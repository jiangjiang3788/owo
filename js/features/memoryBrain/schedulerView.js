// --- Memory Brain scheduler view owner (v0.3.7) ---
// 只渲染调度、成本档、队列和浮现/衰减结果；不执行业务流程。
(function registerMemoryBrainSchedulerView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function percent(value) { return `${Math.round((Number(value) || 0) * 100)}%`; }
    function renderCostProfiles(cards, activeId) {
        return `<div class="memory-brain-cost-grid">${(cards || []).map(profile => `
            <article class="memory-brain-cost-card" data-active="${profile.id === activeId ? 'true' : 'false'}">
                <div><strong>${escapeHtml(profile.name)}</strong><span>${escapeHtml(profile.id)}</span></div>
                <p>${escapeHtml(profile.description)}</p>
                <small>预算 ${escapeHtml(profile.dailyBudgetUnits)} units · ${escapeHtml(profile.modelTier)}</small>
            </article>`).join('')}</div>`;
    }
    function renderQueue(items) {
        if (!items || !items.length) return '<div class="memory-brain-empty">还没有整理队列。点“生成整理计划”后，只会写入影子队列，不会自动跑贵模型。</div>';
        return `<div class="memory-brain-schedule-queue">${items.map(item => `
            <article class="memory-brain-schedule-item" data-status="${escapeHtml(item.status || '')}">
                <div class="memory-brain-schedule-top"><strong>${escapeHtml(item.kind)}</strong><span>${escapeHtml(item.costUnits || 0)} units</span></div>
                <p>${escapeHtml(item.reason)}</p>
                <div class="memory-brain-schedule-meta"><em>优先级 ${percent(item.priority)}</em><em>${escapeHtml(item.status || (item.runnable === false ? 'queued-over-budget' : 'queued'))}</em></div>
            </article>`).join('')}</div>`;
    }
    function renderRuns(runs) {
        if (!runs || !runs.length) return '<div class="memory-brain-empty">还没有调度运行记录。</div>';
        return `<div class="memory-brain-run-list">${runs.map(run => `
            <article class="memory-brain-run-card" data-kind="${escapeHtml(run.kind)}">
                <div><strong>${escapeHtml(run.kind)}</strong><span>${escapeHtml(run.status)}</span></div>
                <p>${escapeHtml(run.profileId || '')} · ${escapeHtml(run.createdAt || '')}</p>
                <small>${escapeHtml(run.updateCount || run.queueItemIds && run.queueItemIds.length || 0)} 项 · 成本 ${escapeHtml(run.estimatedCostUnits || run.costUnits || 0)} units</small>
            </article>`).join('')}</div>`;
    }
    function renderFloating(items) {
        if (!items || !items.length) return '<div class="memory-brain-empty">还没有浮现结果。运行一次“浮现/衰减维护”后会显示最容易被想起的记忆。</div>';
        return `<div class="memory-brain-floating-list">${items.map(item => `
            <article class="memory-brain-floating-card">
                <div><strong>${escapeHtml(item.type)}</strong><span>${percent(item.score)}</span></div>
                <p>${escapeHtml(item.title || item.id)}</p>
                <small>${escapeHtml((item.reasonFlags || []).join(' / ') || 'weighted')}</small>
            </article>`).join('')}</div>`;
    }
    function renderSchedulerPanel(card) {
        const settings = card && card.settings || {};
        const profile = card && card.profile || {};
        const options = (card && card.costProfiles || []).map(item => `<option value="${escapeHtml(item.id)}" ${item.id === settings.costProfileId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('');
        return `
            <div class="memory-brain-scheduler-panel">
                <div class="memory-brain-scheduler-summary">
                    <div><span>当前成本档</span><strong>${escapeHtml(profile.name || settings.costProfileId || 'balanced')}</strong></div>
                    <div><span>今日预算</span><strong>${escapeHtml(settings.dailyBudgetUnits || profile.dailyBudgetUnits || 0)} units</strong></div>
                    <div><span>调度模式</span><strong>${escapeHtml(settings.mode || 'shadow-scheduler')}</strong></div>
                    <div><span>最近维护</span><strong>${escapeHtml(settings.lastMaintenanceAt || '暂无')}</strong></div>
                </div>
                <div class="memory-brain-scheduler-controls">
                    <label><span>成本档</span><select id="memory-brain-cost-profile-select">${options}</select></label>
                    <button id="memory-brain-save-cost-profile-btn">保存成本档</button>
                    <button id="memory-brain-build-plan-btn">生成整理计划</button>
                    <button id="memory-brain-run-maintenance-btn">运行浮现/衰减</button>
                    <button id="memory-brain-rollback-maintenance-btn">撤回最近维护</button>
                </div>
                <div class="memory-brain-inline-status" id="memory-brain-scheduler-status"></div>
                ${renderCostProfiles(card && card.costProfiles, settings.costProfileId)}
                <div class="memory-brain-scheduler-columns">
                    <section><h3>整理队列</h3>${renderQueue(card && card.queueItems)}</section>
                    <section><h3>今日浮现</h3>${renderFloating(card && card.floating)}</section>
                </div>
                <section><h3>调度运行记录</h3>${renderRuns(card && card.runs)}</section>
            </div>`;
    }

    feature.schedulerView = { renderSchedulerPanel };
})(window);
