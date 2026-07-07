// --- Memory Brain view owner (v0.4.2) ---
// 只负责记忆脑 App 展示和按钮绑定，不直接读取旧记忆系统私有状态。
(function registerMemoryBrainView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    const service = feature.service;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function renderLayerCards(cards) {
        return cards.map(card => `
            <article class="memory-brain-layer-card" data-layer="${escapeHtml(card.id)}">
                <div class="memory-brain-layer-top"><span>${escapeHtml(card.name)}</span><strong>${escapeHtml(card.countText)}</strong></div>
                <p>${escapeHtml(card.goal)}</p><small>${escapeHtml(card.status)}</small>
            </article>`).join('');
    }
    function renderReplacementCards(cards) {
        return cards.map(card => `
            <article class="memory-brain-stage-card">
                <div class="memory-brain-stage-index">${card.index}</div>
                <div><h3>${escapeHtml(card.name)} <span>${escapeHtml(card.targetVersion)}</span></h3>
                <p>${escapeHtml(card.goal)}</p>
                <div class="memory-brain-stage-modes"><em>旧系统：${escapeHtml(card.oldSystemMode)}</em><em>新记忆脑：${escapeHtml(card.brainMode)}</em></div></div>
            </article>`).join('');
    }
    function renderPlanCards(cards) {
        return cards.map(card => `
            <article class="memory-brain-plan-card" data-status="${escapeHtml(card.status)}">
                <span>${escapeHtml(card.version)}</span><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.result)}</p>
            </article>`).join('');
    }
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
        return `
            <header class="app-header memory-brain-header">
                <button class="back-btn" data-target="home-screen">‹</button>
                <div class="title-container"><h1 class="title">记忆脑</h1><p class="memory-brain-subtitle">v0.4.2 · 回填队列 / 断点续跑 · 影子模式</p></div>
                <button class="action-btn" id="memory-brain-open-console-btn">控制台</button>
            </header>
            <main class="memory-brain-page">
                <section class="memory-brain-hero">
                    <div><span class="memory-brain-kicker">Memory Brain</span><h2>开始把历史切片编入可暂停、可继续、可重试的回填队列。</h2>
                    <p>v0.4.2 在 archiveChunks 基础上生成 backfillJobs 和 backfillRuns；只排队、记断点，不总结、不迁移、不注入。</p></div>
                    <div class="memory-brain-hero-stats"><strong>${escapeHtml(dashboard.eventCount || 0)}</strong><span>时间线事件</span><strong>${escapeHtml(dashboard.archiveSourceCount || 0)}</strong><span>历史来源</span><strong>${escapeHtml(dashboard.archiveChunkCount || 0)}</strong><span>历史切片</span><strong>${escapeHtml(dashboard.backfillJobCount || 0)}</strong><span>回填任务</span><strong>${escapeHtml(dashboard.factCount || 0)}</strong><span>原子事实</span><strong>${escapeHtml(dashboard.familyCount || 0)}</strong><span>记忆家族</span><strong>${escapeHtml(dashboard.edgeCount || 0)}</strong><span>关系边</span><strong>${escapeHtml(dashboard.modelCount || 0)}</strong><span>长期模型</span><strong>${escapeHtml(dashboard.injectionPreviewCount || 0)}</strong><span>注入预览</span><strong>${escapeHtml(dashboard.scheduleQueueCount || 0)}</strong><span>整理队列</span><strong>${escapeHtml(dashboard.exportCount || 0)}</strong><span>导出记录</span></div>
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
                    <button id="memory-brain-start-backfill-btn">开始一批</button><button id="memory-brain-pause-backfill-btn">暂停队列</button><button id="memory-brain-resume-backfill-btn">继续队列</button><button id="memory-brain-retry-backfill-btn">重试失败</button><button id="memory-brain-rollback-backfill-btn">撤回最近回填队列</button>
                </section>
                <div class="memory-brain-inline-status" id="memory-brain-backfill-status"></div>
                <section class="memory-brain-section memory-brain-backfill-section"><div class="memory-brain-section-title"><h2>回填队列 / 断点续跑</h2><p>把 archiveChunks 编入 backfillJobs，支持暂停、继续、重试和批次回滚。v0.4.2 仍不跑 AI。</p></div>${backfillHtml}</section>

                <section class="memory-brain-actions memory-brain-event-actions">
                    <label class="memory-brain-limit-field"><span>最近消息</span><input id="memory-brain-event-limit-input" type="number" min="2" max="120" value="30"></label>
                    <button id="memory-brain-generate-event-btn">整理最近聊天</button><button id="memory-brain-scan-btn">扫描旧记忆源</button><button id="memory-brain-open-console-inline-btn">看控制台</button>
                </section>
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
                <section class="memory-brain-section memory-brain-injection-section"><div class="memory-brain-section-title"><h2>注入预览</h2><p>这里展示新记忆脑本次准备注入的内容，并和旧记忆来源只读对照。v0.4.2 仍不接正式 prompt。</p></div>${injectionHtml}</section>
                <section class="memory-brain-section memory-brain-model-section"><div class="memory-brain-section-title"><h2>长期模型</h2><p>用户画像、AI 自我、世界观和项目脑在这里以版本卡片展示。现在只是影子模型，不接正式聊天注入。</p></div>${modelHtml}</section>
                <section class="memory-brain-section memory-brain-graph-section"><div class="memory-brain-section-title"><h2>Graph 关系网</h2><p>手机端先用关系卡片，不做重 canvas。每条边都能看到来源事实、家族和为什么连接。</p></div>${graphHtml}</section>
                <section class="memory-brain-section memory-brain-family-section"><div class="memory-brain-section-title"><h2>记忆家族</h2><p>事实不再孤立，会按相似度聚成自然主题簇。家族名由 AI 命名；没有 API 时也会用关键词 fallback。</p></div>${familyHtml}</section>
                <section class="memory-brain-section memory-brain-timeline-section"><div class="memory-brain-section-title"><h2>事件时间线</h2><p>每张卡片都保留来源消息范围。事件是事实、家族和 graph 的上游。</p></div>${timelineHtml}</section>
                <section class="memory-brain-section memory-brain-fact-section"><div class="memory-brain-section-title"><h2>原子事实候选</h2><p>AI 自动把复合事件拆成小事实，保存 subject / predicate / object、证据、置信度和来源。现在仍只是影子记忆。</p></div>${factHtml}</section>
                <section class="memory-brain-section memory-brain-plan-section"><div class="memory-brain-section-title"><h2>完整 v0.3.x 计划</h2><p>不是固定分类柜，而是聊天原文 → 事件 → 事实 → 家族 → graph → 长期模型 → 注入预览的生长路线。</p></div><div class="memory-brain-plan-grid">${renderPlanCards(dashboard.planCards)}</div></section>
                <section class="memory-brain-section"><div class="memory-brain-section-title"><h2>九层记忆结构</h2><p>分类不写死，只固定生长流程：事件 → 事实 → 家族 → graph → 长期模型 → 注入包 → 调度生命层 → 记忆小屋收口层。</p></div><div class="memory-brain-layer-grid">${renderLayerCards(dashboard.layerCards)}</div></section>
                <section class="memory-brain-section"><div class="memory-brain-section-title"><h2>旧系统什么时候被替换</h2><p>替换不是时间点，而是 gate：新记忆脑能稳定整理、对照、注入后才接管。</p></div><div class="memory-brain-stage-list">${renderReplacementCards(dashboard.replacementCards)}</div></section>
                <section class="memory-brain-section"><div class="memory-brain-section-title"><h2>历史记录怎么整理</h2><p>历史不会一次性全吞，先分批生成事件，再拆事实，再聚家族和 graph。</p></div>${renderLegacyScan(dashboard.legacyScan)}</section>
                <section class="memory-brain-section memory-brain-note"><h2>避免双系统的规则</h2><p>v0.4.2 新增 backfillJobs、backfillRuns 和 history-backfill-queue 批次。旧表格、旧向量、旧日记在切换前继续正式工作；新记忆脑只写入 memoryBrain.* 影子状态，仍不参与正式 prompt 注入。</p></section>
            </main>`;
    }
    function showToast(text) { const toast = app.shared && app.shared.ui && app.shared.ui.toast; if (toast && typeof toast.showToast === 'function') toast.showToast(text); }
    function setStatus(screen, id, text, kind) { const el = screen.querySelector(id); if (el) { el.textContent = text || ''; el.dataset.kind = kind || ''; } }
    function bindFactRetireButtons(screen) {
        screen.querySelectorAll('.memory-brain-fact-retire-btn').forEach(btn => btn.addEventListener('click', () => { service.retireFact(btn.getAttribute('data-fact-id')); showToast('已撤回这条事实候选'); render(); }));
    }
    function bindFamilyRetireButtons(screen) {
        screen.querySelectorAll('.memory-brain-family-retire-btn').forEach(btn => btn.addEventListener('click', () => { service.retireFamily(btn.getAttribute('data-family-id')); showToast('已撤回这个记忆家族'); render(); }));
    }
    function bindGraphRetireButtons(screen) {
        screen.querySelectorAll('.memory-brain-graph-retire-btn').forEach(btn => btn.addEventListener('click', () => { service.retireEdge(btn.getAttribute('data-edge-id')); showToast('已撤回这条 graph 关系'); render(); }));
    }
    function bindModelRetireButtons(screen) {
        screen.querySelectorAll('.memory-brain-model-retire-btn').forEach(btn => btn.addEventListener('click', () => { service.retireModel(btn.getAttribute('data-model-id')); showToast('已撤回这个长期模型'); render(); }));
    }
    function bindInjectionPreviewRetireButtons(screen) {
        screen.querySelectorAll('.memory-brain-injection-retire-btn').forEach(btn => btn.addEventListener('click', () => { service.retireInjectionPreview(btn.getAttribute('data-preview-id')); showToast('已撤回这个注入预览'); render(); }));
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
        screen.querySelectorAll('#memory-brain-open-console-btn, #memory-brain-open-console-inline-btn, #memory-brain-open-console-injection-btn, #memory-brain-open-console-export-btn, #memory-brain-open-console-archive-btn').forEach(btn => btn.addEventListener('click', () => service.openConsole()));
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
            const result = await service.startBackfillQueue({ limit: limitInput ? Number(limitInput.value) || 20 : 20 });
            showToast(`已开始 ${result.jobs && result.jobs.length || 0} 个回填任务`);
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
        const rollbackFactBtn = screen.querySelector('#memory-brain-rollback-facts-btn');
        if (rollbackFactBtn) rollbackFactBtn.addEventListener('click', () => { try { const result = service.rollbackLatestFactBatch(); showToast(`已撤回最近事实批次：${result.rolledBackFacts || 0} 条事实`); render(); } catch (error) { setStatus(screen, '#memory-brain-fact-status', error.message, 'error'); showToast(error.message); } });
        const rollbackFamilyBtn = screen.querySelector('#memory-brain-rollback-family-btn');
        if (rollbackFamilyBtn) rollbackFamilyBtn.addEventListener('click', () => { try { const result = service.rollbackLatestFamilyBatch(); showToast(`已撤回最近家族批次：${result.familyCount || 0} 个家族`); render(); } catch (error) { setStatus(screen, '#memory-brain-family-status', error.message, 'error'); showToast(error.message); } });
        const rollbackGraphBtn = screen.querySelector('#memory-brain-rollback-graph-btn');
        if (rollbackGraphBtn) rollbackGraphBtn.addEventListener('click', () => { try { const result = service.rollbackLatestGraphBatch(); showToast(`已撤回最近 graph 批次：${result.edgeCount || 0} 条关系`); render(); } catch (error) { setStatus(screen, '#memory-brain-graph-status', error.message, 'error'); showToast(error.message); } });
        const rollbackModelBtn = screen.querySelector('#memory-brain-rollback-model-btn');
        if (rollbackModelBtn) rollbackModelBtn.addEventListener('click', () => { try { const result = service.rollbackLatestModelBatch(); showToast(`已撤回最近模型批次：${result.modelCount || 0} 个模型`); render(); } catch (error) { setStatus(screen, '#memory-brain-model-status', error.message, 'error'); showToast(error.message); } });
        const rollbackInjectionBtn = screen.querySelector('#memory-brain-rollback-injection-btn');
        if (rollbackInjectionBtn) rollbackInjectionBtn.addEventListener('click', () => { try { const result = service.rollbackLatestInjectionPreviewBatch(); showToast(`已撤回最近注入预览：${result.previewCount || 0} 条`); render(); } catch (error) { setStatus(screen, '#memory-brain-injection-status', error.message, 'error'); showToast(error.message); } });
        const rollbackMaintenanceBtn = screen.querySelector('#memory-brain-rollback-maintenance-btn');
        if (rollbackMaintenanceBtn) rollbackMaintenanceBtn.addEventListener('click', () => { try { const result = service.rollbackLatestMaintenanceBatch(); showToast(`已撤回最近维护批次：${result.restoredCount || 0} 项`); render(); } catch (error) { setStatus(screen, '#memory-brain-scheduler-status', error.message, 'error'); showToast(error.message); } });
        const rollbackExportBtn = screen.querySelector('#memory-brain-rollback-export-btn');
        if (rollbackExportBtn) rollbackExportBtn.addEventListener('click', () => { try { const result = service.rollbackLatestExportBatch(); showToast(`已撤回最近导出记录：${result.exportCount || 0} 条`); render(); } catch (error) { setStatus(screen, '#memory-brain-palace-status', error.message, 'error'); showToast(error.message); } });
        bindFactRetireButtons(screen); bindFamilyRetireButtons(screen); bindGraphRetireButtons(screen); bindModelRetireButtons(screen); bindInjectionPreviewRetireButtons(screen);
    }
    function render() {
        const screen = document.getElementById('memory-brain-screen');
        if (!screen) return false;
        const dashboard = service.getDashboard();
        screen.innerHTML = buildHtml(dashboard);
        bindEvents(screen);
        service.recordOperation('打开记忆脑 App', { mode: dashboard.mode, stage: dashboard.currentStageId, totals: dashboard.totals, eventCount: dashboard.eventCount, factCount: dashboard.factCount, familyCount: dashboard.familyCount, edgeCount: dashboard.edgeCount, modelCount: dashboard.modelCount, injectionPreviewCount: dashboard.injectionPreviewCount, scheduleQueueCount: dashboard.scheduleQueueCount, schedulerRunCount: dashboard.schedulerRunCount, exportCount: dashboard.exportCount, archiveSourceCount: dashboard.archiveSourceCount, archiveRunCount: dashboard.archiveRunCount, archiveChunkCount: dashboard.archiveChunkCount, archiveChunkRunCount: dashboard.archiveChunkRunCount });
        return true;
    }

    feature.view = { render };
})(window);
