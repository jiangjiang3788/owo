// --- Memory Brain trust score view owner (v0.5.6) ---
(function registerMemoryTrustScoreView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    const TYPE_LABELS = { fact: '事实', family: '家族', edge: '关系边', model: '长期模型' };
    const LEVEL_LABELS = { high: '高可信', medium: '中可信', low: '低可信', critical: '高风险' };
    function renderReasons(reasons) { return (reasons || []).map(reason => `<li><span>${escapeHtml(reason.text || reason)}</span><em>${escapeHtml(reason.points || 0)}</em></li>`).join('') || '<li><span>暂无解释</span><em>0</em></li>'; }
    function renderRecord(record) {
        return `<article class="memory-brain-trust-record" data-level="${escapeHtml(record.level)}"><div class="memory-brain-trust-score"><strong>${escapeHtml(record.score)}</strong><span>${escapeHtml(LEVEL_LABELS[record.level] || record.level)}</span></div><div class="memory-brain-trust-body"><h3>${escapeHtml(TYPE_LABELS[record.targetType] || record.targetType)} · ${escapeHtml(record.title || record.targetId)}</h3><p>${escapeHtml(record.targetId)}</p><ul>${renderReasons(record.reasons)}</ul></div></article>`;
    }
    function renderMemoryTrustScorePanel(cards) {
        cards = cards || {};
        const levelCards = (cards.levelCards || []).map(card => `<div class="memory-brain-trust-pill"><span>${escapeHtml(LEVEL_LABELS[card.level] || card.level)}</span><strong>${escapeHtml(card.count)}</strong></div>`).join('');
        const typeCards = (cards.typeCards || []).map(card => `<div class="memory-brain-trust-pill"><span>${escapeHtml(TYPE_LABELS[card.type] || card.type)}</span><strong>${escapeHtml(card.count)}</strong></div>`).join('');
        const lowRecords = (cards.lowRecords || []).map(renderRecord).join('') || '<div class="memory-brain-empty">暂时没有低可信记忆。运行信任分后会在这里显示需要关注的对象。</div>';
        const latest = (cards.latestRecords || []).slice(0, 8).map(renderRecord).join('') || '<div class="memory-brain-empty">还没有信任分记录。</div>';
        const runs = (cards.runs || []).map(run => `<li><span>${escapeHtml(run.id)}</span><em>${escapeHtml(run.status)} · 平均 ${escapeHtml(run.averageScore)} · 低可信 ${escapeHtml(run.lowCount)} / ${escapeHtml(run.totalCount)}</em></li>`).join('') || '<li><span>暂无运行记录</span><em></em></li>';
        const batches = (cards.batches || []).map(batch => `<li><span>${escapeHtml(batch.id)}</span><em>${escapeHtml(batch.status)} · ${escapeHtml(batch.totalCount)} 项 · 平均 ${escapeHtml(batch.averageScore)}</em></li>`).join('') || '<li><span>暂无批次</span><em></em></li>';
        return `<div class="memory-brain-trust-panel"><div class="memory-brain-trust-overview"><div><span>计划状态</span><strong>${escapeHtml(cards.planStatus || 'unknown')}</strong></div><div><span>预计对象</span><strong>${escapeHtml(cards.stats && cards.stats.total || 0)}</strong></div><div><span>平均信任分</span><strong>${escapeHtml(cards.stats && cards.stats.averageScore || 0)}</strong></div><div><span>低可信</span><strong>${escapeHtml(cards.stats && cards.stats.lowCount || 0)}</strong></div></div><div class="memory-brain-trust-grid">${levelCards}${typeCards}</div>${cards.planError ? `<div class="memory-brain-inline-status error">${escapeHtml(cards.planError)}</div>` : ''}<h3>低可信 / 高风险优先看</h3><div class="memory-brain-trust-list">${lowRecords}</div><h3>最近信任分记录</h3><div class="memory-brain-trust-list compact">${latest}</div><div class="memory-brain-two-col"><div><h3>运行记录</h3><ul class="memory-brain-chat-list">${runs}</ul></div><div><h3>批次</h3><ul class="memory-brain-chat-list">${batches}</ul></div></div></div>`;
    }
    function bindMemoryTrustScorePanel(screen, service, helpers) {
        const runBtn = screen.querySelector('#memory-brain-run-trust-btn');
        if (runBtn) runBtn.addEventListener('click', () => { try { const result = service.runMemoryTrustScore({}); helpers.showToast(`已计算 ${result.records && result.records.length || 0} 项记忆信任分`); helpers.render(); } catch (error) { helpers.setStatus(screen, '#memory-brain-trust-status', error.message, 'error'); helpers.showToast(error.message); } });
        const rollbackBtn = screen.querySelector('#memory-brain-rollback-trust-btn');
        if (rollbackBtn) rollbackBtn.addEventListener('click', () => { try { const result = service.rollbackLatestTrustScoreBatch({}); helpers.showToast(`已撤回最近信任分：${result.recordCount || 0} 项`); helpers.render(); } catch (error) { helpers.setStatus(screen, '#memory-brain-trust-status', error.message, 'error'); helpers.showToast(error.message); } });
    }
    feature.trustScoreView = { renderMemoryTrustScorePanel, bindMemoryTrustScorePanel };
})(window);
