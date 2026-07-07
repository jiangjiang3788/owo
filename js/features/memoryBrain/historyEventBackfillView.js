// --- Memory Brain history event backfill view owner (v0.4.3) ---
// 只渲染历史事件回填运行记录和最近事件；不读取存储、不调用 AI。
(function registerHistoryEventBackfillView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function renderRun(run) {
        return `<article class="memory-brain-event-backfill-run" data-status="${escapeHtml(run.status)}"><div><strong>${escapeHtml(run.status)}</strong><span>${escapeHtml(run.createdAt || '')}</span></div><p>${escapeHtml(run.jobCount)} 个任务 · ${escapeHtml(run.eventCount)} 条事件 · ${escapeHtml(run.failedCount)} 个失败</p></article>`;
    }
    function renderBatch(batch) {
        return `<article class="memory-brain-event-backfill-batch" data-status="${escapeHtml(batch.status)}"><strong>${escapeHtml(batch.eventCount)} 条事件</strong><span>${escapeHtml(batch.jobCount)} 个任务 · 失败 ${escapeHtml(batch.failedCount)}</span><small>${escapeHtml(batch.createdAt || '')}</small></article>`;
    }
    function renderEvent(event) {
        return `<article class="memory-brain-event-backfill-card"><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.summary)}</p><small>${escapeHtml(event.sourceRangeText)} · ${escapeHtml(event.dateText)}</small></article>`;
    }
    function renderHistoryEventBackfillPanel(cards) {
        const data = cards || {};
        const runs = (data.runs || []).map(renderRun).join('');
        const batches = (data.batches || []).map(renderBatch).join('');
        const events = (data.recentEvents || []).map(renderEvent).join('');
        return `<div class="memory-brain-event-backfill-panel">
            <div class="memory-brain-event-backfill-stats"><span>运行 ${escapeHtml(data.totalText && data.totalText.runs || 0)}</span><span>历史事件 ${escapeHtml(data.totalText && data.totalText.events || 0)}</span><span>批次 ${escapeHtml(data.totalText && data.totalText.batches || 0)}</span><small>${escapeHtml(data.nextVersion || 'v0.4.4')}</small></div>
            <div class="memory-brain-event-backfill-grid"><section><h3>最近运行</h3>${runs || '<div class="memory-brain-empty">还没有历史事件回填运行。</div>'}</section><section><h3>回填批次</h3>${batches || '<div class="memory-brain-empty">暂无历史事件回填批次。</div>'}</section></div>
            <section><h3>最近回填事件</h3><div class="memory-brain-event-backfill-events">${events || '<div class="memory-brain-empty">运行历史事件回填后，这里会出现来自几万条历史的时间线事件。</div>'}</div></section>
        </div>`;
    }
    feature.historyEventBackfillView = { renderHistoryEventBackfillPanel };
})(window);
