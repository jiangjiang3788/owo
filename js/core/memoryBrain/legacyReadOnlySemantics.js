// --- Memory Brain legacy read-only downgrade semantics (v0.6.3) ---
// 纯语义：评估旧档案 / 日记 / 向量记忆降为只读历史来源的准备度；不访问 DOM、存储、fetch 或正式聊天管线。
(function registerMemoryBrainLegacyReadOnlySemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clip(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, Math.max(0, max - 1)) + '…' : text;
    }
    function countActive(list) { return asArray(list).filter(item => item && item.status !== 'retired' && item.status !== 'rolled-back').length; }
    function countOpenReviews(snapshot) {
        return asArray(snapshot && snapshot.reviewInboxItems).filter(item => item && !['confirmed', 'dismissed', 'corrected', 'rolled-back'].includes(item.status)).length;
    }
    function countUnresolvedConflicts(snapshot) {
        return asArray(snapshot && snapshot.conflicts).filter(item => item && !['resolved', 'dismissed', 'rolled-back'].includes(item.status)).length;
    }
    function buildLegacySourceRows(legacyScan) {
        const totals = legacyScan && legacyScan.totals || {};
        return [
            { id: 'journal', label: '回忆日记', count: Number(totals.journals || 0), currentRole: 'legacy-formal-candidate', plannedRole: 'read-only-history-source', writesAllowedAfterCutover: false },
            { id: 'table', label: '档案 / 表格记忆', count: Number(totals.tableCells || 0), currentRole: 'legacy-formal-candidate', plannedRole: 'read-only-history-source', writesAllowedAfterCutover: false },
            { id: 'vector', label: '向量记忆', count: Number(totals.vectorEntries || 0), currentRole: 'legacy-formal-candidate', plannedRole: 'read-only-history-source', writesAllowedAfterCutover: false },
            { id: 'history', label: '聊天原文', count: Number(totals.messages || 0), currentRole: 'history-source', plannedRole: 'read-only-history-source', writesAllowedAfterCutover: false }
        ];
    }
    function buildIssue(code, severity, title, detail) { return { code, severity, title, detail }; }
    function buildLegacyReadOnlyPlan(input) {
        const options = input && typeof input === 'object' ? input : {};
        const snapshot = options.snapshot || {};
        const legacyScan = options.legacyScan || snapshot.lastLegacyScan || { totals: {} };
        const ownerState = snapshot.ownerState || {};
        const requestedOwner = asText(ownerState.requestedOwner || 'legacy') || 'legacy';
        const effectiveOwner = asText(ownerState.effectiveOwner || 'legacy') || 'legacy';
        const formalOwner = asText(ownerState.formalOwner || 'legacy') || 'legacy';
        const activeOwner = asText(options.activeLegacyOwner || options.legacyOwner || 'legacy') || 'legacy';
        const sourceRows = buildLegacySourceRows(legacyScan);
        const openReviews = countOpenReviews(snapshot);
        const unresolvedConflicts = countUnresolvedConflicts(snapshot);
        const trustedReports = countActive(snapshot.trustedMemoryGateReports);
        const trustRuns = countActive(snapshot.trustScoreRuns);
        const cutoverReports = countActive(snapshot.cutoverReports);
        const formalAdapterReports = countActive(snapshot.formalInjectionAdapterReports);
        const realtimeTraceReports = countActive(snapshot.realtimeInjectionTraceReports);
        const issues = [];
        if (!legacyScan || !legacyScan.totals) issues.push(buildIssue('legacy-scan-missing', 'medium', '缺少旧来源扫描', '建议先运行旧来源扫描或历史归档扫描，再评估降级。'));
        if (openReviews > 0) issues.push(buildIssue('review-inbox-open', 'high', '仍有待审记忆', `还有 ${openReviews} 条审查项未处理，不建议降级旧系统。`));
        if (unresolvedConflicts > 0) issues.push(buildIssue('conflicts-open', 'high', '仍有未解决冲突事实', `还有 ${unresolvedConflicts} 组冲突/争议事实未处理。`));
        if (!trustedReports) issues.push(buildIssue('trusted-gate-missing', 'medium', '尚未运行可信记忆 gate', 'v0.5.7 可信 gate 是切换前必需检查。'));
        if (!trustRuns) issues.push(buildIssue('trust-score-missing', 'medium', '尚未运行记忆信任分', '建议先计算 trust score 后再演练旧系统降级。'));
        if (!cutoverReports) issues.push(buildIssue('cutover-report-missing', 'medium', '尚未运行新旧注入对照', '需要至少一份 cutover rehearsal 观察漏召回和重复召回。'));
        if (!formalAdapterReports) issues.push(buildIssue('adapter-report-missing', 'medium', '尚未运行正式注入 adapter 演练', '需要确认唯一 memory block adapter 的行为。'));
        if (!realtimeTraceReports) issues.push(buildIssue('realtime-trace-missing', 'low', '尚未运行实时注入 trace', '建议至少做一次当前输入的 trace 解释。'));
        issues.push(buildIssue('blocked-until-v0.9', 'high', '旧系统降级被总门禁阻止', '到 v0.9 完成前，旧档案 / 日记 / 向量仍保留正式聊天注入权；本版只生成只读降级演练报告。'));
        const readinessScore = Math.max(0, 100 - issues.reduce((sum, item) => sum + (item.severity === 'high' ? 28 : item.severity === 'medium' ? 14 : 6), 0));
        return {
            kind: 'legacy-readonly-downgrade',
            release: 'v0.6.3',
            status: 'planned-only',
            mode: 'shadow-readonly-plan',
            readinessScore,
            legacyOwner: {
                activeOwner,
                requestedOwner,
                effectiveOwner,
                formalOwner,
                finalOwner: 'legacy',
                formalPromptInjection: false,
                memoryBrainCanReplaceLegacy: false,
                cutoverGate: ownerState.cutoverGate || 'blocked-until-v0.9',
                blockedUntil: 'v0.9'
            },
            sourceSummary: {
                chatCount: Number(legacyScan.chatCount || 0),
                totals: legacyScan.totals || {},
                sources: sourceRows
            },
            downgradePlan: {
                action: 'prepare-read-only-downgrade',
                canApplyNow: false,
                willChangeRuntimeOwner: false,
                willChangeChatMemoryMode: false,
                willDisableLegacyWritesNow: false,
                plannedFormalOwnerBeforeV09: 'legacy',
                plannedAfterV09: 'legacy-read-only-history-source',
                notes: [
                    '旧系统继续作为正式聊天注入 owner，直到 v0.9 总门禁打开。',
                    '本报告只检查降级准备度，不改 chat.memoryMode、不写旧记忆、不接 promptSemantics。',
                    '旧日记 / 表格 / 向量之后会作为 Memory Brain 历史来源，而不是正式注入 owner。'
                ]
            },
            guards: {
                journalOwnerGuard: true,
                tableOwnerGuard: true,
                vectorOwnerGuard: true,
                noDualInjection: true,
                noDualWrite: true,
                legacyWriteBlockedByThisFeature: true,
                promptHooked: false
            },
            prerequisites: {
                reviewInboxOpen: openReviews,
                unresolvedConflicts,
                trustedGateReports: trustedReports,
                trustScoreRuns: trustRuns,
                cutoverReports,
                formalAdapterReports,
                realtimeTraceReports
            },
            issues
        };
    }
    function compactLegacyReadOnlyPlanForList(report) {
        const item = report || {};
        const owner = item.legacyOwner || {};
        const summary = item.sourceSummary || {};
        return {
            id: item.id,
            status: item.status || 'planned-only',
            createdAt: item.createdAt || item.updatedAt || '',
            readinessScore: Number(item.readinessScore || 0),
            activeOwner: owner.activeOwner || 'legacy',
            finalOwner: owner.finalOwner || 'legacy',
            cutoverGate: owner.cutoverGate || 'blocked-until-v0.9',
            chatCount: summary.chatCount || 0,
            totals: summary.totals || {},
            sources: asArray(summary.sources).slice(0, 4),
            issueCount: asArray(item.issues).length,
            issues: asArray(item.issues).slice(0, 6),
            canApplyNow: !!(item.downgradePlan && item.downgradePlan.canApplyNow),
            preview: clip(asArray(item.downgradePlan && item.downgradePlan.notes).join('\n'), 420)
        };
    }

    core.memoryBrain.legacyReadOnlySemantics = { buildLegacyReadOnlyPlan, compactLegacyReadOnlyPlanForList };
})(OwoApp);
