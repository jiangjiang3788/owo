// --- Memory Brain fact conflict view owner (v0.5.2) ---
// 只渲染冲突事实处理面板，不读写状态。
(function registerFactConflictView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
    function renderFactSummary(fact) { return `<li><code>${escapeHtml(fact.id)}</code><span>${escapeHtml(fact.status || '')}/${escapeHtml(fact.lifecycleStatus || '')}</span><p>${escapeHtml(fact.content || '')}</p><em>confidence ${escapeHtml(Math.round((Number(fact.confidence) || 0) * 100))}%</em></li>`; }
    function renderGroup(group) {
        return `<article class="memory-brain-conflict-group" data-conflict-id="${escapeHtml(group.id)}">
            <div class="memory-brain-conflict-group-head"><strong>${escapeHtml(group.id)}</strong><span>${escapeHtml(group.factCount)} 条事实</span></div>
            <p>${escapeHtml(group.reason || '这些事实互相冲突，需要选择处理方式。')}</p>
            <ul>${(group.factSummaries || []).map(renderFactSummary).join('')}</ul>
            <button class="memory-brain-load-conflict-btn" data-conflict-id="${escapeHtml(group.id)}" data-preferred-fact-id="${escapeHtml(group.preferredFactId)}" data-fact-ids="${escapeHtml((group.factIds || []).join(','))}">载入处理表单</button>
        </article>`;
    }
    function renderResolution(item) { return `<div class="memory-brain-conflict-record"><strong>${escapeHtml(item.action)} · ${escapeHtml(item.status)}</strong><span>${escapeHtml(item.conflictId)}</span><p>${escapeHtml(item.reason)}</p></div>`; }
    function renderRun(run) { return `<div class="memory-brain-conflict-run"><strong>${escapeHtml(run.status)}</strong><span>${escapeHtml(run.conflictId)}</span><em>${escapeHtml(run.action)} · ${escapeHtml(run.factCount)} facts</em></div>`; }
    function renderBatch(batch) { return `<div class="memory-brain-conflict-batch"><strong>${escapeHtml(batch.status)}</strong><span>${escapeHtml(batch.conflictId)}</span><em>${escapeHtml(batch.action)}</em></div>`; }
    function renderFactConflictPanel(cards) {
        const groups = (cards && cards.groups || []).map(renderGroup).join('');
        const resolutions = (cards && cards.resolutions || []).map(renderResolution).join('');
        const runs = (cards && cards.runs || []).map(renderRun).join('');
        const batches = (cards && cards.batches || []).map(renderBatch).join('');
        return `<div class="memory-brain-conflict-panel">
            <div class="memory-brain-conflict-stats"><span>待处理冲突 <strong>${escapeHtml(cards && cards.totalText && cards.totalText.groups || 0)}</strong></span><span>处理记录 <strong>${escapeHtml(cards && cards.totalText && cards.totalText.resolutions || 0)}</strong></span><span>批次 <strong>${escapeHtml(cards && cards.totalText && cards.totalText.batches || 0)}</strong></span></div>
            <div class="memory-brain-conflict-form">
                <label>Conflict ID<input id="memory-brain-conflict-id-input" placeholder="dispute-... / fact-conflict..."></label>
                <label>处理方式<select id="memory-brain-conflict-action-select"><option value="prefer-fact">选择真实版本，其他标记过时</option><option value="keep-both">两边都保留为 active</option><option value="conditional">条件保留，标记适用场景</option><option value="mark-obsolete">手动指定过时事实</option><option value="dismiss">忽略这个冲突提示</option></select></label>
                <label>首选 Fact ID<input id="memory-brain-conflict-preferred-input" placeholder="保留为真实版本的 factId"></label>
                <label>过时 Fact IDs<input id="memory-brain-conflict-obsolete-input" placeholder="逗号分隔；留空时默认首选外全部过时"></label>
                <label>条件说明<textarea id="memory-brain-conflict-condition-input" rows="3" placeholder="例如：旧事实适用于 2025 年以前，新事实适用于现在。"></textarea></label>
                <label>处理原因<input id="memory-brain-conflict-reason-input" placeholder="为什么这样处理"></label>
                <div class="memory-brain-conflict-help">冲突处理只更新 Memory Brain facts / conflicts，并保留 batch 回滚；不写旧记忆、不正式注入。</div>
            </div>
            <h3>待处理冲突组</h3><div class="memory-brain-conflict-groups">${groups || '<div class="memory-brain-empty">暂无 open disputed facts。可先运行事实生命周期清理。</div>'}</div>
            <h3>最近处理记录</h3><div class="memory-brain-conflict-records">${resolutions || '<div class="memory-brain-empty">暂无冲突处理记录。</div>'}</div>
            <h3>运行 / 批次</h3><div class="memory-brain-conflict-runs">${runs || '<div class="memory-brain-empty">暂无运行记录。</div>'}</div><div class="memory-brain-conflict-batches">${batches || ''}</div>
        </div>`;
    }
    function bindFactConflictPanel(screen, service, helpers) {
        const setStatus = helpers && helpers.setStatus || function() {};
        const showToast = helpers && helpers.showToast || function() {};
        const rerender = helpers && helpers.render || function() {};
        screen.querySelectorAll('.memory-brain-load-conflict-btn').forEach(btn => btn.addEventListener('click', () => {
            const set = (selector, value) => { const input = screen.querySelector(selector); if (input) input.value = value || ''; };
            set('#memory-brain-conflict-id-input', btn.getAttribute('data-conflict-id'));
            set('#memory-brain-conflict-preferred-input', btn.getAttribute('data-preferred-fact-id'));
            const ids = (btn.getAttribute('data-fact-ids') || '').split(',').filter(Boolean);
            const preferred = btn.getAttribute('data-preferred-fact-id');
            set('#memory-brain-conflict-obsolete-input', ids.filter(id => id !== preferred).join(','));
            setStatus(screen, '#memory-brain-conflict-status', '已载入冲突组，请选择处理方式后应用。', 'ok');
        }));
        const applyBtn = screen.querySelector('#memory-brain-apply-conflict-btn');
        if (applyBtn) applyBtn.addEventListener('click', () => { try {
            const get = selector => { const input = screen.querySelector(selector); return input ? input.value : ''; };
            const result = service.resolveFactConflict({ conflictId: get('#memory-brain-conflict-id-input'), action: get('#memory-brain-conflict-action-select'), preferredFactId: get('#memory-brain-conflict-preferred-input'), obsoleteFactIds: get('#memory-brain-conflict-obsolete-input'), conditionNote: get('#memory-brain-conflict-condition-input'), resolutionReason: get('#memory-brain-conflict-reason-input') });
            showToast(`已处理冲突：${result.resolution && result.resolution.action || ''}`); rerender();
        } catch (error) { setStatus(screen, '#memory-brain-conflict-status', error.message, 'error'); showToast(error.message); } });
        const rollbackBtn = screen.querySelector('#memory-brain-rollback-conflict-btn');
        if (rollbackBtn) rollbackBtn.addEventListener('click', () => { try { const result = service.rollbackLatestConflictResolutionBatch(); showToast(`已撤回冲突处理：${result.restoredFacts || 0} 条事实`); rerender(); } catch (error) { setStatus(screen, '#memory-brain-conflict-status', error.message, 'error'); showToast(error.message); } });
    }
    feature.factConflictView = { renderFactConflictPanel, bindFactConflictPanel };
})(window);
