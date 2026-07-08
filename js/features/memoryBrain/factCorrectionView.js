// --- Memory Brain fact correction view owner (v0.5.1) ---
// 只渲染事实纠错 / 改写面板，不读写状态。
(function registerFactCorrectionView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
    function renderCandidate(item) {
        return `<article class="memory-brain-correction-candidate" data-severity="${escapeHtml(item.severity)}">
            <div class="memory-brain-correction-candidate-head"><strong>${escapeHtml(item.issueType)}</strong><span>${escapeHtml(item.severity)}</span></div>
            <h3>${escapeHtml(item.title || item.factId)}</h3>
            <p>${escapeHtml(item.content)}</p>
            <small>${escapeHtml(item.reason || item.sourceRangeText || '')}</small>
            <div class="memory-brain-correction-meta"><span>fact:${escapeHtml(item.factId)}</span><span>review:${escapeHtml(item.reviewItemId)}</span></div>
            <button class="memory-brain-load-correction-btn" data-fact-id="${escapeHtml(item.factId)}" data-review-id="${escapeHtml(item.reviewItemId)}" data-content="${escapeHtml(item.content)}" data-subject="${escapeHtml(item.subject)}" data-predicate="${escapeHtml(item.predicate)}" data-object="${escapeHtml(item.object)}" data-fact-type="${escapeHtml(item.factType)}" data-labels="${escapeHtml(item.labelsText)}" data-keywords="${escapeHtml(item.keywordsText)}" data-confidence="${escapeHtml(item.confidence)}">载入改写表单</button>
        </article>`;
    }
    function renderCorrection(item) {
        return `<div class="memory-brain-correction-record"><strong>v${escapeHtml(item.version)} · ${escapeHtml(item.status)}</strong><span>${escapeHtml(item.factId)}</span><p>${escapeHtml(item.afterText)}</p><small>${escapeHtml(item.changedText || item.reason)}</small></div>`;
    }
    function renderRun(run) { return `<div class="memory-brain-correction-run"><strong>${escapeHtml(run.status)}</strong><span>${escapeHtml(run.factId)}</span><em>${escapeHtml(run.changedText)}</em></div>`; }
    function renderBatch(batch) { return `<div class="memory-brain-correction-batch"><strong>${escapeHtml(batch.status)}</strong><span>${escapeHtml(batch.factId)}</span><em>v${escapeHtml(batch.version || 1)}</em></div>`; }
    function renderFactCorrectionPanel(cards) {
        const candidates = (cards && cards.candidates || []).map(renderCandidate).join('');
        const corrections = (cards && cards.corrections || []).map(renderCorrection).join('');
        const runs = (cards && cards.runs || []).map(renderRun).join('');
        const batches = (cards && cards.batches || []).map(renderBatch).join('');
        return `<div class="memory-brain-correction-panel">
            <div class="memory-brain-correction-stats"><span>待改写 <strong>${escapeHtml(cards && cards.totalText && cards.totalText.candidates || 0)}</strong></span><span>改写记录 <strong>${escapeHtml(cards && cards.totalText && cards.totalText.corrections || 0)}</strong></span><span>批次 <strong>${escapeHtml(cards && cards.totalText && cards.totalText.batches || 0)}</strong></span></div>
            <div class="memory-brain-correction-form">
                <label>Fact ID<input id="memory-brain-correction-fact-id-input" placeholder="memory-fact-..."></label>
                <label>Review ID<input id="memory-brain-correction-review-id-input" placeholder="可选：review-fact-..."></label>
                <label>改写后的事实<textarea id="memory-brain-correction-content-input" rows="4" placeholder="写成一句完整、稳定、可追溯的原子事实"></textarea></label>
                <div class="memory-brain-correction-form-grid"><label>subject<input id="memory-brain-correction-subject-input" value="user"></label><label>predicate<input id="memory-brain-correction-predicate-input" value="relates_to"></label><label>object<input id="memory-brain-correction-object-input"></label><label>factType<input id="memory-brain-correction-type-input" value="natural"></label><label>confidence %<input id="memory-brain-correction-confidence-input" type="number" min="5" max="100" value="82"></label></div>
                <label>labels<input id="memory-brain-correction-labels-input" placeholder="逗号分隔"></label>
                <label>keywords<input id="memory-brain-correction-keywords-input" placeholder="逗号分隔"></label>
                <label>改写原因<input id="memory-brain-correction-reason-input" placeholder="为什么要这样改"></label>
                <div class="memory-brain-correction-help">改写只更新 Memory Brain fact，并保留原来源、证据、家族和 graph 连接；不写旧记忆、不正式注入。</div>
            </div>
            <h3>待改写候选</h3><div class="memory-brain-correction-candidates">${candidates || '<div class="memory-brain-empty">暂无 needs-edit 的事实。可在审查收件箱里先点“标记待改写”，或手动填 Fact ID。</div>'}</div>
            <h3>最近改写记录</h3><div class="memory-brain-correction-records">${corrections || '<div class="memory-brain-empty">暂无事实改写记录。</div>'}</div>
            <h3>运行 / 批次</h3><div class="memory-brain-correction-runs">${runs || '<div class="memory-brain-empty">暂无运行记录。</div>'}</div><div class="memory-brain-correction-batches">${batches || ''}</div>
        </div>`;
    }
    function bindFactCorrectionPanel(screen, service, helpers) {
        const setStatus = helpers && helpers.setStatus || function() {};
        const showToast = helpers && helpers.showToast || function() {};
        const rerender = helpers && helpers.render || function() {};
        screen.querySelectorAll('.memory-brain-load-correction-btn').forEach(btn => btn.addEventListener('click', () => {
            const set = (selector, value) => { const input = screen.querySelector(selector); if (input) input.value = value || ''; };
            [['#memory-brain-correction-fact-id-input', 'data-fact-id'], ['#memory-brain-correction-review-id-input', 'data-review-id'], ['#memory-brain-correction-content-input', 'data-content'], ['#memory-brain-correction-subject-input', 'data-subject'], ['#memory-brain-correction-predicate-input', 'data-predicate'], ['#memory-brain-correction-object-input', 'data-object'], ['#memory-brain-correction-type-input', 'data-fact-type'], ['#memory-brain-correction-labels-input', 'data-labels'], ['#memory-brain-correction-keywords-input', 'data-keywords']].forEach(pair => set(pair[0], btn.getAttribute(pair[1])));
            set('#memory-brain-correction-confidence-input', Math.round((Number(btn.getAttribute('data-confidence')) || 0.82) * 100));
            setStatus(screen, '#memory-brain-correction-status', '已载入候选事实，请改写后应用。', 'ok');
        }));
        const applyBtn = screen.querySelector('#memory-brain-apply-correction-btn');
        if (applyBtn) applyBtn.addEventListener('click', () => { try {
            const get = selector => { const input = screen.querySelector(selector); return input ? input.value : ''; };
            const result = service.correctFact({ factId: get('#memory-brain-correction-fact-id-input'), reviewItemId: get('#memory-brain-correction-review-id-input'), draft: { content: get('#memory-brain-correction-content-input'), subject: get('#memory-brain-correction-subject-input'), predicate: get('#memory-brain-correction-predicate-input'), object: get('#memory-brain-correction-object-input'), factType: get('#memory-brain-correction-type-input'), labels: get('#memory-brain-correction-labels-input'), keywords: get('#memory-brain-correction-keywords-input'), confidence: (Number(get('#memory-brain-correction-confidence-input')) || 82) / 100, correctionReason: get('#memory-brain-correction-reason-input') } });
            showToast(`已改写事实：v${result.correction && result.correction.version || 1}`); rerender();
        } catch (error) { setStatus(screen, '#memory-brain-correction-status', error.message, 'error'); showToast(error.message); } });
        const rollbackBtn = screen.querySelector('#memory-brain-rollback-correction-btn');
        if (rollbackBtn) rollbackBtn.addEventListener('click', () => { try { const result = service.rollbackLatestFactCorrectionBatch(); showToast(`已撤回事实改写：${result.factId || ''}`); rerender(); } catch (error) { setStatus(screen, '#memory-brain-correction-status', error.message, 'error'); showToast(error.message); } });
    }
    feature.factCorrectionView = { renderFactCorrectionPanel, bindFactCorrectionPanel };
})(window);
