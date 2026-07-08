// --- Memory Brain owner gate view (v0.4.9) ---
// 只渲染单一 owner 安全门卡片，不决定正式 prompt。
(function registerMemoryBrainOwnerGateView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function renderOwnerGatePanel(cards) {
        const state = cards && cards.ownerState || {};
        const modes = cards && Array.isArray(cards.modes) ? cards.modes : [];
        const runs = cards && Array.isArray(cards.runs) ? cards.runs : [];
        const modeButtons = modes.map(mode => `<button class="memory-brain-owner-mode-btn" data-owner-mode="${escapeHtml(mode.id)}" data-active="${mode.active ? 'true' : 'false'}"><strong>${escapeHtml(mode.label)}</strong><span>${mode.effective ? '当前实际' : (mode.active ? '已请求' : '预览')}</span></button>`).join('');
        const issueHtml = (state.issues || []).map(issue => `<li data-severity="${escapeHtml(issue.severity)}"><strong>${escapeHtml(issue.title)}</strong><span>${escapeHtml(issue.detail)}</span></li>`).join('');
        const runHtml = runs.map(run => `<li><span>${escapeHtml(run.requestedOwner)} → ${escapeHtml(run.effectiveOwner)}</span><em>${escapeHtml(run.status)} · ${escapeHtml(run.createdAt || '')}</em></li>`).join('');
        return `<div class="memory-brain-owner-gate-panel">
            <div class="memory-brain-owner-summary">
                <span>正式 owner：${escapeHtml(state.formalOwnerLabel || '旧档案记忆 owner')}</span>
                <span>请求 owner：${escapeHtml(state.requestedOwnerLabel || '旧档案记忆 owner')}</span>
                <strong>${escapeHtml(state.cutoverGate || 'blocked-until-v0.9')}</strong>
            </div>
            <p class="memory-brain-owner-note">${escapeHtml(state.summary || state.reason || 'Memory Brain 仍保持 shadow，只读 / 可整理 / 可预览。')}</p>
            <div class="memory-brain-owner-modes">${modeButtons}</div>
            <ul class="memory-brain-owner-issues">${issueHtml || '<li data-severity="info"><strong>无新增风险</strong><span>当前仍由旧记忆 owner 正式注入。</span></li>'}</ul>
            <ul class="memory-brain-owner-runs">${runHtml || '<li><span>暂无切换门记录</span><em>点击上方模式后只记录演练，不接 prompt</em></li>'}</ul>
        </div>`;
    }
    feature.ownerGateView = { renderOwnerGatePanel };
})(window);
