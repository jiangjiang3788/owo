// --- Memory Brain weight semantics owner (v0.3.7) ---
// 只负责调度、成本档、浮现/衰减的纯计算；不访问 DOM、网络、运行时状态、features 或 platform。
(function registerMemoryBrainWeightSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    const COST_PROFILES = Object.freeze([
        Object.freeze({
            id: 'economy', name: '省钱模式', dailyBudgetUnits: 8, modelTier: 'cheap-first',
            eventEveryMessages: 40, factMaxEvents: 1, familyMinNewFacts: 5, graphMaxEdges: 48, modelCadenceDays: 14, injectionPreviewLimit: 2,
            description: '只保留手动整理和轻维护，尽量少跑模型。适合日常聊天和省额度。'
        }),
        Object.freeze({
            id: 'balanced', name: '均衡模式', dailyBudgetUnits: 18, modelTier: 'cheap-structure-strong-model',
            eventEveryMessages: 24, factMaxEvents: 2, familyMinNewFacts: 3, graphMaxEdges: 96, modelCadenceDays: 7, injectionPreviewLimit: 4,
            description: '事件、事实、家族、graph 都能定期整理，长期模型保持低频重建。'
        }),
        Object.freeze({
            id: 'deep', name: '深度模式', dailyBudgetUnits: 36, modelTier: 'strong-for-reflection',
            eventEveryMessages: 12, factMaxEvents: 4, familyMinNewFacts: 2, graphMaxEdges: 160, modelCadenceDays: 2, injectionPreviewLimit: 6,
            description: '重要阶段或睡前深整理使用，允许更频繁重建长期模型。'
        })
    ]);
    const TASK_COSTS = Object.freeze({
        'weight-maintenance': 0,
        'event-summary': 2,
        'fact-extraction': 3,
        'family-clustering': 2,
        'graph-linking': 1,
        'long-term-model': 8,
        'injection-preview': 1
    });
    const HALF_LIFE_DAYS = Object.freeze({ event: 18, fact: 42, family: 90, edge: 35, model: 120, injectionPreview: 5 });

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clamp(value, min, max) { const number = Number(value); return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min; }
    function isoDay(value) {
        const time = Date.parse(value || '');
        return Number.isFinite(time) ? time : 0;
    }
    function daysBetween(from, to) {
        const start = isoDay(from);
        const end = isoDay(to) || Date.now();
        if (!start) return 0;
        return Math.max(0, (end - start) / 86400000);
    }
    function unique(list, max) {
        const seen = new Set();
        return asArray(list).map(asText).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, max || 100);
    }
    function getCostProfile(profileId) {
        return COST_PROFILES.find(profile => profile.id === profileId) || COST_PROFILES[1];
    }
    function normalizeSchedulerSettings(settings) {
        const source = settings && typeof settings === 'object' ? settings : {};
        const profile = getCostProfile(source.costProfileId || source.processingMode || 'balanced');
        return {
            release: 'v0.3.7',
            enabled: source.enabled !== false,
            mode: 'shadow-scheduler',
            costProfileId: profile.id,
            dailyBudgetUnits: Number(source.dailyBudgetUnits) || profile.dailyBudgetUnits,
            modelTier: source.modelTier || profile.modelTier,
            autoRunPolicy: source.autoRunPolicy || 'manual-confirm',
            backgroundQueueEnabled: source.backgroundQueueEnabled !== false,
            lastPlanAt: source.lastPlanAt || '',
            lastMaintenanceAt: source.lastMaintenanceAt || '',
            nextSuggestedAt: source.nextSuggestedAt || '',
            floatingTopN: Number(source.floatingTopN) || 8
        };
    }
    function hasOpenSignal(item) {
        if (!item) return false;
        return asArray(item.openThreads).length || asArray(item.openQuestions).length || asArray(item.unresolvedThreads).length || asArray(item.pendingActions).length || /open|pending|unresolved|todo|未完成|待确认/.test(asText(item.status) + asText(item.reviewStatus));
    }
    function evidenceCount(item, type) {
        if (!item) return 0;
        if (type === 'family') return asArray(item.factIds).length;
        if (type === 'model') return asArray(item.evidenceFactIds).length + asArray(item.familyIds).length;
        if (type === 'edge') return asArray(item.factIds).length + asArray(item.evidenceFactIds).length;
        if (type === 'injectionPreview') return asArray(item.selected && item.selected.factIds).length + asArray(item.selected && item.selected.modelIds).length;
        return asArray(item.evidenceFactIds).length + asArray(item.familyIds).length + asArray(item.edgeIds).length;
    }
    function baseImportance(item, type) {
        if (!item) return 0.4;
        const explicit = Number(item.weight || item.activation || item.importance || item.confidence);
        let base = Number.isFinite(explicit) ? (explicit > 1 ? explicit / 100 : explicit) : 0.55;
        if (type === 'model' && item.status === 'active') base += 0.16;
        if (type === 'family') base += Math.min(0.18, asArray(item.factIds).length * 0.025);
        if (type === 'edge') base += Math.min(0.12, asArray(item.factIds).length * 0.02);
        if (type === 'injectionPreview') base += Math.min(0.08, evidenceCount(item, type) * 0.01);
        return clamp(base, 0.05, 1);
    }
    function computeMemoryWeight(item, type, options = {}) {
        const now = options.now || new Date().toISOString();
        const ageDays = daysBetween(item && (item.updatedAt || item.createdAt), now);
        const halfLife = Number(options.halfLifeDays || HALF_LIFE_DAYS[type]) || 30;
        const freshness = Math.pow(0.5, ageDays / halfLife);
        const base = baseImportance(item, type);
        const openBonus = hasOpenSignal(item) ? 0.18 : 0;
        const evidenceBonus = Math.min(0.16, evidenceCount(item, type) * 0.018);
        const linkBonus = Math.min(0.12, asArray(item && item.familyIds).length * 0.035 + asArray(item && item.edgeIds).length * 0.012);
        const recentUseBonus = Math.min(0.1, Number(item && item.recallCount) ? Math.log2(Number(item.recallCount) + 1) * 0.025 : 0);
        const score = clamp(base * 0.52 + freshness * 0.22 + openBonus + evidenceBonus + linkBonus + recentUseBonus, 0, 1);
        const decay = clamp(1 - freshness, 0, 1);
        const flags = [];
        if (openBonus) flags.push('open-thread');
        if (evidenceBonus > 0.04) flags.push('evidenced');
        if (linkBonus > 0.04) flags.push('linked');
        if (decay > 0.55) flags.push('decayed');
        if (score >= 0.72) flags.push('floating');
        return { score, activation: score, freshness, decay, ageDays: Math.round(ageDays * 10) / 10, halfLifeDays: halfLife, reasonFlags: flags };
    }
    function itemUpdate(item, type, options) {
        if (!item || item.status === 'retired') return null;
        const result = computeMemoryWeight(item, type, options);
        return {
            id: item.id,
            type,
            title: asText(item.title || item.name || item.content || item.summary || item.relationLabel || item.type).slice(0, 120),
            before: { weight: item.weight, activation: item.activation, decay: item.decay, lastWeightAt: item.lastWeightAt },
            after: {
                weight: Math.round(result.score * 1000) / 1000,
                activation: Math.round(result.activation * 1000) / 1000,
                decay: Math.round(result.decay * 1000) / 1000,
                freshness: Math.round(result.freshness * 1000) / 1000,
                lastWeightAt: options.now,
                weightProfileId: options.profileId || 'balanced',
                weightReason: result.reasonFlags
            },
            score: result.score,
            reasonFlags: result.reasonFlags,
            ageDays: result.ageDays
        };
    }
    function collectWeightUpdates(snapshot, options = {}) {
        const now = options.now || new Date().toISOString();
        const profileId = options.profileId || (snapshot && snapshot.settings && (snapshot.settings.costProfileId || snapshot.settings.processingMode)) || 'balanced';
        const opt = Object.assign({}, options, { now, profileId });
        const updates = [];
        [
            ['events', 'event'], ['facts', 'fact'], ['families', 'family'], ['edges', 'edge'], ['models', 'model'], ['injectionPreviews', 'injectionPreview']
        ].forEach(([key, type]) => asArray(snapshot && snapshot[key]).forEach(item => { const update = itemUpdate(item, type, opt); if (update) updates.push(update); }));
        const maxUpdates = Number(options.maxUpdates) || 300;
        const selected = updates.sort((a, b) => b.score - a.score || String(a.type).localeCompare(String(b.type))).slice(0, maxUpdates);
        return {
            kind: 'weight-maintenance', profileId, createdAt: now, updateCount: selected.length,
            updates: selected,
            floating: selected.filter(update => update.score >= 0.72).slice(0, Number(options.floatingTopN) || 8)
        };
    }
    function latestBatchAt(snapshot, kind) {
        const batch = asArray(snapshot && snapshot.batches).filter(item => item && item.kind === kind && item.status === 'applied')
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
        return batch && (batch.updatedAt || batch.createdAt) || '';
    }
    function active(list) { return asArray(list).filter(item => item && item.status !== 'retired'); }
    function queueItem(kind, priority, reason, profile, extra) {
        return Object.assign({
            kind,
            priority: clamp(priority, 0, 1),
            costUnits: TASK_COSTS[kind] || 0,
            mode: 'shadow-queue',
            reason,
            suggestedAction: kind,
            runnable: true
        }, extra || {});
    }
    function buildMaintenancePlan(snapshot, options = {}) {
        const profile = getCostProfile(options.profileId || options.costProfileId || snapshot && snapshot.settings && (snapshot.settings.costProfileId || snapshot.settings.processingMode));
        const now = options.now || new Date().toISOString();
        const facts = active(snapshot && snapshot.facts);
        const families = active(snapshot && snapshot.families);
        const edges = active(snapshot && snapshot.edges);
        const events = asArray(snapshot && snapshot.events);
        const models = active(snapshot && snapshot.models).filter(model => model.status === 'active');
        const factEventIds = new Set(facts.map(fact => fact && fact.source && fact.source.eventId).filter(Boolean));
        const eventsWithoutFacts = events.filter(event => event && !factEventIds.has(event.id));
        const factsWithoutFamily = facts.filter(fact => !asArray(fact.familyIds).length);
        const edgeTarget = Math.min(profile.graphMaxEdges, Math.max(0, facts.length * 3 + families.length * 2));
        const latestModelAt = latestBatchAt(snapshot, 'long-term-model');
        const modelAgeDays = latestModelAt ? daysBetween(latestModelAt, now) : 999;
        const queue = [queueItem('weight-maintenance', 1, '每次维护先刷新权重、浮现和衰减；不消耗模型。', profile)];
        if (eventsWithoutFacts.length) queue.push(queueItem('fact-extraction', 0.9, `${eventsWithoutFacts.length} 个事件还没有拆成事实。`, profile, { targetCount: Math.min(eventsWithoutFacts.length, profile.factMaxEvents) }));
        if (factsWithoutFamily.length >= profile.familyMinNewFacts) queue.push(queueItem('family-clustering', 0.82, `${factsWithoutFamily.length} 条事实还没有进入记忆家族。`, profile, { targetCount: factsWithoutFamily.length }));
        if (families.length && edges.length < edgeTarget) queue.push(queueItem('graph-linking', 0.7, `当前关系边 ${edges.length} 条，低于本档建议 ${edgeTarget} 条。`, profile, { targetCount: edgeTarget - edges.length }));
        if (models.length < 4 || modelAgeDays >= profile.modelCadenceDays) queue.push(queueItem('long-term-model', models.length < 4 ? 0.86 : 0.64, models.length < 4 ? '四类长期模型还不完整。' : `长期模型已 ${Math.round(modelAgeDays)} 天未重建。`, profile, { modelAgeDays }));
        const messageCount = snapshot && snapshot.lastLegacyScan && snapshot.lastLegacyScan.totals && Number(snapshot.lastLegacyScan.totals.messages) || 0;
        if (messageCount && messageCount > Math.max(profile.eventEveryMessages, events.length * profile.eventEveryMessages)) queue.push(queueItem('event-summary', 0.58, '旧聊天来源有新增整理空间，建议手动生成事件时间线。', profile));
        if (models.length || facts.length) queue.push(queueItem('injection-preview', 0.5, '已有可召回内容，建议定期生成影子注入预览做对照。', profile, { targetCount: profile.injectionPreviewLimit }));
        let spent = 0;
        const selected = queue.sort((a, b) => b.priority - a.priority).map((item, index) => Object.assign({ id: `schedule-${kindSafe(item.kind)}-${index + 1}` }, item)).filter(item => {
            if (item.kind === 'weight-maintenance') return true;
            if (spent + item.costUnits > profile.dailyBudgetUnits) { item.runnable = false; item.reason += '；超过今日成本档预算，先排队。'; return true; }
            spent += item.costUnits;
            return true;
        });
        return {
            release: 'v0.3.7', createdAt: now, profile, dailyBudgetUnits: profile.dailyBudgetUnits,
            estimatedCostUnits: selected.reduce((sum, item) => sum + (item.runnable ? item.costUnits : 0), 0),
            queueItems: selected,
            stats: { eventCount: events.length, factCount: facts.length, familyCount: families.length, edgeCount: edges.length, modelCount: models.length, eventsWithoutFacts: eventsWithoutFacts.length, factsWithoutFamily: factsWithoutFamily.length },
            policy: { previewOnly: true, formalPromptInjection: false, manualConfirm: true, noLegacyWrite: true }
        };
    }
    function kindSafe(kind) { return asText(kind).replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'task'; }
    function compactSchedulerForList(settings, plan, runs, queue) {
        const normalized = normalizeSchedulerSettings(settings);
        const profile = getCostProfile(normalized.costProfileId);
        const runList = asArray(runs).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 8);
        const queueList = asArray(queue || plan && plan.queueItems).slice(0, 12);
        return {
            settings: normalized,
            profile,
            costProfiles: COST_PROFILES.map(item => Object.assign({}, item)),
            queueItems: queueList,
            runs: runList,
            floating: asArray(plan && plan.floating).slice(0, normalized.floatingTopN),
            summary: plan ? { estimatedCostUnits: plan.estimatedCostUnits, dailyBudgetUnits: plan.dailyBudgetUnits, stats: plan.stats } : null
        };
    }

    core.memoryBrain.weightSemantics = { COST_PROFILES, TASK_COSTS, normalizeSchedulerSettings, getCostProfile, computeMemoryWeight, collectWeightUpdates, buildMaintenancePlan, compactSchedulerForList };
})(OwoApp);
