// --- Data Management storage panel (v0.2.17) ---
// 只负责把存储分析直接渲染到数据管理 App；复用 platform/storage.storageAnalysis、browser imageAdapter 和 storage repository。
(function registerDataManagementStoragePanel(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.dataManagement;

    const categoryNames = Object.freeze({
        messages: '聊天记录',
        charactersAndGroups: '角色与群组',
        worldAndForum: '世界书与论坛',
        personalization: '个性化设置',
        apiAndCore: '核心与 API',
        other: '其他数据'
    });
    const colorPalette = ['#ff80ab', '#90caf9', '#a5d6a7', '#fff59d', '#b39ddb', '#ffcc80'];

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    }

    function toast(message) {
        const fn = OwoApp.shared && OwoApp.shared.ui ? OwoApp.shared.ui.showToast : null;
        if (typeof fn === 'function') fn(message);
    }

    function recordOperation(label, data, status) {
        const ops = OwoApp.platform && OwoApp.platform.observability
            ? OwoApp.platform.observability.operationTraceService
            : null;
        if (!ops || typeof ops.recordOperation !== 'function') return null;
        return ops.recordOperation({
            source: 'features/dataManagement/storagePanel',
            sourceModule: 'features/dataManagement/storagePanel',
            action: label,
            label,
            status: status || 'operation',
            data: data || {}
        });
    }

    function formatBytes(bytes, decimals = 2) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function getDataStorage() {
        return OwoApp.platform && OwoApp.platform.storage && OwoApp.platform.storage.storageAnalysis
            ? OwoApp.platform.storage.storageAnalysis.dataStorage
            : null;
    }

    function getImageCompressor() {
        return OwoApp.platform && OwoApp.platform.browser ? OwoApp.platform.browser.compressImage : null;
    }

    function getStorageRepository() {
        return OwoApp.platform && OwoApp.platform.storage ? OwoApp.platform.storage.repository : null;
    }

    function getConfirmDialog() {
        return OwoApp.shared && OwoApp.shared.ui ? OwoApp.shared.ui.showAppConfirmDialog : null;
    }

    async function getStorageInfo() {
        const storage = getDataStorage();
        if (!storage || typeof storage.getStorageInfo !== 'function') throw new Error('存储分析接口未加载');
        return storage.getStorageInfo();
    }

    function renderChart(chartEl, info) {
        const chartData = Object.entries(info.categorizedSizes || {})
            .map(([key, value]) => ({ name: categoryNames[key] || key, value }))
            .filter(item => item.value > 0);
        if (global.echarts && chartEl) {
            const chart = global.echarts.init(chartEl);
            chart.setOption({
                color: colorPalette,
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                legend: { show: false },
                series: [{
                    name: '存储占比',
                    type: 'pie',
                    radius: ['50%', '70%'],
                    avoidLabelOverlap: false,
                    label: { show: false, position: 'center' },
                    emphasis: { label: { show: true, fontSize: '18', fontWeight: 'bold' } },
                    labelLine: { show: false },
                    data: chartData
                }]
            });
            return chart;
        }
        if (chartEl) chartEl.innerHTML = '<div class="dm-empty-note">图表库未加载，已显示下方明细。</div>';
        return null;
    }

    function renderDetails(listEl, totalEl, info) {
        const totalSize = info.totalSize || 0;
        if (totalEl) totalEl.textContent = formatBytes(totalSize);
        if (!listEl) return;
        listEl.innerHTML = '';
        Object.entries(info.categorizedSizes || {})
            .map(([key, value]) => ({ key, name: categoryNames[key] || key, value }))
            .sort((a, b) => b.value - a.value)
            .forEach((item, index) => {
                if (item.value <= 0) return;
                const percentage = totalSize > 0 ? ((item.value / totalSize) * 100).toFixed(2) : '0.00';
                const color = colorPalette[index % colorPalette.length];
                const row = document.createElement('div');
                row.className = 'dm-storage-row';
                row.innerHTML = `
                    <span class="dm-storage-dot" style="background:${color}"></span>
                    <span class="dm-storage-name">${escapeHtml(item.name)}</span>
                    <span class="dm-storage-size">${formatBytes(item.value)}</span>
                    <span class="dm-storage-percent">${percentage}%</span>`;
                listEl.appendChild(row);
            });
    }

    async function compressAllHistoryImages(refresh) {
        const compressImage = getImageCompressor();
        if (typeof compressImage !== 'function') throw new Error('图片压缩接口未加载');
        let compressedCount = 0;
        let totalSavedBytes = 0;
        async function compressIfBase64(url) {
            if (!url || !String(url).startsWith('data:image/')) return url;
            const originalSize = Math.round((url.length * 3) / 4);
            if (originalSize < 100 * 1024) return url;
            const res = await fetch(url);
            const blob = await res.blob();
            const compressedDataUrl = await compressImage(blob, { quality: 0.8, maxWidth: 512, maxHeight: 512 });
            const newSize = Math.round((compressedDataUrl.length * 3) / 4);
            if (newSize < originalSize) {
                compressedCount++;
                totalSavedBytes += originalSize - newSize;
                return compressedDataUrl;
            }
            return url;
        }
        async function scanHistory(history) {
            if (!Array.isArray(history)) return;
            for (const msg of history) {
                let changed = false;
                if (msg.novelAiImageUrl) {
                    const next = await compressIfBase64(msg.novelAiImageUrl);
                    if (next !== msg.novelAiImageUrl) { msg.novelAiImageUrl = next; changed = true; }
                }
                if (Array.isArray(msg._imageVersions)) {
                    for (const item of msg._imageVersions) {
                        if (!item || !item.imageUrl) continue;
                        const next = await compressIfBase64(item.imageUrl);
                        if (next !== item.imageUrl) { item.imageUrl = next; changed = true; }
                    }
                }
                if (msg.content && typeof msg.content === 'string' && msg.content.includes('data:image/')) {
                    const regex = /(data:image\/[^;"']+(?:;[^;"']+)*;base64,[A-Za-z0-9+/=]+)/g;
                    const matches = Array.from(msg.content.matchAll(regex));
                    let newContent = msg.content;
                    for (const match of matches) {
                        const next = await compressIfBase64(match[1]);
                        if (next !== match[1]) { newContent = newContent.replace(match[1], next); changed = true; }
                    }
                    if (changed) msg.content = newContent;
                }
            }
        }
        const state = global.db || {};
        for (const char of state.characters || []) await scanHistory(char.history);
        for (const group of state.groups || []) await scanHistory(group.history);
        const repository = getStorageRepository();
        if (repository && typeof repository.saveData === 'function') await repository.saveData();
        if (typeof refresh === 'function') await refresh();
        const message = `压缩完成：${compressedCount} 张图片，节省 ${formatBytes(totalSavedBytes)}`;
        recordOperation('压缩聊天图片完成', { compressedCount, totalSavedBytes, savedText: formatBytes(totalSavedBytes) }, 'success');
        toast(message);
    }

    async function renderPersistenceStatus(mountEl) {
        const statusEl = mountEl.querySelector('[data-dm-storage-persistence]');
        if (!statusEl) return;
        const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
        const estimate = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate().catch(() => null) : null;
        let quotaText = '';
        if (estimate && estimate.quota) {
            const pct = Math.min(100, ((estimate.usage || 0) / estimate.quota) * 100);
            quotaText = `<div class="dm-storage-progress"><span style="width:${pct.toFixed(1)}%"></span></div><p>${formatBytes(estimate.usage || 0)} / 约 ${formatBytes(estimate.quota)}（${pct.toFixed(1)}%）</p>`;
        }
        statusEl.innerHTML = `
            <div class="dm-storage-status-title">持久化存储保护：${persisted ? '已开启' : '未开启'}</div>
            ${quotaText}
            ${persisted ? '' : '<button type="button" class="btn btn-secondary btn-small" data-dm-storage-action="persist">立即开启保护</button>'}`;
        const btn = statusEl.querySelector('[data-dm-storage-action="persist"]');
        if (btn) btn.addEventListener('click', async () => {
            const ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false;
            recordOperation('开启持久化存储保护', { ok }, ok ? 'success' : 'error');
            toast(ok ? '已开启持久化存储' : '开启失败，可能是浏览器策略限制');
            await renderPersistenceStatus(mountEl);
        });
    }

    function render(mountEl) {
        if (!mountEl) return false;
        let chart = null;
        mountEl.innerHTML = `
            <div class="dm-storage-panel">
                <div class="dm-storage-actions">
                    <button type="button" class="btn btn-primary" data-dm-storage-action="refresh">重新分析</button>
                    <button type="button" class="btn btn-secondary" data-dm-storage-action="compress">一键压缩聊天图片</button>
                </div>
                <div data-dm-storage-persistence class="dm-storage-status"></div>
                <div class="dm-storage-chart" data-dm-storage-chart></div>
                <div class="dm-storage-total"><span>总占用空间</span><strong data-dm-storage-total>---</strong></div>
                <div class="dm-storage-list" data-dm-storage-list></div>
            </div>`;
        const chartEl = mountEl.querySelector('[data-dm-storage-chart]');
        const totalEl = mountEl.querySelector('[data-dm-storage-total]');
        const listEl = mountEl.querySelector('[data-dm-storage-list]');
        async function refresh(source) {
            const startedAt = Date.now();
            try {
                const info = await getStorageInfo();
                if (chart && typeof chart.dispose === 'function') chart.dispose();
                chart = renderChart(chartEl, info);
                renderDetails(listEl, totalEl, info);
                await renderPersistenceStatus(mountEl);
                recordOperation('存储分析刷新', { source: source || 'auto', totalSize: info.totalSize || 0, durationMs: Date.now() - startedAt, categorizedSizes: info.categorizedSizes || {} }, 'success');
            } catch (error) {
                recordOperation('存储分析刷新失败', { source: source || 'auto', errorMessage: error.message, durationMs: Date.now() - startedAt }, 'error');
                throw error;
            }
        }
        mountEl.querySelector('[data-dm-storage-action="refresh"]')?.addEventListener('click', () => refresh('manual').catch(err => toast(err.message || '分析失败')));
        mountEl.querySelector('[data-dm-storage-action="compress"]')?.addEventListener('click', async () => {
            const confirmDialog = getConfirmDialog();
            if (typeof confirmDialog !== 'function') {
                toast('确认弹窗未加载');
                return;
            }
            const ok = await confirmDialog({
                title: '压缩所有聊天图片',
                message: '此操作会遍历聊天记录里的 Base64 图片并压缩，可能需要一些时间。确定继续吗？',
                confirmText: '开始压缩',
                cancelText: '取消'
            });
            if (ok !== 'confirm') return;
            recordOperation('开始压缩聊天图片', { source: 'dataManagement' }, 'operation');
            compressAllHistoryImages(() => refresh('afterCompress')).catch(err => {
                recordOperation('压缩聊天图片失败', { errorMessage: err.message }, 'error');
                toast(err.message || '压缩失败');
            });
        });
        refresh('auto').catch(err => toast(err.message || '分析失败'));
        return true;
    }

    feature.storagePanel = Object.freeze({
        render,
        getRoutingReport: () => ({ owner: 'features/dataManagement/storagePanel', uses: ['platform/storage.storageAnalysis.dataStorage', 'platform/browser.compressImage', 'platform/storage.repository.saveData', 'platform/observability.operationTraceService.recordOperation'] })
    });
})(window);
