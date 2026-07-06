// --- Memory Brain service owner (v0.3.0) ---
// 编排记忆脑 App 的扫描、状态读取和控制台记录；不直接渲染 DOM。
(function registerMemoryBrainService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    const model = feature.model;

    function getPlatformApi() {
        return app.platform.memoryBrain.publicApi;
    }

    function recordOperation(label, data, level) {
        const service = app.platform.observability && app.platform.observability.operationTraceService;
        if (service && typeof service.recordOperation === 'function') {
            return service.recordOperation({
                source: 'features/memoryBrain',
                sourceModule: 'features/memoryBrain/service',
                label,
                level: level || 'event',
                data: data || {}
            });
        }
        return null;
    }

    function getDashboard(options = {}) {
        const platformApi = getPlatformApi();
        const snapshot = platformApi.getSnapshot(options);
        const replacementPlan = platformApi.getReplacementPlan();
        const legacyScan = options.forceScan ? platformApi.scanLegacySources(options) : null;
        return model.buildDashboard(snapshot, legacyScan, replacementPlan);
    }

    function scanLegacySources(options = {}) {
        const platformApi = getPlatformApi();
        const report = platformApi.rememberLegacyScan(options);
        recordOperation('记忆脑扫描旧记忆来源', {
            chatCount: report.chatCount,
            totals: report.totals,
            sources: report.sources
        });
        return report;
    }

    function getReplacementAnswer() {
        return [
            '新记忆脑不是立刻替换旧系统。v0.3.0 到 v0.3.5 都属于影子整理和对照阶段。',
            '到 v0.3.6 先做注入影子对照：旧系统仍然正式注入，新系统只生成注入预览，控制台对比差异。',
            '只有当事件、事实、家族、graph、长期模型和注入预览连续稳定后，v0.3.7+ 才切为唯一注入 owner。',
            '切换后旧记忆表格、向量记忆、回忆日记不再双写，只作为只读来源和历史查看入口。'
        ].join('\n');
    }

    function getHistorySortingAnswer() {
        return [
            '历史整理分批进行，不一次性全吞。先按聊天、角色、时间范围切成批次。',
            '每批先生成事件摘要，保留来源消息范围；再拆原子事实；再做向量和关键词索引。',
            '事实可以进入多个记忆家族，家族超过阈值后更新摘要；graph 负责连接人、事、主题、目的和情绪。',
            '所有批次都写入控制台，能看到原始输出、解析错误、应用结果，也能回滚。'
        ].join('\n');
    }

    function copyPlanningText() {
        const text = [
            '【什么时候替换旧记忆系统】',
            getReplacementAnswer(),
            '',
            '【如何避免双系统】',
            '只允许一个正式注入 owner。v0.3.0 起旧系统是 read-only source，新系统先是 shadow brain；切换前不双写、不双注入。',
            '',
            '【历史记录怎么整理】',
            getHistorySortingAnswer()
        ].join('\n');
        if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
            global.navigator.clipboard.writeText(text);
        }
        recordOperation('复制记忆脑替换与历史整理计划', { textLength: text.length });
        return text;
    }

    function openConsole() {
        const quickDock = app.features.quickDock && app.features.quickDock.publicApi;
        const opener = quickDock && (quickDock.openConsolePanel || quickDock.openConsole || quickDock.openRequestPanel);
        if (typeof opener === 'function') return opener.call(quickDock, { source: 'memoryBrain' });
        return false;
    }

    function getRoutingReport() {
        return {
            owner: 'features/memoryBrain/service',
            release: 'v0.3.0',
            platformOwner: 'platform/memoryBrain.publicApi',
            consoleOwner: 'platform/observability.operationTraceService',
            legacyMode: 'read-only-source',
            replacementPolicy: 'single injection owner after shadow comparison'
        };
    }

    feature.service = {
        getDashboard,
        scanLegacySources,
        getReplacementAnswer,
        getHistorySortingAnswer,
        copyPlanningText,
        openConsole,
        recordOperation,
        getRoutingReport
    };
})(window);
