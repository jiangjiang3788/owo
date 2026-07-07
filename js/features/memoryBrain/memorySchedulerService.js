// --- Memory Brain scheduler service owner (v0.3.7) ---
// 编排成本档、整理计划、浮现/衰减维护和回滚；不接正式 prompt，不触碰旧记忆写入。
(function registerMemorySchedulerService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function getCoreApi() { return app.core.memoryBrain.publicApi; }
    function recordOperation(label, data, level) {
        const service = app.platform.observability && app.platform.observability.operationTraceService;
        if (service && typeof service.recordOperation === 'function') return service.recordOperation({ source: 'features/memoryBrain', sourceModule: 'features/memoryBrain/memorySchedulerService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function getSchedulerCards(options = {}) {
        const platformApi = getPlatformApi();
        const scheduler = platformApi.getSchedulerSnapshot(options);
        const snapshot = platformApi.getSnapshot(options);
        const plan = getCoreApi().buildMaintenancePlan(snapshot, { profileId: scheduler.settings && scheduler.settings.costProfileId });
        return getCoreApi().compactSchedulerForList(scheduler.settings, plan, scheduler.runs, scheduler.queue);
    }
    function updateCostProfile(profileId, options = {}) {
        const platformApi = getPlatformApi();
        const profile = getCoreApi().getCostProfile(profileId || 'balanced');
        const result = platformApi.updateSchedulerSettings({ costProfileId: profile.id, dailyBudgetUnits: profile.dailyBudgetUnits, modelTier: profile.modelTier }, options);
        recordOperation('记忆脑成本档更新', { profileId: profile.id, dailyBudgetUnits: profile.dailyBudgetUnits, modelTier: profile.modelTier });
        return result;
    }
    function buildMaintenancePlan(options = {}) {
        const platformApi = getPlatformApi();
        const snapshot = platformApi.getSnapshot(options);
        const scheduler = platformApi.getSchedulerSnapshot(options);
        const profileId = options.profileId || scheduler.settings && scheduler.settings.costProfileId || 'balanced';
        recordOperation('记忆脑调度计划输入', { profileId, counts: { events: (snapshot.events || []).length, facts: (snapshot.facts || []).length, families: (snapshot.families || []).length, edges: (snapshot.edges || []).length, models: (snapshot.models || []).length } });
        const plan = getCoreApi().buildMaintenancePlan(snapshot, { profileId });
        const stored = platformApi.appendMaintenancePlanBatch({ input: { profileId, manual: true }, plan }, options);
        recordOperation('记忆脑调度计划应用结果', { profileId, queueCount: stored.queueItems.length, estimatedCostUnits: stored.run.estimatedCostUnits, dailyBudgetUnits: stored.run.dailyBudgetUnits });
        return stored;
    }
    function runMaintenanceCycle(options = {}) {
        const platformApi = getPlatformApi();
        const scheduler = platformApi.getSchedulerSnapshot(options);
        const profileId = options.profileId || scheduler.settings && scheduler.settings.costProfileId || 'balanced';
        const snapshot = platformApi.getSnapshot(options);
        recordOperation('记忆脑浮现衰减输入', { profileId, maxUpdates: options.maxUpdates || 300 });
        const pass = getCoreApi().collectWeightUpdates(snapshot, { profileId, maxUpdates: options.maxUpdates || 300, floatingTopN: scheduler.settings && scheduler.settings.floatingTopN || 8 });
        const stored = platformApi.appendMaintenanceCycleBatch({ input: { profileId, manual: true }, pass }, options);
        recordOperation('记忆脑浮现衰减应用结果', { profileId, changedCount: stored.changedCount, floatingCount: (stored.floating || []).length, batchId: stored.batch && stored.batch.id });
        return stored;
    }
    function rollbackLatestMaintenanceBatch(options = {}) {
        const platformApi = getPlatformApi();
        const snapshot = platformApi.getSnapshot(options);
        const batch = (snapshot.batches || []).find(item => item && item.kind === 'memory-maintenance' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的浮现/衰减维护批次');
        const result = platformApi.rollbackMaintenanceBatch(batch.id, options);
        recordOperation('记忆脑浮现衰减批次回滚', { batchId: batch.id, restoredCount: result.restoredCount });
        return result;
    }
    function getRoutingReport() {
        return {
            owner: 'features/memoryBrain/memorySchedulerService',
            release: 'v0.3.7',
            platformOwner: 'platform/memoryBrain.memoryScheduleStore',
            coreOwner: 'core/memoryBrain.weightSemantics',
            mode: 'shadow-scheduler',
            formalPromptInjection: false,
            legacyMode: 'read-only-source'
        };
    }

    feature.memorySchedulerService = { getSchedulerCards, updateCostProfile, buildMaintenancePlan, runMaintenanceCycle, rollbackLatestMaintenanceBatch, recordOperation, getRoutingReport };
})(window);
