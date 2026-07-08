// --- Memory Brain grouped UI view helper (v0.6.3) ---
// 只负责把已有 Memory Brain section 按功能包进折叠 details，不生成业务内容。
(function registerMemoryBrainGroupedUiView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    const UI_GROUP_DEFS = [
        { id: 'history', title: '历史整理室', description: '扫描、切片、回填队列、历史事件和历史事实。', selectors: ['.memory-brain-archive-actions', '#memory-brain-archive-status', '.memory-brain-archive-section', '.memory-brain-chunk-section', '.memory-brain-backfill-actions', '#memory-brain-backfill-status', '.memory-brain-backfill-section', '.memory-brain-event-backfill-section', '.memory-brain-fact-backfill-section'] },
        { id: 'quality', title: '整理质量和重建', description: '可信审查、事实纠错、冲突处理、家族合并/拆分、事实生命周期、全量家族 / graph、长期模型、模型人工修正、纠错影响传播、记忆信任分、可信记忆 gate 和接管演练。', selectors: ['.memory-brain-review-actions', '#memory-brain-review-status', '.memory-brain-review-section', '.memory-brain-correction-actions', '#memory-brain-correction-status', '.memory-brain-correction-section', '.memory-brain-conflict-actions', '#memory-brain-conflict-status', '.memory-brain-conflict-section', '.memory-brain-family-adjust-actions', '#memory-brain-family-adjust-status', '.memory-brain-family-adjust-section', '.memory-brain-model-correction-actions', '#memory-brain-model-correction-status', '.memory-brain-model-correction-section', '.memory-brain-propagation-actions', '#memory-brain-propagation-status', '.memory-brain-propagation-section', '.memory-brain-trust-actions', '#memory-brain-trust-status', '.memory-brain-trust-section', '.memory-brain-trusted-actions', '#memory-brain-trusted-gate-status', '.memory-brain-trusted-section', '.memory-brain-lifecycle-actions', '#memory-brain-lifecycle-status', '.memory-brain-lifecycle-section', '.memory-brain-rebuild-actions', '#memory-brain-rebuild-status', '.memory-brain-rebuild-section', '.memory-brain-history-model-actions', '#memory-brain-history-model-status', '.memory-brain-history-model-section', '.memory-brain-cutover-actions', '#memory-brain-cutover-status', '.memory-brain-cutover-section'] },
        { id: 'owner', title: '单一 owner 安全门', description: 'legacy / memoryBrain / off 三态只做演练，v0.9 前不接正式 prompt；旧系统只读降级也只做演练。', selectors: ['.memory-brain-owner-actions', '#memory-brain-owner-status', '.memory-brain-owner-section', '.memory-brain-formal-adapter-actions', '#memory-brain-formal-adapter-status', '.memory-brain-formal-adapter-section', '.memory-brain-realtime-trace-actions', '#memory-brain-realtime-trace-status', '.memory-brain-realtime-trace-section', '.memory-brain-legacy-readonly-actions', '#memory-brain-legacy-readonly-status', '.memory-brain-legacy-readonly-section', '.memory-brain-owner-recovery-actions', '#memory-brain-owner-recovery-status', '.memory-brain-owner-recovery-section'] },
        { id: 'daily', title: '日常记忆脑', description: '最近聊天整理、事实、家族、graph、模型、注入预览、调度和记忆小屋。', selectors: ['.memory-brain-event-actions', '#memory-brain-event-status', '.memory-brain-fact-actions', '#memory-brain-fact-status', '.memory-brain-family-actions', '#memory-brain-family-status', '.memory-brain-graph-actions', '#memory-brain-graph-status', '.memory-brain-model-actions', '#memory-brain-model-status', '.memory-brain-injection-actions', '#memory-brain-injection-status', '.memory-brain-palace-actions', '#memory-brain-palace-status', '.memory-brain-palace-section', '.memory-brain-scheduler-section', '.memory-brain-injection-section', '.memory-brain-model-section', '.memory-brain-graph-section', '.memory-brain-family-section', '.memory-brain-timeline-section', '.memory-brain-fact-section'] },
        { id: 'overview', title: '路线和结构', description: '完整计划、九层结构、替换路线、历史整理说明和双系统规则。', selectors: ['.memory-brain-plan-section', '.memory-brain-layer-section', '.memory-brain-replacement-section', '.memory-brain-history-plan-section', '.memory-brain-note'] }
    ];
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function getGroupCard(dashboard, id) { return (dashboard.uiGroupCards || []).find(card => card && card.id === id) || null; }
    function applyGroupedSections(screen, dashboard, service) {
        const main = screen.querySelector('.memory-brain-page');
        if (!main) return;
        UI_GROUP_DEFS.forEach(def => {
            const selected = Array.from(main.children).filter(child => def.selectors.some(selector => child.matches(selector)));
            if (!selected.length) return;
            const groupCard = getGroupCard(dashboard, def.id);
            const details = document.createElement('details');
            details.className = 'memory-brain-ui-group';
            details.dataset.groupId = def.id;
            details.open = groupCard ? !!groupCard.open : def.id !== 'daily' && def.id !== 'overview';
            const summary = document.createElement('summary');
            summary.innerHTML = `<span class="memory-brain-ui-group-title"><strong>${escapeHtml(groupCard && groupCard.title || def.title)}</strong><span>${escapeHtml(groupCard && groupCard.description || def.description)}</span></span><span class="memory-brain-ui-group-pill">${selected.length} 项</span>`;
            const body = document.createElement('div');
            body.className = 'memory-brain-ui-group-body';
            details.appendChild(summary);
            details.appendChild(body);
            main.insertBefore(details, selected[0]);
            selected.forEach(node => body.appendChild(node));
            details.addEventListener('toggle', () => { if (service && typeof service.updateUiGroupOpen === 'function') service.updateUiGroupOpen(def.id, details.open); });
        });
    }
    feature.groupedUiView = { applyGroupedSections, UI_GROUP_DEFS };
})(window);
