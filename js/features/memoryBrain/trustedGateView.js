// --- Memory Brain trusted gate view owner (v0.5.7) ---
(function registerTrustedMemoryGateView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    const STATUS_LABELS = { passed: '通过', warning: '警告', blocked: '阻断', missing: '缺失' };
    function renderCheck(check) {
        return `<article class="memory-brain-trusted-check" data-status="${escapeHtml(check.status)}"><div><strong>${escapeHtml(check.title || check.id)}</strong><span>${escapeHtml(STATUS_LABELS[check.status] || check.status)}</span></div><p>${escapeHtml(check.message || '')}</p><small>${escapeHtml(check.nextAction || '')}</small></article>`;
    }
    function renderTrustedGatePanel(cards) {
        cards = cards || {};
        const checks = (cards.checks || []).map(renderCheck).join('') || '<div class="memory-brain-empty">还没有可信记忆 gate 检查项。</div>';
        const actions = (cards.nextActions || []).map(item => `<li>${escapeHtml(item)}</li>`).join('') || '<li>暂无阻断动作。</li>';
        const reports = (cards.reports || []).map(report => `<li><span>${escapeHtml(report.id || '当前计划')}</span><em>${escapeHtml(report.status)} · ${escapeHtml(report.readinessScore)} 分 · 阻断 ${escapeHtml(report.blockerCount)} / 警告 ${escapeHtml(report.warningCount)}</em></li>`).join('') || '<li><span>暂无报告</span><em></em></li>';
        const runs = (cards.runs || []).map(run => `<li><span>${escapeHtml(run.id)}</span><em>${escapeHtml(run.status)} · ${escapeHtml(run.readinessScore)} 分 · 阻断 ${escapeHtml(run.blockerCount)} / 警告 ${escapeHtml(run.warningCount)}</em></li>`).join('') || '<li><span>暂无运行记录</span><em></em></li>';
        const batches = (cards.batches || []).map(batch => `<li><span>${escapeHtml(batch.id)}</span><em>${escapeHtml(batch.status)} · ${escapeHtml(batch.readinessScore)} 分</em></li>`).join('') || '<li><span>暂无批次</span><em></em></li>';
        return `<div class="memory-brain-trusted-panel"><div class="memory-brain-trusted-score"><div><span>可信阶段分</span><strong>${escapeHtml(cards.readinessScore || 0)}</strong></div><div><span>可信可用</span><strong>${cards.trustedReady ? '是' : '否'}</strong></div><div><span>阻断</span><strong>${escapeHtml(cards.blockerCount || 0)}</strong></div><div><span>警告</span><strong>${escapeHtml(cards.warningCount || 0)}</strong></div><div><span>正式接管</span><strong>${escapeHtml(cards.cutoverGate || 'blocked-until-v0.9')}</strong></div></div><div class="memory-brain-trusted-checks">${checks}</div><div class="memory-brain-trusted-next"><h3>下一步处理建议</h3><ol>${actions}</ol></div><div class="memory-brain-two-col"><div><h3>报告</h3><ul class="memory-brain-chat-list">${reports}</ul></div><div><h3>运行记录</h3><ul class="memory-brain-chat-list">${runs}</ul></div></div><div><h3>批次</h3><ul class="memory-brain-chat-list">${batches}</ul></div></div>`;
    }
    function bindTrustedGatePanel(screen, service, helpers) {
        const runBtn = screen.querySelector('#memory-brain-run-trusted-gate-btn');
        if (runBtn) runBtn.addEventListener('click', () => { try { const result = service.runTrustedMemoryGate({}); helpers.showToast(`可信记忆 gate：${result.run && result.run.readinessScore || 0} 分`); helpers.render(); } catch (error) { helpers.setStatus(screen, '#memory-brain-trusted-gate-status', error.message, 'error'); helpers.showToast(error.message); } });
        const rollbackBtn = screen.querySelector('#memory-brain-rollback-trusted-gate-btn');
        if (rollbackBtn) rollbackBtn.addEventListener('click', () => { try { const result = service.rollbackLatestTrustedMemoryGateBatch({}); helpers.showToast(`已撤回可信记忆 gate：${result.readinessScore || 0} 分报告`); helpers.render(); } catch (error) { helpers.setStatus(screen, '#memory-brain-trusted-gate-status', error.message, 'error'); helpers.showToast(error.message); } });
    }
    feature.trustedGateView = { renderTrustedGatePanel, bindTrustedGatePanel };
})(window);
