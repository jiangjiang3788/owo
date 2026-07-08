// --- Memory Brain UI group semantics (v0.5.0) ---
// 纯语义：定义记忆脑页面功能分组和默认折叠状态。
(function registerMemoryBrainUiGroupSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    const GROUPS = Object.freeze([
        Object.freeze({ id: 'history', title: '历史整理室', description: '扫描、切片、回填队列、历史事件和历史事实。', defaultOpen: true }),
        Object.freeze({ id: 'quality', title: '整理质量和重建', description: '可信审查、事实生命周期、全量家族 / graph、长期模型重建和接管演练。', defaultOpen: true }),
        Object.freeze({ id: 'owner', title: '单一 owner 安全门', description: '查看 legacy / memoryBrain / off 三态切换门，v0.9 前只预览不接管。', defaultOpen: true }),
        Object.freeze({ id: 'daily', title: '日常记忆脑', description: '最近聊天整理、事实、家族、graph、模型、注入预览和调度。', defaultOpen: false }),
        Object.freeze({ id: 'overview', title: '路线和结构', description: '完整计划、九层结构、替换路线和旧来源说明。', defaultOpen: false })
    ]);

    function normalizeGroupPrefs(value) {
        const source = value && typeof value === 'object' ? value : {};
        const normalized = {};
        GROUPS.forEach(group => {
            normalized[group.id] = typeof source[group.id] === 'boolean' ? source[group.id] : !!group.defaultOpen;
        });
        return normalized;
    }

    function buildGroupCards(prefs) {
        const normalized = normalizeGroupPrefs(prefs);
        return GROUPS.map(group => Object.assign({}, group, { open: normalized[group.id] }));
    }

    core.memoryBrain.uiGroupSemantics = { GROUPS, normalizeGroupPrefs, buildGroupCards };
})(OwoApp);
