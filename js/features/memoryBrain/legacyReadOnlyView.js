// --- Memory Brain legacy read-only downgrade view (v0.6.3) ---
(function registerMemoryBrainLegacyReadOnlyView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function renderIssue(issue) { return `<li data-severity="${escapeHtml(issue.severity || 'info')}"><strong>${escapeHtml(issue.title || issue.code)}</strong><span>${escapeHtml(issue.detail || '')}</span></li>`; }
    function renderSource(source) { return `<li><strong>${escapeHtml(source.label || source.id)}</strong><span>${escapeHtml(source.count || 0)} 项</span><em>${escapeHtml(source.plannedRole || 'read-only-history-source')}</em></li>`; }
    function renderReport(report) {
        return `<article class="memory-brain-legacy-readonly-card">
            <div class="memory-brain-legacy-readonly-top"><strong>准备度 ${escapeHtml(report.readinessScore || 0)}</strong><span>${escapeHtml(report.cutoverGate || 'blocked-until-v0.9')}</span><em>${escapeHtml(report.createdAt || '')}</em></div>
            <p>${escapeHtml(report.preview || '旧系统将来降级为只读历史来源；本版只做演练。')}</p>
            <div class="memory-brain-legacy-readonly-stats"><span>聊天 ${escapeHtml(report.chatCount || 0)}</span><span>日记 ${escapeHtml(report.totals && report.totals.journals || 0)}</span><span>表格 ${escapeHtml(report.totals && report.totals.tableCells || 0)}</span><span>向量 ${escapeHtml(report.totals && report.totals.vectorEntries || 0)}</span><span>问题 ${escapeHtml(report.issueCount || 0)}</span></div>
            <ul class="memory-brain-legacy-source-list">${(report.sources || []).map(renderSource).join('')}</ul>
            <ul class="memory-brain-legacy-readonly-issues">${(report.issues || []).map(renderIssue).join('') || '<li data-severity="info"><strong>暂无阻断</strong><span>仍受 v0.9 总门禁保护。</span></li>'}</ul>
        </article>`;
    }
    function renderLegacyReadOnlyPanel(cards) {
        const reports = cards && Array.isArray(cards.reports) ? cards.reports : [];
        const runs = cards && Array.isArray(cards.runs) ? cards.runs : [];
        const runHtml = runs.map(run => `<li><span>${escapeHtml(run.activeOwner || 'legacy')} → ${escapeHtml(run.finalOwner || 'legacy')} · ${escapeHtml(run.status || '')}</span><em>${escapeHtml(run.createdAt || '')}</em></li>`).join('');
        return `<div class="memory-brain-legacy-readonly-panel">
            <div class="memory-brain-legacy-readonly-summary"><span>旧系统只读降级：演练</span><span>正式 owner：legacy</span><strong>blocked-until-v0.9</strong></div>
            <p class="memory-brain-legacy-readonly-note">本功能只生成旧日记 / 表格 / 向量未来降为只读历史来源的准备度报告，不改 chat.memoryMode，不禁用当前正式档案记忆，不接 prompt。</p>
            <div class="memory-brain-legacy-readonly-list">${reports.map(renderReport).join('') || '<div class="memory-brain-empty">还没有旧系统只读降级演练。点击“生成只读降级报告”后，会检查旧来源、可信 gate、冲突和信任分状态。</div>'}</div>
            <ul class="memory-brain-legacy-readonly-runs">${runHtml || '<li><span>暂无旧系统只读降级运行记录</span><em>shadow only</em></li>'}</ul>
        </div>`;
    }
    feature.legacyReadOnlyView = { renderLegacyReadOnlyPanel };
})(window);
