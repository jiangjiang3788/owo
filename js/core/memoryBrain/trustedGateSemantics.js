// --- Memory Brain trusted gate semantics owner (v0.5.7) ---
// 纯计算：汇总 v0.5 可信记忆阶段的审查、纠错、冲突处理、传播和信任分状态；不访问 DOM、网络或平台存储。
(function registerMemoryBrainTrustedGateSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function lower(value) { return asText(value).toLowerCase(); }
    function number(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : (fallback || 0); }
    function unique(list) { const seen = new Set(); return asArray(list).map(asText).filter(Boolean).filter(item => { const key = item.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; }); }
    function active(item) { return item && !['retired', 'rolled-back', 'dismissed'].includes(lower(item.status)); }
    function openReview(item) { return item && !['confirmed', 'corrected', 'dismissed', 'rolled-back'].includes(lower(item.status)); }
    function isApplied(item) { return item && ['applied', 'active', 'resolved', 'propagated'].includes(lower(item.status)); }
    function recent(items) { return asArray(items).filter(item => item && item.createdAt).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null; }
    function addCheck(checks, input) {
        const status = input.status || 'passed';
        const severity = status === 'blocked' ? 'blocker' : status === 'warning' ? 'warning' : 'info';
        const check = Object.assign({ id: '', title: '', status, severity, count: 0, message: '', nextAction: '' }, input);
        checks.push(check);
        return check;
    }
    function trustStats(snapshot) {
        const records = asArray(snapshot.trustScoreRecords).filter(item => item && item.status !== 'rolled-back');
        const latestRun = recent(asArray(snapshot.trustScoreRuns).filter(item => item && item.status !== 'rolled-back'));
        const low = records.filter(item => ['low', 'critical'].includes(lower(item.level)) || number(item.score, 100) < 62);
        const critical = records.filter(item => lower(item.level) === 'critical' || number(item.score, 100) < 42);
        const byType = records.reduce((acc, record) => { const type = record.targetType || 'unknown'; acc[type] = (acc[type] || 0) + 1; return acc; }, {});
        return { records, latestRun, low, critical, byType };
    }
    function buildTrustedMemoryGateReport(snapshot, options = {}) {
        const state = snapshot || {};
        const checks = [];
        const openReviews = asArray(state.reviewInboxItems).filter(openReview);
        const needsEditReviews = openReviews.filter(item => lower(item.status) === 'needs-edit');
        const facts = asArray(state.facts).filter(active);
        const families = asArray(state.families).filter(active);
        const edges = asArray(state.edges).filter(active);
        const models = asArray(state.models).filter(active);
        const conflicts = asArray(state.conflicts).filter(item => item && !['resolved', 'dismissed', 'rolled-back', 'retired'].includes(lower(item.status)));
        const disputedFacts = facts.filter(fact => lower(fact.lifecycleStatus || fact.status) === 'disputed');
        const obsoleteActiveFacts = facts.filter(fact => ['duplicate', 'obsolete'].includes(lower(fact.lifecycleStatus)) && lower(fact.status) === 'active');
        const staleFamilies = families.filter(family => family && (family.needsSummaryRefresh || lower(family.propagationStatus).includes('stale') || lower(family.propagationStatus).includes('needs')));
        const staleEdges = edges.filter(edge => edge && (lower(edge.validationStatus).includes('needs') || lower(edge.validationStatus).includes('stale') || lower(edge.propagationStatus).includes('stale')));
        const staleModels = models.filter(model => model && (model.sourceStale || lower(model.reviewStatus).includes('needs') || lower(model.propagationStatus).includes('stale')));
        const trust = trustStats(state);
        const appliedCorrections = asArray(state.factCorrections).filter(isApplied);
        const appliedConflictResolutions = asArray(state.factConflictResolutions).filter(isApplied);
        const appliedFamilyAdjustments = asArray(state.familyAdjustments).filter(isApplied);
        const appliedModelCorrections = asArray(state.modelCorrections).filter(isApplied);
        const appliedPropagations = asArray(state.correctionPropagations).filter(isApplied);
        const latestPropagation = recent(appliedPropagations);
        const ownerState = state.ownerState || {};
        const requestedOwner = ownerState.requestedOwner || ownerState.formalOwner || 'legacy';
        const effectiveOwner = ownerState.effectiveOwner || ownerState.formalOwner || 'legacy';
        const trustedPassThreshold = number(options.trustedPassThreshold, 78) || 78;

        addCheck(checks, {
            id: 'review-inbox', title: '审查收件箱清理', count: openReviews.length,
            status: needsEditReviews.length ? 'blocked' : openReviews.length ? 'warning' : 'passed',
            message: openReviews.length ? `仍有 ${openReviews.length} 个审查项未处理，其中 ${needsEditReviews.length} 个待改写。` : '没有未处理审查项。',
            nextAction: needsEditReviews.length ? '先处理 needs-edit 审查项或明确忽略。' : openReviews.length ? '逐项确认、忽略或标记待改写。' : '保持。'
        });
        addCheck(checks, {
            id: 'fact-conflicts', title: '冲突事实清理', count: conflicts.length + disputedFacts.length,
            status: conflicts.length || disputedFacts.length ? 'blocked' : 'passed',
            message: conflicts.length || disputedFacts.length ? `仍有 ${conflicts.length} 个冲突组 / ${disputedFacts.length} 条 disputed 事实。` : '没有未解决冲突事实。',
            nextAction: '进入冲突事实处理，选择真实版本、条件保留或标记过时。'
        });
        addCheck(checks, {
            id: 'fact-lifecycle', title: '事实生命周期噪声', count: obsoleteActiveFacts.length,
            status: obsoleteActiveFacts.length ? 'warning' : 'passed',
            message: obsoleteActiveFacts.length ? `仍有 ${obsoleteActiveFacts.length} 条 active 事实带 duplicate / obsolete 标记。` : '事实生命周期状态没有明显噪声。',
            nextAction: '运行事实生命周期 / 冲突处理 / 事实纠错后再传播。'
        });
        addCheck(checks, {
            id: 'correction-coverage', title: '纠错动作覆盖', count: appliedCorrections.length + appliedConflictResolutions.length + appliedFamilyAdjustments.length + appliedModelCorrections.length,
            status: appliedCorrections.length || appliedConflictResolutions.length || appliedFamilyAdjustments.length || appliedModelCorrections.length ? 'passed' : 'warning',
            message: appliedCorrections.length || appliedConflictResolutions.length || appliedFamilyAdjustments.length || appliedModelCorrections.length ? '已经存在人工纠错 / 调整 / 模型修正记录。' : '还没有可信阶段人工纠错记录。',
            nextAction: '至少完成一轮审查和必要的纠错，避免全自动结果直接进入后续阶段。'
        });
        addCheck(checks, {
            id: 'propagation', title: '纠错影响传播', count: appliedPropagations.length,
            status: staleFamilies.length || staleEdges.length || staleModels.length ? 'warning' : appliedPropagations.length ? 'passed' : 'warning',
            message: staleFamilies.length || staleEdges.length || staleModels.length ? `仍有下游结构待刷新：family ${staleFamilies.length} / edge ${staleEdges.length} / model ${staleModels.length}。` : appliedPropagations.length ? '纠错影响已经传播到下游结构。' : '还没有纠错影响传播记录。',
            nextAction: '运行纠错影响传播或重建 family / graph / 长期模型。'
        });
        addCheck(checks, {
            id: 'trust-score', title: '记忆信任分覆盖', count: trust.records.length,
            status: trust.records.length ? (trust.critical.length ? 'warning' : 'passed') : 'blocked',
            message: trust.records.length ? `已有 ${trust.records.length} 条 trust score；低可信 ${trust.low.length}，高风险 ${trust.critical.length}。` : '还没有记忆信任分。',
            nextAction: trust.records.length ? '优先处理低可信 / 高风险项。' : '先运行记忆信任分。'
        });
        addCheck(checks, {
            id: 'structure-coverage', title: '结构覆盖度', count: facts.length + families.length + edges.length + models.length,
            status: facts.length && families.length && edges.length && models.length ? 'passed' : 'warning',
            message: `active facts ${facts.length} / families ${families.length} / edges ${edges.length} / models ${models.length}。`,
            nextAction: '缺少结构时回到 v0.4 历史回填、家族 graph 重建或长期模型重建。'
        });
        addCheck(checks, {
            id: 'owner-safety', title: '正式注入安全门', count: 1,
            status: effectiveOwner === 'legacy' && requestedOwner !== 'memoryBrain' ? 'passed' : 'warning',
            message: `requestedOwner=${requestedOwner}，effectiveOwner=${effectiveOwner}；v0.9 前 Memory Brain 不正式接管。`,
            nextAction: '保持 legacy 正式注入；Memory Brain 仅整理、预览和演练。'
        });

        const blockers = checks.filter(check => check.status === 'blocked');
        const warnings = checks.filter(check => check.status === 'warning');
        const hardPenalty = blockers.length * 22 + warnings.length * 7 + Math.min(25, trust.critical.length * 4) + Math.min(18, trust.low.length * 1.5);
        const readinessScore = Math.max(0, Math.min(100, Math.round(100 - hardPenalty)));
        const trustedReady = blockers.length === 0 && readinessScore >= trustedPassThreshold;
        const status = trustedReady ? (warnings.length ? 'trusted-with-warnings' : 'trusted-pass') : 'blocked';
        const nextActions = checks.filter(check => check.status !== 'passed').map(check => check.nextAction).filter(Boolean).slice(0, 8);
        return {
            id: options.id || '',
            kind: 'trusted-memory-gate',
            status,
            trustedReady,
            readinessScore,
            trustedPassThreshold,
            gateLevel: trustedReady ? (warnings.length ? 'warning' : 'pass') : 'blocked',
            checks,
            blockers: blockers.map(check => check.id),
            warnings: warnings.map(check => check.id),
            counts: {
                facts: facts.length,
                families: families.length,
                edges: edges.length,
                models: models.length,
                openReviews: openReviews.length,
                conflicts: conflicts.length,
                disputedFacts: disputedFacts.length,
                lowTrust: trust.low.length,
                criticalTrust: trust.critical.length,
                correctionCount: appliedCorrections.length,
                conflictResolutionCount: appliedConflictResolutions.length,
                familyAdjustmentCount: appliedFamilyAdjustments.length,
                modelCorrectionCount: appliedModelCorrections.length,
                propagationCount: appliedPropagations.length
            },
            latest: { trustRunId: trust.latestRun && trust.latestRun.id || '', propagationRunId: latestPropagation && latestPropagation.runId || latestPropagation && latestPropagation.id || '' },
            nextActions,
            formalPromptInjection: false,
            writesLegacyMemory: false,
            readyForFormalCutover: false,
            cutoverGate: 'blocked-until-v0.9',
            createdAt: options.createdAt || new Date().toISOString()
        };
    }
    function compactTrustedGateCheckForList(check) {
        return {
            id: check && check.id || '', title: check && check.title || '', status: check && check.status || 'unknown',
            severity: check && check.severity || '', count: check && check.count || 0, message: check && check.message || '', nextAction: check && check.nextAction || ''
        };
    }
    function compactTrustedGateReportForList(report) {
        return {
            id: report && report.id || '', status: report && report.status || '', readinessScore: report && report.readinessScore || 0,
            trustedReady: !!(report && report.trustedReady), blockerCount: asArray(report && report.blockers).length, warningCount: asArray(report && report.warnings).length,
            checks: asArray(report && report.checks).slice(0, 8).map(compactTrustedGateCheckForList), counts: report && report.counts || {}, cutoverGate: report && report.cutoverGate || 'blocked-until-v0.9', createdAt: report && report.createdAt || ''
        };
    }
    function compactTrustedGateRunForList(run) {
        return { id: run && run.id || '', status: run && run.status || '', readinessScore: run && run.readinessScore || 0, blockerCount: run && run.blockerCount || 0, warningCount: run && run.warningCount || 0, trustedReady: !!(run && run.trustedReady), createdAt: run && run.createdAt || '' };
    }
    core.memoryBrain.trustedGateSemantics = { buildTrustedMemoryGateReport, compactTrustedGateCheckForList, compactTrustedGateReportForList, compactTrustedGateRunForList };
})(OwoApp);
