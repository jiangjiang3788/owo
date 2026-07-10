// --- Theater public facade (V29/V33) ---
// 只导出稳定 API；跨 feature 只能通过这里访问小剧场能力。
(function registerTheaterPublicFacade(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.theater = OwoApp.features.theater || {};

    function getState(state) {
        return state || global.db || {};
    }

    function findScenarioById(state, scenarioId, mode) {
        const target = getState(state);
        const model = feature.model;
        if (!model || typeof model.findScenarioById !== 'function') return null;
        const normalizedMode = mode || 'text';
        let scenario = model.findScenarioById(target, normalizedMode, scenarioId);
        if (!scenario && normalizedMode !== 'html') scenario = model.findScenarioById(target, 'html', scenarioId);
        if (!scenario && normalizedMode !== 'text') scenario = model.findScenarioById(target, 'text', scenarioId);
        return scenario || null;
    }

    function createScenarioShareViewModel(state, scenarioId, options = {}) {
        const target = getState(state);
        const scenario = findScenarioById(target, scenarioId, options.mode);
        const semantics = OwoApp.core.theater.sceneSemantics;
        let charName = '';
        if (scenario && scenario.charId && Array.isArray(target.characters)) {
            const character = target.characters.find(item => item && item.id === scenario.charId);
            if (character) charName = character.remarkName || character.realName || '';
        }
        const rawContent = scenario && scenario.content ? String(scenario.content).replace(/\s+/g, ' ').trim() : '';
        return {
            scenario,
            exists: !!scenario,
            id: scenarioId,
            mode: scenario ? (scenario.mode || options.mode || 'text') : (options.mode || 'text'),
            title: scenario ? (scenario.title || '剧情') : '小剧场',
            category: scenario ? (scenario.category || '未分类') : '未分类',
            charName,
            preview: rawContent ? rawContent.slice(0, 60) + (rawContent.length > 60 ? '…' : '') : '',
            isHtml: scenario ? (semantics && semantics.isHtmlMode ? semantics.isHtmlMode(scenario.mode || options.mode) : (scenario.mode || options.mode) === 'html') : false
        };
    }

    function openScenarioFromChat(scenario, options = {}) {
        if (!scenario) return false;
        global._theaterDetailFromChat = true;
        if (typeof global.openApp === 'function') global.openApp('theater');
        const mode = scenario.mode || options.mode || 'text';
        const delay = Number.isFinite(options.delay) ? options.delay : 0;
        const openDetail = () => {
            if (mode === 'html' && typeof global.showTheaterHtmlScenarioDetail === 'function') {
                global.showTheaterHtmlScenarioDetail(scenario);
                return true;
            }
            if (typeof global.showTheaterScenarioDetail === 'function') {
                global.showTheaterScenarioDetail(scenario);
                return true;
            }
            return false;
        };
        if (delay > 0) {
            global.setTimeout(openDetail, delay);
            return true;
        }
        return openDetail();
    }

    function getRoutingReport() {
        return {
            publicOwner: 'OwoApp.features.theater.publicApi',
            sceneSemanticsOwner: 'OwoApp.core.theater.sceneSemantics',
            promptSemanticsOwner: 'OwoApp.core.theater.promptSemantics',
            modelOwner: 'OwoApp.features.theater.model',
            promptServiceOwner: 'OwoApp.features.theater.promptService',
            legacyShell: 'js/modules/theater.js',
            chatAiChanged: false,
            forumChanged: false,
            messageSendChanged: false
        };
    }

    function getPublicContract() {
        return {
            feature: 'theater',
            stableApis: [
                'getRoutingReport',
                'getPublicContract',
                'findScenarioById',
                'createScenarioShareViewModel',
                'openScenarioFromChat',
                'sceneSemantics',
                'promptSemantics',
                'model',
                'promptService'
            ],
            privateOwners: ['OwoApp.features.theater.model', 'OwoApp.features.theater.promptService'],
            crossFeatureRule: '聊天渲染等外部模块只能通过 OwoApp.features.theater.publicApi 访问小剧场场景'
        };
    }

    feature.publicApi = {
        getRoutingReport,
        getPublicContract,
        findScenarioById,
        createScenarioShareViewModel,
        openScenarioFromChat,
        sceneSemantics: OwoApp.core.theater.sceneSemantics,
        promptSemantics: OwoApp.core.theater.promptSemantics,
        model: feature.model,
        promptService: feature.promptService
    };
})(window);
