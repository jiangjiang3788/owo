// --- AI provider request assembly owner (V13 canonical owner) ---
// V14 起复用 core/chat/messageSemantics 做 message role/content/parts 映射。
// 只负责 endpoint/header/request body/fetch option 组装；不发起 fetch，不处理 stream 解析。
(function registerAiProviderRequestAdapter(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;
    const providerConfig = ai.providerConfig;
    const messageSemantics = OwoApp.core.chat.messageSemantics;
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

    function buildEndpoint(settings, options = {}) {
        const cfg = normalize(settings);
        if (isGemini(cfg.provider)) {
            const action = options.geminiAction || (options.stream ? 'streamGenerateContent' : 'generateContent');
            return `${cfg.url}/v1beta/models/${cfg.model}:${action}?key=${randomValue(cfg.key)}`;
        }
        return `${cfg.url}/v1/chat/completions`;
    }

    function buildHeaders(settings) {
        const cfg = normalize(settings);
        if (isGemini(cfg.provider)) return {'Content-Type': 'application/json'};
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.key}`
        };
    }

    function buildJsonPostRequest(settings, requestBody, options = {}) {
        const fetchOptions = {
            method: 'POST',
            headers: buildHeaders(settings),
            body: JSON.stringify(requestBody)
        };
        if (options.signal) fetchOptions.signal = options.signal;
        return {
            endpoint: buildEndpoint(settings, options),
            headers: fetchOptions.headers,
            requestBody,
            fetchOptions
        };
    }

    function parseCustomPayload(value) {
        if (!value || typeof value !== 'string' || !value.trim()) return null;
        try {
            const parsed = JSON.parse(value.trim());
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (e) {
            console.error('解析自定义联网参数 JSON 失败:', e);
            return null;
        }
    }

    function applyWebSearchPayload(requestBody, settings, webSearch = {}) {
        if (!webSearch.enabled) return requestBody;
        const customPayload = webSearch.customPayload && typeof webSearch.customPayload === 'object'
            ? webSearch.customPayload
            : parseCustomPayload(webSearch.customPayloadText);
        if (customPayload) {
            Object.assign(requestBody, customPayload);
            return requestBody;
        }
        requestBody.tools = isGemini(settings) ? [{googleSearch: {}}] : [{type: 'web_search'}];
        return requestBody;
    }

    function buildOpenAiChatRequest(settings, options) {
        const cfg = normalize(settings);
        const requestBody = {
            model: cfg.model,
            messages: options.messages || [],
            stream: Boolean(options.stream),
            temperature: options.temperature
        };
        if (options.temperature === undefined) delete requestBody.temperature;
        applyWebSearchPayload(requestBody, cfg, options.webSearch);
        return buildJsonPostRequest(cfg, requestBody, {stream: Boolean(options.stream), signal: options.signal});
    }

    function buildGeminiContentRequest(settings, options) {
        const cfg = normalize(settings);
        const requestBody = {
            contents: options.contents || []
        };
        if (options.systemInstruction !== undefined) {
            requestBody.system_instruction = {parts: [{text: options.systemInstruction}]};
        }
        if (options.temperature !== undefined) {
            requestBody.generationConfig = {temperature: options.temperature};
        }
        applyWebSearchPayload(requestBody, cfg, options.webSearch);
        return buildJsonPostRequest(cfg, requestBody, {stream: Boolean(options.stream), signal: options.signal});
    }

    function buildMessageCompletionRequest(settings, options) {
        const cfg = normalize(settings);
        if (isGemini(cfg)) {
            const requestBody = {
                model: cfg.model,
                contents: messageSemantics.openAiMessagesToGeminiContents(options.messages || []),
                stream: Boolean(options.stream)
            };
            if (options.temperature !== undefined) requestBody.temperature = options.temperature;
            const systemInstruction = options.systemInstruction !== undefined
                ? options.systemInstruction
                : messageSemantics.collectSystemInstruction(options.messages || []);
            if (systemInstruction !== undefined) {
                requestBody.system_instruction = {parts: [{text: systemInstruction}]};
            }
            return buildJsonPostRequest(cfg, requestBody, {stream: Boolean(options.stream), signal: options.signal});
        }
        return buildOpenAiChatRequest(cfg, {
            messages: options.normalizedMessages || options.messages || [],
            stream: Boolean(options.stream),
            temperature: options.temperature,
            webSearch: options.webSearch,
            signal: options.signal
        });
    }

    function buildPromptCompletionRequest(settings, options) {
        const cfg = normalize(settings);
        const prompt = options.prompt || '';
        if (isGemini(cfg)) {
            const requestBody = {
                model: cfg.model,
                contents: [{role: 'user', parts: [{text: prompt}]}],
                stream: Boolean(options.stream)
            };
            return buildJsonPostRequest(cfg, requestBody, {stream: Boolean(options.stream), signal: options.signal});
        }
        return buildOpenAiChatRequest(cfg, {
            messages: [{role: 'user', content: prompt}],
            stream: Boolean(options.stream),
            temperature: options.temperature,
            signal: options.signal
        });
    }

    function buildImageDescriptionRequest(settings, options) {
        const cfg = normalize(settings);
        const prompt = options.prompt || '';
        const images = options.images || [];
        if (isGemini(cfg)) {
            const parts = [{text: prompt}];
            for (const imageData of images) {
                const match = imageData.match(/^data:(image\/(.+));base64,(.*)$/);
                if (match && match[1] === 'image/gif') parts.push({text: '[动态图片(GIF)]'});
                else if (match) parts.push({inline_data: {mime_type: match[1], data: match[3]}});
                else if (imageData.startsWith('http')) parts.push({text: `[图片地址: ${imageData}]`});
            }
            const requestBody = {
                contents: [{role: 'user', parts}],
                generationConfig: {temperature: options.temperature === undefined ? 0.3 : options.temperature}
            };
            return buildJsonPostRequest(cfg, requestBody, {stream: false, signal: options.signal});
        }
        const content = [{type: 'text', text: prompt}];
        for (const imageData of images) {
            content.push({type: 'image_url', image_url: {url: imageData}});
        }
        return buildOpenAiChatRequest(cfg, {
            messages: [{role: 'user', content}],
            stream: false,
            temperature: options.temperature === undefined ? 0.3 : options.temperature,
            signal: options.signal
        });
    }

    ai.providerRequestAdapter = {
        isGemini,
        buildEndpoint,
        buildHeaders,
        buildJsonPostRequest,
        buildOpenAiChatRequest,
        buildGeminiContentRequest,
        buildMessageCompletionRequest,
        buildPromptCompletionRequest,
        buildImageDescriptionRequest,
        applyWebSearchPayload,
        openAiMessagesToGeminiContents: messageSemantics.openAiMessagesToGeminiContents
    };
})(window);
