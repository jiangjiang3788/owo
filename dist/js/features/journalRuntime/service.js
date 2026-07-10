// --- Journal AI Runtime vertical slice (v0.9.3 canonical owner) ---
// 单一 Prompt 输入、单一输出校验、零业务写入；legacy/shadow/unified 仅切换执行适配器。
(function registerJournalRuntimeService(global) {
    const app = global.OwoApp;
    const feature = app.features.journalRuntime;
    const modeSemantics = app.core.journal.runtimeModeSemantics;
    const outputContracts = app.core.output.outputContracts;
    const aiRuntime = app.features.aiRuntime.publicApi;
    const traceStore = app.platform.ai.requestTraceStore;

    function asObject(value) { return value && typeof value === 'object' ? value : {}; }
    function getState(request) { return request && request.state ? request.state : global.db || {}; }

    function selectLegacySettings(state, sourceKey) {
        const database = asObject(state);
        const preferred = asObject(database[sourceKey || 'summaryApiSettings']);
        if (preferred.url && preferred.key && preferred.model) return preferred;
        return asObject(database.apiSettings);
    }

    function recordDiagnostic(mode, taskType, details) {
        if (!traceStore || typeof traceStore.recordDiagnostic !== 'function') return;
        traceStore.recordDiagnostic({
            source: 'journalRuntime.cutover',
            label: `日记 Runtime · ${mode}`,
            category: 'diagnostic',
            status: 'diagnostic',
            diagnostic: Object.assign({
                mode,
                taskType,
                responseOwner: modeSemantics.describeMode(mode).responseOwner,
                promptOwner: modeSemantics.describeMode(mode).promptOwner
            }, details || {})
        });
    }

    async function executeLegacyPrompt(request) {
        const source = asObject(request);
        const state = getState(source);
        const settings = selectLegacySettings(state, source.legacySettingsKey);
        let url = String(settings.url || '').replace(/\/$/, '');
        if (!url || !settings.key || !settings.model) throw new Error('日记生成 API 设置不完整');
        if (typeof global.fetchAiResponse !== 'function') throw new Error('legacy journal executor unavailable');

        const requestBody = {
            model: settings.model,
            messages: [{ role: 'user', content: source.prompt }],
            temperature: source.temperature === undefined ? 0.7 : source.temperature
        };
        const endpoint = `${url}/v1/chat/completions`;
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.key}` };
        return global.fetchAiResponse(settings, requestBody, headers, endpoint, false);
    }

    async function executeUnifiedPrompt(request) {
        const source = asObject(request);
        const result = await aiRuntime.invokeTask({
            taskType: source.taskType,
            schemaVersion: 1,
            state: getState(source),
            source: source.source || 'journalRuntime',
            label: source.label || source.taskType,
            input: { prompt: String(source.prompt || ''), temperature: source.temperature },
            options: { temperature: source.temperature === undefined ? 0.7 : source.temperature }
        });
        return String(result && result.content || '');
    }

    async function preflightUnified(request) {
        const source = asObject(request);
        return aiRuntime.resolveTask({
            taskType: source.taskType,
            schemaVersion: 1,
            state: getState(source),
            source: source.source || 'journalRuntime.shadow',
            input: { prompt: String(source.prompt || '') },
            options: { temperature: source.temperature === undefined ? 0.7 : source.temperature }
        });
    }

    async function repairStructuredOutputOnce(request, raw, contractId) {
        const source = asObject(request);
        const repairPrompt = outputContracts.buildRepairPrompt(contractId, raw, { taskType: source.taskType });
        if (!repairPrompt) return { attempted: false, raw, parsed: outputContracts.parse(contractId, raw) };
        let repairedRaw = '';
        if (source.mode === modeSemantics.MODES.UNIFIED) {
            const repairResult = await aiRuntime.invokeTask({
                taskType: 'system.repair_structured_output',
                schemaVersion: 1,
                state: getState(source),
                source: 'journalRuntime.outputRepair',
                label: `修复 ${contractId}`,
                input: { prompt: repairPrompt },
                options: { temperature: 0 }
            });
            repairedRaw = String(repairResult && repairResult.content || '');
        } else {
            repairedRaw = await executeLegacyPrompt({ state: getState(source), prompt: repairPrompt, temperature: 0 });
        }
        return { attempted: true, raw: repairedRaw, parsed: outputContracts.parse(contractId, repairedRaw) };
    }

    async function executeJournalTask(request) {
        const source = asObject(request);
        const state = getState(source);
        const taskType = String(source.taskType || 'journal.generate');
        const definition = app.core.ai.taskContracts.getRegisteredDefinition(taskType);
        if (!definition || !taskType.startsWith('journal.')) throw new Error(`非法日记任务：${taskType}`);
        const prompt = String(source.prompt || '');
        if (!prompt.trim()) throw new Error('日记任务 prompt 不能为空');

        const mode = modeSemantics.resolveMode(state, source);
        let raw = '';
        if (mode === modeSemantics.MODES.UNIFIED) {
            raw = await executeUnifiedPrompt(Object.assign({}, source, { state, taskType, prompt }));
            recordDiagnostic(mode, taskType, { networkCalls: 1, shadowPreflight: false, writeOperations: 0 });
        } else {
            if (mode === modeSemantics.MODES.SHADOW) {
                const prepared = await preflightUnified(Object.assign({}, source, { state, taskType, prompt }));
                recordDiagnostic(mode, taskType, {
                    networkCalls: 1,
                    shadowPreflight: true,
                    routeId: prepared && prepared.route && prepared.route.id,
                    writeOperations: 0
                });
            } else {
                recordDiagnostic(mode, taskType, { networkCalls: 1, shadowPreflight: false, writeOperations: 0 });
            }
            raw = await executeLegacyPrompt(Object.assign({}, source, { state, taskType, prompt }));
        }

        const contractId = definition.outputContractId;
        let parsed = outputContracts.parse(contractId, raw, { taskType });
        let repairAttempted = false;
        if (!parsed.ok) {
            const repair = await repairStructuredOutputOnce(Object.assign({}, source, { state, taskType, mode }), raw, contractId);
            repairAttempted = repair.attempted;
            raw = repair.raw;
            parsed = repair.parsed;
        }
        if (!parsed.ok) {
            const error = new Error(`日记输出不符合 ${contractId}：${parsed.errors.join('; ')}`);
            error.code = 'JOURNAL_OUTPUT_VALIDATION_ERROR';
            error.details = { taskType, contractId, repairAttempted, errors: parsed.errors };
            throw error;
        }

        return {
            taskType,
            schemaVersion: definition.schemaVersion,
            outputContractId: contractId,
            mode,
            value: parsed.value,
            raw,
            repairAttempted,
            sideEffectsCommitted: false
        };
    }

    function getMode(state, options) {
        return modeSemantics.resolveMode(state || global.db || {}, options || {});
    }

    async function setMode(mode, state, options) {
        const database = state || global.db;
        if (!database || typeof database !== 'object') throw new Error('无法设置 journalRuntimeMode：状态未加载');
        if (!modeSemantics.isRuntimeMode(mode)) throw new Error(`未知 journalRuntimeMode：${mode}`);
        database.journalRuntimeMode = modeSemantics.normalizeMode(mode);
        if (!options || options.persist !== false) {
            const repository = app.platform.storage && app.platform.storage.repository;
            if (repository && typeof repository.saveGlobalSettings === 'function') await repository.saveGlobalSettings();
        }
        return database.journalRuntimeMode;
    }

    function getStatus(state) { return modeSemantics.describeMode(getMode(state)); }

    feature.service = { executeJournalTask, repairStructuredOutputOnce, getMode, setMode, getStatus };
})(window);
