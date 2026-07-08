// --- Memory Brain family adjustment view owner (v0.5.3) ---
// 只渲染家族合并 / 拆分 / 改名面板，不读写状态。
(function registerMemoryBrainFamilyAdjustmentView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
    function renderCandidate(item) {
        return `<article class="memory-brain-family-adjust-candidate" data-candidate-id="${escapeHtml(item.id)}">
            <div class="memory-brain-family-adjust-head"><strong>${escapeHtml(Math.round((Number(item.score) || 0) * 100))}% 相似</strong><span>${escapeHtml(item.familyTitles && item.familyTitles.join(' / ') || item.title || '')}</span></div>
            <p>${escapeHtml(item.reason || '')}</p>
            <div class="memory-brain-family-adjust-ids"><code>${escapeHtml(item.primaryFamilyId)}</code><em>+</em><code>${escapeHtml((item.secondaryFamilyIds || []).join(', '))}</code></div>
            <button class="memory-brain-load-family-adjust-btn" data-action="merge" data-primary-family-id="${escapeHtml(item.primaryFamilyId)}" data-secondary-family-ids="${escapeHtml((item.secondaryFamilyIds || []).join(','))}" data-title="${escapeHtml(item.title || '')}">载入合并表单</button>
        </article>`;
    }
    function renderAdjustment(item) {
        return `<div class="memory-brain-family-adjust-record"><strong>${escapeHtml(item.action)} · ${escapeHtml(item.status)}</strong><span>${escapeHtml((item.familyIds || []).join(', '))}</span><p>${escapeHtml(item.reason || '')}</p></div>`;
    }
    function renderRun(run) { return `<div class="memory-brain-family-adjust-run"><strong>${escapeHtml(run.status)}</strong><span>${escapeHtml(run.action)}</span><em>${escapeHtml(run.familyCount)} families · ${escapeHtml(run.factCount)} facts</em></div>`; }
    function renderBatch(batch) { return `<div class="memory-brain-family-adjust-batch"><strong>${escapeHtml(batch.status)}</strong><span>${escapeHtml(batch.action)}</span><em>${escapeHtml((batch.familyIds || []).join(', '))}</em></div>`; }
    function renderFamilyOption(item) { return `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)} · ${escapeHtml(item.factCount)} facts</option>`; }
    function renderFamilyAdjustmentPanel(cards) {
        const candidates = (cards && cards.candidates || []).map(renderCandidate).join('');
        const adjustments = (cards && cards.adjustments || []).map(renderAdjustment).join('');
        const runs = (cards && cards.runs || []).map(renderRun).join('');
        const batches = (cards && cards.batches || []).map(renderBatch).join('');
        const options = (cards && cards.familyOptions || []).map(renderFamilyOption).join('');
        return `<div class="memory-brain-family-adjust-panel">
            <div class="memory-brain-family-adjust-stats"><span>合并候选 <strong>${escapeHtml(cards && cards.totalText && cards.totalText.candidates || 0)}</strong></span><span>调整记录 <strong>${escapeHtml(cards && cards.totalText && cards.totalText.adjustments || 0)}</strong></span><span>批次 <strong>${escapeHtml(cards && cards.totalText && cards.totalText.batches || 0)}</strong></span></div>
            <div class="memory-brain-family-adjust-form">
                <label>处理方式<select id="memory-brain-family-adjust-action-select"><option value="merge">合并家族</option><option value="split">拆分家族</option><option value="rename">改名 / 修摘要</option></select></label>
                <label>主家族 / 源家族<select id="memory-brain-family-adjust-primary-select"><option value="">选择家族</option>${options}</select></label>
                <label>副家族 IDs<input id="memory-brain-family-adjust-secondary-input" placeholder="合并时填写，逗号分隔"></label>
                <label>拆分事实 IDs<textarea id="memory-brain-family-adjust-split-facts-input" rows="3" placeholder="拆分时填写属于源家族的 factIds，逗号或换行分隔"></textarea></label>
                <label>新标题<input id="memory-brain-family-adjust-title-input" placeholder="合并后标题 / 拆分新家族标题 / 改名标题"></label>
                <label>新摘要<textarea id="memory-brain-family-adjust-summary-input" rows="3" placeholder="可选：新的家族摘要"></textarea></label>
                <label>处理原因<input id="memory-brain-family-adjust-reason-input" placeholder="为什么这样合并、拆分或改名"></label>
                <div class="memory-brain-family-adjust-help">只调整 memoryBrain.families 和 fact.familyIds；不写旧记忆，不正式注入。</div>
            </div>
            <h3>相近家族候选</h3><div class="memory-brain-family-adjust-candidates">${candidates || '<div class="memory-brain-empty">暂无相近家族候选。可以手动选择家族合并、拆分或改名。</div>'}</div>
            <h3>最近调整记录</h3><div class="memory-brain-family-adjust-records">${adjustments || '<div class="memory-brain-empty">暂无家族调整记录。</div>'}</div>
            <h3>运行 / 批次</h3><div class="memory-brain-family-adjust-runs">${runs || '<div class="memory-brain-empty">暂无运行记录。</div>'}</div><div class="memory-brain-family-adjust-batches">${batches || ''}</div>
        </div>`;
    }
    function bindFamilyAdjustmentPanel(screen, service, helpers) {
        const setStatus = helpers && helpers.setStatus || function() {};
        const showToast = helpers && helpers.showToast || function() {};
        const rerender = helpers && helpers.render || function() {};
        screen.querySelectorAll('.memory-brain-load-family-adjust-btn').forEach(btn => btn.addEventListener('click', () => {
            const set = (selector, value) => { const input = screen.querySelector(selector); if (input) input.value = value || ''; };
            set('#memory-brain-family-adjust-action-select', btn.getAttribute('data-action') || 'merge');
            set('#memory-brain-family-adjust-primary-select', btn.getAttribute('data-primary-family-id'));
            set('#memory-brain-family-adjust-secondary-input', btn.getAttribute('data-secondary-family-ids'));
            set('#memory-brain-family-adjust-title-input', btn.getAttribute('data-title'));
            setStatus(screen, '#memory-brain-family-adjust-status', '已载入相近家族候选，可修改标题/摘要后应用。', 'ok');
        }));
        const applyBtn = screen.querySelector('#memory-brain-apply-family-adjust-btn');
        if (applyBtn) applyBtn.addEventListener('click', () => { try {
            const get = selector => { const input = screen.querySelector(selector); return input ? input.value : ''; };
            const result = service.adjustFamily({ action: get('#memory-brain-family-adjust-action-select'), primaryFamilyId: get('#memory-brain-family-adjust-primary-select'), familyId: get('#memory-brain-family-adjust-primary-select'), secondaryFamilyIds: get('#memory-brain-family-adjust-secondary-input'), splitFactIds: get('#memory-brain-family-adjust-split-facts-input'), title: get('#memory-brain-family-adjust-title-input'), summary: get('#memory-brain-family-adjust-summary-input'), reason: get('#memory-brain-family-adjust-reason-input') });
            showToast(`已调整家族：${result.adjustment && result.adjustment.action || ''}`); rerender();
        } catch (error) { setStatus(screen, '#memory-brain-family-adjust-status', error.message, 'error'); showToast(error.message); } });
        const rollbackBtn = screen.querySelector('#memory-brain-rollback-family-adjust-btn');
        if (rollbackBtn) rollbackBtn.addEventListener('click', () => { try { const result = service.rollbackLatestFamilyAdjustmentBatch(); showToast(`已撤回家族调整：${result.familyCount || 0} 个家族`); rerender(); } catch (error) { setStatus(screen, '#memory-brain-family-adjust-status', error.message, 'error'); showToast(error.message); } });
    }
    feature.familyAdjustmentView = { renderFamilyAdjustmentPanel, bindFamilyAdjustmentPanel };
})(window);
