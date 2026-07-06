// --- Quick dock service (v0.2.17) ---
// 悬浮球是快捷宿主；控制台内容只调用 debugConsole public renderer，不复制控制台逻辑。
(function registerQuickDockService(global) {
    const OwoApp = global.OwoApp;
    const quickDock = OwoApp.features.quickDock;
    const model = quickDock.model;
    const repository = OwoApp.platform.storage.repository;

    function toast(message, duration) {
        const fn = OwoApp.shared && OwoApp.shared.ui && OwoApp.shared.ui.showToast;
        if (typeof fn === 'function') fn(message, duration);
    }

    function getApiPublic() {
        return OwoApp.features && OwoApp.features.settings && OwoApp.features.settings.apiSettings
            ? OwoApp.features.settings.apiSettings.publicApi // OwoApp.features.settings.apiSettings.publicApi
            : null;
    }

    function getCloudBackupPublic() {
        return OwoApp.features && OwoApp.features.cloudBackup ? OwoApp.features.cloudBackup.publicApi : null; // OwoApp.features.cloudBackup.publicApi
    }

    function getDebugConsolePublic() {
        return OwoApp.features && OwoApp.features.debugConsole ? OwoApp.features.debugConsole.publicApi : null; // OwoApp.features.debugConsole.publicApi
    }

    function recordOperation(label, data, status) {
        const ops = OwoApp.platform && OwoApp.platform.observability
            ? OwoApp.platform.observability.operationTraceService
            : null;
        if (ops && typeof ops.recordOperation === 'function') {
            ops.recordOperation({
                source: 'features/quickDock',
                sourceModule: 'features/quickDock/service',
                action: label,
                label,
                status: status || 'operation',
                data: data || {}
            });
        }
    }

    function getCurrentModel() {
        const api = getApiPublic();
        return api && api.getCurrentMainModel ? api.getCurrentMainModel() : { model: '', provider: '' };
    }

    function listModels() {
        const api = getApiPublic();
        if (!api || !api.listMainModels) return [];
        return api.listMainModels({ includeDom: true });
    }

    async function switchModel(candidateId) {
        const api = getApiPublic();
        if (!api || !api.switchMainModel) throw new Error('模型切换接口未加载');
        const result = await api.switchMainModel(candidateId, { sourceTrigger: 'quickDock' });
        toast('已切换模型：' + (result.model || candidateId));
        return result;
    }

    async function backupNow() {
        const cloud = getCloudBackupPublic();
        if (!cloud || !cloud.backupNow) throw new Error('云备份接口未加载');
        model.setStatusText('正在备份到 GitHub...');
        try {
            const result = await cloud.backupNow({ onProgress: message => model.setStatusText(message), sourceTrigger: 'quickDock' });
            model.setStatusText('备份完成');
            toast('GitHub 备份完成');
            return result;
        } catch (error) {
            model.setStatusText('备份失败：' + error.message);
            throw error;
        }
    }

    async function restoreLatest() {
        const cloud = getCloudBackupPublic();
        if (!cloud || !cloud.restoreLatest) throw new Error('云恢复接口未加载');
        model.setStatusText('正在恢复最新 GitHub 备份...');
        try {
            const result = await cloud.restoreLatest({ onProgress: message => model.setStatusText(message), sourceTrigger: 'quickDock' });
            model.setStatusText('恢复完成，请刷新应用确认数据');
            toast('GitHub 恢复完成，请刷新应用');
            return result;
        } catch (error) {
            model.setStatusText('恢复失败：' + error.message);
            throw error;
        }
    }

    function renderConsole(mountEl, options) {
        const api = getDebugConsolePublic();
        const renderer = api && (api.renderConsole || api.renderEmbeddedConsole || api.renderEmbeddedRequestConsole);
        if (typeof renderer !== 'function') {
            if (mountEl) mountEl.innerHTML = '<div class="quick-dock-console-empty">控制台接口未加载。</div>';
            return false;
        }
        renderer.call(api, mountEl, Object.assign({
            title: '控制台',
            subtitle: '发送 / 回复 / 请求 / 错误 / 诊断',
            hideNote: true
        }, options || {}));
        return true;
    }

    function destroyConsole(mountEl) {
        const api = getDebugConsolePublic();
        if (!mountEl || !api) return;
        const destroyer = api.destroyConsole || api.destroyEmbeddedConsole || api.destroyEmbeddedRequestConsole;
        if (typeof destroyer === 'function') destroyer.call(api, mountEl);
    }

    function openConsolePanel(options = {}) {
        model.setActivePanel('console');
        recordOperation('打开悬浮球控制台', { source: options.source || 'quickDock' }, 'event');
        return true;
    }

    function ensureMagicRoom() {
        if (!global.db || typeof global.db !== 'object') throw new Error('数据库尚未加载，无法读取提示词');
        if (!global.db.magicRoom || typeof global.db.magicRoom !== 'object') global.db.magicRoom = {};
        return global.db.magicRoom;
    }

    function getPromptState() {
        const magicRoom = ensureMagicRoom();
        return {
            enabled: !!magicRoom.customPromptEnabled,
            template: model.normalizePromptText(magicRoom.customPromptTemplate || ''),
            presetCount: Array.isArray(magicRoom.presets) ? magicRoom.presets.length : 0
        };
    }

    async function savePromptState(nextState) {
        const magicRoom = ensureMagicRoom();
        magicRoom.customPromptEnabled = !!(nextState && nextState.enabled);
        magicRoom.customPromptTemplate = model.normalizePromptText(nextState && nextState.template);
        await repository.saveData();
        recordOperation('保存提示词', { enabled: magicRoom.customPromptEnabled, length: String(magicRoom.customPromptTemplate || '').length }, 'success');
        toast('提示词设置已保存');
        return getPromptState();
    }

    quickDock.service = {
        getCurrentModel,
        listModels,
        switchModel,
        backupNow,
        restoreLatest,
        renderConsole,
        destroyConsole,
        openConsolePanel,
        openConsole: openConsolePanel,
        getPromptState,
        savePromptState,
        toast
    };
})(window);
