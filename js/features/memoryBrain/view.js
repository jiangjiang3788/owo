(function registerMemoryBrainView(global) { const app = global.OwoApp, feature = app.features.memoryBrain, service = feature.service; function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); } function renderLayerCards(cards) {
        return cards.map(card => `
            <article class="memory-brain-layer-card" data-layer="${escapeHtml(card.id)}">
                <div class="memory-brain-layer-top"><span>${escapeHtml(card.name)}</span><strong>${escapeHtml(card.countText)}</strong></div>
                <p>${escapeHtml(card.goal)}</p><small>${escapeHtml(card.status)}</small>
            </article>`).join(''); }
    function renderReplacementCards(cards) {
        return cards.map(card => `
            <article class="memory-brain-stage-card">
                <div class="memory-brain-stage-index">${card.index}</div>
                <div><h3>${escapeHtml(card.name)} <span>${escapeHtml(card.targetVersion)}</span></h3>
                <p>${escapeHtml(card.goal)}</p>
                <div class="memory-brain-stage-modes"><em>旧系统：${escapeHtml(card.oldSystemMode)}</em><em>新记忆脑：${escapeHtml(card.brainMode)}</em></div></div>
            </article>`).join(''); }
    function renderPlanCards(cards) {
        return cards.map(card => `
            <article class="memory-brain-plan-card" data-status="${escapeHtml(card.status)}">
                <span>${escapeHtml(card.version)}</span><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.result)}</p>
            </article>`).join(''); }
    function renderLegacyScan(scan) {
        if (!scan) return `<div class="memory-brain-empty">还没有扫描旧记忆来源。点“扫描旧记忆源”后，只统计来源，不迁移、不写入旧系统。</div>`;
        const sources = (scan.sources || []).map(source => `<div class="memory-brain-source-pill"><span>${escapeHtml(source.name)}</span><strong>${escapeHtml(source.count)}</strong><small>${escapeHtml(source.mode)}</small></div>`).join('');
        const topChats = (scan.topChats || []).map(chat => `<li><span>${escapeHtml(chat.name)}</span><em>${escapeHtml(chat.messageCount)} 条消息 · ${escapeHtml(chat.vectorEntryCount)} 向量 · ${escapeHtml(chat.tableCellCount)} 表格项</em></li>`).join('');
        return `<div class="memory-brain-scan-grid">${sources}</div><ul class="memory-brain-chat-list">${topChats || '<li><span>暂无聊天来源</span><em></em></li>'}</ul>`;
    }
    function buildHtml(dashboard) {
        const timelineHtml = feature.timelineView && feature.timelineView.renderTimeline ? feature.timelineView.renderTimeline(dashboard.timelineEvents) : '<div class="memory-brain-empty">时间线视图尚未加载。</div>';
        const factHtml = feature.factView && feature.factView.renderFactList ? feature.factView.renderFactList(dashboard.factCards) : '<div class="memory-brain-empty">事实视图尚未加载。</div>';
        const familyHtml = feature.familyView && feature.familyView.renderFamilyList ? feature.familyView.renderFamilyList(dashboard.familyCards) : '<div class="memory-brain-empty">家族视图尚未加载。</div>';
        const graphHtml = feature.graphView && feature.graphView.renderGraphList ? feature.graphView.renderGraphList(dashboard.graphCards) : '<div class="memory-brain-empty">Graph 视图尚未加载。</div>';
        const modelHtml = feature.modelView && feature.modelView.renderModelList ? feature.modelView.renderModelList(dashboard.modelCards) : '<div class="memory-brain-empty">长期模型视图尚未加载。</div>';
        const injectionHtml = feature.injectionView && feature.injectionView.renderInjectionList ? feature.injectionView.renderInjectionList(dashboard.injectionPreviewCards) : '<div class="memory-brain-empty">注入预览视图尚未加载。</div>';
        const schedulerHtml = feature.schedulerView && feature.schedulerView.renderSchedulerPanel ? feature.schedulerView.renderSchedulerPanel(dashboard.schedulerCards) : '<div class="memory-brain-empty">调度视图尚未加载。</div>';
        const palaceHtml = feature.memoryPalaceView && feature.memoryPalaceView.renderMemoryPalace ? feature.memoryPalaceView.renderMemoryPalace(dashboard.palaceCards, dashboard.exportCards) : '<div class="memory-brain-empty">记忆小屋视图尚未加载。</div>';
        const archiveHtml = feature.historyArchiveView && feature.historyArchiveView.renderHistoryArchivePanel ? feature.historyArchiveView.renderHistoryArchivePanel(dashboard.archiveCards) : '<div class="memory-brain-empty">历史归档视图尚未加载。</div>';
        const chunkHtml = feature.historyChunkView && feature.historyChunkView.renderHistoryChunkPanel ? feature.historyChunkView.renderHistoryChunkPanel(dashboard.chunkCards) : '<div class="memory-brain-empty">历史切片视图尚未加载。</div>';
        const backfillHtml = feature.historyBackfillView && feature.historyBackfillView.renderHistoryBackfillPanel ? feature.historyBackfillView.renderHistoryBackfillPanel(dashboard.backfillCards) : '<div class="memory-brain-empty">回填队列视图尚未加载。</div>';
        const eventBackfillHtml = feature.historyEventBackfillView && feature.historyEventBackfillView.renderHistoryEventBackfillPanel ? feature.historyEventBackfillView.renderHistoryEventBackfillPanel(dashboard.eventBackfillCards) : '<div class="memory-brain-empty">历史事件回填视图尚未加载。</div>';
        const factBackfillHtml = feature.historyFactBackfillView && feature.historyFactBackfillView.renderHistoryFactBackfillPanel ? feature.historyFactBackfillView.renderHistoryFactBackfillPanel(dashboard.factBackfillCards) : '<div class="memory-brain-empty">历史事实回填视图尚未加载。</div>';
        const lifecycleHtml = feature.factLifecycleView && feature.factLifecycleView.renderFactLifecyclePanel ? feature.factLifecycleView.renderFactLifecyclePanel(dashboard.factLifecycleCards) : '<div class="memory-brain-empty">事实生命周期视图尚未加载。</div>';
        const rebuildHtml = feature.familyGraphRebuildView && feature.familyGraphRebuildView.renderFamilyGraphRebuildPanel ? feature.familyGraphRebuildView.renderFamilyGraphRebuildPanel(dashboard.familyGraphRebuildCards) : '<div class="memory-brain-empty">全量重建视图尚未加载。</div>';
        const historyModelHtml = feature.historyModelRebuildView && feature.historyModelRebuildView.renderHistoryModelRebuildPanel ? feature.historyModelRebuildView.renderHistoryModelRebuildPanel(dashboard.historyModelRebuildCards) : '<div class="memory-brain-empty">全历史长期模型重建视图尚未加载。</div>';
        const cutoverHtml = feature.cutoverRehearsalView && feature.cutoverRehearsalView.renderCutoverRehearsalPanel ? feature.cutoverRehearsalView.renderCutoverRehearsalPanel(dashboard.cutoverCards) : '<div class="memory-brain-empty">接管演练视图尚未加载。</div>';
        const ownerGateHtml = feature.ownerGateView && feature.ownerGateView.renderOwnerGatePanel ? feature.ownerGateView.renderOwnerGatePanel(dashboard.ownerGateCards) : '<div class="memory-brain-empty">owner 切换门视图尚未加载。</div>';
        const reviewInboxHtml = feature.reviewInboxView && feature.reviewInboxView.renderReviewInboxPanel ? feature.reviewInboxView.renderReviewInboxPanel(dashboard.reviewInboxCards) : '<div class="memory-brain-empty">记忆审查收件箱视图尚未加载。</div>';
        const correctionHtml = feature.factCorrectionView && feature.factCorrectionView.renderFactCorrectionPanel ? feature.factCorrectionView.renderFactCorrectionPanel(dashboard.factCorrectionCards) : '<div class="memory-brain-empty">事实纠错视图尚未加载。</div>';
        const conflictHtml = feature.factConflictView && feature.factConflictView.renderFactConflictPanel ? feature.factConflictView.renderFactConflictPanel(dashboard.factConflictCards) : '<div class="memory-brain-empty">冲突事实处理视图尚未加载。</div>';
        const familyAdjustmentHtml = feature.familyAdjustmentView && feature.familyAdjustmentView.renderFamilyAdjustmentPanel ? feature.familyAdjustmentView.renderFamilyAdjustmentPanel(dashboard.familyAdjustmentCards) : '<div class="memory-brain-empty">家族调整视图尚未加载。</div>';
        const modelCorrectionHtml = feature.modelCorrectionView && feature.modelCorrectionView.renderModelCorrectionPanel ? feature.modelCorrectionView.renderModelCorrectionPanel(dashboard.modelCorrectionCards) : '<div class="memory-brain-empty">长期模型修正视图尚未加载。</div>';
        const propagationHtml = feature.correctionPropagationView && feature.correctionPropagationView.renderCorrectionPropagationPanel ? feature.correctionPropagationView.renderCorrectionPropagationPanel(dashboard.propagationCards) : '<div class="memory-brain-empty">纠错影响传播视图尚未加载。</div>';
        const trustScoreHtml = feature.trustScoreView && feature.trustScoreView.renderMemoryTrustScorePanel ? feature.trustScoreView.renderMemoryTrustScorePanel(dashboard.trustScoreCards) : '<div class="memory-brain-empty">记忆信任分视图尚未加载。</div>';
        const trustedGateHtml = feature.trustedGateView && feature.trustedGateView.renderTrustedGatePanel ? feature.trustedGateView.renderTrustedGatePanel(dashboard.trustedGateCards) : '<div class="memory-brain-empty">可信记忆 gate 视图尚未加载。</div>';
        const formalAdapterHtml = feature.formalInjectionAdapterView && feature.formalInjectionAdapterView.renderFormalInjectionAdapterPanel ? feature.formalInjectionAdapterView.renderFormalInjectionAdapterPanel(dashboard.formalAdapterCards) : '<div class="memory-brain-empty">正式注入 adapter 视图尚未加载。</div>';
        const realtimeTraceHtml = feature.realtimeInjectionTraceView && feature.realtimeInjectionTraceView.renderRealtimeInjectionTracePanel ? feature.realtimeInjectionTraceView.renderRealtimeInjectionTracePanel(dashboard.realtimeTraceCards) : '<div class="memory-brain-empty">实时注入 trace 视图尚未加载。</div>';
        const legacyReadOnlyHtml = feature.legacyReadOnlyView && feature.legacyReadOnlyView.renderLegacyReadOnlyPanel ? feature.legacyReadOnlyView.renderLegacyReadOnlyPanel(dashboard.legacyReadOnlyCards) : '<div class="memory-brain-empty">旧系统只读降级视图尚未加载。</div>';
        const ownerRecoveryHtml = feature.ownerRecoveryView && feature.ownerRecoveryView.renderOwnerRecoveryPanel ? feature.ownerRecoveryView.renderOwnerRecoveryPanel(dashboard.ownerRecoveryCards) : '<div class="memory-brain-empty">一键关闭 / 回退视图尚未加载。</div>'; 
        return `
            <header class="app-header memory-brain-header">
                <button class="back-btn" data-target="home-screen">‹</button>
                <div class="title-container"><h1 class="title">记忆脑</h1><p class="memory-brain-subtitle">v0.6.4 · 一键关闭 / 回退演练 · 旧表格记忆仍可总结</p></div>
                <button class="action-btn" id="memory-brain-open-console-btn">控制台</button>
            </header>
            <main class="memory-brain-page">
                <section class="memory-brain-hero">
                    <div><span class="memory-brain-kicker">Memory Brain</span><h2>进入旧系统只读降级演练阶段，检查旧日记 / 表格 / 向量未来作为只读历史来源的准备度。</h2>
                    <p>v0.6.3 只写降级准备报告、运行记录和批次，不改 chat.memoryMode，不禁用旧档案记忆；到 v0.9 前正式注入仍由当前旧记忆 owner 执行。</p></div>
                    <div class="memory-brain-hero-stats"><strong>${escapeHtml(dashboard.eventCount || 0)}</strong><span>时间线事件</span><strong>${escapeHtml(dashboard.archiveSourceCount || 0)}</strong><span>历史来源</span><strong>${escapeHtml(dashboard.archiveChunkCount || 0)}</strong><span>历史切片</span><strong>${escapeHtml(dashboard.backfillJobCount || 0)}</strong><span>回填任务</span><strong>${escapeHtml(dashboard.factCount || 0)}</strong><span>原子事实</span><strong>${escapeHtml(dashboard.familyCount || 0)}</strong><span>记忆家族</span><strong>${escapeHtml(dashboard.edgeCount || 0)}</strong><span>关系边</span><strong>${escapeHtml(dashboard.modelCount || 0)}</strong><span>长期模型</span><strong>${escapeHtml(dashboard.injectionPreviewCount || 0)}</strong><span>注入预览</span><strong>${escapeHtml(dashboard.cutoverReportCount || 0)}</strong><span>接管报告</span><strong>${escapeHtml(dashboard.ownerSwitchRunCount || 0)}</strong><span>owner 门</span><strong>${escapeHtml(dashboard.reviewInboxCount || 0)}</strong><span>待审记忆</span><strong>${escapeHtml(dashboard.factCorrectionCount || 0)}</strong><span>事实改写</span><strong>${escapeHtml(dashboard.factConflictCount || 0)}</strong><span>待处理冲突</span><strong>${escapeHtml(dashboard.familyAdjustmentCount || 0)}</strong><span>家族调整</span><strong>${escapeHtml(dashboard.modelCorrectionCount || 0)}</strong><span>模型修正</span><strong>${escapeHtml(dashboard.correctionPropagationCount || 0)}</strong><span>影响传播</span><strong>${escapeHtml(dashboard.trustScoreCount || 0)}</strong><span>信任分</span><strong>${escapeHtml(dashboard.trustedGateReportCount || 0)}</strong><span>可信 gate</span><strong>${escapeHtml(dashboard.formalInjectionAdapterReportCount || 0)}</strong><span>adapter</span><strong>${escapeHtml(dashboard.realtimeInjectionTraceReportCount || 0)}</strong><span>trace</span><strong>${escapeHtml(dashboard.legacyReadOnlyReportCount || 0)}</strong><span>只读演练</span><strong>${escapeHtml(dashboard.ownerRecoveryReportCount || 0)}</strong><span>回退演练</span><strong>${escapeHtml(dashboard.scheduleQueueCount || 0)}</strong><span>整理队列</span><strong>${escapeHtml(dashboard.exportCount || 0)}</strong><span>导出记录</span></div>
                </section>
                <section class="memory-brain-actions memory-brain-archive-actions">
                    <label class="memory-brain-limit-field"><span>切片消息数</span><input id="memory-brain-archive-chunk-input" type="number" min="20" max="200" value="60"></label>
                    <label class="memory-brain-limit-field"><span>重叠消息</span><input id="memory-brain-archive-overlap-input" type="number" min="0" max="40" value="8"></label>
                    <label class="memory-brain-limit-field"><span>最少消息</span><input id="memory-brain-archive-min-input" type="number" min="0" max="500" value="0"></label>
                    <label class="memory-brain-limit-field"><span>来源上限</span><input id="memory-brain-archive-source-limit-input" type="number" min="0" max="9999" value="0"></label>
                    <button id="memory-brain-scan-archive-btn">扫描全部历史</button><button id="memory-brain-prepare-chunks-btn">准备历史切片</button><button id="memory-brain-build-backfill-btn">建立回填队列</button><button id="memory-brain-rollback-chunks-btn">撤回最近切片</button><button id="memory-brain-open-console-archive-btn">看扫描 trace</button>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-archive-status"></div>
                <section class="memory-brain-section memory-brain-archive-section"><div class="memory-brain-section-title"><h2>历史整理室 / 历史源扫描</h2><p>先回答一共有多少聊天、多少消息、时间范围和预计切片数。</p></div>${archiveHtml}</section>
                <section class="memory-brain-section memory-brain-chunk-section"><div class="memory-brain-section-title"><h2>历史切片 / 游标</h2><p>把几万条消息切成可恢复的小块，给每个来源建立 pending / running / done / failed 游标。v0.4.1 不跑 AI。</p></div>${chunkHtml}</section>
                <section class="memory-brain-actions memory-brain-backfill-actions">
                    <label class="memory-brain-limit-field"><span>任务上限</span><input id="memory-brain-backfill-limit-input" type="number" min="1" max="5000" value="200"></label>
                    <label class="memory-brain-limit-field"><span>任务类型</span><select id="memory-brain-backfill-task-select"><option value="event-backfill">历史事件回填</option><option value="fact-backfill">历史事实回填</option><option value="family-rebuild">全量家族重建</option><option value="graph-rebuild">全量 graph 重建</option><option value="model-rebuild">长期模型重建</option></select></label>
                    <button id="memory-brain-start-backfill-btn">开始一批</button><button id="memory-brain-run-event-backfill-btn">回填历史事件</button><button id="memory-brain-run-fact-backfill-btn">回填历史事实</button><button id="memory-brain-pause-backfill-btn">暂停队列</button><button id="memory-brain-resume-backfill-btn">继续队列</button><button id="memory-brain-retry-backfill-btn">重试失败</button><button id="memory-brain-rollback-backfill-btn">撤回最近回填队列</button><button id="memory-brain-rollback-history-events-btn">撤回最近历史事件</button><button id="memory-brain-rollback-history-facts-btn">撤回最近历史事实</button>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-backfill-status"></div>
                <section class="memory-brain-section memory-brain-backfill-section"><div class="memory-brain-section-title"><h2>回填队列 / 断点续跑</h2><p>把 archiveChunks 编入 backfillJobs，支持暂停、继续、重试和批次回滚。v0.4.2 只建队列；v0.4.3 生成历史事件；v0.4.4 运行 fact-backfill 任务并生成历史事实。</p></div>${backfillHtml}</section>
                <section class="memory-brain-section memory-brain-event-backfill-section"><div class="memory-brain-section-title"><h2>历史事件回填</h2><p>把 running 的 event-backfill 任务整理成历史事件，作为历史事实回填的上游。</p></div>${eventBackfillHtml}</section>
                <section class="memory-brain-section memory-brain-fact-backfill-section"><div class="memory-brain-section-title"><h2>历史事实回填</h2><p>把历史事件拆成可追溯的 atomic facts，继续 shadow，不改旧记忆。</p></div>${factBackfillHtml}</section>
                <section class="memory-brain-actions memory-brain-lifecycle-actions">
                    <label class="memory-brain-limit-field"><span>重复阈值%</span><input id="memory-brain-lifecycle-threshold-input" type="number" min="70" max="99" value="90"></label>
                    <button id="memory-brain-run-lifecycle-btn">清理重复 / 冲突 / 过时事实</button><button id="memory-brain-rollback-lifecycle-btn">撤回最近清理</button>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-lifecycle-status"></div>
                <section class="memory-brain-section memory-brain-lifecycle-section"><div class="memory-brain-section-title"><h2>事实生命周期</h2><p>标记 duplicate / disputed / obsolete，保留 batch 和回滚；不合并进旧记忆。</p></div>${lifecycleHtml}</section>
                <section class="memory-brain-actions memory-brain-rebuild-actions">
                    <label class="memory-brain-limit-field"><span>家族最少事实</span><input id="memory-brain-rebuild-family-min-input" type="number" min="1" max="8" value="2"></label>
                    <label class="memory-brain-limit-field"><span>最多关系边</span><input id="memory-brain-rebuild-edge-max-input" type="number" min="24" max="260" value="180"></label>
                    <button id="memory-brain-rebuild-family-graph-btn">全量重建家族 / Graph</button><button id="memory-brain-rollback-rebuild-btn">撤回最近全量重建</button>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-rebuild-status"></div>
                <section class="memory-brain-section memory-brain-rebuild-section"><div class="memory-brain-section-title"><h2>全量家族 / Graph 重建</h2><p>只基于 active facts，自动排除 duplicate / obsolete / disputed。会先 reset 新脑 family/graph，再批次化重建，仍不接正式 prompt。</p></div>${rebuildHtml}</section>
                <section class="memory-brain-actions memory-brain-history-model-actions">
                    <label class="memory-brain-limit-field"><span>证据事实上限</span><input id="memory-brain-history-model-max-facts-input" type="number" min="24" max="320" value="160"></label>
                    <label class="memory-brain-limit-field"><span>家族上限</span><input id="memory-brain-history-model-max-families-input" type="number" min="6" max="80" value="42"></label>
                    <label class="memory-brain-limit-field"><span>关系上限</span><input id="memory-brain-history-model-max-edges-input" type="number" min="12" max="220" value="120"></label>
                    <button id="memory-brain-rebuild-history-models-btn">全历史重建长期模型</button><button id="memory-brain-rollback-history-models-btn">撤回最近全历史模型</button>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-history-model-status"></div>
                <section class="memory-brain-section memory-brain-history-model-section"><div class="memory-brain-section-title"><h2>全历史长期模型重建</h2><p>基于清理后的 facts、全量家族和 graph 生成 6 个长期模型。继续保持 shadow，不接正式 prompt。</p></div>${historyModelHtml}</section>
                <section class="memory-brain-actions memory-brain-cutover-actions"><div class="memory-brain-injection-input-row"><textarea id="memory-brain-cutover-query-input" class="memory-brain-injection-query" placeholder="输入接管演练测试问题；留空时使用当前聊天最后一条用户消息。"></textarea><div class="memory-brain-injection-button-row"><button id="memory-brain-run-cutover-btn">运行新旧注入对照</button><button id="memory-brain-rollback-cutover-btn">撤回最近演练</button><button id="memory-brain-open-console-cutover-btn">看接管 trace</button></div></div></section>
                <div class="memory-brain-inline-status" id="memory-brain-cutover-status"></div><section class="memory-brain-section memory-brain-cutover-section"><div class="memory-brain-section-title"><h2>新旧注入对照 / 接管演练</h2><p>同一输入下比较旧正式记忆 owner 和 Memory Brain shadow 注入包，生成漏召回、重复召回和接管风险报告。readyForFormalCutover 仍固定为 false。</p></div>${cutoverHtml}</section>
                <section class="memory-brain-actions memory-brain-owner-actions"><button id="memory-brain-owner-legacy-btn">请求 legacy owner</button><button id="memory-brain-owner-brain-btn">请求 Memory Brain</button><button id="memory-brain-owner-off-btn">请求关闭注入</button><button id="memory-brain-rollback-owner-btn">撤回最近 owner 门</button></section>
                <div class="memory-brain-inline-status" id="memory-brain-owner-status"></div>
                <section class="memory-brain-section memory-brain-owner-section"><div class="memory-brain-section-title"><h2>单一 owner 切换门</h2><p>只允许一个正式记忆 owner。v0.4.9 只记录切换演练和回退；Memory Brain 正式接管仍被阻止到 v0.9。</p></div>${ownerGateHtml}</section>
                <section class="memory-brain-actions memory-brain-formal-adapter-actions"><button id="memory-brain-run-formal-adapter-btn">运行 adapter 演练</button><button id="memory-brain-rollback-formal-adapter-btn">撤回最近 adapter</button><button id="memory-brain-open-console-formal-adapter-btn">看 adapter trace</button></section><div class="memory-brain-inline-status" id="memory-brain-formal-adapter-status"></div><section class="memory-brain-section memory-brain-formal-adapter-section"><div class="memory-brain-section-title"><h2>正式注入 adapter</h2><p>统一 legacy / Memory Brain / off 三态的唯一 memory block 出口。v0.6.0 只做演练和报告，不接正式 prompt。</p></div>${formalAdapterHtml}</section>
                <section class="memory-brain-actions memory-brain-realtime-trace-actions"><button id="memory-brain-run-realtime-trace-btn">生成实时注入 trace</button><button id="memory-brain-rollback-realtime-trace-btn">撤回最近 trace</button><button id="memory-brain-open-console-realtime-trace-btn">看注入 trace</button></section><div class="memory-brain-inline-status" id="memory-brain-realtime-trace-status"></div><section class="memory-brain-section memory-brain-realtime-trace-section"><div class="memory-brain-section-title"><h2>实时注入 trace</h2><p>解释每次候选记忆为什么命中、为什么未命中、为什么被裁剪，以及为什么仍由 legacy 正式注入。</p></div>${realtimeTraceHtml}</section>
                <section class="memory-brain-actions memory-brain-legacy-readonly-actions"><button id="memory-brain-run-legacy-readonly-btn">生成只读降级报告</button><button id="memory-brain-rollback-legacy-readonly-btn">撤回最近只读演练</button><button id="memory-brain-open-console-legacy-readonly-btn">看只读降级 trace</button></section><div class="memory-brain-inline-status" id="memory-brain-legacy-readonly-status"></div><section class="memory-brain-section memory-brain-legacy-readonly-section"><div class="memory-brain-section-title"><h2>旧系统只读降级</h2><p>检查旧档案 / 日记 / 向量未来作为只读历史来源的准备度。v0.9 前只演练，不改正式 owner。</p></div>${legacyReadOnlyHtml}</section>
                <section class="memory-brain-actions memory-brain-owner-recovery-actions"><button id="memory-brain-disable-shadow-btn">一键关闭影子候选</button><button id="memory-brain-enable-shadow-btn">恢复影子预览</button><button id="memory-brain-restore-legacy-btn">一键回退 legacy</button><button id="memory-brain-owner-off-preview-btn">关闭注入演练</button><button id="memory-brain-rollback-owner-recovery-btn">撤回最近回退</button></section><div class="memory-brain-inline-status" id="memory-brain-owner-recovery-status"></div><section class="memory-brain-section memory-brain-owner-recovery-section"><div class="memory-brain-section-title"><h2>一键关闭 / 回退</h2><p>只控制 Memory Brain 影子注入候选和 owner 演练；如果当前聊天使用档案 / 表格记忆，旧表格记忆仍可自动总结。</p></div>${ownerRecoveryHtml}</section>
                <section class="memory-brain-actions memory-brain-review-actions"><label class="memory-brain-limit-field"><span>低置信阈值%</span><input id="memory-brain-review-confidence-input" type="number" min="30" max="90" value="58"></label><button id="memory-brain-build-review-btn">生成审查收件箱</button><button id="memory-brain-rollback-review-btn">撤回最近审查</button><button id="memory-brain-open-console-review-btn">看审查 trace</button></section>
                <div class="memory-brain-inline-status" id="memory-brain-review-status"></div>
                <section class="memory-brain-section memory-brain-review-section"><div class="memory-brain-section-title"><h2>可信记忆审查收件箱</h2><p>汇总低置信、重复、冲突、过时事实和待确认长期模型。这里先审查，不改旧记忆，不正式注入。</p></div>${reviewInboxHtml}</section>
                <section class="memory-brain-actions memory-brain-correction-actions"><button id="memory-brain-apply-correction-btn">应用事实改写</button><button id="memory-brain-rollback-correction-btn">撤回最近改写</button><button id="memory-brain-open-console-correction-btn">看改写 trace</button></section>
                <div class="memory-brain-inline-status" id="memory-brain-correction-status"></div>
                <section class="memory-brain-section memory-brain-correction-section"><div class="memory-brain-section-title"><h2>事实纠错 / 改写</h2><p>从审查收件箱的 needs-edit 项或手动 Fact ID 改写事实。保留来源、证据、家族/graph 连接、版本历史和回滚批次。</p></div>${correctionHtml}</section>
                <section class="memory-brain-actions memory-brain-conflict-actions"><button id="memory-brain-apply-conflict-btn">应用冲突处理</button><button id="memory-brain-rollback-conflict-btn">撤回最近冲突处理</button><button id="memory-brain-open-console-conflict-btn">看冲突 trace</button></section>
                <div class="memory-brain-inline-status" id="memory-brain-conflict-status"></div>
                <section class="memory-brain-section memory-brain-conflict-section"><div class="memory-brain-section-title"><h2>冲突事实处理</h2><p>对 disputed facts 选择真实版本、条件保留、标记过时或忽略误报。所有处理只写 Memory Brain，可回滚。</p></div>${conflictHtml}</section>
                <section class="memory-brain-actions memory-brain-family-adjust-actions"><button id="memory-brain-apply-family-adjust-btn">应用家族调整</button><button id="memory-brain-rollback-family-adjust-btn">撤回最近家族调整</button><button id="memory-brain-open-console-family-adjust-btn">看家族调整 trace</button></section><div class="memory-brain-inline-status" id="memory-brain-family-adjust-status"></div><section class="memory-brain-section memory-brain-family-adjust-section"><div class="memory-brain-section-title"><h2>家族合并 / 拆分</h2><p>合并近似家族、拆分误聚家族、手动改名，并保留成员变更和回滚批次。</p></div>${familyAdjustmentHtml}</section>
                <section class="memory-brain-actions memory-brain-model-correction-actions"><button id="memory-brain-apply-model-correction-btn">应用模型修正</button><button id="memory-brain-rollback-model-correction-btn">撤回最近模型修正</button><button id="memory-brain-open-console-model-correction-btn">看模型修正 trace</button></section><div class="memory-brain-inline-status" id="memory-brain-model-correction-status"></div><section class="memory-brain-section memory-brain-model-correction-section"><div class="memory-brain-section-title"><h2>长期模型人工修正</h2><p>修正用户画像、AI 自我、世界观、项目脑、互动偏好和关系连续性。每次修正生成新 active 版本，旧版本 superseded，可回滚。</p></div>${modelCorrectionHtml}</section>
                <section class="memory-brain-actions memory-brain-propagation-actions"><button id="memory-brain-apply-propagation-btn">应用纠错影响传播</button><button id="memory-brain-rollback-propagation-btn">撤回最近传播</button><button id="memory-brain-open-console-propagation-btn">看传播 trace</button></section><div class="memory-brain-inline-status" id="memory-brain-propagation-status"></div><section class="memory-brain-section memory-brain-propagation-section"><div class="memory-brain-section-title"><h2>纠错影响传播</h2><p>把事实改写、冲突处理、家族调整和模型修正传播到受影响的 family / graph / model / review inbox。只做标记和回滚批次，不接正式 prompt。</p></div>${propagationHtml}</section>
                <section class="memory-brain-actions memory-brain-trust-actions"><button id="memory-brain-run-trust-btn">计算记忆信任分</button><button id="memory-brain-rollback-trust-btn">撤回最近信任分</button><button id="memory-brain-open-console-trust-btn">看信任分 trace</button></section><div class="memory-brain-inline-status" id="memory-brain-trust-status"></div><section class="memory-brain-section memory-brain-trust-section"><div class="memory-brain-section-title"><h2>记忆信任分</h2><p>根据证据、置信度、冲突状态、修正历史、传播状态和来源新鲜度，为 facts / families / graph / models 生成可解释 trust score。</p></div>${trustScoreHtml}</section>
                <section class="memory-brain-actions memory-brain-trusted-actions"><button id="memory-brain-run-trusted-gate-btn">运行可信记忆 gate</button><button id="memory-brain-rollback-trusted-gate-btn">撤回最近可信 gate</button><button id="memory-brain-open-console-trusted-gate-btn">看可信 gate trace</button></section><div class="memory-brain-inline-status" id="memory-brain-trusted-gate-status"></div><section class="memory-brain-section memory-brain-trusted-section"><div class="memory-brain-section-title"><h2>可信记忆 gate</h2><p>统一检查审查收件箱、事实纠错、冲突处理、家族调整、模型修正、纠错传播和信任分；只收口可信阶段，不打开正式注入。</p></div>${trustedGateHtml}</section>
                <section class="memory-brain-actions memory-brain-event-actions"><label class="memory-brain-limit-field"><span>最近消息</span><input id="memory-brain-event-limit-input" type="number" min="2" max="120" value="30"></label><button id="memory-brain-generate-event-btn">整理最近聊天</button><button id="memory-brain-scan-btn">扫描旧记忆源</button><button id="memory-brain-open-console-inline-btn">看控制台</button></section>
                <div class="memory-brain-inline-status" id="memory-brain-event-status"></div>
                <section class="memory-brain-actions memory-brain-fact-actions">
                    <label class="memory-brain-limit-field"><span>最多事实</span><input id="memory-brain-fact-max-input" type="number" min="1" max="18" value="8"></label>
                    <button id="memory-brain-extract-facts-btn">从事件提取事实</button><button id="memory-brain-rollback-facts-btn">撤回最近事实批次</button><button id="memory-brain-copy-plan-btn">复制完整计划</button>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-fact-status"></div>
                <section class="memory-brain-actions memory-brain-family-actions">
                    <label class="memory-brain-limit-field"><span>新家族最少事实</span><input id="memory-brain-family-min-input" type="number" min="1" max="8" value="2"></label>
                    <button id="memory-brain-organize-families-btn">整理记忆家族</button><button id="memory-brain-rollback-family-btn">撤回最近家族批次</button>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-family-status"></div>
                <section class="memory-brain-actions memory-brain-graph-actions">
                    <label class="memory-brain-limit-field"><span>最多关系边</span><input id="memory-brain-graph-max-input" type="number" min="12" max="220" value="120"></label>
                    <button id="memory-brain-build-graph-btn">建立关系图谱</button><button id="memory-brain-rollback-graph-btn">撤回最近 graph 批次</button>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-graph-status"></div>
                <section class="memory-brain-actions memory-brain-model-actions">
                    <label class="memory-brain-limit-field"><span>最多证据事实</span><input id="memory-brain-model-max-facts-input" type="number" min="8" max="80" value="48"></label>
                    <button id="memory-brain-build-models-btn">生成长期模型</button><button id="memory-brain-rollback-model-btn">撤回最近模型批次</button>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-model-status"></div>
                <section class="memory-brain-actions memory-brain-injection-actions">
                    <div class="memory-brain-injection-input-row">
                        <textarea id="memory-brain-injection-query-input" class="memory-brain-injection-query" placeholder="输入当前聊天问题；留空时会尝试使用当前聊天最后一条用户消息。"></textarea>
                        <div class="memory-brain-injection-button-row"><button id="memory-brain-build-injection-btn">生成影子注入预览</button><button id="memory-brain-rollback-injection-btn">撤回最近预览批次</button><button id="memory-brain-open-console-injection-btn">看注入 trace</button></div>
                    </div>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-injection-status"></div>
                <section class="memory-brain-actions memory-brain-palace-actions">
                    <button id="memory-brain-copy-export-btn">复制导出包</button><button id="memory-brain-rollback-export-btn">撤回最近导出记录</button><button id="memory-brain-open-console-export-btn">看导出 trace</button>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-palace-status"></div>
                <section class="memory-brain-section memory-brain-palace-section"><div class="memory-brain-section-title"><h2>记忆小屋 / 产品化收口</h2><p>把事件、事实、家族、graph、长期模型、注入预览、调度和导出路线放进一个能长期查看的入口。</p></div>${palaceHtml}</section>
                <section class="memory-brain-section memory-brain-scheduler-section"><div class="memory-brain-section-title"><h2>调度 / 成本 / 浮现衰减</h2><p>这里设置省钱、均衡、深度三档，并生成手动确认的整理队列。运行维护只更新新记忆脑权重，不接正式 prompt。</p></div>${schedulerHtml}</section>
                <section class="memory-brain-section memory-brain-injection-section"><div class="memory-brain-section-title"><h2>注入预览</h2><p>这里展示新记忆脑本次准备注入的内容，并和旧记忆来源只读对照。v0.4.8 仍不接正式 prompt。</p></div>${injectionHtml}</section>
                <section class="memory-brain-section memory-brain-model-section"><div class="memory-brain-section-title"><h2>长期模型</h2><p>用户画像、AI 自我、世界观、项目脑、互动偏好和关系连续性在这里以版本卡片展示。现在只是影子模型，不接正式聊天注入。</p></div>${modelHtml}</section>
                <section class="memory-brain-section memory-brain-graph-section"><div class="memory-brain-section-title"><h2>Graph 关系网</h2><p>手机端先用关系卡片，不做重 canvas。每条边都能看到来源事实、家族和为什么连接。</p></div>${graphHtml}</section>
                <section class="memory-brain-section memory-brain-family-section"><div class="memory-brain-section-title"><h2>记忆家族</h2><p>事实不再孤立，会按相似度聚成自然主题簇。家族名由 AI 命名；没有 API 时也会用关键词 fallback。</p></div>${familyHtml}</section>
                <section class="memory-brain-section memory-brain-timeline-section"><div class="memory-brain-section-title"><h2>事件时间线</h2><p>每张卡片都保留来源消息范围。事件是事实、家族和 graph 的上游。</p></div>${timelineHtml}</section>
                <section class="memory-brain-section memory-brain-fact-section"><div class="memory-brain-section-title"><h2>原子事实候选</h2><p>AI 自动把复合事件拆成小事实，保存 subject / predicate / object、证据、置信度和来源。现在仍只是影子记忆。</p></div>${factHtml}</section>
                <section class="memory-brain-section memory-brain-plan-section"><div class="memory-brain-section-title"><h2>完整 v0.3.x 计划</h2><p>不是固定分类柜，而是聊天原文 → 事件 → 事实 → 家族 → graph → 长期模型 → 注入预览的生长路线。</p></div><div class="memory-brain-plan-grid">${renderPlanCards(dashboard.planCards)}</div></section>
                <section class="memory-brain-section memory-brain-layer-section"><div class="memory-brain-section-title"><h2>九层记忆结构</h2><p>分类不写死，只固定生长流程：事件 → 事实 → 家族 → graph → 长期模型 → 注入包 → 调度生命层 → 记忆小屋收口层。</p></div><div class="memory-brain-layer-grid">${renderLayerCards(dashboard.layerCards)}</div></section>
                <section class="memory-brain-section memory-brain-replacement-section"><div class="memory-brain-section-title"><h2>旧系统什么时候被替换</h2><p>替换不是时间点，而是 gate：新记忆脑能稳定整理、对照、注入后才接管。</p></div><div class="memory-brain-stage-list">${renderReplacementCards(dashboard.replacementCards)}</div></section>
                <section class="memory-brain-section memory-brain-history-plan-section"><div class="memory-brain-section-title"><h2>历史记录怎么整理</h2><p>历史不会一次性全吞，先分批生成事件，再拆事实，再聚家族和 graph。</p></div>${renderLegacyScan(dashboard.legacyScan)}</section>
                <section class="memory-brain-section memory-brain-note"><h2>避免双系统的规则</h2><p>v0.5.4 新增长期模型人工修正。legacy / memoryBrain / off 仍只做安全门演练；旧表格、旧向量、旧日记继续作为正式注入 owner，新记忆脑只写入 memoryBrain.* 影子状态，仍不参与正式 prompt 注入。</p></section>
            </main>`;
    }
    function showToast(text) { const toast = app.shared && app.shared.ui && app.shared.ui.toast; if (toast && typeof toast.showToast === 'function') toast.showToast(text); }
    function setStatus(screen, id, text, kind) { const el = screen.querySelector(id); if (el) { el.textContent = text || ''; el.dataset.kind = kind || ''; } }
    function bindFactRetireButtons(screen) { screen.querySelectorAll('.memory-brain-fact-retire-btn').forEach(btn => btn.addEventListener('click', () => { service.retireFact(btn.getAttribute('data-fact-id')); showToast('已撤回这条事实候选'); render(); }));
    }
    function bindFamilyRetireButtons(screen) { screen.querySelectorAll('.memory-brain-family-retire-btn').forEach(btn => btn.addEventListener('click', () => { service.retireFamily(btn.getAttribute('data-family-id')); showToast('已撤回这个记忆家族'); render(); }));
    }
    function bindGraphRetireButtons(screen) { screen.querySelectorAll('.memory-brain-graph-retire-btn').forEach(btn => btn.addEventListener('click', () => { service.retireEdge(btn.getAttribute('data-edge-id')); showToast('已撤回这条 graph 关系'); render(); }));
    }
    function bindModelRetireButtons(screen) { screen.querySelectorAll('.memory-brain-model-retire-btn').forEach(btn => btn.addEventListener('click', () => { service.retireModel(btn.getAttribute('data-model-id')); showToast('已撤回这个长期模型'); render(); }));
    }
    function bindInjectionPreviewRetireButtons(screen) { screen.querySelectorAll('.memory-brain-injection-retire-btn').forEach(btn => btn.addEventListener('click', () => { service.retireInjectionPreview(btn.getAttribute('data-preview-id')); showToast('已撤回这个注入预览'); render(); }));
    }
    function bindAsyncButton(screen, buttonId, statusId, workingText, handler) {
        const btn = screen.querySelector(buttonId);
        if (!btn) return;
        btn.addEventListener('click', async () => {
            btn.disabled = true; setStatus(screen, statusId, workingText, 'working');
            try { await handler(); render(); }
            catch (error) { setStatus(screen, statusId, error && error.message ? error.message : '操作失败', 'error'); showToast(error && error.message ? error.message : '操作失败'); btn.disabled = false; }
        });
    }
    function bindEvents(screen) {
        const scanBtn = screen.querySelector('#memory-brain-scan-btn');
        if (scanBtn) scanBtn.addEventListener('click', () => { service.scanLegacySources(); render(); showToast('已扫描旧记忆来源，不会迁移或改写旧系统'); });
        screen.querySelectorAll('#memory-brain-open-console-btn, #memory-brain-open-console-inline-btn, #memory-brain-open-console-injection-btn, #memory-brain-open-console-export-btn, #memory-brain-open-console-archive-btn, #memory-brain-open-console-cutover-btn, #memory-brain-open-console-review-btn, #memory-brain-open-console-correction-btn, #memory-brain-open-console-conflict-btn, #memory-brain-open-console-family-adjust-btn, #memory-brain-open-console-model-correction-btn, #memory-brain-open-console-propagation-btn, #memory-brain-open-console-trust-btn, #memory-brain-open-console-trusted-gate-btn, #memory-brain-open-console-formal-adapter-btn, #memory-brain-open-console-realtime-trace-btn, #memory-brain-open-console-legacy-readonly-btn').forEach(btn => btn.addEventListener('click', () => service.openConsole()));
        bindAsyncButton(screen, '#memory-brain-scan-archive-btn', '#memory-brain-archive-status', '正在扫描全部聊天来源，只建立历史索引，不跑 AI…', async () => {
            const chunkInput = screen.querySelector('#memory-brain-archive-chunk-input');
            const overlapInput = screen.querySelector('#memory-brain-archive-overlap-input');
            const minInput = screen.querySelector('#memory-brain-archive-min-input');
            const result = await service.scanHistoryArchive({ chunkSize: chunkInput ? Number(chunkInput.value) || 60 : 60, overlap: overlapInput ? Number(overlapInput.value) || 8 : 8, minMessages: minInput ? Number(minInput.value) || 0 : 0 });
            showToast(`已扫描 ${result.sources && result.sources.length || 0} 个历史来源，预计 ${result.run && result.run.estimatedChunkCount || 0} 个切片`);
        });
        bindAsyncButton(screen, '#memory-brain-prepare-chunks-btn', '#memory-brain-archive-status', '正在准备历史切片和游标，只写 archiveChunks，不跑 AI…', async () => {
            const chunkInput = screen.querySelector('#memory-brain-archive-chunk-input');
            const overlapInput = screen.querySelector('#memory-brain-archive-overlap-input');
            const minInput = screen.querySelector('#memory-brain-archive-min-input');
            const sourceLimitInput = screen.querySelector('#memory-brain-archive-source-limit-input');
            const result = await service.prepareArchiveChunks({ chunkSize: chunkInput ? Number(chunkInput.value) || 60 : 60, overlap: overlapInput ? Number(overlapInput.value) || 8 : 8, minMessages: minInput ? Number(minInput.value) || 0 : 0, sourceLimit: sourceLimitInput ? Number(sourceLimitInput.value) || 0 : 0 });
            showToast(`已准备 ${result.chunks && result.chunks.length || 0} 个历史切片，${result.cursors && result.cursors.length || 0} 个游标`);
        });
        bindAsyncButton(screen, '#memory-brain-build-backfill-btn', '#memory-brain-backfill-status', '正在建立历史回填队列，只写 backfillJobs，不跑 AI…', async () => {
            const limitInput = screen.querySelector('#memory-brain-backfill-limit-input');
            const taskSelect = screen.querySelector('#memory-brain-backfill-task-select');
            const result = await service.prepareBackfillQueue({ jobLimit: limitInput ? Number(limitInput.value) || 200 : 200, taskKind: taskSelect ? taskSelect.value : 'event-backfill' });
            showToast(`已建立 ${result.jobs && result.jobs.length || 0} 个回填任务`);
        });
        bindAsyncButton(screen, '#memory-brain-start-backfill-btn', '#memory-brain-backfill-status', '正在标记一批回填任务为 running，仍不跑 AI…', async () => {
            const limitInput = screen.querySelector('#memory-brain-backfill-limit-input');
            const taskSelect = screen.querySelector('#memory-brain-backfill-task-select');
            const result = await service.startBackfillQueue({ limit: limitInput ? Number(limitInput.value) || 20 : 20, taskKind: taskSelect ? taskSelect.value : 'event-backfill' });
            showToast(`已开始 ${result.jobs && result.jobs.length || 0} 个回填任务`);
        });
        bindAsyncButton(screen, '#memory-brain-run-event-backfill-btn', '#memory-brain-backfill-status', '正在回填历史事件，会调用 memory-event 模型，但仍不接正式 prompt…', async () => {
            const limitInput = screen.querySelector('#memory-brain-backfill-limit-input');
            const result = await service.runHistoryEventBackfill({ limit: limitInput ? Math.min(Number(limitInput.value) || 3, 20) : 3 });
            showToast(`已回填 ${result.events && result.events.length || 0} 条历史事件`);
        });
        bindAsyncButton(screen, '#memory-brain-run-fact-backfill-btn', '#memory-brain-backfill-status', '正在回填历史事实，会调用 memory-fact 模型，但仍不接正式 prompt…', async () => {
            const limitInput = screen.querySelector('#memory-brain-backfill-limit-input');
            const maxFactsInput = screen.querySelector('#memory-brain-fact-max-input');
            const result = await service.runHistoryFactBackfill({ limit: limitInput ? Math.min(Number(limitInput.value) || 3, 20) : 3, maxFacts: maxFactsInput ? Number(maxFactsInput.value) || 8 : 8 });
            showToast(`已回填 ${result.facts && result.facts.length || 0} 条历史事实`);
        });
        bindAsyncButton(screen, '#memory-brain-pause-backfill-btn', '#memory-brain-backfill-status', '正在暂停回填队列…', async () => {
            const result = await service.pauseBackfillQueue({ limit: 5000 });
            showToast(`已暂停 ${result.jobs && result.jobs.length || 0} 个回填任务`);
        });
        bindAsyncButton(screen, '#memory-brain-resume-backfill-btn', '#memory-brain-backfill-status', '正在恢复已暂停的回填任务…', async () => {
            const result = await service.resumeBackfillQueue({ limit: 5000 });
            showToast(`已恢复 ${result.jobs && result.jobs.length || 0} 个回填任务`);
        });
        bindAsyncButton(screen, '#memory-brain-retry-backfill-btn', '#memory-brain-backfill-status', '正在重新排队失败的回填任务…', async () => {
            const result = await service.retryFailedBackfillJobs({ limit: 5000 });
            showToast(`已重试 ${result.jobs && result.jobs.length || 0} 个失败任务`);
        });
        const rollbackChunkBtn = screen.querySelector('#memory-brain-rollback-chunks-btn');
        if (rollbackChunkBtn) rollbackChunkBtn.addEventListener('click', () => { try { const result = service.rollbackLatestArchiveChunkBatch(); showToast(`已撤回最近历史切片：${result.chunkCount || 0} 个切片`); render(); } catch (error) { setStatus(screen, '#memory-brain-archive-status', error.message, 'error'); showToast(error.message); } });
        const rollbackBackfillBtn = screen.querySelector('#memory-brain-rollback-backfill-btn');
        if (rollbackBackfillBtn) rollbackBackfillBtn.addEventListener('click', () => { try { const result = service.rollbackLatestBackfillBatch(); showToast(`已撤回最近回填队列：${result.jobCount || 0} 个任务`); render(); } catch (error) { setStatus(screen, '#memory-brain-backfill-status', error.message, 'error'); showToast(error.message); } });
        const rollbackHistoryEventBtn = screen.querySelector('#memory-brain-rollback-history-events-btn');
        if (rollbackHistoryEventBtn) rollbackHistoryEventBtn.addEventListener('click', () => { try { const result = service.rollbackLatestHistoryEventBatch(); showToast(`已撤回最近历史事件：${result.eventCount || 0} 条事件`); render(); } catch (error) { setStatus(screen, '#memory-brain-backfill-status', error.message, 'error'); showToast(error.message); } });
        const rollbackHistoryFactBtn = screen.querySelector('#memory-brain-rollback-history-facts-btn');
        if (rollbackHistoryFactBtn) rollbackHistoryFactBtn.addEventListener('click', () => { try { const result = service.rollbackLatestHistoryFactBatch(); showToast(`已撤回最近历史事实：${result.factCount || 0} 条事实`); render(); } catch (error) { setStatus(screen, '#memory-brain-backfill-status', error.message, 'error'); showToast(error.message); } });
        bindAsyncButton(screen, '#memory-brain-run-lifecycle-btn', '#memory-brain-lifecycle-status', '正在标记重复、冲突和过时事实，不写旧记忆…', async () => {
            const input = screen.querySelector('#memory-brain-lifecycle-threshold-input');
            const duplicateThreshold = Math.max(0.7, Math.min(0.99, (Number(input && input.value) || 90) / 100));
            const result = await service.runFactLifecycleReview({ duplicateThreshold });
            showToast(`已标记 ${result.updates && result.updates.length || 0} 条事实生命周期状态`);
        });
        const rollbackLifecycleBtn = screen.querySelector('#memory-brain-rollback-lifecycle-btn');
        if (rollbackLifecycleBtn) rollbackLifecycleBtn.addEventListener('click', () => { try { const result = service.rollbackLatestFactLifecycleBatch(); showToast(`已撤回最近事实清理：${result.restoredFactCount || 0} 条事实`); render(); } catch (error) { setStatus(screen, '#memory-brain-lifecycle-status', error.message, 'error'); showToast(error.message); } });
        bindAsyncButton(screen, '#memory-brain-rebuild-family-graph-btn', '#memory-brain-rebuild-status', '正在全量重建家族 / Graph，只写 memoryBrain.*，不接正式 prompt…', async () => {
            const minInput = screen.querySelector('#memory-brain-rebuild-family-min-input');
            const edgeInput = screen.querySelector('#memory-brain-rebuild-edge-max-input');
            const result = await service.rebuildFamilyGraph({ familyMinFacts: minInput ? Number(minInput.value) || 2 : 2, maxEdges: edgeInput ? Number(edgeInput.value) || 180 : 180 });
            showToast(`已重建 ${result.familyResult && result.familyResult.families && result.familyResult.families.length || 0} 个家族，${result.graphResult && result.graphResult.edges && result.graphResult.edges.length || 0} 条关系`);
        });
        bindAsyncButton(screen, '#memory-brain-rebuild-history-models-btn', '#memory-brain-history-model-status', '正在基于全历史 facts / families / graph 重建长期模型，不接正式 prompt…', async () => {
            const factInput = screen.querySelector('#memory-brain-history-model-max-facts-input');
            const familyInput = screen.querySelector('#memory-brain-history-model-max-families-input');
            const edgeInput = screen.querySelector('#memory-brain-history-model-max-edges-input');
            const result = await service.rebuildFullHistoryModels({ maxFacts: factInput ? Number(factInput.value) || 160 : 160, maxFamilies: familyInput ? Number(familyInput.value) || 42 : 42, maxEdges: edgeInput ? Number(edgeInput.value) || 120 : 120 });
            showToast(`已重建 ${result.models && result.models.length || 0} 个全历史长期模型`);
        });
        const rollbackRebuildBtn = screen.querySelector('#memory-brain-rollback-rebuild-btn');
        if (rollbackRebuildBtn) rollbackRebuildBtn.addEventListener('click', () => { try { const result = service.rollbackLatestFamilyGraphRebuildBatch(); showToast(result.ok ? '已撤回最近全量重建' : '撤回失败'); render(); } catch (error) { setStatus(screen, '#memory-brain-rebuild-status', error.message, 'error'); showToast(error.message); } });
        const rollbackHistoryModelBtn = screen.querySelector('#memory-brain-rollback-history-models-btn');
        if (rollbackHistoryModelBtn) rollbackHistoryModelBtn.addEventListener('click', () => { try { const result = service.rollbackLatestHistoryModelBatch(); showToast(`已撤回最近全历史模型：${result.modelCount || 0} 个模型`); render(); } catch (error) { setStatus(screen, '#memory-brain-history-model-status', error.message, 'error'); showToast(error.message); } });
        bindAsyncButton(screen, '#memory-brain-run-cutover-btn', '#memory-brain-cutover-status', '正在比较旧正式记忆 owner 和 Memory Brain shadow 注入包，不会接正式 prompt…', async () => { const input = screen.querySelector('#memory-brain-cutover-query-input'); const result = await service.runCutoverRehearsal({ query: input ? input.value : '' }); showToast(`已生成接管演练报告：${result.report && result.report.readiness && result.report.readiness.score || 0} 分`); });
        const rollbackCutoverBtn = screen.querySelector('#memory-brain-rollback-cutover-btn'); if (rollbackCutoverBtn) rollbackCutoverBtn.addEventListener('click', () => { try { const result = service.rollbackLatestCutoverRehearsalBatch(); showToast(`已撤回最近接管演练：${result.reportCount || 0} 份报告`); render(); } catch (error) { setStatus(screen, '#memory-brain-cutover-status', error.message, 'error'); showToast(error.message); } });
        [ ['#memory-brain-owner-legacy-btn', 'legacy'], ['#memory-brain-owner-brain-btn', 'memoryBrain'], ['#memory-brain-owner-off-btn', 'off'] ].forEach(pair => { const btn = screen.querySelector(pair[0]); if (btn) btn.addEventListener('click', () => { try { const result = service.requestOwnerSwitch(pair[1]); setStatus(screen, '#memory-brain-owner-status', result.ownerState && result.ownerState.summary || '已记录 owner 切换门演练', 'ok'); showToast(result.ownerState && result.ownerState.summary || '已记录 owner 切换门演练'); render(); } catch (error) { setStatus(screen, '#memory-brain-owner-status', error.message, 'error'); showToast(error.message); } }); });
        const rollbackOwnerBtn = screen.querySelector('#memory-brain-rollback-owner-btn'); if (rollbackOwnerBtn) rollbackOwnerBtn.addEventListener('click', () => { try { const result = service.rollbackLatestOwnerSwitchBatch(); showToast(result.ok ? '已撤回最近 owner 切换门' : '撤回失败'); render(); } catch (error) { setStatus(screen, '#memory-brain-owner-status', error.message, 'error'); showToast(error.message); } });
        screen.querySelectorAll('.memory-brain-owner-mode-btn').forEach(btn => btn.addEventListener('click', () => { try { const result = service.requestOwnerSwitch(btn.getAttribute('data-owner-mode')); setStatus(screen, '#memory-brain-owner-status', result.ownerState && result.ownerState.summary || '已记录 owner 切换门演练', 'ok'); showToast(result.ownerState && result.ownerState.summary || '已记录 owner 切换门演练'); render(); } catch (error) { setStatus(screen, '#memory-brain-owner-status', error.message, 'error'); showToast(error.message); } }));
        bindAsyncButton(screen, '#memory-brain-build-review-btn', '#memory-brain-review-status', '正在生成记忆审查收件箱，只写 memoryBrain.reviewInboxItems…', async () => { const input = screen.querySelector('#memory-brain-review-confidence-input'); const result = await service.buildReviewInbox({ lowConfidenceThreshold: (Number(input && input.value) || 58) / 100 }); showToast(`已生成审查项：${result.items && result.items.length || 0} 条`); });
        const rollbackReviewBtn = screen.querySelector('#memory-brain-rollback-review-btn'); if (rollbackReviewBtn) rollbackReviewBtn.addEventListener('click', () => { try { const result = service.rollbackLatestReviewInboxBatch(); showToast(`已撤回最近审查：${result.removedItemCount || 0} 项`); render(); } catch (error) { setStatus(screen, '#memory-brain-review-status', error.message, 'error'); showToast(error.message); } });
        screen.querySelectorAll('.memory-brain-review-confirm-btn').forEach(btn => btn.addEventListener('click', () => { try { service.updateReviewItemStatus(btn.getAttribute('data-review-id'), 'confirmed'); showToast('已确认保留这个审查项'); render(); } catch (error) { setStatus(screen, '#memory-brain-review-status', error.message, 'error'); showToast(error.message); } }));
        screen.querySelectorAll('.memory-brain-review-edit-btn').forEach(btn => btn.addEventListener('click', () => { try { service.updateReviewItemStatus(btn.getAttribute('data-review-id'), 'needs-edit'); showToast('已标记为后续待改写'); render(); } catch (error) { setStatus(screen, '#memory-brain-review-status', error.message, 'error'); showToast(error.message); } }));
        screen.querySelectorAll('.memory-brain-review-dismiss-btn').forEach(btn => btn.addEventListener('click', () => { try { service.updateReviewItemStatus(btn.getAttribute('data-review-id'), 'dismissed'); showToast('已忽略这个审查项'); render(); } catch (error) { setStatus(screen, '#memory-brain-review-status', error.message, 'error'); showToast(error.message); } }));
        if (feature.factCorrectionView && feature.factCorrectionView.bindFactCorrectionPanel) feature.factCorrectionView.bindFactCorrectionPanel(screen, service, { setStatus, showToast, render });
        if (feature.factConflictView && feature.factConflictView.bindFactConflictPanel) feature.factConflictView.bindFactConflictPanel(screen, service, { setStatus, showToast, render });
        if (feature.familyAdjustmentView && feature.familyAdjustmentView.bindFamilyAdjustmentPanel) feature.familyAdjustmentView.bindFamilyAdjustmentPanel(screen, service, { setStatus, showToast, render });
        if (feature.modelCorrectionView && feature.modelCorrectionView.bindModelCorrectionPanel) feature.modelCorrectionView.bindModelCorrectionPanel(screen, service, { setStatus, showToast, render });
        if (feature.correctionPropagationView && feature.correctionPropagationView.bindCorrectionPropagationPanel) feature.correctionPropagationView.bindCorrectionPropagationPanel(screen, service, { setStatus, showToast, render });
        if (feature.trustScoreView && feature.trustScoreView.bindMemoryTrustScorePanel) feature.trustScoreView.bindMemoryTrustScorePanel(screen, service, { setStatus, showToast, render });
        if (feature.trustedGateView && feature.trustedGateView.bindTrustedGatePanel) feature.trustedGateView.bindTrustedGatePanel(screen, service, { setStatus, showToast, render });
        bindAsyncButton(screen, '#memory-brain-run-formal-adapter-btn', '#memory-brain-formal-adapter-status', '正在运行正式注入 adapter 演练，不会接入 prompt…', async () => { const input = screen.querySelector('#memory-brain-formal-query-input'); const result = await service.runFormalInjectionAdapter({ query: input ? input.value : '' }); showToast(`已生成 adapter 演练：${result.report && result.report.final && result.report.final.owner || 'legacy'}`); });
        const rollbackFormalAdapterBtn = screen.querySelector('#memory-brain-rollback-formal-adapter-btn'); if (rollbackFormalAdapterBtn) rollbackFormalAdapterBtn.addEventListener('click', () => { try { const result = service.rollbackLatestFormalInjectionAdapterBatch(); showToast(`已撤回最近 adapter 演练：${result.reportId || ''}`); render(); } catch (error) { setStatus(screen, '#memory-brain-formal-adapter-status', error.message, 'error'); showToast(error.message); } });
        bindAsyncButton(screen, '#memory-brain-run-realtime-trace-btn', '#memory-brain-realtime-trace-status', '正在生成实时注入 trace，不会接入 prompt…', async () => { const input = screen.querySelector('#memory-brain-realtime-query-input'); const result = await service.runRealtimeInjectionTrace({ query: input ? input.value : '' }); showToast(`已生成实时 trace：命中 ${result.run && result.run.hitCount || 0} 条，阻断 ${result.run && result.run.blockerCount || 0} 条`); });
        const rollbackRealtimeTraceBtn = screen.querySelector('#memory-brain-rollback-realtime-trace-btn'); if (rollbackRealtimeTraceBtn) rollbackRealtimeTraceBtn.addEventListener('click', () => { try { const result = service.rollbackLatestRealtimeInjectionTraceBatch(); showToast(`已撤回最近实时 trace：${result.reportId || ''}`); render(); } catch (error) { setStatus(screen, '#memory-brain-realtime-trace-status', error.message, 'error'); showToast(error.message); } });
        bindAsyncButton(screen, '#memory-brain-run-legacy-readonly-btn', '#memory-brain-legacy-readonly-status', '正在生成旧系统只读降级准备报告，不会修改旧记忆…', async () => { const result = await service.runLegacyReadOnlyDowngrade(); showToast(`已生成只读降级报告：准备度 ${result.report && result.report.readinessScore || 0}`); });
        const rollbackLegacyReadOnlyBtn = screen.querySelector('#memory-brain-rollback-legacy-readonly-btn'); if (rollbackLegacyReadOnlyBtn) rollbackLegacyReadOnlyBtn.addEventListener('click', () => { try { const result = service.rollbackLatestLegacyReadOnlyBatch(); showToast(`已撤回最近只读降级演练：${result.reportId || ''}`); render(); } catch (error) { setStatus(screen, '#memory-brain-legacy-readonly-status', error.message, 'error'); showToast(error.message); } });
        [['#memory-brain-disable-shadow-btn', 'disable-shadow'], ['#memory-brain-enable-shadow-btn', 'enable-shadow'], ['#memory-brain-restore-legacy-btn', 'restore-legacy'], ['#memory-brain-owner-off-preview-btn', 'request-off']].forEach(pair => { const btn = screen.querySelector(pair[0]); if (btn) btn.addEventListener('click', () => { try { const result = service.runOwnerRecoveryAction(pair[1]); const text = result.report && result.report.summary || '已记录一键关闭 / 回退演练'; setStatus(screen, '#memory-brain-owner-recovery-status', text, 'ok'); showToast(text); render(); } catch (error) { setStatus(screen, '#memory-brain-owner-recovery-status', error.message, 'error'); showToast(error.message); } }); });
        const rollbackOwnerRecoveryBtn = screen.querySelector('#memory-brain-rollback-owner-recovery-btn'); if (rollbackOwnerRecoveryBtn) rollbackOwnerRecoveryBtn.addEventListener('click', () => { try { const result = service.rollbackLatestOwnerRecoveryBatch(); showToast(`已撤回最近一键关闭 / 回退：${result.reportId || ''}`); render(); } catch (error) { setStatus(screen, '#memory-brain-owner-recovery-status', error.message, 'error'); showToast(error.message); } });
        const copyPlanBtn = screen.querySelector('#memory-brain-copy-plan-btn');
        if (copyPlanBtn) copyPlanBtn.addEventListener('click', () => { service.copyPlanningText(); showToast('已复制 v0.3.x 完整计划'); });
        bindAsyncButton(screen, '#memory-brain-generate-event-btn', '#memory-brain-event-status', '正在整理最近聊天，结果会写入影子时间线…', async () => {
            const input = screen.querySelector('#memory-brain-event-limit-input');
            const result = await service.summarizeRecentChat({ limit: input ? Number(input.value) || 30 : 30 });
            showToast(`已生成事件：${result.event && result.event.title || '时间线事件'}`);
        });
        bindAsyncButton(screen, '#memory-brain-extract-facts-btn', '#memory-brain-fact-status', '正在从最新未拆事件提取原子事实…', async () => {
            const input = screen.querySelector('#memory-brain-fact-max-input');
            const result = await service.extractFactsFromLatestEvent({ maxFacts: input ? Number(input.value) || 8 : 8 });
            showToast(`已新增 ${result.facts && result.facts.length || 0} 条事实候选`);
        });
        bindAsyncButton(screen, '#memory-brain-organize-families-btn', '#memory-brain-family-status', '正在让事实自动聚成记忆家族…', async () => {
            const input = screen.querySelector('#memory-brain-family-min-input');
            const result = await service.organizeFamilies({ minNewFacts: input ? Number(input.value) || 2 : 2 });
            showToast(`已整理 ${result.families && result.families.length || 0} 个记忆家族`);
        });
        bindAsyncButton(screen, '#memory-brain-build-graph-btn', '#memory-brain-graph-status', '正在建立事实、家族和主题之间的关系边…', async () => {
            const input = screen.querySelector('#memory-brain-graph-max-input');
            const result = await service.buildGraph({ maxEdges: input ? Number(input.value) || 120 : 120 });
            showToast(`已建立 ${result.edges && result.edges.length || 0} 条 graph 关系`);
        });
        bindAsyncButton(screen, '#memory-brain-build-models-btn', '#memory-brain-model-status', '正在生成用户画像、AI 自我、世界观和项目脑…', async () => {
            const input = screen.querySelector('#memory-brain-model-max-facts-input');
            const result = await service.buildLongTermModels({ maxFacts: input ? Number(input.value) || 48 : 48 });
            showToast(`已生成 ${result.models && result.models.length || 0} 个长期模型`);
        });
        bindAsyncButton(screen, '#memory-brain-build-injection-btn', '#memory-brain-injection-status', '正在生成 shadow injection package，不会进入正式 prompt…', async () => {
            const input = screen.querySelector('#memory-brain-injection-query-input');
            const result = await service.buildShadowInjectionPreview({ query: input ? input.value : '' });
            showToast(`已生成注入预览：${result.preview && result.preview.blockCharCount || 0} 字符`);
        });
        const saveCostBtn = screen.querySelector('#memory-brain-save-cost-profile-btn');
        if (saveCostBtn) saveCostBtn.addEventListener('click', () => {
            const select = screen.querySelector('#memory-brain-cost-profile-select');
            const result = service.updateCostProfile(select ? select.value : 'balanced');
            setStatus(screen, '#memory-brain-scheduler-status', `已切换到 ${result.settings && result.settings.costProfileId || 'balanced'} 成本档`, 'ok');
            showToast('已保存记忆脑成本档');
            render();
        });
        bindAsyncButton(screen, '#memory-brain-build-plan-btn', '#memory-brain-scheduler-status', '正在生成影子整理计划，不会自动跑贵模型…', async () => {
            const select = screen.querySelector('#memory-brain-cost-profile-select');
            const result = await service.buildMaintenancePlan({ profileId: select ? select.value : undefined });
            showToast(`已生成整理队列：${result.queueItems && result.queueItems.length || 0} 项`);
        });
        bindAsyncButton(screen, '#memory-brain-run-maintenance-btn', '#memory-brain-scheduler-status', '正在刷新浮现/衰减权重，只更新新记忆脑字段…', async () => {
            const result = await service.runMaintenanceCycle({ maxUpdates: 300 });
            showToast(`已维护 ${result.changedCount || 0} 条记忆权重`);
        });
        bindAsyncButton(screen, '#memory-brain-copy-export-btn', '#memory-brain-palace-status', '正在生成并复制 memoryBrain 导出包，不会迁移旧记忆…', async () => {
            const result = await service.copyExportBundle({ source: 'memory-brain-app' });
            showToast(`已复制导出包：${result.textLength || 0} 字符`);
        });
        const rollbackFactBtn = screen.querySelector('#memory-brain-rollback-facts-btn'); if (rollbackFactBtn) rollbackFactBtn.addEventListener('click', () => { try { const result = service.rollbackLatestFactBatch(); showToast(`已撤回最近事实批次：${result.rolledBackFacts || 0} 条事实`); render(); } catch (error) { setStatus(screen, '#memory-brain-fact-status', error.message, 'error'); showToast(error.message); } });
        const rollbackFamilyBtn = screen.querySelector('#memory-brain-rollback-family-btn'); if (rollbackFamilyBtn) rollbackFamilyBtn.addEventListener('click', () => { try { const result = service.rollbackLatestFamilyBatch(); showToast(`已撤回最近家族批次：${result.familyCount || 0} 个家族`); render(); } catch (error) { setStatus(screen, '#memory-brain-family-status', error.message, 'error'); showToast(error.message); } });
        const rollbackGraphBtn = screen.querySelector('#memory-brain-rollback-graph-btn'); if (rollbackGraphBtn) rollbackGraphBtn.addEventListener('click', () => { try { const result = service.rollbackLatestGraphBatch(); showToast(`已撤回最近 graph 批次：${result.edgeCount || 0} 条关系`); render(); } catch (error) { setStatus(screen, '#memory-brain-graph-status', error.message, 'error'); showToast(error.message); } });
        const rollbackModelBtn = screen.querySelector('#memory-brain-rollback-model-btn'); if (rollbackModelBtn) rollbackModelBtn.addEventListener('click', () => { try { const result = service.rollbackLatestModelBatch(); showToast(`已撤回最近模型批次：${result.modelCount || 0} 个模型`); render(); } catch (error) { setStatus(screen, '#memory-brain-model-status', error.message, 'error'); showToast(error.message); } });
        const rollbackInjectionBtn = screen.querySelector('#memory-brain-rollback-injection-btn'); if (rollbackInjectionBtn) rollbackInjectionBtn.addEventListener('click', () => { try { const result = service.rollbackLatestInjectionPreviewBatch(); showToast(`已撤回最近注入预览：${result.previewCount || 0} 条`); render(); } catch (error) { setStatus(screen, '#memory-brain-injection-status', error.message, 'error'); showToast(error.message); } });
        const rollbackMaintenanceBtn = screen.querySelector('#memory-brain-rollback-maintenance-btn'); if (rollbackMaintenanceBtn) rollbackMaintenanceBtn.addEventListener('click', () => { try { const result = service.rollbackLatestMaintenanceBatch(); showToast(`已撤回最近维护批次：${result.restoredCount || 0} 项`); render(); } catch (error) { setStatus(screen, '#memory-brain-scheduler-status', error.message, 'error'); showToast(error.message); } });
        const rollbackExportBtn = screen.querySelector('#memory-brain-rollback-export-btn'); if (rollbackExportBtn) rollbackExportBtn.addEventListener('click', () => { try { const result = service.rollbackLatestExportBatch(); showToast(`已撤回最近导出记录：${result.exportCount || 0} 条`); render(); } catch (error) { setStatus(screen, '#memory-brain-palace-status', error.message, 'error'); showToast(error.message); } });
        bindFactRetireButtons(screen); bindFamilyRetireButtons(screen); bindGraphRetireButtons(screen); bindModelRetireButtons(screen); bindInjectionPreviewRetireButtons(screen); }
    function render() { const screen = document.getElementById('memory-brain-screen'); if (!screen) return false;
        const dashboard = service.getDashboard(); screen.innerHTML = buildHtml(dashboard); if (feature.groupedUiView && feature.groupedUiView.applyGroupedSections) feature.groupedUiView.applyGroupedSections(screen, dashboard, service);
        bindEvents(screen);
        service.recordOperation('打开记忆脑 App', { mode: dashboard.mode, stage: dashboard.currentStageId, totals: dashboard.totals, eventCount: dashboard.eventCount, factCount: dashboard.factCount, familyCount: dashboard.familyCount, edgeCount: dashboard.edgeCount, modelCount: dashboard.modelCount, injectionPreviewCount: dashboard.injectionPreviewCount, scheduleQueueCount: dashboard.scheduleQueueCount, schedulerRunCount: dashboard.schedulerRunCount, exportCount: dashboard.exportCount, archiveSourceCount: dashboard.archiveSourceCount, archiveRunCount: dashboard.archiveRunCount, archiveChunkCount: dashboard.archiveChunkCount, archiveChunkRunCount: dashboard.archiveChunkRunCount, historyFactBatchCount: dashboard.historyFactBatchCount, familyGraphRebuildBatchCount: dashboard.familyGraphRebuildBatchCount, historyModelRebuildBatchCount: dashboard.historyModelRebuildBatchCount, cutoverReportCount: dashboard.cutoverReportCount, cutoverRehearsalBatchCount: dashboard.cutoverRehearsalBatchCount, reviewInboxCount: dashboard.reviewInboxCount, reviewInboxRunCount: dashboard.reviewInboxRunCount, factCorrectionCount: dashboard.factCorrectionCount, factCorrectionRunCount: dashboard.factCorrectionRunCount, factConflictCount: dashboard.factConflictCount, factConflictRunCount: dashboard.factConflictRunCount, familyAdjustmentCount: dashboard.familyAdjustmentCount, familyAdjustmentRunCount: dashboard.familyAdjustmentRunCount, modelCorrectionCount: dashboard.modelCorrectionCount, modelCorrectionRunCount: dashboard.modelCorrectionRunCount, correctionPropagationCount: dashboard.correctionPropagationCount, correctionPropagationRunCount: dashboard.correctionPropagationRunCount, trustScoreCount: dashboard.trustScoreCount, trustScoreRunCount: dashboard.trustScoreRunCount, trustedGateReportCount: dashboard.trustedGateReportCount, trustedGateRunCount: dashboard.trustedGateRunCount, formalInjectionAdapterReportCount: dashboard.formalInjectionAdapterReportCount, formalInjectionAdapterRunCount: dashboard.formalInjectionAdapterRunCount, realtimeInjectionTraceReportCount: dashboard.realtimeInjectionTraceReportCount, realtimeInjectionTraceRunCount: dashboard.realtimeInjectionTraceRunCount, legacyReadOnlyReportCount: dashboard.legacyReadOnlyReportCount, legacyReadOnlyRunCount: dashboard.legacyReadOnlyRunCount, ownerRecoveryReportCount: dashboard.ownerRecoveryReportCount, ownerRecoveryRunCount: dashboard.ownerRecoveryRunCount });
        return true; }
    feature.view = { render }; })(window);
