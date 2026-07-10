// --- AI response normalizer owner (v0.3.9) ---
// 抽取用户可见 content，隔离 reasoning_content，并生成一次回复批次摘要。
(function registerAiResponseNormalizer(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;

    function asObject(value) { return value && typeof value === 'object' ? value : {}; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function stripReasoning(value) {
        if (!value || typeof value !== 'object') return value;
        const clone = Array.isArray(value) ? [] : {};
        Object.keys(value).forEach(key => {
            if (/reasoning|thought|chain_of_thought/i.test(key)) return;
            const item = value[key];
            clone[key] = item && typeof item === 'object' ? stripReasoning(item) : item;
        });
        return clone;
    }

    function extractAssistantMessage(responseJson, provider) {
        const json = asObject(responseJson);
        if (provider === 'gemini') {
            const text = asArray(json.candidates)[0]?.content?.parts?.[0]?.text || '';
            return { content: String(text || ''), role: 'assistant', providerFields: {} };
        }
        const message = asArray(json.choices)[0]?.message || {};
        const content = message.content !== undefined ? message.content : '';
        const reasoning = message.reasoning_content || message.reasoning || message.thoughts || '';
        return {
            content: String(content || ''),
            role: message.role || 'assistant',
            providerFields: {
                hasReasoning: !!reasoning,
                reasoningLength: reasoning ? String(reasoning).length : 0,
                reasoningRedacted: !!reasoning
            }
        };
    }

    function normalizeChatCompletion(responseJson, options = {}) {
        const message = extractAssistantMessage(responseJson, options.provider);
        return {
            content: message.content,
            role: message.role,
            usage: asObject(responseJson).usage || null,
            model: asObject(responseJson).model || options.model || '',
            provider: options.provider || '',
            metadata: Object.assign({
                finishReason: asArray(asObject(responseJson).choices)[0]?.finish_reason || '',
                responseObject: asObject(responseJson).object || '',
                strippedProviderJson: stripReasoning(responseJson)
            }, message.providerFields || {})
        };
    }

    function splitBracketedMessages(content) {
        const text = String(content || '').trim();
        if (!text) return [];
        const pattern = /\[([^\[\]\n：:]{1,32})(?:的消息|的语音|送来的礼物|发来的照片\/视频|的转账|更新状态为|撤回了一条消息|引用[“"][\s\S]*?并回复|位置)[：:]?[\s\S]*?\]/g;
        const matches = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            matches.push({ index: matches.length, content: match[0].trim(), speaker: match[1] || '', type: 'parsed-block' });
        }
        if (matches.length) return matches;
        return text.split(/\n{2,}/).map(part => part.trim()).filter(Boolean).map((part, index) => ({ index, content: part, speaker: '', type: 'paragraph' }));
    }

    function buildResponseBatch(input = {}) {
        const normalized = input.normalized || normalizeChatCompletion(input.responseJson || {}, input);
        const messages = splitBracketedMessages(normalized.content);
        return {
            id: input.id || ('response-batch-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)),
            kind: 'ai-response-batch',
            category: 'response',
            status: input.status || 'success',
            source: input.source || 'ai.responseNormalizer',
            label: input.label || 'AI 回复批次',
            provider: input.provider || normalized.provider || '',
            model: input.model || normalized.model || '',
            requestTraceId: input.requestTraceId || '',
            chatId: input.chatId || '',
            chatType: input.chatType || '',
            startedAt: input.startedAt || Date.now(),
            completedAt: input.completedAt || Date.now(),
            durationMs: Number(input.durationMs || 0),
            messageCount: messages.length,
            messages,
            content: normalized.content,
            usage: normalized.usage,
            metadata: normalized.metadata,
            childConsolePolicy: 'single-batch-card'
        };
    }

    ai.responseNormalizer = {
        normalizeChatCompletion,
        extractAssistantMessage,
        splitBracketedMessages,
        buildResponseBatch,
        stripReasoning
    };
})(window);
