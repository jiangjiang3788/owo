// --- Prepared private-chat request contract (v0.9.2 canonical owner) ---
// 统一描述“已经由唯一 Prompt builder 构建完成”的请求；不复制 Prompt 构建逻辑。
(function registerPreparedChatRequestSemantics(app) {
    const core = app.core;
    core.chat = core.chat || {};

    function asObject(value) {
        return value && typeof value === 'object' ? value : {};
    }

    function stableHash(input) {
        const text = String(input || '');
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, '0');
    }

    function bodyShape(requestBody) {
        const body = asObject(requestBody);
        const messages = Array.isArray(body.messages) ? body.messages : [];
        const contents = Array.isArray(body.contents) ? body.contents : [];
        const systemText = body.system_instruction && Array.isArray(body.system_instruction.parts)
            ? body.system_instruction.parts.map(part => part && part.text || '').join('\n')
            : '';
        return {
            keys: Object.keys(body).sort(),
            messageCount: messages.length,
            contentCount: contents.length,
            systemChars: systemText.length,
            bodyChars: JSON.stringify(body).length
        };
    }

    function createSignature(request) {
        const source = asObject(request);
        const providerRequest = asObject(source.providerRequest);
        const shape = bodyShape(source.requestBody !== undefined ? source.requestBody : providerRequest.requestBody);
        const raw = JSON.stringify({
            taskType: source.taskType || '',
            provider: source.provider || '',
            model: source.model || '',
            stream: Boolean(source.stream),
            endpointClass: String(providerRequest.endpoint || '').replace(/[?&]key=[^&]+/gi, '?key=[redacted]'),
            shape
        });
        return `chatreq:${stableHash(raw)}`;
    }

    function normalizePreparedRequest(request) {
        const source = asObject(request);
        const providerRequest = asObject(source.providerRequest);
        const errors = [];
        if (!source.taskType) errors.push('taskType is required');
        if (!providerRequest.endpoint) errors.push('providerRequest.endpoint is required');
        if (!providerRequest.fetchOptions) errors.push('providerRequest.fetchOptions is required');
        if (errors.length) {
            const error = new Error(`Prepared chat request invalid: ${errors.join('; ')}`);
            error.code = 'PREPARED_CHAT_REQUEST_INVALID';
            error.details = errors;
            throw error;
        }
        return {
            taskType: source.taskType,
            schemaVersion: source.schemaVersion === undefined ? 1 : Number(source.schemaVersion),
            providerRequest,
            settings: asObject(source.settings),
            provider: source.provider || '',
            model: source.model || '',
            stream: Boolean(source.stream),
            source: source.source || 'chatRuntime',
            label: source.label || source.taskType,
            requestBody: source.requestBody !== undefined ? source.requestBody : providerRequest.requestBody,
            taskId: source.taskId || '',
            routeId: source.routeId || '',
            state: source.state,
            chatId: source.chatId || '',
            chatType: source.chatType || 'private',
            character: source.character || null,
            mode: source.mode,
            diagnostics: asObject(source.diagnostics),
            signature: source.signature || createSignature(source)
        };
    }

    function buildTraceSummary(prepared) {
        const source = normalizePreparedRequest(prepared);
        const shape = bodyShape(source.requestBody);
        return {
            signature: source.signature,
            taskType: source.taskType,
            chatId: source.chatId,
            chatType: source.chatType,
            provider: source.provider,
            model: source.model,
            stream: source.stream,
            requestShape: shape,
            diagnostics: source.diagnostics
        };
    }

    core.chat.preparedRequestSemantics = {
        stableHash,
        bodyShape,
        createSignature,
        normalizePreparedRequest,
        buildTraceSummary
    };
})(OwoApp);
