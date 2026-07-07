// --- Memory Brain types owner (v0.4.7) ---
// 只定义长期记忆脑的数据形状、层级和迁移阶段；不访问运行时、网络或持久化。
(function registerMemoryBrainTypes(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    const SCHEMA_VERSION = 1;
    const RELEASE = 'v0.4.7';

    const LAYERS = Object.freeze([
        Object.freeze({ id: 'raw', name: '聊天原文层', goal: '所有发送、回复、附件和请求都可追溯。', status: 'legacy-source' }),
        Object.freeze({ id: 'archive', name: '历史归档层', goal: '扫描全部聊天，建立可切片、可续跑的大历史来源索引。', status: 'active-v0.4.4' }),
        Object.freeze({ id: 'event', name: '事件摘要层', goal: '把一段对话整理成真实时间线事件。', status: 'active-v0.3.1' }),
        Object.freeze({ id: 'fact', name: '原子事实层', goal: '复合记忆拆成可多归属的事实单元，并标记重复、冲突和过时状态。', status: 'active-v0.4.5' }),
        Object.freeze({ id: 'family', name: '记忆家族层', goal: '相似事实自动聚成主题家族并持续摘要。', status: 'active-v0.4.6' }),
        Object.freeze({ id: 'graph', name: 'Graph 关系层', goal: '人、事、主题、目的、情绪、项目互相连接。', status: 'active-v0.4.6' }),
        Object.freeze({ id: 'model', name: '长期模型层', goal: '形成用户画像、AI 自我、世界观、项目脑、互动偏好和关系连续性。', status: 'active-v0.4.7' }),
        Object.freeze({ id: 'injection', name: '注入包层', goal: '每次聊天前选择应该想起什么，并可预览。', status: 'active-v0.3.6' }),
        Object.freeze({ id: 'scheduler', name: '调度生命层', goal: '省钱/均衡/深度模式、整理队列、浮现和衰减。', status: 'active-v0.3.7' }),
        Object.freeze({ id: 'product', name: '记忆小屋收口层', goal: '把时间线、事实、家族、graph、模型、注入预览和导出路线收成长期可用 UI。', status: 'active-v0.3.8' })
    ]);

    const MIGRATION_STAGES = Object.freeze([
        Object.freeze({
            id: 'shadow',
            name: '影子模式',
            targetVersion: 'v0.3.0',
            goal: '新记忆脑只建结构、扫描旧来源，不参与聊天注入。',
            oldSystemMode: '继续工作',
            brainMode: '只读观察'
        }),
        Object.freeze({
            id: 'timeline',
            name: '时间线接管',
            targetVersion: 'v0.3.1',
            goal: '旧聊天历史被整理为事件时间线，但旧表格/向量仍是正式注入来源。',
            oldSystemMode: '正式注入',
            brainMode: '生成事件'
        }),
        Object.freeze({
            id: 'fact',
            name: '事实拆解',
            targetVersion: 'v0.3.2',
            goal: '事件被拆成原子事实候选，自动影子应用，并保留来源和批次回滚。',
            oldSystemMode: '正式注入',
            brainMode: '生成事实'
        }),
        Object.freeze({
            id: 'family',
            name: '家族成团',
            targetVersion: 'v0.3.3',
            goal: '事件拆成事实，事实自动聚成家族；仍不强行替换旧记忆。',
            oldSystemMode: '正式注入',
            brainMode: '整理和对照'
        }),

        Object.freeze({
            id: 'graph',
            name: '关系成网',
            targetVersion: 'v0.3.4',
            goal: '事实、家族、人物、主题、情绪、目的和项目建立轻量关系边；仍不做正式注入。',
            oldSystemMode: '正式注入',
            brainMode: '整理 graph'
        }),
        Object.freeze({
            id: 'model',
            name: '长期模型成形',
            targetVersion: 'v0.3.5',
            goal: '基于事件、事实、家族和 graph 生成用户画像、AI 自我、世界观、项目脑，并保留版本历史。',
            oldSystemMode: '正式注入',
            brainMode: '长期模型影子整理'
        }),
        Object.freeze({
            id: 'injection-shadow',
            name: '注入影子对照',
            targetVersion: 'v0.3.6',
            goal: '新旧系统同时生成注入预览，只让控制台对照差异，避免突然换脑。',
            oldSystemMode: '正式注入',
            brainMode: '影子注入'
        }),
        Object.freeze({
            id: 'scheduler',
            name: '调度和生命机制',
            targetVersion: 'v0.3.7',
            goal: '建立省钱/均衡/深度成本档、手动维护队列、浮现和衰减；仍不接正式 prompt。',
            oldSystemMode: '正式注入',
            brainMode: '影子调度和维护'
        }),
        Object.freeze({
            id: 'productization',
            name: '记忆小屋收口',
            targetVersion: 'v0.3.8',
            goal: '把已完成的事件、事实、家族、graph、长期模型、注入预览、调度和导出路线收成可长期使用的记忆小屋。',
            oldSystemMode: '正式注入',
            brainMode: '产品化影子脑'
        }),
        Object.freeze({
            id: 'history-archive',
            name: '历史大整理入口',
            targetVersion: 'v0.4.0',
            goal: '先扫描所有聊天来源、消息数量和时间范围，建立 archiveSources；仍不让 Memory Brain 正式注入。',
            oldSystemMode: '正式注入',
            brainMode: '历史来源索引'
        }),
        Object.freeze({
            id: 'history-chunks',
            name: '历史切片和游标',
            targetVersion: 'v0.4.1',
            goal: '把几万条历史消息切成带 overlap、可续跑、可重试的 archiveChunks，并为每个来源建立 cursor。',
            oldSystemMode: '正式注入',
            brainMode: '历史切片索引'
        }),
        Object.freeze({
            id: 'history-backfill',
            name: '历史回填队列',
            targetVersion: 'v0.4.2',
            goal: '把 archiveChunks 编入 backfillJobs / runs，支持暂停、继续、失败重试和断点续跑。',
            oldSystemMode: '正式注入',
            brainMode: '历史回填队列'
        }),
        Object.freeze({
            id: 'history-event-backfill',
            name: '历史事件回填',
            targetVersion: 'v0.4.3',
            goal: '从 archiveChunks 批量生成历史事件，保留来源消息范围，并推进 backfillJobs 断点状态。',
            oldSystemMode: '正式注入',
            brainMode: '历史事件时间线'
        }),
        Object.freeze({
            id: 'history-fact-backfill',
            name: '历史事实回填',
            targetVersion: 'v0.4.4',
            goal: '从历史事件批量拆出原子事实，保留事件证据、消息范围和回填批次。',
            oldSystemMode: '正式注入',
            brainMode: '历史原子事实'
        }),

        Object.freeze({
            id: 'fact-lifecycle',
            name: '事实生命周期清理',
            targetVersion: 'v0.4.5',
            goal: '对历史事实池做 duplicate / obsolete / disputed 标记，为全量家族和 graph 重建前清理噪声。',
            oldSystemMode: '正式注入',
            brainMode: '事实可信清理'
        }),
        Object.freeze({
            id: 'family-graph-rebuild',
            name: '全量家族 / graph 重建',
            targetVersion: 'v0.4.6',
            goal: '用清理后的 active facts 重建记忆家族和 graph，排除 duplicate / obsolete / disputed。',
            oldSystemMode: '正式注入',
            brainMode: '全历史关系结构重建'
        }),
        Object.freeze({
            id: 'history-model-rebuild',
            name: '全历史长期模型重建',
            targetVersion: 'v0.4.7',
            goal: '用清理后的 facts、全量 family 和 graph 重建用户画像、AI 自我、世界观、项目脑、互动偏好和关系连续性。',
            oldSystemMode: '正式注入',
            brainMode: '全历史长期模型影子重建'
        }),
        Object.freeze({
            id: 'cutover',
            name: '正式替换',
            targetVersion: 'v0.6+',
            goal: '新记忆脑通过连续稳定性检查后才成为唯一注入 owner，旧系统降为只读历史来源。',
            oldSystemMode: '只读兼容',
            brainMode: '正式注入'
        })
    ]);

    function createDefaultSettings() {
        return {
            release: RELEASE,
            schemaVersion: SCHEMA_VERSION,
            mode: 'shadow',
            familySimilarityThreshold: 0.7,
            familySummaryMinFacts: 5,
            processingMode: 'balanced',
            costProfileId: 'balanced',
            autoApplyPolicy: 'auto-with-rollback',
            legacyBridgeMode: 'read-only-source',
            currentStageId: 'history-model-rebuild'
        };
    }

    function createDefaultMemoryBrainState() {
        return {
            schemaVersion: SCHEMA_VERSION,
            release: RELEASE,
            settings: createDefaultSettings(),
            events: [],
            facts: [],
            families: [],
            edges: [],
            models: [],
            batches: [],
            injectionPreviews: [],
            scheduleQueue: [],
            schedulerRuns: [],
            exports: [],
            archiveSources: [],
            archiveScanRuns: [],
            archiveChunks: [],
            archiveCursors: [],
            archiveChunkRuns: [],
            backfillJobs: [],
            backfillRuns: [],
            historyEventBackfillRuns: [],
            historyFactBackfillRuns: [],
            factLifecycleRuns: [],
            familyGraphRebuildRuns: [],
            historyModelRebuildRuns: [],
            factMerges: [],
            conflicts: [],
            obsoleteFacts: [],
            lastBackfillRun: null,
            lastArchiveScan: null,
            lastArchiveChunkRun: null,
            lastHistoryModelRebuildRun: null,
            lastLegacyScan: null,
            createdAt: null,
            updatedAt: null
        };
    }

    function normalizeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeMemoryBrainState(value) {
        const base = createDefaultMemoryBrainState();
        const source = value && typeof value === 'object' ? value : {};
        return Object.assign(base, source, {
            schemaVersion: SCHEMA_VERSION,
            release: RELEASE,
            settings: Object.assign(createDefaultSettings(), source.settings || {}),
            events: normalizeArray(source.events),
            facts: normalizeArray(source.facts),
            families: normalizeArray(source.families),
            edges: normalizeArray(source.edges),
            models: normalizeArray(source.models),
            batches: normalizeArray(source.batches),
            injectionPreviews: normalizeArray(source.injectionPreviews),
            scheduleQueue: normalizeArray(source.scheduleQueue),
            schedulerRuns: normalizeArray(source.schedulerRuns),
            exports: normalizeArray(source.exports),
            archiveSources: normalizeArray(source.archiveSources),
            archiveScanRuns: normalizeArray(source.archiveScanRuns),
            archiveChunks: normalizeArray(source.archiveChunks),
            archiveCursors: normalizeArray(source.archiveCursors),
            archiveChunkRuns: normalizeArray(source.archiveChunkRuns),
            backfillJobs: normalizeArray(source.backfillJobs),
            backfillRuns: normalizeArray(source.backfillRuns),
            historyEventBackfillRuns: normalizeArray(source.historyEventBackfillRuns),
            historyFactBackfillRuns: normalizeArray(source.historyFactBackfillRuns),
            factLifecycleRuns: normalizeArray(source.factLifecycleRuns),
            familyGraphRebuildRuns: normalizeArray(source.familyGraphRebuildRuns),
            historyModelRebuildRuns: normalizeArray(source.historyModelRebuildRuns),
            factMerges: normalizeArray(source.factMerges),
            conflicts: normalizeArray(source.conflicts),
            obsoleteFacts: normalizeArray(source.obsoleteFacts),
            lastBackfillRun: source.lastBackfillRun || null,
            lastArchiveScan: source.lastArchiveScan || null,
            lastArchiveChunkRun: source.lastArchiveChunkRun || null,
            lastHistoryModelRebuildRun: source.lastHistoryModelRebuildRun || null,
            lastLegacyScan: source.lastLegacyScan || null
        });
    }

    function getLayerById(id) {
        return LAYERS.find(layer => layer.id === id) || null;
    }

    function getStageById(id) {
        return MIGRATION_STAGES.find(stage => stage.id === id) || MIGRATION_STAGES[0];
    }

    core.memoryBrain.types = {
        SCHEMA_VERSION,
        RELEASE,
        LAYERS,
        MIGRATION_STAGES,
        createDefaultSettings,
        createDefaultMemoryBrainState,
        normalizeMemoryBrainState,
        getLayerById,
        getStageById
    };
})(OwoApp);
