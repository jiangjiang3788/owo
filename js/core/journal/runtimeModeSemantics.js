// --- Journal runtime cutover mode semantics (v0.9.3 canonical owner) ---
(function registerJournalRuntimeModeSemantics(app) {
    app.core = app.core || {};
    app.core.journal = app.core.journal || {};
    const shared = app.core.ai.cutoverSemantics;

    function resolveMode(state, request) {
        return shared.resolveMode({ state, request, stateModeKey: 'journalRuntimeMode', defaultMode: shared.MODES.SHADOW });
    }

    function describeMode(value) {
        return shared.describeMode(value, {
            legacyResponseOwner: 'journal-legacy-adapter',
            unifiedResponseOwner: 'journal-runtime',
            promptOwner: 'journal.single-builder'
        });
    }

    app.core.journal.runtimeModeSemantics = {
        MODES: shared.MODES,
        normalizeMode: shared.normalizeMode,
        isRuntimeMode: shared.isRuntimeMode,
        resolveMode,
        describeMode
    };
})(OwoApp);
