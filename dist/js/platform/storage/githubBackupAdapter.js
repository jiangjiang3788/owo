// --- GitHub backup platform adapter (v0.2.5) ---
// 只连接 GitHub API、gzip/base64 文件适配和备份数据；不读写 DOM、不弹窗。
(function registerGithubBackupAdapter(global) {
    const app = global.OwoApp;
    const storage = app.platform.storage;
    const fileAdapter = app.platform.browser.fileAdapter;
    const backupAdapter = storage.backupAdapter;

    const SINGLE_FILE_MAX_B64 = 35 * 1024 * 1024;
    const CHUNK_B64_SIZE = 35 * 1024 * 1024;
    const CHUNKS_DIR = 'backup_chunks';

    function sanitizeToken(token) {
        return String(token || '').replace(/^(Bearer|token)\s+/i, '').replace(/\s+/g, '');
    }

    function normalizeConfig(config) {
        return {
            token: sanitizeToken(config && config.token),
            repo: String(config && config.repo || '').trim(),
            auto: !!(config && config.auto),
            interval: parseInt(config && config.interval, 10) || 48,
            lastTime: Number(config && config.lastTime) || 0,
            fileName: String(config && config.fileName || '').trim()
        };
    }

    function assertConfig(config, needWrite) {
        const normalized = normalizeConfig(config);
        if (!normalized.token || !normalized.repo) throw new Error('请先填写 Token 和仓库路径');
        if (needWrite && !normalized.repo.includes('/')) throw new Error('仓库路径格式应为 owner/repo');
        return normalized;
    }

    function encodeRepoPath(repoPath) {
        return String(repoPath || '')
            .split('/')
            .filter(Boolean)
            .map(part => encodeURIComponent(part))
            .join('/');
    }

    function githubContentsUrl(repo, repoPath) {
        const encodedPath = encodeRepoPath(repoPath);
        const path = encodedPath ? `/${encodedPath}` : '/';
        return `https://api.github.com/repos/${repo}/contents${path}`;
    }

    function authHeaders(config, extra) {
        return Object.assign({ Authorization: `token ${config.token}` }, extra || {});
    }

    function isNetworkFailure(error) {
        const message = String(error && error.message || error || '');
        return /Failed to fetch|Load failed|NetworkError|Network request failed|fetch/i.test(message);
    }

    function describeFetchError(error) {
        if (!isNetworkFailure(error)) return error;
        const next = new Error(`GitHub 连接失败：浏览器无法访问 api.github.com。请检查网络/代理、GitHub 是否可访问、Token 权限是否仍有效，再重试。原始错误：${error && error.message ? error.message : error}`);
        next.name = 'GitHubNetworkError';
        next.code = 'github-network-failed';
        next.cause = error;
        return next;
    }

    async function githubFetch(url, options) {
        try {
            return await fetch(url, options);
        } catch (error) {
            throw describeFetchError(error);
        }
    }

    async function readJsonResponse(response, fallbackMessage) {
        try {
            const data = await response.json();
            return data && (data.message || data.error) ? data.message || data.error : fallbackMessage;
        } catch (error) {
            return fallbackMessage;
        }
    }

    async function checkStatus(config) {
        const conf = assertConfig(config, false);
        const res = await githubFetch(`https://api.github.com/repos/${conf.repo}`, { headers: authHeaders(conf) });
        if (!res.ok) throw new Error(await readJsonResponse(res, `连接失败: ${res.status}`));
        const data = await res.json();
        return {
            fullName: data.full_name || conf.repo,
            private: !!data.private,
            canPush: !(data.permissions && data.permissions.push === false)
        };
    }

    async function assertWritableRepo(config) {
        const repoInfo = await checkStatus(config);
        if (repoInfo.canPush === false) throw new Error('Token 缺少写入权限，请重新生成 Token 并勾选 repo 权限');
        return repoInfo;
    }

    async function getExistingSha(config, repoPath) {
        const res = await githubFetch(githubContentsUrl(config.repo, repoPath), { headers: authHeaders(config) });
        if (!res.ok) return null;
        const data = await res.json();
        return data && data.sha ? data.sha : null;
    }

    async function uploadOneFile(config, repoPath, content, message, sha) {
        const body = { message: message || 'Backup', content };
        if (sha) body.sha = sha;
        const res = await githubFetch(githubContentsUrl(config.repo, repoPath), {
            method: 'PUT',
            headers: authHeaders(config, {
                'Content-Type': 'application/json',
                Accept: 'application/vnd.github.v3+json'
            }),
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(await readJsonResponse(res, 'GitHub API Error'));
        return res.json();
    }

    function getSingleBackupPath(config) {
        const customName = String(config.fileName || '').trim();
        if (customName) return customName.endsWith('.ee') ? customName : `${customName}.ee`;
        const dateStr = new Date().toISOString().slice(0, 10);
        return `AutoBackup_${dateStr}_${Date.now()}.ee`;
    }

    async function createBackupBase64(context) {
        const data = await backupAdapter.createFullBackupData(context);
        const blob = await fileAdapter.createGzipJsonBlob(data);
        return fileAdapter.blobToBase64(blob);
    }

    async function uploadBackup(config, context, callbacks = {}) {
        const conf = assertConfig(config, true);
        const onProgress = callbacks.onProgress || function noop() {};
        onProgress('正在检查权限...');
        await assertWritableRepo(conf);
        onProgress('正在打包数据...');
        const base64Content = await createBackupBase64(context);
        if (base64Content.length <= SINGLE_FILE_MAX_B64) {
            onProgress('正在上传至 GitHub...');
            const path = getSingleBackupPath(conf);
            const sha = conf.fileName ? await getExistingSha(conf, path) : null;
            await uploadOneFile(conf, path, base64Content, 'Auto backup', sha);
            return { mode: 'single', path, timestamp: Date.now() };
        }
        const backupId = Date.now();
        const totalChunks = Math.ceil(base64Content.length / CHUNK_B64_SIZE);
        const chunkPaths = [];
        for (let i = 0; i < totalChunks; i++) {
            const chunk = base64Content.slice(i * CHUNK_B64_SIZE, Math.min((i + 1) * CHUNK_B64_SIZE, base64Content.length));
            const chunkName = `BackupChunk_${backupId}_part${i}.ee.chunk`;
            chunkPaths.push(chunkName);
            onProgress(`正在上传分片 ${i + 1}/${totalChunks}...`);
            await uploadOneFile(conf, `${CHUNKS_DIR}/${chunkName}`, btoa(chunk), `Backup chunk ${i + 1}/${totalChunks}`);
        }
        onProgress('正在上传清单...');
        const manifestPath = `${CHUNKS_DIR}/BackupChunk_${backupId}_manifest.json`;
        await uploadOneFile(conf, manifestPath, btoa(JSON.stringify({ backupId, totalChunks, chunkPaths, timestamp: backupId })), 'Backup manifest');
        return { mode: 'chunked', path: manifestPath, timestamp: backupId, totalChunks };
    }

    function sortSingleBackups(files) {
        return (files || []).filter(f => f.name && f.name.startsWith('AutoBackup_') && f.name.endsWith('.ee')).sort((a, b) => {
            const getTs = name => parseInt((name.match(/_(\d+)\.ee$/) || [])[1], 10) || 0;
            return getTs(b.name) - getTs(a.name);
        });
    }

    function sortManifests(files) {
        return (files || []).filter(f => f.name && f.name.startsWith('BackupChunk_') && f.name.endsWith('_manifest.json')).sort((a, b) => {
            const getId = name => parseInt((name.match(/BackupChunk_(\d+)_manifest/) || [])[1], 10) || 0;
            return getId(b.name) - getId(a.name);
        });
    }

    async function fetchGithubList(config, repoPath) {
        const res = await githubFetch(githubContentsUrl(config.repo, repoPath), { headers: authHeaders(config) });
        if (!res.ok) throw new Error(await readJsonResponse(res, `获取列表失败: ${res.status}`));
        return res.json();
    }

    async function findLatestBackup(config) {
        const conf = assertConfig(config, false);
        if (conf.fileName) return { mode: 'single', name: getSingleBackupPath(conf) };
        const rootFiles = await fetchGithubList(conf, '');
        const single = sortSingleBackups(rootFiles)[0] || null;
        let manifest = null;
        try { manifest = sortManifests(await fetchGithubList(conf, CHUNKS_DIR))[0] || null; } catch (error) { manifest = null; }
        if (!single && !manifest) throw new Error('未找到可恢复的备份文件');
        if (!single) return { mode: 'chunked', name: manifest.name };
        if (!manifest) return { mode: 'single', name: single.name };
        const singleTs = parseInt((single.name.match(/_(\d+)\.ee$/) || [])[1], 10) || 0;
        const chunkTs = parseInt((manifest.name.match(/BackupChunk_(\d+)_manifest/) || [])[1], 10) || 0;
        return chunkTs > singleTs ? { mode: 'chunked', name: manifest.name } : { mode: 'single', name: single.name };
    }

    async function downloadRaw(config, repoPath) {
        const res = await githubFetch(githubContentsUrl(config.repo, repoPath), {
            headers: authHeaders(config, { Accept: 'application/vnd.github.v3.raw' })
        });
        if (!res.ok) throw new Error(await readJsonResponse(res, `下载失败: ${res.status}`));
        return res;
    }

    async function downloadLatestBackupData(config, callbacks = {}) {
        const conf = assertConfig(config, false);
        const onProgress = callbacks.onProgress || function noop() {};
        const target = await findLatestBackup(conf);
        if (target.mode === 'single') {
            onProgress(`正在下载: ${target.name}`);
            const blob = await (await downloadRaw(conf, target.name)).blob();
            return fileAdapter.parseGzipJsonBlob(blob);
        }
        onProgress('正在下载分片清单...');
        const manifestText = await (await downloadRaw(conf, `${CHUNKS_DIR}/${target.name}`)).text();
        const manifest = JSON.parse(manifestText);
        let fullBase64 = '';
        for (let i = 0; i < manifest.totalChunks; i++) {
            onProgress(`正在下载分片 ${i + 1}/${manifest.totalChunks}...`);
            fullBase64 += await (await downloadRaw(conf, `${CHUNKS_DIR}/${manifest.chunkPaths[i]}`)).text();
        }
        onProgress('正在解码并解压...');
        return fileAdapter.parseGzipJsonBlob(fileAdapter.base64ToBlob(fullBase64));
    }

    storage.githubBackupAdapter = {
        SINGLE_FILE_MAX_B64,
        CHUNK_B64_SIZE,
        CHUNKS_DIR,
        sanitizeToken,
        normalizeConfig,
        encodeRepoPath,
        isNetworkFailure,
        describeFetchError,
        checkStatus,
        uploadBackup,
        findLatestBackup,
        downloadLatestBackupData
    };
})(window);
