// --- Memory Brain history model rebuild view owner (v0.4.7) ---
// 只渲染全历史长期模型重建记录，不写 store、不请求 AI。
(function registerHistoryModelRebuildView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function renderRun(run) {
        const s = run.evidenceSummary || {};
        const types = (run.modelTypes || []).map(type => `<span>${escapeHtml(type)}</span>`).join('');
        return `<article class="memory-brain-history-model-card"><div><strong>${escapeHtml(run.status)}</strong><small>${escapeHtml(run.createdAt || '')}</small></div><p>模型 ${escapeHtml(run.modelCount || 0)} 个 · 可用事实 ${escapeHtml(s.eligibleFactCount || 0)} / 选中 ${escapeHtml(s.selectedFactCount || 0)} · 家族 ${escapeHtml(s.selectedFamilyCount || 0)} · 关系 ${escapeHtml(s.selectedEdgeCount || 0)}</p><div class="memory-brain-history-model-types">${types}</div><code>${escapeHtml(run.modelBatchId || '—')}</code></article>`;
    }
    function renderHistoryModelRebuildPanel(cards) {
        const data = cards || {};
        const s = data.totalText || {};
        const runs = Array.isArray(data.runs) ? data.runs : [];
        return `<div class="memory-brain-history-model-summary"><span>可用事实 <strong>${escapeHtml(s.eligibleFactCount || 0)}</strong></span><span>排除事实 <strong>${escapeHtml(s.excludedFactCount || 0)}</strong></span><span>选中家族 <strong>${escapeHtml(s.selectedFamilyCount || 0)}</strong></span><span>选中关系 <strong>${escapeHtml(s.selectedEdgeCount || 0)}</strong></span><span>活跃模型 <strong>${escapeHtml(data.activeModelCount || 0)}</strong></span></div><div class="memory-brain-history-model-list">${runs.length ? runs.map(renderRun).join('') : '<div class="memory-brain-empty">还没有全历史长期模型重建记录。</div>'}</div>`;
    }
    feature.historyModelRebuildView = { renderHistoryModelRebuildPanel };
})(window);
