// --- Private conversation runtime cutover service (v0.9.2 canonical owner) ---
// legacy/shadow/unified 共用同一个已构建请求；本服务不构建第二份 Prompt。
(function registerChatRuntimeService(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.chatRuntime;
    const modeSemantics = OwoApp.core.chat.runtimeModeSemantics;
    const preparedSemantics = OwoApp.core.chat.preparedRequestSemantics;
    const aiRuntime = OwoApp.features.aiRuntime.publicApi;
    const traceStore = OwoApp.platform.ai.requestTraceStore;

    function getState(request) {
        return request && request.state
            ? request.state
            : global.db || {};
    }

    function recordCutoverDiagnostic(prepared, mode, extra) {
        if (!traceStore || typeof traceStore.recordDiagnostic !== 'function') return;
        traceStore.recordDiagnostic({
            source: 'chatRuntime.cutover',
            label: `私聊 Runtime · ${mode}`,
            category: 'diagnostic',
            status: 'diagnostic',
            provider: prepared.provider,
            model: prepared.model,
            diagnostic: Object.assign({
                mode,
                responseOwner: modeSemantics.describeMode(mode).responseOwner,
                promptOwner: modeSemantics.describeMode(mode).promptOwner,
                request: preparedSemantics.buildTraceSummary(prepared)
            }, extra || {})
        });
    }

    async function executePreparedRequest(request) {
        const prepared = preparedSemantics.normalizePreparedRequest(request);
        const state = getState(prepared);
        const mode = modeSemantics.resolveMode(state, prepared);

        if (mode === modeSemantics.MODES.SHADOW) {
            const preflight = await aiRuntime.preflightPreparedTask(Object.assign({}, prepared, { dryRun: true }));
            recordCutoverDiagnostic(prepared, mode, {
                preflightOk: Boolean(preflight && preflight.ok),
                taskDefinitionId: preflight && preflight.taskType,
                networkCalls: 1
            });
            return aiRuntime.executeProviderRequest(prepared);
        }

        if (mode === modeSemantics.MODES.UNIFIED) {
            recordCutoverDiagnostic(prepared, mode, {
                preflightOk: true,
                networkCalls: 1
            });
            return aiRuntime.executePreparedTask(prepared);
        }

        recordCutoverDiagnostic(prepared, mode, {
            preflightOk: null,
            networkCalls: 1
        });
        return aiRuntime.executeProviderRequest(prepared);
    }

    function getMode(state, options) {
        return modeSemantics.resolveMode(state || global.db || {}, options || { chatType: 'private' });
    }

    async function setMode(mode, state, options) {
        const database = state || global.db;
        if (!database || typeof database !== 'object') throw new Error('无法设置 chatRuntimeMode：状态未加载');
        if (!modeSemantics.isRuntimeMode(mode)) throw new Error(`未知 chatRuntimeMode：${mode}`);
        database.chatRuntimeMode = modeSemantics.normalizeMode(mode);
        if (!options || options.persist !== false) {
            const repository = OwoApp.platform.storage && OwoApp.platform.storage.repository;
            if (repository && typeof repository.saveGlobalSettings === 'function') {
                await repository.saveGlobalSettings();
            }
        }
        return database.chatRuntimeMode;
    }

    function getStatus(state) {
        const mode = getMode(state, { chatType: 'private' });
        return modeSemantics.describeMode(mode);
    }

    feature.service = {
        executePreparedRequest,
        getMode,
        setMode,
        getStatus
    };
})(window);
