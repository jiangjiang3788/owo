// --- Memory Brain owner recovery semantics (v0.6.4) ---
// 纯语义：计算一键关闭 Memory Brain 影子注入候选 / 回退 legacy owner 的演练结果；不访问 DOM、存储、fetch 或正式聊天管线。
(function registerMemoryBrainOwnerRecoverySemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};
    const BLOCKED_UNTIL = 'v0.9';
    const ACTION_LABELS = Object.freeze({ 'disable-shadow': '关闭 Memory Brain 影子注入候选', 'enable-shadow': '恢复 Memory Brain 影子预览', 'restore-legacy': '回退 legacy 正式 owner', 'request-off': '请求关闭正式记忆注入演练', 'request-memory-brain': '请求 Memory Brain 接管演练' });
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function normalizeAction(value) { const action = asText(value).replace(/_/g, '-').toLowerCase(); if (['enable-shadow', 'enable', 'resume-shadow', 'restore-shadow'].includes(action)) return 'enable-shadow'; if (['restore-legacy', 'legacy', 'rollback-legacy', 'back-to-legacy'].includes(action)) return 'restore-legacy'; if (['request-off', 'off', 'disable-all', 'formal-off'].includes(action)) return 'request-off'; if (['request-memory-brain', 'memorybrain', 'memory-brain', 'brain'].includes(action)) return 'request-memory-brain'; return 'disable-shadow'; }
    function getOwnerApi() { return core.memoryBrain.ownerSwitchSemantics || null; }
    function normalizeOwnerState(value) { const ownerApi = getOwnerApi(); return ownerApi && typeof ownerApi.normalizeOwnerState === 'function' ? ownerApi.normalizeOwnerState(value) : { requestedOwner: 'legacy', effectiveOwner: 'legacy', formalOwner: 'legacy', cutoverGate: 'blocked-until-v0.9', memoryBrainCanInject: false }; }
    function evaluateOwner(requestedOwner, previousOwnerState) { const ownerApi = getOwnerApi(); if (ownerApi && typeof ownerApi.evaluateOwnerSwitch === 'function') return ownerApi.evaluateOwnerSwitch(previousOwnerState, requestedOwner, { now: new Date().toISOString() }); return Object.assign({}, normalizeOwnerState(previousOwnerState), { requestedOwner, effectiveOwner: 'legacy', formalOwner: 'legacy', cutoverGate: 'blocked-until-v0.9', memoryBrainFormalInjection: false }); }
    function normalizeLegacyMode(mode) { const value = asText(mode).toLowerCase(); if (value === 'journal') return 'journal'; if (value === 'vector') return 'vector'; if (value === 'none' || value === 'off') return 'none'; return 'table'; }
    function buildLegacyRuntimeGuarantee(mode) { const active = normalizeLegacyMode(mode || 'table'); return { activeLegacyMemoryMode: active, tableAutoSummaryAllowed: active === 'table', journalAutoSummaryAllowed: active === 'journal', vectorAutoSummaryAllowed: active === 'vector', legacyFormalPromptOwnerStillActive: true, memoryBrainWritesLegacy: false, note: active === 'table' ? '当前使用档案 / 表格记忆时，表格记忆自动总结 / 自动更新仍允许；Memory Brain 只做影子整理和演练。' : '旧记忆总结仍按当前聊天 memoryMode 的 owner 守门执行；本功能不禁用旧 owner。' }; }
    function buildIssue(code, severity, title, detail) { return { code, severity, title, detail }; }
    function buildOwnerRecoveryPlan(input) {
        const options = input && typeof input === 'object' ? input : {};
        const action = normalizeAction(options.action);
        const previousSettings = Object.assign({}, options.settings || {});
        const previousShadow = previousSettings.shadowInjectionEnabled !== false;
        let nextShadow = previousShadow;
        let requestedOwner = normalizeOwnerState(options.ownerState).requestedOwner || 'legacy';
        if (action === 'disable-shadow') { nextShadow = false; requestedOwner = 'legacy'; }
        if (action === 'enable-shadow') { nextShadow = true; requestedOwner = 'legacy'; }
        if (action === 'restore-legacy') { requestedOwner = 'legacy'; }
        if (action === 'request-off') { nextShadow = false; requestedOwner = 'off'; }
        if (action === 'request-memory-brain') { nextShadow = true; requestedOwner = 'memoryBrain'; }
        const ownerEvaluation = evaluateOwner(requestedOwner, options.ownerState);
        const legacyRuntime = buildLegacyRuntimeGuarantee(options.activeLegacyMemoryMode || options.legacyMemoryMode || 'table');
        const issues = [];
        if (action === 'request-memory-brain') issues.push(buildIssue('blocked-until-v0.9', 'high', 'Memory Brain 正式接管仍被阻止', '请求已记录为演练；v0.9 前正式 prompt 仍由旧记忆 owner 执行。'));
        if (action === 'request-off') issues.push(buildIssue('off-rehearsal-only', 'medium', '关闭正式记忆注入只是演练', '本阶段不改 chat_ai / promptSemantics，不会真的关闭旧档案记忆注入。'));
        if (action === 'disable-shadow') issues.push(buildIssue('shadow-preview-disabled', 'info', 'Memory Brain 影子注入候选已关闭', '后续影子预览会返回 disabled 诊断，不影响旧表格记忆总结。'));
        if (action === 'restore-legacy') issues.push(buildIssue('legacy-restored', 'info', '已回退 legacy owner 演练状态', '正式 owner 本来就仍是 legacy；本操作重申不双注入。'));
        issues.push(buildIssue('legacy-table-summary-preserved', legacyRuntime.tableAutoSummaryAllowed ? 'info' : 'low', '旧记忆总结仍按当前 owner 工作', legacyRuntime.note));
        return { kind: 'owner-recovery', release: 'v0.6.4', action, actionLabel: ACTION_LABELS[action], status: 'shadow-only-applied', previousShadowInjectionEnabled: previousShadow, nextShadowInjectionEnabled: nextShadow, settingsPatch: { shadowInjectionEnabled: nextShadow }, requestedOwner, effectiveOwner: 'legacy', formalOwner: 'legacy', ownerState: Object.assign({}, ownerEvaluation, { effectiveOwner: 'legacy', formalOwner: 'legacy', memoryBrainFormalInjection: false, canApplyToPrompt: false }), legacyRuntime, formalPromptInjection: false, canApplyToPrompt: false, noDualInjection: true, noDualWrite: true, cutoverGate: 'blocked-until-v0.9', blockedUntil: BLOCKED_UNTIL, issues, summary: `${ACTION_LABELS[action]}：已记录并应用到 Memory Brain 影子设置；正式聊天仍由旧记忆 owner 执行。` };
    }
    function compactOwnerRecoveryForList(snapshot) { const source = snapshot && typeof snapshot === 'object' ? snapshot : {}; const reports = Array.isArray(source.ownerRecoveryReports) ? source.ownerRecoveryReports : []; const runs = Array.isArray(source.ownerRecoveryRuns) ? source.ownerRecoveryRuns : []; const settings = source.settings || {}; return { shadowInjectionEnabled: settings.shadowInjectionEnabled !== false, reports: reports.filter(item => item && item.status !== 'rolled-back').slice(0, 8).map(item => ({ id: item.id, action: item.action, actionLabel: item.actionLabel || ACTION_LABELS[item.action] || item.action, status: item.status, summary: item.summary, createdAt: item.createdAt, nextShadowInjectionEnabled: item.nextShadowInjectionEnabled, activeLegacyMemoryMode: item.legacyRuntime && item.legacyRuntime.activeLegacyMemoryMode, tableAutoSummaryAllowed: item.legacyRuntime && item.legacyRuntime.tableAutoSummaryAllowed, issueCount: Array.isArray(item.issues) ? item.issues.length : 0, issues: Array.isArray(item.issues) ? item.issues.slice(0, 4) : [] })), runs: runs.slice(0, 8).map(run => ({ id: run.id, action: run.action, status: run.status, createdAt: run.createdAt, shadowInjectionEnabled: run.nextShadowInjectionEnabled })), tableSummaryNote: '如果当前聊天 memoryMode = table，旧表格记忆仍会按旧 owner 守门总结 / 更新；本区只控制 Memory Brain 影子候选和 owner 演练。' }; }
    core.memoryBrain.ownerRecoverySemantics = { BLOCKED_UNTIL, ACTION_LABELS, normalizeAction, buildOwnerRecoveryPlan, compactOwnerRecoveryForList, buildLegacyRuntimeGuarantee };
})(OwoApp);
