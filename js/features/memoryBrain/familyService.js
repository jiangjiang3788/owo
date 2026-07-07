// --- Memory Brain family service owner (v0.3.5) ---
// 编排“facts → embedding/关键词相似度 → memoryBrain.families”，不渲染 DOM、不做 graph、不改正式注入路径。
(function registerMemoryBrainFamilyService(global) {
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
    function isLifecycleExcluded(fact) {
        const status = String(fact && (fact.lifecycleStatus || fact.status) || 'active');
        return ['duplicate', 'obsolete', 'disputed', 'merged', 'retired'].includes(status);
    }
    function normalizeEligibleIdSet(ids) {
        if (!ids) return null;
        if (ids instanceof Set) return ids;
        return Array.isArray(ids) && ids.length ? new Set(ids.map(id => String(id))) : null;
    }
    function isEligibleFactForFamily(fact, options = {}) {
        if (!fact || fact.status === 'retired' || !fact.content) return false;
        if (options.excludeLifecycle === true && isLifecycleExcluded(fact)) return false;
        const eligibleSet = normalizeEligibleIdSet(options.eligibleFactIds);
        if (eligibleSet && !eligibleSet.has(String(fact.id || ''))) return false;
        return true;
    }
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
        return adapter.buildPromptCompletionRequest(config, { prompt, temperature: options.temperature === undefined ? 0.18 : options.temperature, stream: false });
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
    async function requestFamilyText(config, prompt, options) {
        const request = buildRequest(config, prompt, options);
        const traceStore = app.platform.ai && app.platform.ai.requestTraceStore;
        const response = traceStore && typeof traceStore.trackedFetch === 'function'
            ? await traceStore.trackedFetch(request, {
                source: 'features/memoryBrain/familyService',
                label: '记忆脑家族命名 AI 请求',
                provider: config.provider,
                model: config.model,
                stream: false,
                requestBody: request.requestBody
            })
            : await global.fetch(request.endpoint, request.fetchOptions);
        const text = await response.text();
        if (!response.ok) throw new Error(`家族命名 API 失败：${response.status} ${text.slice(0, 400)}`);
        try { return extractModelText(JSON.parse(text), config.provider); }
        catch (error) { throw new Error(`家族命名响应不是 JSON：${text.slice(0, 300)}`); }
    }
    function inputPreview(facts, families, drafts, prompt, embeddingResult) {
        return {
            factCount: facts.length,
            familyCount: families.length,
            draftCount: drafts.length,
            embeddingResult,
            prompt: clip(prompt, 9000),
            sampleDrafts: drafts.slice(0, 6).map(draft => ({ draftKey: draft.draftKey, action: draft.action, title: draft.title, factIds: draft.factIds, keywords: draft.keywords }))
        };
    }
    async function organizeFamilies(options = {}) {
        const state = rootState(options);
        const platformApi = getPlatformApi();
        const coreApi = getCoreApi();
        let embeddingResult = { ok: false, embedded: 0, skipped: 0, reason: 'not_started' };
        try { embeddingResult = await platformApi.ensureFactEmbeddings({ state, limit: Number(options.embeddingLimit) || 24 }); }
        catch (error) { embeddingResult = { ok: false, embedded: 0, skipped: 0, reason: error.message || 'embedding_failed' }; }
        record('记忆脑家族向量准备结果', embeddingResult, embeddingResult.ok ? 'success' : 'event');

        const snapshot = platformApi.getSnapshot({ state });
        const activeFacts = asArray(snapshot.facts).filter(fact => isEligibleFactForFamily(fact, options));
        const activeFamilies = asArray(snapshot.families).filter(family => family && family.status !== 'retired');
        if (!activeFacts.length) throw new Error('还没有原子事实。请先从事件提取事实，再整理记忆家族。');
        let drafts = coreApi.buildFamilyDrafts(activeFacts, activeFamilies, {
            threshold: snapshot.settings && snapshot.settings.familySimilarityThreshold || 0.7,
            minNewFacts: Number(options.minNewFacts) || 2,
            allowSingleSeed: Boolean(options.allowSingleSeed),
            rebuild: Boolean(options.rebuild)
        });
        if (!drafts.length && options.allowSingleSeed !== false) {
            drafts = coreApi.buildFamilyDrafts(activeFacts, activeFamilies, { allowSingleSeed: true, rebuild: Boolean(options.rebuild) });
        }
        const prompt = coreApi.buildFamilyNamingPrompt(drafts, activeFacts, { maxFamilies: Number(options.maxFamilies) || 8 });
        const input = inputPreview(activeFacts, activeFamilies, drafts, prompt, embeddingResult);
        record('记忆脑家族整理输入', input);
        if (!drafts.length) {
            const stored = platformApi.appendFamilyClusteringBatch({ input, parserDiagnostics: ['no_family_drafts'], errorMessage: '没有新的家族候选' }, { state });
            record('记忆脑家族整理应用结果', { batchId: stored.batch && stored.batch.id, familyCount: 0, diagnostics: ['no_family_drafts'] }, 'event');
            return Object.assign({ diagnostics: ['no_family_drafts'] }, stored);
        }
        let rawOutput = '';
        let diagnostics = [];
        let namedDrafts = drafts;
        try {
            const config = getProviderConfigOptional(state);
            if (config) {
                rawOutput = await requestFamilyText(config, prompt, options);
                record('记忆脑家族命名模型输出', { rawOutput }, 'success');
                const parsed = coreApi.parseFamilyNamingResponse(rawOutput);
                diagnostics = diagnostics.concat(parsed.diagnostics || []);
                record('记忆脑家族命名解析结果', { ok: parsed.ok, diagnostics: parsed.diagnostics, families: parsed.families }, parsed.ok ? 'success' : 'error');
                if (parsed.ok) namedDrafts = coreApi.applyFamilyNames(drafts, parsed.families);
                else diagnostics.push('family_naming_fallback_to_local_drafts');
            } else {
                diagnostics.push('family_naming_skipped_no_configured_summary_or_main_api');
            }
            const stored = platformApi.appendFamilyClusteringBatch({ input, rawOutput, parsedDrafts: namedDrafts, parserDiagnostics: diagnostics, families: namedDrafts }, { state });
            platformApi.refreshFamilyVectors(stored.families.map(family => family.id), { state });
            record('记忆脑家族整理应用结果', {
                batchId: stored.batch && stored.batch.id,
                familyCount: stored.families && stored.families.length || 0,
                changedFacts: stored.changedFacts || 0,
                diagnostics
            }, stored.families && stored.families.length ? 'success' : 'event');
            return Object.assign({ diagnostics }, stored);
        } catch (error) {
            record('记忆脑家族整理错误', { message: error.message, draftCount: drafts.length }, 'error');
            const stored = platformApi.appendFamilyClusteringBatch({ input, rawOutput, parsedDrafts: drafts, parserDiagnostics: diagnostics.concat(['family_naming_error_fallback_applied']), families: drafts }, { state });
            return Object.assign({ diagnostics: diagnostics.concat([error.message]), fallbackApplied: true }, stored);
        }
    }
    function getFamilyCards(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const facts = asArray(snapshot.facts).filter(fact => isEligibleFactForFamily(fact, { excludeLifecycle: true }));
        return asArray(snapshot.families).filter(family => family && family.status !== 'retired')
            .slice().sort((a, b) => asArray(b.factIds).length - asArray(a.factIds).length || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
            .slice(0, Number(options.limit) || 24)
            .map(family => getCoreApi().compactFamilyForList(family, facts));
    }
    function retireFamily(familyId, options = {}) {
        const family = getPlatformApi().retireFamily(familyId, 'user-retired-from-memory-brain', options);
        record('记忆脑家族撤回', { familyId, ok: Boolean(family) }, family ? 'success' : 'error');
        return family;
    }
    function rollbackLatestFamilyBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'family-clustering' && item.status === 'applied' && asArray(item.familyIds).length);
        if (!batch) throw new Error('没有可撤回的家族整理批次。');
        const result = getPlatformApi().rollbackFamilyBatch(batch.id, options);
        record('记忆脑家族批次回滚', result, result.ok ? 'success' : 'error');
        return result;
    }

    feature.familyService = { organizeFamilies, getFamilyCards, retireFamily, rollbackLatestFamilyBatch };
})(window);
