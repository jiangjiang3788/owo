// --- Cloud backup service (v0.2.5) ---
// 负责 GitHub 云备份用例编排和本地配置；UI 入口和悬浮球均应走 public facade。
(function registerCloudBackupService(global) {
    const OwoApp = global.OwoApp;
    const cloudBackup = OwoApp.features.cloudBackup;
    const adapter = OwoApp.platform.storage.githubBackupAdapter;
    const repository = OwoApp.platform.storage.repository;

    const CONFIG_KEY = 'gh_config';
    const DEFAULT_CONFIG = Object.freeze({ token: '', repo: '', auto: false, interval: 48, lastTime: 0, fileName: '' });

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function notify(message, duration) {
        const toast = OwoApp.shared && OwoApp.shared.ui ? OwoApp.shared.ui.showToast : null;
        if (typeof toast === 'function') toast(message, duration);
    }

    function requireGlobalObject(name, message) {
        if (global[name] === undefined || global[name] === null) throw new Error(message || `${name} 未加载`);
        return global[name];
    }

    function getBackupContext() {
        return {
            getDb: () => requireGlobalObject('db', '数据库尚未加载，无法执行云备份'),
            getDexieDB: () => requireGlobalObject('dexieDB', 'IndexedDB 尚未加载，无法恢复备份'),
            getGlobalSettingKeys: () => global.globalSettingKeysForBackup || global.globalSettingKeys || [],
            getDefaultWidgetSettings: () => global.defaultWidgetSettings || {},
            saveData: () => repository.saveData(),
            showToast: message => notify(message)
        };
    }

    function loadConfig() {
        try {
            const parsed = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
            return Object.assign(clone(DEFAULT_CONFIG), adapter.normalizeConfig(parsed));
        } catch (error) {
            return clone(DEFAULT_CONFIG);
        }
    }

    function saveConfig(config) {
        const normalized = Object.assign(loadConfig(), adapter.normalizeConfig(config || {}));
        localStorage.setItem(CONFIG_KEY, JSON.stringify(normalized));
        return normalized;
    }

    function getConfig() {
        return loadConfig();
    }

    function readConfigFromForm() {
        const byId = id => document.getElementById(id);
        const config = {
            token: byId('gh-token-input')?.value || '',
            repo: byId('gh-repo-input')?.value || '',
            fileName: byId('gh-filename-input')?.value || '',
            auto: !!byId('gh-auto-switch')?.checked,
            interval: parseInt(byId('gh-interval-select')?.value, 10) || 48,
            lastTime: loadConfig().lastTime || 0
        };
        return adapter.normalizeConfig(config);
    }

    function syncConfigToForm(config) {
        const byId = id => document.getElementById(id);
        const normalized = Object.assign(loadConfig(), adapter.normalizeConfig(config || {}));
        if (byId('gh-token-input')) byId('gh-token-input').value = normalized.token || '';
        if (byId('gh-repo-input')) byId('gh-repo-input').value = normalized.repo || '';
        if (byId('gh-filename-input')) byId('gh-filename-input').value = normalized.fileName || '';
        if (byId('gh-auto-switch')) byId('gh-auto-switch').checked = !!normalized.auto;
        if (byId('gh-interval-select')) byId('gh-interval-select').value = normalized.interval || 48;
        if (byId('gh-interval-setting')) byId('gh-interval-setting').style.display = normalized.auto ? 'flex' : 'none';
        updateStatusText(normalized);
        return normalized;
    }

    function updateStatusText(config) {
        const el = document.getElementById('gh-status-msg');
        if (!el) return;
        const normalized = config || loadConfig();
        if (!normalized.lastTime) {
            el.innerText = '从未备份过';
            return;
        }
        const date = new Date(normalized.lastTime);
        const nextTime = new Date(normalized.lastTime + (normalized.interval || 48) * 3600000);
        el.innerText = `上次: ${date.toLocaleString()} (下次约: ${nextTime.toLocaleString()})`;
    }

    async function saveConfigFromForm() {
        const config = saveConfig(readConfigFromForm());
        syncConfigToForm(config);
        if (config.auto) await checkAndBackup({ silentWhenNotDue: true });
        return config;
    }

    async function backupNow(options = {}) {
        const config = options.config ? saveConfig(options.config) : loadConfig();
        const onProgress = options.onProgress || (message => notify(message));
        const result = await adapter.uploadBackup(config, getBackupContext(), { onProgress });
        const nextConfig = saveConfig(Object.assign({}, config, { lastTime: result.timestamp || Date.now() }));
        updateStatusText(nextConfig);
        return Object.assign({ success: true }, result);
    }

    async function checkAndBackup(options = {}) {
        const config = loadConfig();
        if (!config.token || !config.repo || !config.auto) return { skipped: true, reason: 'disabled' };
        const hours = (Date.now() - (config.lastTime || 0)) / 3600000;
        if (hours < (config.interval || 48)) return { skipped: true, reason: 'not_due', hours };
        const onProgress = options.onProgress || (message => notify('自动备份: ' + message));
        return backupNow({ config, onProgress });
    }

    async function checkStatus(config) {
        return adapter.checkStatus(config || loadConfig());
    }

    async function restoreLatest(options = {}) {
        const config = options.config ? saveConfig(options.config) : loadConfig();
        const onProgress = options.onProgress || (message => notify(message));
        const data = await adapter.downloadLatestBackupData(config, { onProgress });
        onProgress('解压完成，开始导入...');
        const result = await OwoApp.platform.storage.backupAdapter.importBackupData(data, getBackupContext());
        if (!result.success) throw new Error(result.error || '恢复失败');
        return Object.assign({ success: true }, result);
    }

    cloudBackup.service = {
        CONFIG_KEY,
        DEFAULT_CONFIG,
        getConfig,
        loadConfig,
        saveConfig,
        readConfigFromForm,
        syncConfigToForm,
        updateStatusText,
        saveConfigFromForm,
        backupNow,
        checkAndBackup,
        checkStatus,
        restoreLatest
    };
})(window);
