// --- Quick dock service (v0.2.8) ---
// 只编排悬浮球用例；跨功能能力一律走 public facade，不直接碰设置页/教程页旧对象。
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
            ? OwoApp.features.settings.apiSettings.publicApi
            : null;
    }

    function getCloudBackupPublic() {
        return OwoApp.features && OwoApp.features.cloudBackup ? OwoApp.features.cloudBackup.publicApi : null;
    }

    function getDebugConsolePublic() {
        return OwoApp.features && OwoApp.features.debugConsole ? OwoApp.features.debugConsole.publicApi : null;
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
        const result = await api.switchMainModel(candidateId);
        toast('已切换模型：' + (result.model || candidateId));
        return result;
    }

    async function backupNow() {
        const cloud = getCloudBackupPublic();
        if (!cloud || !cloud.backupNow) throw new Error('云备份接口未加载');
        model.setStatusText('正在备份到 GitHub...');
        try {
            const result = await cloud.backupNow({ onProgress: message => model.setStatusText(message) });
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
            const result = await cloud.restoreLatest({ onProgress: message => model.setStatusText(message) });
            model.setStatusText('恢复完成，请刷新应用确认数据');
            toast('GitHub 恢复完成，请刷新应用');
            return result;
        } catch (error) {
            model.setStatusText('恢复失败：' + error.message);
            throw error;
        }
    }

    function openRequestConsole() {
        const debug = getDebugConsolePublic();
        if (debug && debug.openRequestConsole) debug.openRequestConsole();
        else throw new Error('请求控制台接口未加载');
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
        toast('提示词设置已保存');
        return getPromptState();
    }

    quickDock.service = {
        getCurrentModel,
        listModels,
        switchModel,
        backupNow,
        restoreLatest,
        openRequestConsole,
        getPromptState,
        savePromptState,
        toast
    };
})(window);
