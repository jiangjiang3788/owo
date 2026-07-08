// --- Memory Brain correction propagation view owner (v0.5.5) ---
// 只渲染纠错影响传播面板，不读写状态。
(function registerMemoryBrainCorrectionPropagationView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
    function renderSource(item) { return `<div class="memory-brain-propagation-chip"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.count)}</strong></div>`; }
    function renderImpact(item) { return `<article class="memory-brain-propagation-impact"><strong>${escapeHtml(item.count)}</strong><span>${escapeHtml(item.label)}</span><small>${escapeHtml((item.ids || []).join(' / ') || '暂无影响对象')}</small></article>`; }
    function renderPropagation(item) { return `<div class="memory-brain-propagation-record"><strong>${escapeHtml(item.status)}</strong><span>${escapeHtml(item.impactText)}</span><p>${escapeHtml(item.reason)}</p><small>${escapeHtml(item.sourceText)}</small></div>`; }
    function renderRun(run) { return `<div class="memory-brain-propagation-run"><strong>${escapeHtml(run.status)}</strong><span>${escapeHtml(run.impactText)}</span><em>${escapeHtml(run.createdAt)}</em></div>`; }
    function renderBatch(batch) { return `<div class="memory-brain-propagation-batch"><strong>${escapeHtml(batch.status)}</strong><span>${escapeHtml(batch.factCount)} facts · ${escapeHtml(batch.familyCount)} families · ${escapeHtml(batch.edgeCount)} edges · ${escapeHtml(batch.modelCount)} models</span><em>${escapeHtml(batch.id)}</em></div>`; }
    function renderCorrectionPropagationPanel(cards) {
        const sources = (cards && cards.pendingSources || []).map(renderSource).join('');
        const impacts = (cards && cards.impactCards || []).map(renderImpact).join('');
        const propagations = (cards && cards.propagations || []).map(renderPropagation).join('');
        const runs = (cards && cards.runs || []).map(renderRun).join('');
        const batches = (cards && cards.batches || []).map(renderBatch).join('');
        return `<div class="memory-brain-propagation-panel" data-plan-ok="${cards && cards.planOk ? 'true' : 'false'}">
            <div class="memory-brain-propagation-status"><strong>${escapeHtml(cards && cards.planStatus || 'unknown')}</strong><span>${escapeHtml(cards && cards.planError || cards && cards.reason || '根据最近事实改写、冲突处理、家族调整和模型修正生成下游传播计划。')}</span></div>
            <div class="memory-brain-propagation-sources">${sources || '<div class="memory-brain-empty">暂无待传播修正来源。也可以手动填写 fact/family/model IDs 后应用。</div>'}</div>
            <div class="memory-brain-propagation-form"><label>手动 Fact IDs<textarea id="memory-brain-propagation-fact-ids" rows="2" placeholder="可选：逗号或换行分隔"></textarea></label><label>手动 Family IDs<textarea id="memory-brain-propagation-family-ids" rows="2" placeholder="可选：逗号或换行分隔"></textarea></label><label>手动 Model IDs<textarea id="memory-brain-propagation-model-ids" rows="2" placeholder="可选：逗号或换行分隔"></textarea></label><label>传播原因<input id="memory-brain-propagation-reason" placeholder="可选：为什么触发这次传播"></label></div>
            <h3>影响预览</h3><div class="memory-brain-propagation-impacts">${impacts}</div>
            <h3>最近传播记录</h3><div class="memory-brain-propagation-records">${propagations || '<div class="memory-brain-empty">暂无影响传播记录。</div>'}</div>
            <h3>运行 / 批次</h3><div class="memory-brain-propagation-runs">${runs || '<div class="memory-brain-empty">暂无运行记录。</div>'}</div><div class="memory-brain-propagation-batches">${batches || ''}</div>
        </div>`;
    }
    function bindCorrectionPropagationPanel(screen, service, helpers) {
        const setStatus = helpers && helpers.setStatus || function() {};
        const showToast = helpers && helpers.showToast || function() {};
        const rerender = helpers && helpers.render || function() {};
        const get = selector => { const input = screen.querySelector(selector); return input ? input.value : ''; };
        const applyBtn = screen.querySelector('#memory-brain-apply-propagation-btn');
        if (applyBtn) applyBtn.addEventListener('click', () => { try {
            const result = service.applyCorrectionPropagation({ factIds: get('#memory-brain-propagation-fact-ids'), familyIds: get('#memory-brain-propagation-family-ids'), modelIds: get('#memory-brain-propagation-model-ids'), reason: get('#memory-brain-propagation-reason') });
            showToast(`已传播纠错影响：${result.counts && result.counts.factCount || 0} facts / ${result.counts && result.counts.familyCount || 0} families`); rerender();
        } catch (error) { setStatus(screen, '#memory-brain-propagation-status', error.message, 'error'); showToast(error.message); } });
        const rollbackBtn = screen.querySelector('#memory-brain-rollback-propagation-btn');
        if (rollbackBtn) rollbackBtn.addEventListener('click', () => { try { const result = service.rollbackLatestCorrectionPropagationBatch(); showToast(`已撤回影响传播：${result.factCount || 0} facts / ${result.familyCount || 0} families`); rerender(); } catch (error) { setStatus(screen, '#memory-brain-propagation-status', error.message, 'error'); showToast(error.message); } });
    }
    feature.correctionPropagationView = { renderCorrectionPropagationPanel, bindCorrectionPropagationPanel };
})(window);
