// --- Chat message semantics owner (V14 canonical owner) ---
// 只负责 message role/content/parts 的纯归一化和 provider 兼容映射。
(function registerChatMessageSemantics(app) {
    const core = app.core;
    core.chat = core.chat || {};

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeMessageRole(role) {
        if (role === 'char') return 'assistant';
        if (role === 'ai') return 'assistant';
        return role || 'user';
    }

    function aiMessageContentToText(content) {
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            return content.map(part => {
                if (!part) return '';
                if (part.type === 'text' || part.type === 'html') return part.text || part.content || '';
                if (part.type === 'image_url' || part.type === 'image') return '[图片]';
                return '';
            }).filter(Boolean).join('\n');
        }
        if (content === undefined || content === null) return '';
        return String(content);
    }

    function wrapSystemMessageForCompat(content) {
        const text = aiMessageContentToText(content).trim();
        return text ? `[System Instruction]\n${text}` : '[System Instruction]';
    }

    function mergeAdjacentCompatMessages(messages) {
        const merged = [];
        asArray(messages).forEach(msg => {
            if (!msg) return;
            const prev = merged[merged.length - 1];
            const canMerge = prev &&
                prev.role === msg.role &&
                typeof prev.content === 'string' &&
                typeof msg.content === 'string';
            if (canMerge) {
                prev.content += `\n\n${msg.content}`;
            } else {
                merged.push({ ...msg });
            }
        });
        return merged;
    }

    function normalizeMessagesForProvider(messages, provider) {
        const mapped = asArray(messages).map(msg => {
            if (!msg) return null;
            const originalRole = normalizeMessageRole(msg.role);
            let nextRole = originalRole;
            let nextContent = msg.content;

            if (provider === 'claude') {
                if (originalRole === 'assistant' || originalRole === 'user') {
                    nextRole = originalRole;
                } else if (originalRole === 'system') {
                    nextRole = 'user';
                    nextContent = wrapSystemMessageForCompat(msg.content);
                } else {
                    nextRole = 'user';
                }
            }

            return {
                ...msg,
                role: nextRole,
                content: nextContent
            };
        }).filter(Boolean);

        return provider === 'claude' ? mergeAdjacentCompatMessages(mapped) : mapped;
    }

    function openAiPartToGeminiPart(part) {
        if (!part) return null;
        if (part.type === 'text') return {text: part.text || ''};
        const imageUrl = part.type === 'image_url' && part.image_url ? part.image_url.url : '';
        const match = imageUrl && imageUrl.match(/^data:(image\/(.+));base64,(.*)$/);
        return match ? {inline_data: {mime_type: match[1], data: match[3]}} : null;
    }

    function openAiMessageContentToGeminiParts(content) {
        return Array.isArray(content)
            ? content.map(openAiPartToGeminiPart).filter(Boolean)
            : [{text: content || ''}];
    }

    function openAiMessagesToGeminiContents(messages) {
        return asArray(messages).filter(m => m && m.role !== 'system').map(m => {
            const role = normalizeMessageRole(m.role) === 'assistant' ? 'model' : 'user';
            return {
                role,
                parts: openAiMessageContentToGeminiParts(m.content)
            };
        });
    }

    function collectSystemInstruction(messages) {
        return asArray(messages)
            .filter(m => m && m.role === 'system')
            .map(m => aiMessageContentToText(m.content))
            .join('\n\n');
    }

    core.chat.messageSemantics = {
        normalizeMessageRole,
        aiMessageContentToText,
        wrapSystemMessageForCompat,
        mergeAdjacentCompatMessages,
        normalizeMessagesForProvider,
        openAiPartToGeminiPart,
        openAiMessageContentToGeminiParts,
        openAiMessagesToGeminiContents,
        collectSystemInstruction
    };
})(OwoApp);
