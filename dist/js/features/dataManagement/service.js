// --- Data Management service (v0.2.17) ---
// 用例编排：数据管理 App 承载教程/备份/存储；控制台只在 quickDock 宿主中展示，数据管理仅提供入口。
(function registerDataManagementService(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.dataManagement;
    let pendingConsoleOpen = false;

    function toast(message) {
        const fn = OwoApp.shared && OwoApp.shared.ui ? OwoApp.shared.ui.showToast : null;
        if (typeof fn === 'function') fn(message);
        else console.log('[dataManagement]', message);
    }

    function getCloudBackupApi() { return OwoApp.features && OwoApp.features.cloudBackup ? OwoApp.features.cloudBackup.publicApi : null; }
    function getQuickDockApi() { return OwoApp.features && OwoApp.features.quickDock ? OwoApp.features.quickDock.publicApi : null; }
    function getOperationTraceService() { return OwoApp.platform && OwoApp.platform.observability ? OwoApp.platform.observability.operationTraceService : null; }

    function safeClone(value) {
        if (value === undefined) return undefined;
        if (value === null) return null;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        try { return JSON.parse(JSON.stringify(value)); }
        catch (error) { return String(value); }
    }

    function recordOperation(label, data, status) {
        const ops = getOperationTraceService();
        if (!ops || typeof ops.recordOperation !== 'function') return null;
        return ops.recordOperation({
            source: 'features/dataManagement',
            sourceModule: 'features/dataManagement/service',
            action: label || '数据管理操作',
            label: label || '数据管理操作',
            status: status || 'operation',
            data: safeClone(data || {})
        });
    }

    function controlText(el) {
        if (!el) return '';
        return String(el.textContent || el.value || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim();
    }

    function describeControlAction(el, eventType) {
        if (!el) return null;
        const id = el.id || '';
        const type = el.type || '';
        const text = controlText(el);
        const tag = String(el.tagName || '').toLowerCase();
        const key = [id, text, type, tag].join(' ');
        if (!/(gh-|backup|restore|import|export|clear|delete|storage|console|tutorial|token|repo|仓库|备份|恢复|导入|导出|清除|删除|存储|控制台|教程|保存|检查)/i.test(key)) return null;
        return { id, text, tag, type, eventType: eventType || 'click' };
    }

    function recordControlAction(el, eventType, extra) {
        const action = describeControlAction(el, eventType);
        if (!action) return null;
        return recordOperation('数据管理界面操作：' + (action.text || action.id || action.tag), Object.assign(action, safeClone(extra || {})), 'operation');
    }

    async function backupNow() {
        const api = getCloudBackupApi();
        if (!api || typeof api.backupNow !== 'function') throw new Error('云备份接口未加载');
        const startedAt = Date.now();
        try {
            const result = await api.backupNow({ sourceTrigger: 'dataManagement' });
            recordOperation('数据管理触发备份', { result, durationMs: Date.now() - startedAt }, 'success');
            toast('备份完成');
            return result;
        } catch (error) {
            recordOperation('数据管理触发备份失败', { errorMessage: error && error.message, durationMs: Date.now() - startedAt }, 'error');
            throw error;
        }
    }

    async function restoreLatest() {
        const api = getCloudBackupApi();
        if (!api || typeof api.restoreLatest !== 'function') throw new Error('云恢复接口未加载');
        const startedAt = Date.now();
        try {
            const result = await api.restoreLatest({ sourceTrigger: 'dataManagement' });
            recordOperation('数据管理触发恢复', { result, durationMs: Date.now() - startedAt }, 'success');
            toast('恢复完成');
            return result;
        } catch (error) {
            recordOperation('数据管理触发恢复失败', { errorMessage: error && error.message, durationMs: Date.now() - startedAt }, 'error');
            throw error;
        }
    }

    function openConsole() {
        const quickDock = getQuickDockApi();
        const opener = quickDock && (quickDock.openConsolePanel || quickDock.openConsole || quickDock.openRequestPanel);
        recordOperation('打开悬浮球控制台', { source: 'dataManagement' }, 'operation');
        if (typeof opener === 'function') return opener.call(quickDock, { source: 'dataManagement' });
        pendingConsoleOpen = true;
        toast('悬浮球控制台尚未加载，请稍后再试');
        return false;
    }

    function renderConsole(mountEl) {
        if (!mountEl) return false;
        mountEl.innerHTML = '<div class="dm-empty-note">控制台只在悬浮球中显示，本页不再重复渲染。请点击“打开悬浮球控制台”。</div>';
        return false;
    }

    function destroyConsole() {}

    function consumeOpenConsoleRequest() {
        const value = pendingConsoleOpen;
        pendingConsoleOpen = false;
        return value;
    }

    function renderTutorialContent(mountEl) {
        if (!mountEl) return false;
        if (typeof global.renderTutorialContent !== 'function') {
            mountEl.innerHTML = '<div class="dm-empty-note">教程模块未加载。</div>';
            return false;
        }
        global.renderTutorialContent(mountEl);
        if (typeof global.setupTutorialApp === 'function') global.setupTutorialApp(mountEl);
        return true;
    }

    function renderStorageAnalysis(mountEl) {
        if (!mountEl) return false;
        if (!feature.storagePanel || typeof feature.storagePanel.render !== 'function') {
            mountEl.innerHTML = '<div class="dm-empty-note">存储分析面板未加载。</div>';
            return false;
        }
        recordOperation('打开存储分析面板', { source: 'dataManagement' }, 'operation');
        return feature.storagePanel.render(mountEl);
    }

    function getRoutingReport() {
        return {
            owner: 'features/dataManagement/service',
            consoleOwner: 'features/quickDock.publicApi.openConsolePanel',
            traceOwner: 'platform/observability/operationTraceService -> traceStore',
            uses: ['features/quickDock.publicApi.openConsolePanel', 'features/cloudBackup.publicApi', 'window.renderTutorialContent(container)', 'features/dataManagement.storagePanel.render'],
            embeddedScreens: ['tutorial-screen'],
            standaloneHomeEntriesRemoved: true,
            noSecondaryNavigation: true,
            consoleNotRenderedHere: true,
            quickDockOnlyConsole: true,
            singleConsoleRenderer: true,
            singleConsoleHost: 'features/quickDock/view',
            operationTrace: 'operationTraceService.recordOperation / recordControlAction'
        };
    }

    feature.service = { backupNow, restoreLatest, openConsole, renderConsole, destroyConsole, consumeOpenConsoleRequest, renderTutorialContent, renderStorageAnalysis, recordOperation, recordControlAction, getRoutingReport };
})(window);
