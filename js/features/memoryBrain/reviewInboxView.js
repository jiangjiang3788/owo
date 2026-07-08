// --- Memory Brain review inbox view owner (v0.5.0) ---
// 只渲染可信记忆审查收件箱，不读取旧记忆，不写状态。
(function registerReviewInboxView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
    function renderStats(cards) {
        const t = cards && cards.totalText || {};
        return `<div class="memory-brain-review-stats"><span>待审 <strong>${escapeHtml(t.open || 0)}</strong></span><span>高风险 <strong>${escapeHtml(t.high || 0)}</strong></span><span>中风险 <strong>${escapeHtml(t.medium || 0)}</strong></span><span>低风险 <strong>${escapeHtml(t.low || 0)}</strong></span><span>已确认 <strong>${escapeHtml(t.confirmed || 0)}</strong></span><span>已忽略 <strong>${escapeHtml(t.dismissed || 0)}</strong></span></div>`;
    }
    function renderItem(item) {
        return `<article class="memory-brain-review-item" data-severity="${escapeHtml(item.severity)}" data-status="${escapeHtml(item.status)}">
            <div class="memory-brain-review-item-head"><strong>${escapeHtml(item.issueLabel || item.issueType)}</strong><span>${escapeHtml(item.severity)}</span><em>${escapeHtml(item.confidencePercent)}%</em></div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.summary)}</p>
            <small>${escapeHtml(item.reason)}</small>
            <div class="memory-brain-review-meta"><span>${escapeHtml(item.targetType)}:${escapeHtml(item.targetId)}</span><span>${escapeHtml(item.suggestedAction)}</span></div>
            <div class="memory-brain-review-actions"><button class="memory-brain-review-confirm-btn" data-review-id="${escapeHtml(item.id)}">确认先保留</button><button class="memory-brain-review-edit-btn" data-review-id="${escapeHtml(item.id)}">标记待改写</button><button class="memory-brain-review-dismiss-btn" data-review-id="${escapeHtml(item.id)}">忽略</button></div>
        </article>`;
    }
    function renderRun(run) { return `<div class="memory-brain-review-run"><strong>${escapeHtml(run.status)}</strong><span>${escapeHtml(run.createdAt || '')}</span><em>${escapeHtml(run.itemCount)} 项 / ${escapeHtml(run.openCount)} 待审</em></div>`; }
    function renderBatch(batch) { return `<div class="memory-brain-review-batch"><span>${escapeHtml(batch.status)}</span><strong>${escapeHtml(batch.itemCount)} items</strong><em>${escapeHtml(batch.createdAt || '')}</em></div>`; }
    function renderReviewInboxPanel(cards) {
        if (!cards) return '<div class="memory-brain-empty">记忆审查收件箱尚未加载。</div>';
        const openItems = (cards.openItems || []).map(renderItem).join('');
        const resolvedItems = (cards.resolvedItems || []).map(item => `<div class="memory-brain-review-resolved"><strong>${escapeHtml(item.issueLabel)}</strong><span>${escapeHtml(item.title)}</span><em>${escapeHtml(item.status)}</em></div>`).join('');
        const runs = (cards.runs || []).map(renderRun).join('');
        const batches = (cards.batches || []).map(renderBatch).join('');
        return `<div class="memory-brain-review-panel">
            ${renderStats(cards)}
            <div class="memory-brain-review-grid">${openItems || '<div class="memory-brain-empty">暂无待审查记忆。运行“生成审查收件箱”后会汇总低置信、冲突、重复和待确认模型。</div>'}</div>
            <h3>已处理 / 已忽略</h3><div class="memory-brain-review-resolved-list">${resolvedItems || '<div class="memory-brain-empty">暂无已处理项。</div>'}</div>
            <h3>最近审查运行</h3><div class="memory-brain-review-runs">${runs || '<div class="memory-brain-empty">还没有审查运行。</div>'}</div>
            <h3>批次</h3><div class="memory-brain-review-batches">${batches || '<div class="memory-brain-empty">暂无批次。</div>'}</div>
        </div>`;
    }
    feature.reviewInboxView = { renderReviewInboxPanel };
})(window);
