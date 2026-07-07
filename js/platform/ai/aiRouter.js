// --- AI router owner (v0.3.9) ---
// 统一 task → provider → request → normalized response；旧 chat_ai 仍可逐步迁移。
(function registerAiRouter(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;

    function getDb() { return global.db || (OwoApp.app.state.runtimeGlobals && OwoApp.app.state.runtimeGlobals.getDb && OwoApp.app.state.runtimeGlobals.getDb()) || {}; }

    async function chat(options = {}) {
        const sourceDb = options.state || getDb();
        const resolved = ai.modelRegistry.resolve(sourceDb, options.task || 'conversation');
        const request = ai.providerRequestAdapter.buildMessageCompletionRequest(resolved.settings, {
            messages: options.messages || [],
            normalizedMessages: options.normalizedMessages,
            stream: !!options.stream,
            temperature: options.temperature,
            webSearch: options.webSearch,
            signal: options.signal
        });
        const traceStore = ai.requestTraceStore;
        const response = traceStore && typeof traceStore.trackedFetch === 'function'
            ? await traceStore.trackedFetch(request, {
                source: options.source || 'aiRouter.chat',
                label: options.label || ('AI Router · ' + resolved.task),
                provider: resolved.settings.provider,
                model: resolved.settings.model,
                stream: !!options.stream,
                requestBody: request.requestBody
            })
            : await global.fetch(request.endpoint, request.fetchOptions);
        if (!response.ok) throw new Error('AI Router HTTP Error: ' + response.status);
        const json = await response.json();
        const normalized = ai.responseNormalizer.normalizeChatCompletion(json, {
            provider: resolved.settings.provider,
            model: resolved.settings.model
        });
        return Object.assign({ task: resolved.task, route: resolved.route, provider: resolved.provider, raw: json }, normalized);
    }

    function getRoutingReport(sourceDb) {
        return ai.aiConfigStore.buildAiConfigSnapshot(sourceDb || getDb());
    }

    ai.aiRouter = { chat, getRoutingReport };
})(window);
