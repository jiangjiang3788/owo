// --- Memory Brain realtime injection trace view (v0.6.2) ---
(function registerMemoryBrainRealtimeInjectionTraceView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function renderReasonList(items) {
        return (items || []).map(item => `<li><strong>${escapeHtml(item.title || item.id)}</strong><span>${escapeHtml((item.reasons || []).join('；'))}</span></li>`).join('') || '<li><strong>暂无</strong><span>没有记录到对应项。</span></li>';
    }
    function renderBlocker(blocker) { return `<li><strong>${escapeHtml(blocker.title || blocker.code)}</strong><span>${escapeHtml(blocker.detail || '')}</span></li>`; }
    function renderReport(report) {
        const counts = report.selectedCounts || {};
        return `<article class="memory-brain-realtime-card">
            <div class="memory-brain-realtime-top"><strong>${escapeHtml(report.finalOwner || 'legacy')}</strong><span>命中 ${escapeHtml(report.hitCount || 0)}</span><span>未命中 ${escapeHtml(report.missCount || 0)}</span><em>${escapeHtml(report.createdAt || '')}</em></div>
            <p>${escapeHtml(report.queryText || '未提供当前输入')}</p>
            <div class="memory-brain-realtime-stats"><span>旧块 ${escapeHtml(report.legacyChars || 0)}</span><span>脑候选 ${escapeHtml(report.brainChars || 0)}</span><span>重叠 ${escapeHtml(report.overlapRatio || 0)}%</span><span>阻断 ${escapeHtml(report.blockerCount || 0)}</span></div>
            <div class="memory-brain-realtime-counts"><span>模型 ${escapeHtml(counts.models || 0)}</span><span>事实 ${escapeHtml(counts.facts || 0)}</span><span>家族 ${escapeHtml(counts.families || 0)}</span><span>关系 ${escapeHtml(counts.edges || 0)}</span><span>事件 ${escapeHtml(counts.events || 0)}</span></div>
            <details><summary>为什么命中</summary><ul>${renderReasonList(report.hits)}</ul></details>
            <details><summary>为什么没命中 / 被裁剪</summary><ul>${renderReasonList((report.misses || []).concat(report.clipped || []))}</ul></details>
            <details open><summary>为什么不正式接管</summary><ul>${(report.blockers || []).map(renderBlocker).join('') || '<li><strong>仍是 shadow trace</strong><span>本报告不接正式 prompt。</span></li>'}</ul></details>
        </article>`;
    }
    function renderRealtimeInjectionTracePanel(cards) {
        const reports = cards && Array.isArray(cards.reports) ? cards.reports : [];
        const runs = cards && Array.isArray(cards.runs) ? cards.runs : [];
        const runHtml = runs.map(run => `<li><span>${escapeHtml(run.finalOwner || 'legacy')} · 命中 ${escapeHtml(run.hitCount || 0)} · 阻断 ${escapeHtml(run.blockerCount || 0)}</span><em>${escapeHtml(run.createdAt || '')}</em></li>`).join('');
        return `<div class="memory-brain-realtime-panel">
            <textarea id="memory-brain-realtime-query-input" class="memory-brain-realtime-query" placeholder="输入测试用户消息；留空时使用当前聊天最后一条用户消息。"></textarea>
            <p class="memory-brain-realtime-note">v0.6.2 解释每次注入候选为什么命中、为什么没命中、为什么被裁剪、为什么仍由 legacy 正式注入。它只写 trace，不接 prompt。</p>
            <div class="memory-brain-realtime-list">${reports.map(renderReport).join('') || '<div class="memory-brain-empty">还没有实时注入 trace。点击“生成实时注入 trace”后，会记录命中、未命中、裁剪和 blocked-until-v0.9 原因。</div>'}</div>
            <ul class="memory-brain-realtime-runs">${runHtml || '<li><span>暂无实时 trace 运行记录</span><em>shadow only</em></li>'}</ul>
        </div>`;
    }
    feature.realtimeInjectionTraceView = { renderRealtimeInjectionTracePanel };
})(window);
