// --- Settings preset engine model (V20) ---
// 只放预设数组的纯 model/semantics：名称归一化、按名称 upsert、重命名、删除、导入合并。
(function registerSettingsPresetEngineModel(global) {
    const OwoApp = global.OwoApp;
    const settings = OwoApp.features.settings;
    const presetEngine = settings.presetEngine;

    function ensureArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeName(name) {
        return String(name || '').trim();
    }

    function cloneJson(value, fallback) {
        if (typeof value === 'undefined' || value === null) {
            return typeof fallback === 'undefined' ? null : fallback;
        }
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (error) {
            return typeof fallback === 'undefined' ? value : fallback;
        }
    }

    function normalizePreset(preset, options) {
        const opts = options || {};
        const name = normalizeName(preset && preset.name);
        if (!name) return null;
        const next = Object.assign({}, preset, { name });
        if (typeof opts.mapPreset === 'function') return opts.mapPreset(next) || null;
        return next;
    }

    function normalizeCollection(presets, options) {
        const seen = new Map();
        ensureArray(presets).forEach(item => {
            const normalized = normalizePreset(item, options);
            if (!normalized) return;
            seen.set(normalized.name, normalized);
        });
        return Array.from(seen.values());
    }

    function findIndexByName(presets, name) {
        const target = normalizeName(name);
        if (!target) return -1;
        return ensureArray(presets).findIndex(item => normalizeName(item && item.name) === target);
    }

    function upsertByName(presets, preset, options) {
        const nextPreset = normalizePreset(preset, options);
        const list = normalizeCollection(presets, options);
        if (!nextPreset) return list;
        const idx = findIndexByName(list, nextPreset.name);
        if (idx >= 0) list[idx] = nextPreset;
        else list.push(nextPreset);
        return list;
    }

    function renameAt(presets, index, newName, options) {
        const list = normalizeCollection(presets, options);
        const finalName = normalizeName(newName);
        if (!finalName || index < 0 || index >= list.length) return list;
        list[index] = normalizePreset(Object.assign({}, list[index], { name: finalName }), options);
        return normalizeCollection(list, options);
    }

    function removeAt(presets, index, options) {
        const list = normalizeCollection(presets, options);
        if (index < 0 || index >= list.length) return list;
        list.splice(index, 1);
        return list;
    }

    function mergeByName(current, imported, options) {
        if (!Array.isArray(imported)) {
            throw new Error('文件格式错误');
        }
        let list = normalizeCollection(current, options);
        imported.forEach(item => {
            list = upsertByName(list, item, options);
        });
        return list;
    }

    function createPreset(name, data, options) {
        const opts = options || {};
        const raw = opts.wrapData === false
            ? Object.assign({}, data || {}, { name: normalizeName(name) })
            : { name: normalizeName(name), data: data || {} };
        return normalizePreset(raw, options);
    }

    presetEngine.model = {
        ensureArray,
        normalizeName,
        cloneJson,
        normalizePreset,
        normalizeCollection,
        findIndexByName,
        upsertByName,
        renameAt,
        removeAt,
        mergeByName,
        createPreset
    };
})(window);
