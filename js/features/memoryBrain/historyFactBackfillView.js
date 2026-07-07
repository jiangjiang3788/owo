// --- Memory Brain history fact backfill view owner (v0.4.4) ---
// 只渲染历史事实回填运行记录和最近事实；不读取存储、不调用 AI。
(function registerHistoryFactBackfillView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function renderRun(run) {
        return `<article class="memory-brain-fact-backfill-run" data-status="${escapeHtml(run.status)}"><div><strong>${escapeHtml(run.status)}</strong><span>${escapeHtml(run.createdAt || '')}</span></div><p>${escapeHtml(run.jobCount)} 个任务 · ${escapeHtml(run.eventCount)} 条事件 · ${escapeHtml(run.factCount)} 条事实 · 失败 ${escapeHtml(run.failedCount)}</p></article>`;
    }
    function renderBatch(batch) {
        return `<article class="memory-brain-fact-backfill-batch" data-status="${escapeHtml(batch.status)}"><strong>${escapeHtml(batch.factCount)} 条事实</strong><span>${escapeHtml(batch.eventCount)} 条事件 · ${escapeHtml(batch.jobCount)} 个任务 · 失败 ${escapeHtml(batch.failedCount)}</span><small>${escapeHtml(batch.createdAt || '')}</small></article>`;
    }
    function renderFact(fact) {
        return `<article class="memory-brain-fact-backfill-card"><h3>${escapeHtml(fact.content)}</h3><p>${escapeHtml(fact.atomText || '')}</p><small>${escapeHtml(fact.confidenceText || '')} · ${escapeHtml(fact.sourceRangeText || '')}</small></article>`;
    }
    function renderHistoryFactBackfillPanel(cards) {
        const data = cards || {};
        const runs = (data.runs || []).map(renderRun).join('');
        const batches = (data.batches || []).map(renderBatch).join('');
        const facts = (data.recentFacts || []).map(renderFact).join('');
        return `<div class="memory-brain-fact-backfill-panel">
            <div class="memory-brain-fact-backfill-stats"><span>运行 ${escapeHtml(data.totalText && data.totalText.runs || 0)}</span><span>历史事实 ${escapeHtml(data.totalText && data.totalText.facts || 0)}</span><span>pending ${escapeHtml(data.totalText && data.totalText.pending || 0)}</span><span>running ${escapeHtml(data.totalText && data.totalText.running || 0)}</span><span>批次 ${escapeHtml(data.totalText && data.totalText.batches || 0)}</span><small>${escapeHtml(data.nextVersion || 'v0.4.5')}</small></div>
            <div class="memory-brain-fact-backfill-grid"><section><h3>最近运行</h3>${runs || '<div class="memory-brain-empty">还没有历史事实回填运行。</div>'}</section><section><h3>回填批次</h3>${batches || '<div class="memory-brain-empty">暂无历史事实回填批次。</div>'}</section></div>
            <section><h3>最近回填事实</h3><div class="memory-brain-fact-backfill-facts">${facts || '<div class="memory-brain-empty">运行历史事实回填后，这里会出现从历史事件拆出的原子事实。</div>'}</div></section>
        </div>`;
    }
    feature.historyFactBackfillView = { renderHistoryFactBackfillPanel };
})(window);
