// --- AI router compatibility facade (v0.9.0) ---
// 新调用应使用 OwoApp.features.aiRuntime.publicApi.invokeTask；本文件保留旧 chat() 兼容入口。
(function registerAiRouter(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;

    function getDb() {
        return global.db || (OwoApp.app.state.runtimeGlobals && OwoApp.app.state.runtimeGlobals.getDb && OwoApp.app.state.runtimeGlobals.getDb()) || {};
    }

    function getRuntime() {
        return OwoApp.features && OwoApp.features.aiRuntime && OwoApp.features.aiRuntime.publicApi;
    }

    async function chat(options = {}) {
        const runtime = getRuntime();
        if (runtime && typeof runtime.invokeTask === 'function') {
            const result = await runtime.invokeTask({
                taskType: options.task || 'conversation.reply',
                state: options.state || getDb(),
                source: options.source || 'aiRouter.chat',
                label: options.label || 'AI Router Chat',
                input: {
                    messages: options.messages || [],
                    normalizedMessages: options.normalizedMessages,
                    temperature: options.temperature,
                    webSearch: options.webSearch
                },
                options: {
                    stream: !!options.stream,
                    signal: options.signal,
                    returnRawResponse: !!options.returnRawResponse
                }
            });
            return result;
        }

        // 启动早期或兼容环境下的最小回退；正式运行时应始终走 AI Task Runtime。
        const sourceDb = options.state || getDb();
        const resolved = ai.modelRegistry.resolve(sourceDb, options.task || 'conversation.reply');
        const request = ai.providerRequestAdapter.buildMessageCompletionRequest(resolved.settings, {
            messages: options.messages || [],
            normalizedMessages: options.normalizedMessages,
            stream: !!options.stream,
            temperature: options.temperature,
            webSearch: options.webSearch,
            signal: options.signal
        });
        const response = ai.requestTraceStore && typeof ai.requestTraceStore.trackedFetch === 'function'
            ? await ai.requestTraceStore.trackedFetch(request, {
                source: options.source || 'aiRouter.compat',
                label: options.label || `AI Router · ${resolved.taskType}`,
                provider: resolved.settings.provider,
                model: resolved.settings.model,
                stream: !!options.stream,
                requestBody: request.requestBody,
                taskType: resolved.taskType
            })
            : await global.fetch(request.endpoint, request.fetchOptions);
        if (!response.ok) throw new Error(`AI Router HTTP Error: ${response.status}`);
        if (options.stream || options.returnRawResponse) return { taskType: resolved.taskType, response, rawResponse: true };
        const json = await response.json();
        const normalized = ai.responseNormalizer.normalizeChatCompletion(json, {
            provider: resolved.settings.provider,
            model: resolved.settings.model
        });
        return { ...normalized, task: resolved.taskType, taskType: resolved.taskType, route: resolved.route, provider: resolved.provider, raw: json };
    }

    async function invokeTask(request) {
        const runtime = getRuntime();
        if (!runtime || typeof runtime.invokeTask !== 'function') throw new Error('AI Task Runtime 尚未加载');
        return runtime.invokeTask(request);
    }

    function getRoutingReport(sourceDb) {
        const runtime = getRuntime();
        return runtime && typeof runtime.getRoutingReport === 'function'
            ? runtime.getRoutingReport(sourceDb || getDb())
            : ai.aiConfigStore.buildAiConfigSnapshot(sourceDb || getDb());
    }

    ai.aiRouter = { chat, invokeTask, getRoutingReport };
})(window);
