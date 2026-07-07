// --- Memory Brain fact lifecycle view owner (v0.4.5) ---
// 只渲染事实生命周期卡片，不读取旧记忆，不写状态。
(function registerFactLifecycleView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
    function renderRun(run) {
        return `<article class="memory-brain-lifecycle-run"><div><strong>${escapeHtml(run.status)}</strong><span>${escapeHtml(run.createdAt || '')}</span></div><p>检查 ${escapeHtml(run.factCount)} 条，更新 ${escapeHtml(run.updateCount)} 条 · 重复 ${escapeHtml(run.duplicateCount)} · 过时 ${escapeHtml(run.obsoleteCount)} · 冲突 ${escapeHtml(run.disputedCount)}</p></article>`;
    }
    function renderBatch(batch) {
        return `<div class="memory-brain-lifecycle-batch"><span>${escapeHtml(batch.status)}</span><strong>${escapeHtml(batch.factCount)} facts</strong><em>${escapeHtml(batch.createdAt || '')}</em></div>`;
    }
    function renderIssue(issue) {
        return `<article class="memory-brain-lifecycle-issue" data-type="${escapeHtml(issue.type)}"><div><strong>${escapeHtml(issue.type)}</strong><span>${escapeHtml((issue.factIds || []).join(' / '))}</span></div><p>${escapeHtml(issue.factContent || issue.reason || '待确认事实')}</p><small>${escapeHtml(issue.reason || '')}</small></article>`;
    }
    function renderFactLifecyclePanel(cards) {
        if (!cards) return '<div class="memory-brain-empty">事实生命周期视图尚未加载。</div>';
        const runs = (cards.runs || []).map(renderRun).join('');
        const batches = (cards.batches || []).map(renderBatch).join('');
        const issues = (cards.issues || []).map(renderIssue).join('');
        return `<div class="memory-brain-lifecycle-panel">
            <div class="memory-brain-lifecycle-stats"><span>Active <strong>${escapeHtml(cards.totalText && cards.totalText.active || 0)}</strong></span><span>Duplicate <strong>${escapeHtml(cards.totalText && cards.totalText.duplicate || 0)}</strong></span><span>Obsolete <strong>${escapeHtml(cards.totalText && cards.totalText.obsolete || 0)}</strong></span><span>Disputed <strong>${escapeHtml(cards.totalText && cards.totalText.disputed || 0)}</strong></span></div>
            <div class="memory-brain-lifecycle-grid">${issues || '<div class="memory-brain-empty">暂无重复、冲突或过时事实。运行整理后会显示需要处理的事实。</div>'}</div>
            <h3>最近整理运行</h3><div class="memory-brain-lifecycle-runs">${runs || '<div class="memory-brain-empty">还没有事实生命周期运行记录。</div>'}</div>
            <h3>批次</h3><div class="memory-brain-lifecycle-batches">${batches || '<div class="memory-brain-empty">暂无批次。</div>'}</div>
        </div>`;
    }
    feature.factLifecycleView = { renderFactLifecyclePanel };
})(window);
