// --- Memory Brain fact extraction service owner (v0.3.5) ---
// 编排“事件摘要 → AI 原子事实 → memoryBrain.facts”，不渲染 DOM，不改正式注入路径。
(function registerMemoryBrainFactExtractionService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function rootState(options) { return (options && options.state) || global.db || {}; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clip(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }
    function getCoreApi() { return app.core.memoryBrain.publicApi; }
    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function record(label, data, level) {
        if (feature.service && typeof feature.service.recordOperation === 'function') {
            return feature.service.recordOperation(label, data || {}, level || 'event');
        }
        return null;
    }
    function getProviderConfig(state) {
        const providerConfig = app.platform.ai && app.platform.ai.providerConfig;
        if (!providerConfig || typeof providerConfig.selectChatProviderConfig !== 'function') throw new Error('AI providerConfig 尚未加载');
        const config = providerConfig.selectChatProviderConfig(state, { isSummary: true });
        if (!providerConfig.isProviderConfigured(config)) throw new Error('请先配置总结 API 或主 API，再提取原子事实。');
        config.streamEnabled = false;
        return config;
    }
    function buildRequest(config, prompt, options = {}) {
        const adapter = app.platform.ai && app.platform.ai.providerRequestAdapter;
        if (!adapter || typeof adapter.buildPromptCompletionRequest !== 'function') throw new Error('AI providerRequestAdapter 尚未加载');
        return adapter.buildPromptCompletionRequest(config, { prompt, temperature: options.temperature === undefined ? 0.15 : options.temperature, stream: false });
    }
    function extractModelText(data, provider) {
        if (!data) return '';
        if (typeof data === 'string') return data;
        if (data.output_text) return data.output_text;
        if (provider === 'gemini') {
            const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
            return asArray(parts).map(part => part && part.text || '').join('');
        }
        return data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
    }
    async function requestFactText(config, prompt, options) {
        const request = buildRequest(config, prompt, options);
        const traceStore = app.platform.ai && app.platform.ai.requestTraceStore;
        const response = traceStore && typeof traceStore.trackedFetch === 'function'
            ? await traceStore.trackedFetch(request, {
                source: 'features/memoryBrain/factExtractionService',
                label: '记忆脑事实提取 AI 请求',
                provider: config.provider,
                model: config.model,
                stream: false,
                requestBody: request.requestBody
            })
            : await global.fetch(request.endpoint, request.fetchOptions);
        const text = await response.text();
        if (!response.ok) throw new Error(`事实提取 API 失败：${response.status} ${text.slice(0, 400)}`);
        try { return extractModelText(JSON.parse(text), config.provider); }
        catch (error) { throw new Error(`事实提取响应不是 JSON：${text.slice(0, 300)}`); }
    }
    function hasActiveFactForEvent(facts, eventId) {
        return asArray(facts).some(fact => fact && fact.status !== 'retired' && fact.source && fact.source.eventId === eventId);
    }
    function resolveEvent(options = {}) {
        const platformApi = getPlatformApi();
        const events = platformApi.listEvents(options);
        if (!events.length) throw new Error('还没有事件。请先整理最近聊天生成时间线事件。');
        if (options.eventId) {
            const found = events.find(event => event && event.id === options.eventId);
            if (!found) throw new Error('找不到要提取事实的事件。');
            return found;
        }
        const facts = platformApi.listFacts(options);
        return events.find(event => event && !hasActiveFactForEvent(facts, event.id)) || events[0];
    }
    function inputPreview(event, prompt, maxFacts) {
        return {
            eventId: event && event.id,
            eventTitle: event && event.title,
            eventSummary: clip(event && event.summary, 500),
            maxFacts,
            source: event && event.source || {},
            prompt
        };
    }

    async function extractFactsFromEvent(options = {}) {
        const state = rootState(options);
        const event = resolveEvent(options);
        const maxFacts = Number(options.maxFacts) || 8;
        const prompt = getCoreApi().buildFactExtractionPrompt(event, { maxFacts });
        const input = inputPreview(event, prompt, maxFacts);
        record('记忆脑事实提取输入', input);
        try {
            const config = getProviderConfig(state);
            const rawOutput = await requestFactText(config, prompt, options);
            record('记忆脑事实提取模型输出', { eventId: event.id, eventTitle: event.title, rawOutput }, 'success');
            const parsed = getCoreApi().parseFactExtractionResponse(rawOutput);
            record('记忆脑事实提取解析结果', { ok: parsed.ok, diagnostics: parsed.diagnostics, drafts: parsed.drafts }, parsed.ok ? 'success' : 'error');
            if (!parsed.ok) {
                getPlatformApi().appendFactExtractionBatch({ event, input, rawOutput, parserDiagnostics: parsed.diagnostics, errorMessage: '事实提取 JSON 解析失败' }, options);
                throw new Error('事实提取 JSON 解析失败：' + parsed.diagnostics.join('；'));
            }
            const sourcedFacts = getCoreApi().ensureFactsSource(parsed.drafts, event);
            const stored = getPlatformApi().appendFactExtractionBatch({
                event,
                input,
                rawOutput,
                parsedDrafts: parsed.drafts,
                parserDiagnostics: parsed.diagnostics,
                facts: sourcedFacts
            }, options);
            record('记忆脑事实提取应用结果', {
                eventId: event.id,
                batchId: stored.batch && stored.batch.id,
                factCount: stored.facts && stored.facts.length || 0,
                diagnostics: stored.batch && stored.batch.parserDiagnostics || []
            }, stored.facts && stored.facts.length ? 'success' : 'event');
            return Object.assign({ event, diagnostics: parsed.diagnostics }, stored);
        } catch (error) {
            record('记忆脑事实提取错误', { eventId: event.id, eventTitle: event.title, message: error.message }, 'error');
            if (!/JSON 解析失败/.test(error.message || '')) {
                getPlatformApi().appendFactExtractionBatch({ event, input, errorMessage: error.message }, options);
            }
            throw error;
        }
    }
    function extractFactsFromLatestEvent(options = {}) { return extractFactsFromEvent(options); }
    function getFactCards(options = {}) {
        const includeRetired = Boolean(options.includeRetired);
        return getPlatformApi().listFacts(options)
            .filter(fact => includeRetired || fact.status !== 'retired')
            .slice(0, Number(options.limit) || 36)
            .map(getCoreApi().compactFactForList);
    }
    function retireFact(factId, options = {}) {
        const fact = getPlatformApi().retireFact(factId, 'user-retired-from-memory-brain', options);
        record('记忆脑事实候选撤回', { factId, ok: Boolean(fact) }, fact ? 'success' : 'error');
        return fact;
    }
    function rollbackLatestFactBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'fact-extraction' && item.status === 'applied' && asArray(item.factIds).length);
        if (!batch) throw new Error('没有可撤回的事实提取批次。');
        const result = getPlatformApi().rollbackBatch(batch.id, options);
        record('记忆脑事实批次回滚', result, result.ok ? 'success' : 'error');
        return result;
    }

    feature.factExtractionService = {
        extractFactsFromEvent,
        extractFactsFromLatestEvent,
        getFactCards,
        retireFact,
        rollbackLatestFactBatch,
        resolveEvent
    };
})(window);
