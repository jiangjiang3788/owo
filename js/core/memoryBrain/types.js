// --- Memory Brain types owner (v0.3.0) ---
// 只定义长期记忆脑的数据形状、层级和迁移阶段；不访问运行时、网络或持久化。
(function registerMemoryBrainTypes(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    const SCHEMA_VERSION = 1;
    const RELEASE = 'v0.3.0';

    const LAYERS = Object.freeze([
        Object.freeze({ id: 'raw', name: '聊天原文层', goal: '所有发送、回复、附件和请求都可追溯。', status: 'legacy-source' }),
        Object.freeze({ id: 'event', name: '事件摘要层', goal: '把一段对话整理成真实时间线事件。', status: 'planned-v0.3.1' }),
        Object.freeze({ id: 'fact', name: '原子事实层', goal: '复合记忆拆成可多归属的事实单元。', status: 'planned-v0.3.2' }),
        Object.freeze({ id: 'family', name: '记忆家族层', goal: '相似事实自动聚成主题家族并持续摘要。', status: 'planned-v0.3.3' }),
        Object.freeze({ id: 'graph', name: 'Graph 关系层', goal: '人、事、主题、目的、情绪互相连接。', status: 'planned-v0.3.4' }),
        Object.freeze({ id: 'model', name: '长期模型层', goal: '形成用户画像、AI 自我、世界观和项目脑。', status: 'planned-v0.3.5' }),
        Object.freeze({ id: 'injection', name: '注入包层', goal: '每次聊天前选择应该想起什么，并可预览。', status: 'planned-v0.3.6' })
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
            id: 'family',
            name: '家族成团',
            targetVersion: 'v0.3.3',
            goal: '事件拆成事实，事实自动聚成家族；仍不强行替换旧记忆。',
            oldSystemMode: '正式注入',
            brainMode: '整理和对照'
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
            id: 'cutover',
            name: '正式替换',
            targetVersion: 'v0.3.7+',
            goal: '新记忆脑通过稳定性检查后成为唯一注入 owner，旧系统降为导入和查看来源。',
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
            autoApplyPolicy: 'auto-with-rollback',
            legacyBridgeMode: 'read-only-source',
            currentStageId: 'shadow'
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
            release: source.release || RELEASE,
            settings: Object.assign(createDefaultSettings(), source.settings || {}),
            events: normalizeArray(source.events),
            facts: normalizeArray(source.facts),
            families: normalizeArray(source.families),
            edges: normalizeArray(source.edges),
            models: normalizeArray(source.models),
            batches: normalizeArray(source.batches),
            injectionPreviews: normalizeArray(source.injectionPreviews),
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
