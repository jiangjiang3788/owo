// --- Memory Brain formal injection adapter view (v0.6.0) ---
(function registerMemoryBrainFormalInjectionAdapterView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function renderIssue(issue) { return `<li data-severity="${escapeHtml(issue.severity || 'info')}"><strong>${escapeHtml(issue.title || issue.code)}</strong><span>${escapeHtml(issue.detail || '')}</span></li>`; }
    function renderReport(report) {
        return `<article class="memory-brain-formal-report-card">
            <div class="memory-brain-formal-report-top"><strong>${escapeHtml(report.finalOwner || 'legacy')}</strong><span>${escapeHtml(report.cutoverGate || 'blocked-until-v0.9')}</span><em>${escapeHtml(report.createdAt || '')}</em></div>
            <p>${escapeHtml(report.queryText || '未提供当前输入')}</p>
            <div class="memory-brain-formal-stats"><span>旧块 ${escapeHtml(report.legacyChars || 0)}</span><span>脑候选 ${escapeHtml(report.brainChars || 0)}</span><span>最终块 ${escapeHtml(report.finalChars || 0)}</span><span>问题 ${escapeHtml(report.issueCount || 0)}</span></div>
            <ul class="memory-brain-formal-issues">${(report.issues || []).map(renderIssue).join('') || '<li data-severity="info"><strong>无新增阻断</strong><span>当前仍遵守单一 owner 规则。</span></li>'}</ul>
        </article>`;
    }
    function renderFormalInjectionAdapterPanel(cards) {
        const reports = cards && Array.isArray(cards.reports) ? cards.reports : [];
        const runs = cards && Array.isArray(cards.runs) ? cards.runs : [];
        const latest = reports[0] || null;
        const runHtml = runs.map(run => `<li><span>${escapeHtml(run.finalOwner || 'legacy')} · ${escapeHtml(run.status || '')}</span><em>${escapeHtml(run.createdAt || '')}</em></li>`).join('');
        return `<div class="memory-brain-formal-panel">
            <textarea id="memory-brain-formal-query-input" class="memory-brain-formal-query" placeholder="输入测试用户消息；留空时会使用当前聊天最后一条用户消息。"></textarea>
            <div class="memory-brain-formal-summary"><span>唯一 adapter：${latest ? escapeHtml(latest.finalOwner) : 'legacy'}</span><span>Memory Brain 正式注入：false</span><strong>blocked-until-v0.9</strong></div>
            <p class="memory-brain-formal-note">v0.6.0 只建立唯一 memory block adapter 和演练记录，不把 Memory Brain 写进正式 prompt；当前正式注入仍由旧记忆 owner 执行。</p>
            <div class="memory-brain-formal-report-list">${reports.map(renderReport).join('') || '<div class="memory-brain-empty">还没有正式注入 adapter 演练。点击“运行 adapter 演练”后，会同时生成旧正式块和 Memory Brain 候选块，但不会接入 prompt。</div>'}</div>
            <ul class="memory-brain-formal-runs">${runHtml || '<li><span>暂无 adapter 运行记录</span><em>shadow only</em></li>'}</ul>
        </div>`;
    }
    feature.formalInjectionAdapterView = { renderFormalInjectionAdapterPanel };
})(window);
