// --- Memory Brain family / graph rebuild view owner (v0.4.6) ---
// 只渲染全量重建运行记录，不写 store、不请求 AI。
(function registerMemoryBrainFamilyGraphRebuildView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function renderRun(run) {
        const s = run.factSummary || {};
        return `<article class="memory-brain-rebuild-card"><div><strong>${escapeHtml(run.status)}</strong><small>${escapeHtml(run.createdAt || '')}</small></div><p>可用事实 ${escapeHtml(s.eligibleFactCount || 0)} / 活跃事实 ${escapeHtml(s.activeFactCount || 0)}，排除 ${escapeHtml(s.excludedFactCount || 0)} 条 duplicate / obsolete / disputed。</p><code>family ${escapeHtml(run.familyBatchId || '—')} · graph ${escapeHtml(run.graphBatchId || '—')}</code></article>`;
    }
    function renderFamilyGraphRebuildPanel(cards) {
        const data = cards || {};
        const s = data.totalText || {};
        const runs = Array.isArray(data.runs) ? data.runs : [];
        return `<div class="memory-brain-rebuild-summary"><span>可用事实 <strong>${escapeHtml(s.eligibleFactCount || 0)}</strong></span><span>排除事实 <strong>${escapeHtml(s.excludedFactCount || 0)}</strong></span><span>活跃事实 <strong>${escapeHtml(s.activeFactCount || 0)}</strong></span></div><div class="memory-brain-rebuild-list">${runs.length ? runs.map(renderRun).join('') : '<div class="memory-brain-empty">还没有全量重建记录。</div>'}</div>`;
    }
    feature.familyGraphRebuildView = { renderFamilyGraphRebuildPanel };
})(window);
