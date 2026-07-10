// --- Theater prompt service owner (V29) ---
// 绑定运行时 state，组装小剧场 prompt request；不调用 fetch，不处理 stream，不保存。
(function registerTheaterPromptService(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.theater = OwoApp.features.theater || {};
    const semantics = OwoApp.core.theater.sceneSemantics;
    const promptSemantics = OwoApp.core.theater.promptSemantics;

    function stateOf(state) { return state || global.db || {}; }
    function asArray(value) { return Array.isArray(value) ? value : []; }

    function getCharactersByIds(state, ids) {
        const target = stateOf(state);
        return semantics.getCharactersByIds(target.characters || [], ids);
    }

    function getPersonaById(state, personaId) {
        const target = stateOf(state);
        if (!personaId) return null;
        return asArray(target.myPersonaPresets).find(p => p && (p.id || p.name) === personaId) || null;
    }

    function getWorldBooksByIds(state, worldBookIds) {
        const target = stateOf(state);
        const selected = new Set(asArray(worldBookIds).filter(Boolean));
        if (!selected.size) return [];
        return asArray(target.worldBooks).filter(book => book && selected.has(book.id) && !book.disabled);
    }

    function buildManualGenerationRequest(options) {
        const input = options || {};
        const state = stateOf(input.state);
        const mode = semantics.normalizeMode(input.mode);
        const characters = getCharactersByIds(state, input.charIds || []);
        const persona = getPersonaById(state, input.personaId);
        const worldBooks = getWorldBooksByIds(state, input.worldBookIds || []);
        const systemPrompt = promptSemantics.getManualSystemPrompt(mode);
        const userPrompt = promptSemantics.buildManualPrompt({
            customPrompt: input.customPrompt || '',
            characters,
            persona,
            worldBooks,
            contextEnabled: input.contextEnabled,
            chatHistoryCount: input.chatHistoryCount,
            journalCount: input.journalCount,
            filterHistory: input.filterHistory
        });
        return { systemPrompt, userPrompt, mode, characters, persona, worldBooks };
    }

    function buildCharacterGenerationRequest(charId, options) {
        const input = options || {};
        const state = stateOf(input.state);
        const char = asArray(state.characters).find(item => item && item.id === charId);
        if (!char || !char.charTheaterEnabled) return null;
        const mode = promptSemantics.decideCharacterMode(char.charTheaterFormat || 'text', input.randomValue);
        const worldBookIds = Array.isArray(char.charTheaterWorldBookIds) ? char.charTheaterWorldBookIds : [];
        const worldBooks = getWorldBooksByIds(state, worldBookIds);
        const defaultPersona = !char.myPersona && asArray(state.myPersonaPresets).length > 0 ? state.myPersonaPresets[0] : null;
        const prompt = promptSemantics.buildCharacterPrompt({ character: char, worldBooks, defaultPersona });
        return {
            char,
            charName: prompt.charName,
            myName: prompt.myName,
            mode,
            useHtml: semantics.isHtmlMode(mode),
            worldBookIds,
            systemPrompt: promptSemantics.buildCharacterSystemPrompt(char, mode),
            userPrompt: prompt.userPrompt,
            customPrompt: prompt.customPrompt,
            chatCount: prompt.chatCount,
            journalCount: prompt.journalCount
        };
    }

    function normalizeGeneratedContent(content, options) {
        const input = options || {};
        const state = stateOf(input.state);
        const persona = getPersonaById(state, input.personaId);
        const characters = getCharactersByIds(state, input.charIds || []);
        const firstChar = characters[0] || null;
        return semantics.normalizeGeneratedContent(content, {
            mode: input.mode,
            customPrompt: input.customPrompt,
            userName: input.userName || (persona && persona.name),
            charName: input.charName || (firstChar && (firstChar.realName || firstChar.remarkName)),
            fallbackStyle: input.fallbackStyle
        });
    }

    feature.promptService = {
        getCharactersByIds,
        getPersonaById,
        getWorldBooksByIds,
        buildManualGenerationRequest,
        buildCharacterGenerationRequest,
        normalizeGeneratedContent
    };
})(window);
