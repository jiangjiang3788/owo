// --- Memory Brain cutover rehearsal view owner (v0.4.8) ---
// 渲染新旧注入对照报告；不决定正式切换。
(function registerMemoryBrainCutoverRehearsalView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function renderIssues(issues) {
        if (!issues || !issues.length) return '<div class="memory-brain-cutover-ok">暂无高风险问题；仍保持 shadow。</div>';
        return `<ul class="memory-brain-cutover-issues">${issues.map(issue => `<li data-severity="${escapeHtml(issue.severity)}"><strong>${escapeHtml(issue.title)}</strong><span>${escapeHtml(issue.detail)}</span></li>`).join('')}</ul>`;
    }
    function renderReport(report) {
        const metrics = report.metrics || {};
        return `<article class="memory-brain-cutover-card">
            <div class="memory-brain-cutover-head"><div><h3>${escapeHtml(report.chatName || '接管演练')}</h3><p>${escapeHtml(report.queryText || '使用当前聊天最后一条用户消息')}</p></div><strong>${escapeHtml(report.score)} 分</strong></div>
            <div class="memory-brain-cutover-metrics"><span>旧命中 ${escapeHtml(metrics.legacyHitCount || 0)}</span><span>新命中 ${escapeHtml(metrics.memoryBrainHitCount || 0)}</span><span>重叠 ${escapeHtml(metrics.overlapPercent || 0)}%</span><span>${escapeHtml(report.gate || 'blocked')}</span></div>
            ${renderIssues(report.issues)}
            <details><summary>查看旧正式注入块预览</summary><pre>${escapeHtml(report.legacyBlockPreview || '无')}</pre></details>
            <details><summary>查看 Memory Brain 影子注入块预览</summary><pre>${escapeHtml(report.memoryBrainBlockPreview || '无')}</pre></details>
        </article>`;
    }
    function renderRun(run) {
        return `<li><span>${escapeHtml(run.chatName || run.id)}</span><em>${escapeHtml(run.status)} · ${escapeHtml(run.createdAt || '')} · score ${escapeHtml(run.readiness && run.readiness.score || 0)}</em></li>`;
    }
    function renderCutoverRehearsalPanel(cards) {
        cards = cards || { totalText: {}, reports: [], runs: [], batches: [] };
        const total = cards.totalText || {};
        const reports = cards.reports || [];
        return `<div class="memory-brain-cutover-panel">
            <div class="memory-brain-cutover-summary"><span>报告 ${escapeHtml(total.reports || 0)}</span><span>运行 ${escapeHtml(total.runs || 0)}</span><span>批次 ${escapeHtml(total.batches || 0)}</span><strong>readyForFormalCutover = false</strong></div>
            <div class="memory-brain-cutover-list">${reports.length ? reports.map(renderReport).join('') : '<div class="memory-brain-empty">还没有接管演练报告。输入测试问题或留空使用当前聊天最后一条用户消息。</div>'}</div>
            <ul class="memory-brain-cutover-runs">${(cards.runs || []).map(renderRun).join('')}</ul>
        </div>`;
    }
    feature.cutoverRehearsalView = { renderCutoverRehearsalPanel };
})(window);
