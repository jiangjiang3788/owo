// --- Private chat runtime cutover mode semantics (v0.9.3 thin adapter) ---
// 通用 legacy/shadow/unified 语义由 core.ai.cutoverSemantics 持有。
(function registerChatRuntimeModeSemantics(app) {
    const core = app.core;
    core.chat = core.chat || {};
    const shared = core.ai.cutoverSemantics;

    function resolveMode(state, request) {
        const source = request && typeof request === 'object' ? request : {};
        const character = source.character && typeof source.character === 'object' ? source.character : null;
        return shared.resolveMode({
            state,
            request: source,
            subject: character,
            stateModeKey: 'chatRuntimeMode',
            subjectModeKey: 'chatRuntimeMode',
            defaultMode: shared.MODES.SHADOW,
            isSupported: item => !item.chatType || item.chatType === 'private'
        });
    }

    function describeMode(value) {
        const mode = shared.normalizeMode(value);
        return shared.describeMode(mode, {
            legacyResponseOwner: 'legacy-executor',
            unifiedResponseOwner: 'chat-runtime',
            promptOwner: mode === shared.MODES.UNIFIED ? 'legacy-chat-builder-adapter' : 'legacy-chat-builder'
        });
    }

    core.chat.runtimeModeSemantics = {
        MODES: shared.MODES,
        normalizeMode: shared.normalizeMode,
        resolveMode,
        isRuntimeMode: shared.isRuntimeMode,
        describeMode
    };
})(OwoApp);
