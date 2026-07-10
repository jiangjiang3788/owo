// --- AI embedding adapter owner (V24 canonical owner) ---
// 只负责向量 embedding endpoint/header/request/fetch，不处理 vector memory 状态、prompt 主编排或聊天 stream。
(function registerEmbeddingAdapter(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;
    const providerConfig = ai.providerConfig;
    const randomValue = OwoApp.shared && OwoApp.shared.utils && OwoApp.shared.utils.getRandomValue
        ? OwoApp.shared.utils.getRandomValue
        : function pickFirst(value) { return String(value || '').split(',')[0].trim(); };

    function normalize(settings) {
        return providerConfig.normalizeProviderSettings(settings);
    }

    function isGemini(settingsOrProvider) {
        const provider = typeof settingsOrProvider === 'string'
            ? settingsOrProvider
            : normalize(settingsOrProvider).provider;
        return provider === 'gemini';
    }

    function selectEmbeddingProviderConfig(sourceDb) {
        const rootDb = sourceDb && typeof sourceDb === 'object' ? sourceDb : {};
        const vector = rootDb.vectorApiSettings || {};
        const summary = rootDb.summaryApiSettings || {};
        const main = rootDb.apiSettings || {};
        let selected = main;
        let source = 'main';
        if (providerConfig.isProviderConfigured(vector)) {
            selected = vector;
            source = 'vector';
        } else if (providerConfig.isProviderConfigured(summary)) {
            selected = summary;
            source = 'summary';
        }
        const normalized = normalize(selected);
        normalized.source = source;
        return normalized;
    }

    function getBatchSize(sourceDb, fallback = 8) {
        const settings = sourceDb && sourceDb.vectorApiSettings ? sourceDb.vectorApiSettings : {};
        const value = parseInt(settings.batchSize, 10);
        return Math.max(1, Number.isFinite(value) ? value : fallback);
    }

    function buildGeminiEmbeddingRequest(settings, text) {
        const cfg = normalize(settings);
        return {
            endpoint: `${cfg.url}/v1beta/models/${cfg.model}:embedContent?key=${randomValue(cfg.key)}`,
            fetchOptions: {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    content: {
                        parts: [{text: text || ''}]
                    }
                })
            }
        };
    }

    function buildOpenAiEmbeddingRequest(settings, texts) {
        const cfg = normalize(settings);
        const body = {
            model: cfg.model,
            input: texts.length === 1 ? texts[0] : texts
        };
        const dimensions = parseInt(cfg.dimensions, 10);
        if (Number.isFinite(dimensions)) body.dimensions = dimensions;
        return {
            endpoint: `${cfg.url}/v1/embeddings`,
            fetchOptions: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${cfg.key}`
                },
                body: JSON.stringify(body)
            }
        };
    }


    function trackedEmbeddingFetch(request, cfg, label) {
        const traceStore = ai.requestTraceStore;
        const requestBody = request.fetchOptions && request.fetchOptions.body
            ? JSON.parse(request.fetchOptions.body)
            : undefined;
        if (traceStore && typeof traceStore.trackedFetch === 'function') {
            return traceStore.trackedFetch(Object.assign({ requestBody }, request), {
                source: 'platform.ai.embeddingAdapter',
                label,
                provider: cfg.provider,
                model: cfg.model,
                stream: false,
                requestBody
            });
        }
        return fetch(request.endpoint, request.fetchOptions);
    }

    async function parseEmbeddingResponse(response, provider) {
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Embedding API Error: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        if (isGemini(provider)) return data.embedding && Array.isArray(data.embedding.values) ? data.embedding.values : [];
        const list = Array.isArray(data.data) ? data.data : [];
        return list.map(item => item.embedding || []);
    }

    async function fetchEmbeddingBatch(settings, texts) {
        const cfg = normalize(settings);
        const list = (Array.isArray(texts) ? texts : [texts]).map(item => String(item || '')).filter(Boolean);
        if (list.length === 0) return [];
        if (isGemini(cfg)) {
            const outputs = [];
            for (const text of list) {
                const request = buildGeminiEmbeddingRequest(cfg, text);
                const response = await trackedEmbeddingFetch(request, cfg, 'Gemini 向量请求');
                outputs.push(await parseEmbeddingResponse(response, cfg.provider));
            }
            return outputs;
        }
        const request = buildOpenAiEmbeddingRequest(cfg, list);
        const response = await trackedEmbeddingFetch(request, cfg, 'OpenAI 向量请求');
        return parseEmbeddingResponse(response, cfg.provider);
    }

    async function fetchEmbeddings(texts, options = {}) {
        const list = (Array.isArray(texts) ? texts : [texts])
            .map(item => String(item || '').trim())
            .filter(Boolean);
        if (list.length === 0) return [];
        const cfg = options.providerConfig || selectEmbeddingProviderConfig(options.state);
        if (!providerConfig.isProviderConfigured(cfg)) {
            throw new Error('请先配置向量 API');
        }
        const batchSize = Math.max(1, parseInt(options.batchSize, 10) || getBatchSize(options.state));
        const outputs = [];
        for (let index = 0; index < list.length; index += batchSize) {
            const batch = list.slice(index, index + batchSize);
            const vectors = await fetchEmbeddingBatch(cfg, batch);
            outputs.push(...vectors);
        }
        return outputs;
    }

    function cosineSimilarity(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let index = 0; index < a.length; index++) {
            const av = Number(a[index]) || 0;
            const bv = Number(b[index]) || 0;
            dot += av * bv;
            normA += av * av;
            normB += bv * bv;
        }
        if (!normA || !normB) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    ai.embeddingAdapter = {
        selectEmbeddingProviderConfig,
        getBatchSize,
        buildGeminiEmbeddingRequest,
        buildOpenAiEmbeddingRequest,
        fetchEmbeddingBatch,
        fetchEmbeddings,
        cosineSimilarity
    };
})(window);
