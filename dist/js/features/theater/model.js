// --- Theater model owner (V29) ---
// 负责小剧场列表、提示词预设和 scene 状态模型；不渲染 DOM，不发请求。
(function registerTheaterModel(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.theater = OwoApp.features.theater || {};
    const semantics = OwoApp.core.theater.sceneSemantics;

    function ensureState(state) {
        return state || global.db || {};
    }

    function getScenarioList(state, mode) {
        const target = ensureState(state);
        const key = semantics.getScenarioListKey(mode);
        if (!Array.isArray(target[key])) target[key] = [];
        return target[key];
    }

    function setScenarioList(state, mode, list) {
        const target = ensureState(state);
        target[semantics.getScenarioListKey(mode)] = Array.isArray(list) ? list : [];
        return target[semantics.getScenarioListKey(mode)];
    }

    function getPromptPresetList(state, mode) {
        const target = ensureState(state);
        const key = semantics.getPromptPresetListKey(mode);
        if (!Array.isArray(target[key])) target[key] = [];
        return target[key];
    }

    function setPromptPresetList(state, mode, list) {
        const target = ensureState(state);
        target[semantics.getPromptPresetListKey(mode)] = Array.isArray(list) ? list : [];
        return target[semantics.getPromptPresetListKey(mode)];
    }

    function addScenario(state, mode, scenario) {
        const list = getScenarioList(state, mode);
        const normalized = semantics.normalizeScenario(scenario, { mode });
        list.unshift(normalized);
        return normalized;
    }

    function findScenarioById(state, mode, id) {
        return getScenarioList(state, mode).find(item => item && item.id === id) || null;
    }

    function updateScenario(state, mode, id, patch) {
        const scenario = findScenarioById(state, mode, id);
        if (!scenario) return null;
        Object.assign(scenario, patch || {});
        return scenario;
    }

    function deleteScenarioById(state, mode, id) {
        const list = getScenarioList(state, mode);
        const index = list.findIndex(item => item && item.id === id);
        if (index === -1) return null;
        return list.splice(index, 1)[0];
    }

    function deleteScenariosByIds(state, mode, ids) {
        const selected = new Set(Array.from(ids || []).filter(Boolean));
        if (!selected.size) return 0;
        const list = getScenarioList(state, mode);
        const before = list.length;
        setScenarioList(state, mode, list.filter(item => !item || !selected.has(item.id)));
        return before - getScenarioList(state, mode).length;
    }

    function toggleFavorite(state, mode, id) {
        const scenario = findScenarioById(state, mode, id);
        if (!scenario) return null;
        scenario.isFavorite = !scenario.isFavorite;
        return scenario;
    }

    function getCategories(state, mode) {
        return semantics.getScenarioCategories(getScenarioList(state, mode));
    }

    function getScenarioListForView(state, mode, category) {
        return semantics.filterScenariosByCategory(getScenarioList(state, mode), category);
    }

    function getCharacterDisplayName(state, scenario) {
        const target = ensureState(state);
        return semantics.getCharacterDisplayName(scenario, target.characters || []);
    }

    feature.model = {
        getScenarioList,
        setScenarioList,
        getPromptPresetList,
        setPromptPresetList,
        addScenario,
        findScenarioById,
        updateScenario,
        deleteScenarioById,
        deleteScenariosByIds,
        toggleFavorite,
        getCategories,
        getScenarioListForView,
        getCharacterDisplayName
    };
})(window);
