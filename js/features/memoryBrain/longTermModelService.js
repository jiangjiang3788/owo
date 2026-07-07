// --- Memory Brain long-term model service owner (v0.3.5) ---
// 编排 facts / families / graph → 用户画像、AI 自我、世界观、项目脑；不接正式 prompt 注入。
(function registerMemoryBrainLongTermModelService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function rootState(options) { return (options && options.state) || global.db || {}; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clip(value, max) { const text = asText(value); return text.length > max ? text.slice(0, max - 1) + '…' : text; }
    function getCoreApi() { return app.core.memoryBrain.publicApi; }
    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function record(label, data, level) {
        if (feature.service && typeof feature.service.recordOperation === 'function') return feature.service.recordOperation(label, data || {}, level || 'event');
        return null;
    }
    function getProviderConfigOptional(state) {
        const providerConfig = app.platform.ai && app.platform.ai.providerConfig;
        if (!providerConfig || typeof providerConfig.selectChatProviderConfig !== 'function') return null;
        const config = providerConfig.selectChatProviderConfig(state, { isSummary: true });
        if (!providerConfig.isProviderConfigured(config)) return null;
        config.streamEnabled = false;
        return config;
    }
    function buildRequest(config, prompt, options = {}) {
        const adapter = app.platform.ai && app.platform.ai.providerRequestAdapter;
        if (!adapter || typeof adapter.buildPromptCompletionRequest !== 'function') throw new Error('AI providerRequestAdapter 尚未加载');
        return adapter.buildPromptCompletionRequest(config, { prompt, temperature: options.temperature === undefined ? 0.2 : options.temperature, stream: false });
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
    async function requestModelText(config, prompt, options) {
        const request = buildRequest(config, prompt, options);
        const traceStore = app.platform.ai && app.platform.ai.requestTraceStore;
        const response = traceStore && typeof traceStore.trackedFetch === 'function'
            ? await traceStore.trackedFetch(request, {
                source: 'features/memoryBrain/longTermModelService',
                label: '记忆脑长期模型 AI 请求',
                provider: config.provider,
                model: config.model,
                stream: false,
                requestBody: request.requestBody
            })
            : await global.fetch(request.endpoint, request.fetchOptions);
        const text = await response.text();
        if (!response.ok) throw new Error(`长期模型 API 失败：${response.status} ${text.slice(0, 400)}`);
        try { return extractModelText(JSON.parse(text), config.provider); }
        catch (error) { throw new Error(`长期模型响应不是 JSON：${text.slice(0, 300)}`); }
    }
    function buildInput(snapshot, prompt, options) {
        return {
            factCount: asArray(snapshot.facts).filter(fact => fact && fact.status !== 'retired').length,
            familyCount: asArray(snapshot.families).filter(family => family && family.status !== 'retired').length,
            edgeCount: asArray(snapshot.edges).filter(edge => edge && edge.status !== 'retired').length,
            currentModelCount: asArray(snapshot.models).filter(model => model && model.status === 'active').length,
            requestedTypes: ['user-profile', 'ai-self', 'world-model', 'project-brain'],
            rebuild: Boolean(options.rebuild),
            prompt: clip(prompt, 12000)
        };
    }
    function assertReady(snapshot) {
        const facts = asArray(snapshot.facts).filter(fact => fact && fact.status !== 'retired');
        const families = asArray(snapshot.families).filter(family => family && family.status !== 'retired');
        if (!facts.length) throw new Error('还没有原子事实。请先提取事实，再生成长期模型。');
        if (!families.length) throw new Error('还没有记忆家族。请先整理家族，再生成长期模型。');
    }
    async function buildLongTermModels(options = {}) {
        const state = rootState(options);
        const platformApi = getPlatformApi();
        const coreApi = getCoreApi();
        const snapshot = platformApi.getSnapshot({ state });
        assertReady(snapshot);
        const prompt = coreApi.buildLongTermModelPrompt(snapshot, { maxFacts: Number(options.maxFacts) || 48, maxFamilies: Number(options.maxFamilies) || 18, maxEdges: Number(options.maxEdges) || 64 });
        const input = buildInput(snapshot, prompt, options);
        record('记忆脑长期模型整理输入', input);
        let rawOutput = '';
        let diagnostics = [];
        let drafts = [];
        try {
            const config = getProviderConfigOptional(state);
            if (config) {
                rawOutput = await requestModelText(config, prompt, options);
                record('记忆脑长期模型输出', { rawOutput }, 'success');
                const parsed = coreApi.parseLongTermModelResponse(rawOutput);
                diagnostics = diagnostics.concat(parsed.diagnostics || []);
                record('记忆脑长期模型解析结果', { ok: parsed.ok, diagnostics: parsed.diagnostics, models: parsed.models }, parsed.ok ? 'success' : 'error');
                drafts = parsed.ok ? parsed.models : [];
            } else diagnostics.push('long_term_model_fallback_no_configured_summary_or_main_api');
            if (!drafts.length) drafts = coreApi.buildFallbackLongTermModels(snapshot);
            const stored = platformApi.appendLongTermModelBatch({ input, rawOutput, parsedDrafts: drafts, parserDiagnostics: diagnostics, models: drafts }, { state });
            record('记忆脑长期模型应用结果', { batchId: stored.batch && stored.batch.id, modelCount: stored.models && stored.models.length || 0, modelTypes: stored.batch && stored.batch.modelTypes, diagnostics }, stored.models && stored.models.length ? 'success' : 'event');
            return Object.assign({ diagnostics }, stored);
        } catch (error) {
            record('记忆脑长期模型错误', { message: error.message }, 'error');
            drafts = coreApi.buildFallbackLongTermModels(snapshot);
            const stored = platformApi.appendLongTermModelBatch({ input, rawOutput, parsedDrafts: drafts, parserDiagnostics: diagnostics.concat(['long_term_model_error_fallback_applied', error.message]), models: drafts }, { state });
            return Object.assign({ diagnostics: diagnostics.concat([error.message]), fallbackApplied: true }, stored);
        }
    }
    function getModelCards(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        return asArray(snapshot.models).filter(model => options.includeHistory || model.status === 'active')
            .sort((a, b) => (a.type || '').localeCompare(b.type || '') || (Number(b.version) || 0) - (Number(a.version) || 0))
            .slice(0, Number(options.limit) || 16).map(getCoreApi().compactModelForList);
    }
    function retireModel(modelId, options = {}) {
        const model = getPlatformApi().retireModel(modelId, 'user-retired-from-memory-brain-model', options);
        record('记忆脑长期模型撤回', { modelId, ok: Boolean(model) }, model ? 'success' : 'error');
        return model;
    }
    function rollbackLatestModelBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'long-term-model' && item.status === 'applied' && asArray(item.modelIds).length);
        if (!batch) throw new Error('没有可撤回的长期模型批次。');
        const result = getPlatformApi().rollbackModelBatch(batch.id, options);
        record('记忆脑长期模型批次回滚', result, result.ok ? 'success' : 'error');
        return result;
    }

    feature.longTermModelService = { buildLongTermModels, getModelCards, retireModel, rollbackLatestModelBatch };
})(window);
