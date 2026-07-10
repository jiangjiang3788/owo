// --- AI message sanitizer owner (v0.3.9) ---
// 只清洗进入 provider context 的历史消息；不修改原始聊天记录。
(function registerAiMessageSanitizer(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;

    const REFUSAL_PATTERNS = [
        /I\s+can't\s+take\s+on\s+this\s+roleplay/i,
        /I\s+can(?:not|'t)\s+comply/i,
        /我不能(?:继续|扮演|满足|提供)/,
        /无法继续这个角色扮演/,
        /不能生成.*(?:露骨|色情|性)/
    ];

    function normalizeText(value) {
        return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    }

    function extractText(message) {
        if (!message) return '';
        if (typeof message.content === 'string') return message.content;
        if (Array.isArray(message.parts)) {
            return message.parts.map(part => part && (part.text || part.content || '')).filter(Boolean).join('\n');
        }
        return '';
    }

    function isUnknownAssistantMessage(message) {
        const text = extractText(message);
        return /^\s*\[system:[^\]]+\]\s*\[unknown(?:的消息)?[:：]/i.test(text)
            || /^\s*\[unknown(?:的消息)?[:：]/i.test(text)
            || message.senderId === 'unknown';
    }

    function isDebugMessage(message) {
        if (!message) return false;
        if (message.isThinking || message.isContextDisabled) return true;
        const text = extractText(message);
        return /^\s*(?:\{\s*"id"\s*:|##\s*基本信息|\[request-|\[response-)/.test(text)
            || /reasoning_content\s*:/.test(text)
            || /聊天回复请求|响应 JSON|请求体/.test(text);
    }

    function isRefusalMessage(message) {
        if (!message || !(message.role === 'assistant' || message.role === 'char')) return false;
        const text = extractText(message);
        return REFUSAL_PATTERNS.some(pattern => pattern.test(text));
    }

    function shouldDropMessage(message) {
        if (!message) return { drop: true, reason: 'empty' };
        if (isUnknownAssistantMessage(message)) return { drop: true, reason: 'unknown-assistant' };
        if (isDebugMessage(message)) return { drop: true, reason: 'debug-or-disabled' };
        if (isRefusalMessage(message)) return { drop: true, reason: 'assistant-refusal' };
        return { drop: false, reason: '' };
    }

    function cloneMessage(message) {
        try { return JSON.parse(JSON.stringify(message)); }
        catch (error) { return Object.assign({}, message); }
    }

    function sameConsecutiveMessage(a, b) {
        if (!a || !b) return false;
        const roleA = a.role === 'char' ? 'assistant' : a.role;
        const roleB = b.role === 'char' ? 'assistant' : b.role;
        if (roleA !== roleB) return false;
        return normalizeText(extractText(a)) === normalizeText(extractText(b));
    }

    function sanitizeHistoryMessages(messages, options = {}) {
        const input = Array.isArray(messages) ? messages : [];
        const cleaned = [];
        const diagnostics = {
            inputCount: input.length,
            outputCount: 0,
            dropped: [],
            duplicateCount: 0,
            policy: 'no-unknown-no-reasoning-no-debug-no-consecutive-duplicate'
        };
        input.forEach((message, index) => {
            const verdict = shouldDropMessage(message);
            if (verdict.drop) {
                diagnostics.dropped.push({ index, reason: verdict.reason, role: message && message.role });
                return;
            }
            const cloned = cloneMessage(message);
            if (cleaned.length && sameConsecutiveMessage(cleaned[cleaned.length - 1], cloned)) {
                diagnostics.duplicateCount += 1;
                diagnostics.dropped.push({ index, reason: 'consecutive-duplicate', role: cloned.role });
                return;
            }
            cleaned.push(cloned);
        });
        const limit = Number(options.limit || 0);
        const limited = limit > 0 && cleaned.length > limit ? cleaned.slice(-limit) : cleaned;
        diagnostics.outputCount = limited.length;
        diagnostics.trimmedByLimit = cleaned.length - limited.length;
        return { messages: limited, diagnostics };
    }

    ai.messageSanitizer = {
        sanitizeHistoryMessages,
        shouldDropMessage,
        isUnknownAssistantMessage,
        isDebugMessage,
        isRefusalMessage,
        extractText
    };
})(window);
