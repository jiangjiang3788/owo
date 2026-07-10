// --- AI task contracts owner (v0.9.1 canonical owner) ---
// 任务注册表拥有 schema、路由和输出契约；业务调用方不能自由拼装策略。
(function registerAiTaskContracts(app) {
    app.core = app.core || {};
    app.core.ai = app.core.ai || {};

    function task(id, inputMode, legacySettingsKey, capabilities, options) {
        const opts = options || {};
        return Object.freeze({
            id,
            schemaVersion: Number(opts.schemaVersion || 1),
            inputMode,
            inputSchema: Object.freeze(opts.inputSchema || inputSchemaFor(inputMode)),
            legacySettingsKey,
            routePolicyId: opts.routePolicyId || legacySettingsKey || 'apiSettings',
            outputContractId: opts.outputContractId || 'provider.chat-completion.v1',
            sideEffectPolicy: opts.sideEffectPolicy || 'none',
            capabilities: Object.freeze((capabilities || []).slice()),
            allowedOverrides: Object.freeze((opts.allowedOverrides || ['stream', 'timeoutMs', 'signal', 'temperature', 'returnRawResponse', 'webSearch']).slice())
        });
    }

    function inputSchemaFor(mode) {
        if (mode === 'messages') return { type: 'object', required: ['messages'], properties: { messages: 'array' } };
        if (mode === 'prompt') return { type: 'object', required: ['prompt'], properties: { prompt: 'string' } };
        if (mode === 'images') return { type: 'object', required: ['images'], properties: { images: 'array' } };
        if (mode === 'embedding') return { type: 'object', anyOf: ['text', 'texts', 'input'] };
        return { type: 'object' };
    }

    const TASK_DEFINITIONS = Object.freeze({
        'conversation.reply': task('conversation.reply', 'messages', 'apiSettings', ['text', 'chat', 'streaming'], {
            outputContractId: 'chat.provider-response.v1'
        }),
        'conversation.background': task('conversation.background', 'messages', 'backgroundApiSettings', ['text', 'chat']),
        'conversation.summary': task('conversation.summary', 'prompt', 'summaryApiSettings', ['text', 'summary']),
        'conversation.video_call': task('conversation.video_call', 'messages', 'apiSettings', ['text', 'chat', 'streaming']),

        'journal.generate': task('journal.generate', 'prompt', 'summaryApiSettings', ['text', 'summary', 'structured-output'], {
            outputContractId: 'journal.entry.v1'
        }),
        'journal.merge': task('journal.merge', 'prompt', 'summaryApiSettings', ['text', 'summary', 'structured-output'], {
            outputContractId: 'journal.merge-result.v1'
        }),
        'journal.summarize': task('journal.summarize', 'prompt', 'summaryApiSettings', ['text', 'summary', 'structured-output'], {
            outputContractId: 'journal.entry.v1'
        }),

        'archive.suggest_updates': task('archive.suggest_updates', 'prompt', 'summaryApiSettings', ['text', 'structured-output'], {
            outputContractId: 'archive.update-proposal.v1'
        }),
        'memory.extract': task('memory.extract', 'prompt', 'summaryApiSettings', ['text', 'structured-output', 'memory'], {
            outputContractId: 'memory.candidate-list.v1'
        }),
        'memory.consolidate': task('memory.consolidate', 'prompt', 'summaryApiSettings', ['text', 'structured-output', 'memory']),
        'memory.rerank': task('memory.rerank', 'prompt', 'summaryApiSettings', ['text', 'ranking', 'memory']),

        'theater.generate': task('theater.generate', 'messages', 'apiSettings', ['text', 'long-form']),
        'forum.generate': task('forum.generate', 'messages', 'apiSettings', ['text', 'social-generation']),

        'image.describe': task('image.describe', 'images', 'imageRecognitionApiSettings', ['text', 'vision']),
        'image.analyze': task('image.analyze', 'images', 'imageRecognitionApiSettings', ['text', 'vision']),
        'embedding.create': task('embedding.create', 'embedding', 'vectorApiSettings', ['embedding'], {
            outputContractId: 'embedding.vector-list.v1'
        }),

        'system.summarize': task('system.summarize', 'prompt', 'summaryApiSettings', ['text', 'summary']),
        'system.classify': task('system.classify', 'prompt', 'backgroundApiSettings', ['text', 'classification']),
        'system.repair_structured_output': task('system.repair_structured_output', 'prompt', 'summaryApiSettings', ['text', 'structured-output'], {
            outputContractId: 'provider.chat-completion.v1',
            allowedOverrides: ['timeoutMs', 'signal', 'temperature']
        }),
        'system.generic': task('system.generic', 'messages', 'apiSettings', ['text'])
    });

    const TASK_ALIASES = Object.freeze({
        conversation: 'conversation.reply',
        chat: 'conversation.reply',
        background: 'conversation.background',
        summary: 'system.summarize',
        image: 'image.describe',
        embedding: 'embedding.create',
        'memory-event': 'memory.extract',
        'memory-fact': 'memory.extract',
        'memory-family': 'memory.consolidate',
        'memory-graph': 'memory.consolidate',
        'memory-persona': 'memory.consolidate',
        'memory-injection-preview': 'memory.rerank'
    });

    function normalizeTaskType(value) {
        const raw = String(value || '').trim();
        return TASK_ALIASES[raw] || raw;
    }

    function hasDefinition(value) {
        const id = normalizeTaskType(value);
        return Boolean(id && TASK_DEFINITIONS[id]);
    }

    function getDefinition(value) {
        const id = normalizeTaskType(value);
        return TASK_DEFINITIONS[id] || TASK_DEFINITIONS['system.generic'];
    }

    function getRegisteredDefinition(value) {
        const id = normalizeTaskType(value);
        return TASK_DEFINITIONS[id] || null;
    }

    function listDefinitions() {
        return Object.keys(TASK_DEFINITIONS).map(id => TASK_DEFINITIONS[id]);
    }

    function validateInput(definition, input, providerRequest) {
        const errors = [];
        if (providerRequest) return errors;
        if (definition.inputMode === 'messages' && !Array.isArray(input.messages)) errors.push('messages task requires input.messages');
        if (definition.inputMode === 'prompt' && typeof input.prompt !== 'string') errors.push('prompt task requires input.prompt');
        if (definition.inputMode === 'images' && !Array.isArray(input.images)) errors.push('image task requires input.images');
        if (definition.inputMode === 'embedding') {
            const hasValue = input.text !== undefined || input.texts !== undefined || input.input !== undefined;
            if (!hasValue) errors.push('embedding task requires input.text/input.texts/input.input');
        }
        return errors;
    }

    function validateOverrides(definition, options) {
        const allowed = new Set(definition.allowedOverrides || []);
        return Object.keys(options || {}).filter(key => !allowed.has(key)).map(key => `override is not allowed: ${key}`);
    }

    function validateTaskRequest(request) {
        const source = request && typeof request === 'object' ? request : {};
        const requestedType = source.taskType || source.task;
        const taskType = normalizeTaskType(requestedType);
        const definition = getRegisteredDefinition(taskType);
        const errors = [];
        if (!requestedType) errors.push('taskType is required');
        if (requestedType && !definition) errors.push(`unregistered taskType: ${taskType}`);
        const input = source.input && typeof source.input === 'object' ? source.input : source;
        if (definition) {
            errors.push(...validateInput(definition, input, source.providerRequest));
            errors.push(...validateOverrides(definition, source.options));
            if (source.schemaVersion !== undefined && Number(source.schemaVersion) !== definition.schemaVersion) {
                errors.push(`schemaVersion mismatch: expected ${definition.schemaVersion}`);
            }
        }
        return { ok: errors.length === 0, errors, taskType, definition, input };
    }

    function inferLegacyTaskType(meta) {
        const source = meta && typeof meta === 'object' ? meta : {};
        const sourceKey = String(source.sourceKey || '');
        if (sourceKey === 'summaryApiSettings') return 'system.summarize';
        if (sourceKey === 'backgroundApiSettings') return 'conversation.background';
        if (sourceKey === 'imageRecognitionApiSettings') return 'image.describe';
        if (sourceKey === 'vectorApiSettings') return 'embedding.create';
        const label = String(source.label || source.source || '').toLowerCase();
        if (label.includes('日记') || label.includes('journal')) return 'journal.generate';
        if (label.includes('总结') || label.includes('summary')) return 'system.summarize';
        if (label.includes('图片') || label.includes('image')) return 'image.describe';
        if (label.includes('通话') || label.includes('call')) return 'conversation.video_call';
        if (label.includes('后台') || label.includes('background')) return 'conversation.background';
        return 'system.generic';
    }

    app.core.ai.taskContracts = {
        TASK_DEFINITIONS,
        TASK_ALIASES,
        normalizeTaskType,
        hasDefinition,
        getDefinition,
        getRegisteredDefinition,
        listDefinitions,
        validateTaskRequest,
        inferLegacyTaskType
    };
})(OwoApp);
