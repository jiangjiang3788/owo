// --- Generic runtime cutover semantics (v0.9.3 canonical owner) ---
// legacy / shadow / unified 的统一纯语义；不构建 Prompt、不发请求、不写状态。
(function registerRuntimeCutoverSemantics(app) {
    app.core = app.core || {};
    app.core.ai = app.core.ai || {};

    const MODES = Object.freeze({ LEGACY: 'legacy', SHADOW: 'shadow', UNIFIED: 'unified' });
    const MODE_SET = new Set(Object.values(MODES));

    function normalizeMode(value, fallback) {
        const normalized = String(value || '').trim().toLowerCase();
        if (MODE_SET.has(normalized)) return normalized;
        const safeFallback = String(fallback || '').trim().toLowerCase();
        return MODE_SET.has(safeFallback) ? safeFallback : MODES.SHADOW;
    }

    function isRuntimeMode(value) {
        return MODE_SET.has(String(value || '').trim().toLowerCase());
    }

    function resolveMode(options) {
        const source = options && typeof options === 'object' ? options : {};
        const request = source.request && typeof source.request === 'object' ? source.request : {};
        const state = source.state && typeof source.state === 'object' ? source.state : {};
        const subject = source.subject && typeof source.subject === 'object' ? source.subject : null;
        const defaultMode = normalizeMode(source.defaultMode, MODES.SHADOW);

        if (typeof source.isSupported === 'function' && !source.isSupported(request)) return MODES.LEGACY;
        if (request.mode !== undefined) return normalizeMode(request.mode, defaultMode);
        if (subject && source.subjectModeKey && subject[source.subjectModeKey] !== undefined) {
            return normalizeMode(subject[source.subjectModeKey], defaultMode);
        }
        if (source.stateModeKey && state[source.stateModeKey] !== undefined) {
            return normalizeMode(state[source.stateModeKey], defaultMode);
        }
        return defaultMode;
    }

    function describeMode(value, owners) {
        const mode = normalizeMode(value);
        const config = owners && typeof owners === 'object' ? owners : {};
        if (mode === MODES.LEGACY) {
            return { mode, responseOwner: config.legacyResponseOwner || 'legacy-executor', promptOwner: config.promptOwner || 'single-builder', performsShadowPreflight: false };
        }
        if (mode === MODES.UNIFIED) {
            return { mode, responseOwner: config.unifiedResponseOwner || 'unified-runtime', promptOwner: config.promptOwner || 'single-builder', performsShadowPreflight: false };
        }
        return { mode: MODES.SHADOW, responseOwner: config.legacyResponseOwner || 'legacy-executor', promptOwner: config.promptOwner || 'single-builder', performsShadowPreflight: true };
    }

    app.core.ai.cutoverSemantics = { MODES, normalizeMode, isRuntimeMode, resolveMode, describeMode };
})(OwoApp);
