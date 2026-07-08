// --- Memory Brain cutover report store owner (v0.4.8) ---
// 保存新旧注入对照 / 接管演练报告；只写 memoryBrain.cutoverReports / cutoverRehearsalRuns / batches，不接正式 prompt。
(function registerMemoryBrainCutoverReportStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryCutoverReportStore] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() { return typeof platform.memoryBrainStore.saveRootState === 'function' ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function safeClone(value) {
        if (value === undefined) return undefined;
        if (value === null) return null;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        try { return JSON.parse(JSON.stringify(value)); } catch (error) { return String(value); }
    }
    function clip(value, max) {
        const text = String(value == null ? '' : value);
        return text.length > max ? text.slice(0, max) + `\n… truncated ${text.length - max} chars` : text;
    }
    function normalizeReport(raw, batchId, createdAt, state) {
        const report = Object.assign({}, safeClone(raw || {}));
        report.id = report.id || nextId('memory-cutover-report');
        report.layer = 'cutover';
        report.kind = 'cutover-rehearsal-report';
        report.status = 'active';
        report.mode = 'shadow';
        report.batchId = batchId;
        report.createdAt = report.createdAt || createdAt;
        report.updatedAt = createdAt;
        report.release = state.release || 'v0.4.8';
        report.policy = Object.assign({ previewOnly: true, formalPromptInjection: false, noDualInjection: true }, report.policy || {});
        if (report.readiness) report.readiness.readyForFormalCutover = false;
        return report;
    }
    function appendCutoverRehearsalBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const batchId = payload.batchId || nextId('memory-brain-batch');
        const report = normalizeReport(payload.report || {}, batchId, createdAt, state);
        state.cutoverReports = [report].concat(asArray(state.cutoverReports).filter(item => item && item.id !== report.id)).slice(0, 80);
        const run = {
            id: payload.runId || nextId('memory-cutover-run'),
            kind: 'cutover-rehearsal-run',
            status: 'applied',
            mode: 'shadow',
            createdAt,
            updatedAt: createdAt,
            reportId: report.id,
            batchId,
            chatId: report.query && report.query.chatId || '',
            chatType: report.query && report.query.chatType || '',
            chatName: report.query && report.query.chatName || '',
            ownerSnapshot: safeClone(report.ownerSnapshot || {}),
            metrics: safeClone(report.metrics || {}),
            readiness: safeClone(report.readiness || {}),
            issueCount: asArray(report.issues).length,
            diagnostics: asArray(payload.diagnostics || report.issues && report.issues.map(issue => issue.kind)).slice(0, 20)
        };
        state.cutoverRehearsalRuns = [run].concat(asArray(state.cutoverRehearsalRuns).filter(item => item && item.id !== run.id)).slice(0, 80);
        state.lastCutoverRehearsalRun = run;
        const batch = {
            id: batchId,
            kind: 'cutover-rehearsal',
            status: 'applied',
            mode: 'shadow',
            createdAt,
            updatedAt: createdAt,
            input: safeClone(payload.input || {}),
            reportIds: [report.id],
            runIds: [run.id],
            metrics: safeClone(report.metrics || {}),
            readiness: safeClone(report.readiness || {}),
            memoryBrainBlockPreview: clip(report.memoryBrainBlockPreview, 4000),
            legacyBlockPreview: clip(report.legacyBlockPreview, 4000),
            policy: { previewOnly: true, formalPromptInjection: false, noDualInjection: true },
            errorMessage: payload.errorMessage || ''
        };
        state.batches = asArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ batch, report, run });
    }
    function rollbackCutoverRehearsalBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'cutover-rehearsal') return { ok: false, reason: 'batch_not_found_or_not_cutover_rehearsal' };
        const updatedAt = nowIso();
        const reportIds = new Set(asArray(batch.reportIds));
        const runIds = new Set(asArray(batch.runIds));
        asArray(state.cutoverReports).forEach(report => { if (report && reportIds.has(report.id)) { report.status = 'retired'; report.retiredAt = updatedAt; report.updatedAt = updatedAt; report.reviewStatus = 'batch-rolled-back'; } });
        asArray(state.cutoverRehearsalRuns).forEach(run => { if (run && runIds.has(run.id)) { run.status = 'rolled-back'; run.rollbackAt = updatedAt; run.updatedAt = updatedAt; } });
        batch.status = 'rolled-back';
        batch.rollbackAt = updatedAt;
        batch.updatedAt = updatedAt;
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId, reportCount: reportIds.size, runCount: runIds.size };
    }
    function listCutoverReports(options = {}) {
        return asArray(ensureState(options).cutoverReports).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }
    function listCutoverRehearsalRuns(options = {}) {
        return asArray(ensureState(options).cutoverRehearsalRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }
    function getCutoverRehearsalSnapshot(options = {}) {
        const state = ensureState(options);
        return safeClone({ reports: state.cutoverReports, runs: state.cutoverRehearsalRuns, lastRun: state.lastCutoverRehearsalRun, batches: asArray(state.batches).filter(batch => batch && batch.kind === 'cutover-rehearsal') });
    }
    function getRoutingReport() { return { owner: 'platform/memoryBrain/memoryCutoverReportStore', release: 'v0.4.8', writes: ['memoryBrain.cutoverReports', 'memoryBrain.cutoverRehearsalRuns', 'memoryBrain.batches(kind=cutover-rehearsal)'], formalPromptInjection: false, noDualInjection: true, legacyMode: 'read-only-comparison' }; }

    platform.memoryCutoverReportStore = { appendCutoverRehearsalBatch, rollbackCutoverRehearsalBatch, listCutoverReports, listCutoverRehearsalRuns, getCutoverRehearsalSnapshot, getRoutingReport };
})(window);
