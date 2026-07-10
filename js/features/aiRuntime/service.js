// --- Unified AI Task Runtime service (v0.9.0 canonical owner) ---
// 统一任务校验、模型路由、Provider Request、故障回退与标准化响应。
(function registerAiRuntimeService(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.aiRuntime;
    const taskContracts = OwoApp.core.ai.taskContracts;
    const configStore = OwoApp.platform.ai.aiConfigStore;
    const requestAdapter = OwoApp.platform.ai.providerRequestAdapter;
    const responseNormalizer = OwoApp.platform.ai.responseNormalizer;
    const traceStore = OwoApp.platform.ai.requestTraceStore;
    const embeddingAdapter = OwoApp.platform.ai.embeddingAdapter;

    function asObject(value) { return value && typeof value === 'object' ? value : {}; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function getState(request) {
        return request && request.state
            ? request.state
            : global.db || (OwoApp.app.state.runtimeGlobals && OwoApp.app.state.runtimeGlobals.getDb && OwoApp.app.state.runtimeGlobals.getDb()) || {};
    }
    function createTaskId(taskType) {
        return `${taskType}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    }

    function validateTask(request) {
        const validation = taskContracts.validateTaskRequest(request);
        if (!validation.ok) {
            const error = new Error(`AI Task 无效：${validation.errors.join('; ')}`);
            error.code = 'AI_TASK_VALIDATION_ERROR';
            error.details = validation;
            throw error;
        }
        return validation;
    }

    function resolveTask(request) {
        const validation = validateTask(request);
        const state = getState(request);
        const resolved = configStore.resolveTaskRoute(state, validation.taskType);
        return {
            id: request.id || createTaskId(validation.taskType),
            taskType: validation.taskType,
            schemaVersion: validation.definition.schemaVersion,
            definition: validation.definition,
            input: validation.input,
            state,
            route: resolved.route,
            candidates: resolved.candidates,
            snapshot: resolved.snapshot,
            options: asObject(request.options),
            source: request.source || 'features.aiRuntime',
            label: request.label || validation.taskType,
            outputContractId: validation.definition.outputContractId,
            sideEffectPolicy: validation.definition.sideEffectPolicy
        };
    }

    function buildProviderRequest(prepared, candidate) {
        const input = prepared.input;
        const options = prepared.options;
        const settings = candidate.settings;
        if (prepared.providerRequest) return prepared.providerRequest;

        if (prepared.definition.inputMode === 'prompt') {
            return requestAdapter.buildPromptCompletionRequest(settings, {
                prompt: input.prompt,
                stream: !!options.stream,
                temperature: input.temperature !== undefined ? input.temperature : options.temperature,
                signal: options.signal
            });
        }
        if (prepared.definition.inputMode === 'images') {
            return requestAdapter.buildImageDescriptionRequest(settings, {
                prompt: input.prompt || '',
                images: asArray(input.images),
                temperature: input.temperature !== undefined ? input.temperature : options.temperature,
                signal: options.signal
            });
        }
        return requestAdapter.buildMessageCompletionRequest(settings, {
            messages: asArray(input.messages),
            normalizedMessages: input.normalizedMessages,
            systemInstruction: input.systemInstruction,
            stream: !!options.stream,
            temperature: input.temperature !== undefined ? input.temperature : options.temperature,
            webSearch: input.webSearch || options.webSearch,
            signal: options.signal
        });
    }


    function preflightPreparedTask(request) {
        const source = asObject(request);
        const validation = taskContracts.validateTaskRequest({
            taskType: source.taskType,
            schemaVersion: source.schemaVersion,
            providerRequest: source.providerRequest,
            input: source.input || {}
        });
        if (!validation.ok) {
            const error = new Error(`Prepared AI Task 无效：${validation.errors.join('; ')}`);
            error.code = 'PREPARED_AI_TASK_VALIDATION_ERROR';
            error.details = validation;
            throw error;
        }
        const providerRequest = source.providerRequest;
        if (!providerRequest || !providerRequest.endpoint || !providerRequest.fetchOptions) {
            throw new Error('Prepared AI Task 需要完整 providerRequest');
        }
        return {
            ok: true,
            taskType: validation.taskType,
            schemaVersion: validation.definition.schemaVersion,
            outputContractId: validation.definition.outputContractId,
            sideEffectPolicy: validation.definition.sideEffectPolicy,
            providerRequest
        };
    }

    async function executePreparedTask(request) {
        const source = asObject(request);
        const preflight = preflightPreparedTask(source);
        if (source.dryRun) return preflight;
        return executeProviderRequest({
            taskType: preflight.taskType,
            taskId: source.taskId || createTaskId(preflight.taskType),
            routeId: source.routeId || 'prepared-request',
            fallbackIndex: 0,
            providerRequest: preflight.providerRequest,
            settings: asObject(source.settings),
            provider: source.provider || (source.settings && source.settings.provider) || '',
            model: source.model || (source.settings && source.settings.model) || '',
            stream: Boolean(source.stream),
            source: source.source || 'aiRuntime.executePreparedTask',
            label: source.label || preflight.taskType,
            requestBody: source.requestBody !== undefined ? source.requestBody : preflight.providerRequest.requestBody
        });
    }

    async function executeProviderRequest(request) {
        const source = asObject(request);
        const providerRequest = source.providerRequest;
        if (!providerRequest || !providerRequest.endpoint || !providerRequest.fetchOptions) {
            throw new Error('executeProviderRequest 需要完整 providerRequest');
        }
        const taskType = taskContracts.normalizeTaskType(source.taskType || taskContracts.inferLegacyTaskType(source));
        const settings = asObject(source.settings);
        const response = traceStore && typeof traceStore.trackedFetch === 'function'
            ? await traceStore.trackedFetch(providerRequest, {
                source: source.source || 'aiRuntime.executeProviderRequest',
                label: source.label || taskType,
                provider: source.provider || settings.provider || '',
                model: source.model || settings.model || '',
                stream: !!source.stream,
                requestBody: source.requestBody !== undefined ? source.requestBody : providerRequest.requestBody,
                taskType,
                taskId: source.taskId || '',
                routeId: source.routeId || '',
                fallbackIndex: Number(source.fallbackIndex || 0)
            })
            : await global.fetch(providerRequest.endpoint, providerRequest.fetchOptions);
        return response;
    }

    async function parseTaskResponse(response, prepared, candidate) {
        if (prepared.options.returnRawResponse || prepared.options.stream) {
            return {
                taskId: prepared.id,
                taskType: prepared.taskType,
                schemaVersion: prepared.schemaVersion,
                outputContractId: prepared.outputContractId,
                route: prepared.route,
                candidate,
                response,
                rawResponse: true
            };
        }
        const json = await response.json();
        const normalized = responseNormalizer.normalizeChatCompletion(json, {
            provider: candidate.settings.provider,
            model: candidate.settings.model
        });
        return {
            taskId: prepared.id,
            taskType: prepared.taskType,
            schemaVersion: prepared.schemaVersion,
            outputContractId: prepared.outputContractId,
            sideEffectPolicy: prepared.sideEffectPolicy,
            route: prepared.route,
            candidate,
            content: normalized.content,
            normalized,
            usage: normalized.usage,
            provider: candidate.settings.provider,
            model: candidate.settings.model,
            raw: json
        };
    }

    async function executeEmbeddingTask(prepared) {
        const enabledCandidates = prepared.candidates.filter(candidate => candidate.enabled);
        const rawTexts = prepared.input.texts !== undefined
            ? prepared.input.texts
            : prepared.input.input !== undefined
                ? prepared.input.input
                : prepared.input.text;
        const texts = (Array.isArray(rawTexts) ? rawTexts : [rawTexts])
            .map(item => String(item == null ? '' : item).trim())
            .filter(Boolean);
        if (!texts.length) throw new Error('embedding.create 需要 input.text 或 input.texts');
        let lastError = null;
        for (let index = 0; index < enabledCandidates.length; index++) {
            const candidate = enabledCandidates[index];
            try {
                const vectors = await embeddingAdapter.fetchEmbeddingBatch(candidate.settings, texts);
                return {
                    taskId: prepared.id,
                    taskType: prepared.taskType,
                    schemaVersion: prepared.schemaVersion,
                    outputContractId: prepared.outputContractId,
                    sideEffectPolicy: prepared.sideEffectPolicy,
                    route: prepared.route,
                    candidate,
                    vectors,
                    provider: candidate.settings.provider,
                    model: candidate.settings.model
                };
            } catch (error) {
                if (error && (error.name === 'AbortError' || error.code === 'ABORT_ERR')) throw error;
                lastError = error;
                recordFallbackDiagnostic(prepared, candidate, index, error);
            }
        }
        throw lastError || new Error('没有可用的 Embedding 模型路由');
    }

    function recordFallbackDiagnostic(prepared, candidate, index, error) {
        if (!traceStore || typeof traceStore.recordDiagnostic !== 'function') return;
        traceStore.recordDiagnostic({
            source: 'aiRuntime.fallback',
            label: `AI Task 回退 · ${prepared.taskType}`,
            provider: candidate && candidate.settings && candidate.settings.provider,
            model: candidate && candidate.settings && candidate.settings.model,
            diagnostic: {
                taskId: prepared.id,
                taskType: prepared.taskType,
                routeId: prepared.route && prepared.route.id,
                failedCandidateIndex: index,
                failedSourceKey: candidate && candidate.sourceKey,
                nextCandidateAvailable: index < prepared.candidates.length - 1
            },
            errorMessage: error && error.message ? error.message : String(error || '')
        });
    }

    async function executeTask(prepared) {
        if (prepared.definition.inputMode === 'embedding') return executeEmbeddingTask(prepared);
        const candidates = prepared.candidates.filter(candidate => candidate.enabled);
        if (!candidates.length) throw new Error(`任务 ${prepared.taskType} 没有可用模型，请检查 API 设置`);
        let lastError = null;
        for (let index = 0; index < candidates.length; index++) {
            const candidate = candidates[index];
            try {
                const providerRequest = buildProviderRequest(prepared, candidate);
                const response = await executeProviderRequest({
                    taskType: prepared.taskType,
                    taskId: prepared.id,
                    routeId: prepared.route && prepared.route.id,
                    fallbackIndex: index,
                    providerRequest,
                    settings: candidate.settings,
                    provider: candidate.settings.provider,
                    model: candidate.settings.model,
                    stream: !!prepared.options.stream,
                    source: prepared.source,
                    label: prepared.label,
                    requestBody: providerRequest.requestBody
                });
                if (!response.ok) {
                    const text = await response.text();
                    const error = new Error(`AI Runtime HTTP Error: ${response.status} ${text}`);
                    error.status = response.status;
                    throw error;
                }
                return await parseTaskResponse(response, prepared, candidate);
            } catch (error) {
                if (error && (error.name === 'AbortError' || error.code === 'ABORT_ERR')) throw error;
                lastError = error;
                recordFallbackDiagnostic(prepared, candidate, index, error);
            }
        }
        throw lastError || new Error(`任务 ${prepared.taskType} 执行失败`);
    }

    async function invokeTask(request) {
        const prepared = resolveTask(request);
        return executeTask(prepared);
    }

    function getRoutingReport(state) {
        return configStore.buildAiConfigSnapshot(state || getState({}));
    }

    feature.service = {
        validateTask,
        resolveTask,
        buildProviderRequest,
        preflightPreparedTask,
        executePreparedTask,
        executeProviderRequest,
        executeTask,
        invokeTask,
        getRoutingReport
    };
})(window);
