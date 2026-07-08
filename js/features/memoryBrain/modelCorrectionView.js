// --- Memory Brain model correction view owner (v0.5.4) ---
// 只渲染长期模型人工修正面板，不读写状态。
(function registerMemoryBrainModelCorrectionView(global) {
    const feature = global.OwoApp.features.memoryBrain;
    function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
    function attr(value) { return escapeHtml(value); }
    function renderLoadButton(card, label) {
        return `<button class="memory-brain-load-model-correction-btn"
            data-model-id="${attr(card.modelId || card.id)}" data-review-id="${attr(card.reviewItemId || '')}"
            data-title="${attr(card.title || '')}" data-summary="${attr(card.summary || '')}"
            data-stable-traits="${attr(card.stableTraitsText || '')}" data-preferences="${attr(card.preferencesText || '')}"
            data-boundaries="${attr(card.boundariesText || '')}" data-relationship-notes="${attr(card.relationshipNotesText || '')}"
            data-project-decisions="${attr(card.projectDecisionsText || '')}" data-open-questions="${attr(card.openQuestionsText || '')}"
            data-labels="${attr(card.labelsText || '')}" data-keywords="${attr(card.keywordsText || '')}" data-confidence="${attr(card.confidence || 80)}">${escapeHtml(label || '载入表单')}</button>`;
    }
    function renderCandidate(item) {
        return `<article class="memory-brain-model-correction-candidate">
            <div class="memory-brain-model-correction-head"><strong>${escapeHtml(item.typeLabel || item.modelType || '长期模型')}</strong><span>${escapeHtml(item.itemTitle || item.title || '')}</span><em>${escapeHtml(item.severity || '')}</em></div>
            <p>${escapeHtml(item.reason || item.summary || '')}</p>
            <code>${escapeHtml(item.modelId || '')}</code>${renderLoadButton(item, '载入待修正模型')}
        </article>`;
    }
    function renderModelOption(item) {
        return `<article class="memory-brain-model-correction-option">
            <div><strong>${escapeHtml(item.typeLabel || '')} · v${escapeHtml(item.version || 1)}</strong><span>${escapeHtml(item.confidence || 0)}%</span></div>
            <h3>${escapeHtml(item.title || '')}</h3><p>${escapeHtml(item.summary || '')}</p><code>${escapeHtml(item.id || '')}</code>${renderLoadButton(item, '载入当前模型')}
        </article>`;
    }
    function renderCorrection(item) { return `<div class="memory-brain-model-correction-record"><strong>${escapeHtml(item.modelTypeLabel)} · ${escapeHtml(item.status)}</strong><span>v${escapeHtml(item.version)} · ${escapeHtml(item.changedText || 'no-change')}</span><p>${escapeHtml(item.afterTitle || item.reason || '')}</p></div>`; }
    function renderRun(run) { return `<div class="memory-brain-model-correction-run"><strong>${escapeHtml(run.status)}</strong><span>${escapeHtml(run.modelType)} · v${escapeHtml(run.version)}</span><em>${escapeHtml(run.changedText || '')}</em></div>`; }
    function renderBatch(batch) { return `<div class="memory-brain-model-correction-batch"><strong>${escapeHtml(batch.status)}</strong><span>${escapeHtml(batch.modelId)} → ${escapeHtml(batch.newModelId)}</span><em>${escapeHtml((batch.changedFields || []).join(' / '))}</em></div>`; }
    function renderModelCorrectionPanel(cards) {
        const data = cards || {};
        const candidates = (data.candidates || []).map(renderCandidate).join('');
        const options = (data.modelOptions || []).map(renderModelOption).join('');
        const corrections = (data.corrections || []).map(renderCorrection).join('');
        const runs = (data.runs || []).map(renderRun).join('');
        const batches = (data.batches || []).map(renderBatch).join('');
        return `<div class="memory-brain-model-correction-panel">
            <div class="memory-brain-model-correction-stats"><span>待修正 <strong>${escapeHtml(data.totalText && data.totalText.candidates || 0)}</strong></span><span>活跃模型 <strong>${escapeHtml(data.totalText && data.totalText.models || 0)}</strong></span><span>修正记录 <strong>${escapeHtml(data.totalText && data.totalText.corrections || 0)}</strong></span><span>批次 <strong>${escapeHtml(data.totalText && data.totalText.batches || 0)}</strong></span></div>
            <div class="memory-brain-model-correction-form">
                <label>Model ID<input id="memory-brain-model-correction-model-id-input" placeholder="要修正的长期模型 ID"></label>
                <label>Review ID<input id="memory-brain-model-correction-review-id-input" placeholder="可选：来自审查收件箱的 item ID"></label>
                <label>标题<input id="memory-brain-model-correction-title-input" placeholder="修正后的模型标题"></label>
                <label>摘要<textarea id="memory-brain-model-correction-summary-input" rows="5" placeholder="修正后的长期理解摘要"></textarea></label>
                <label>稳定理解<textarea id="memory-brain-model-correction-traits-input" rows="3" placeholder="逗号或换行分隔"></textarea></label>
                <label>偏好<textarea id="memory-brain-model-correction-preferences-input" rows="3" placeholder="逗号或换行分隔"></textarea></label>
                <label>边界<textarea id="memory-brain-model-correction-boundaries-input" rows="3" placeholder="逗号或换行分隔"></textarea></label>
                <label>关系备注<textarea id="memory-brain-model-correction-relationship-input" rows="3" placeholder="逗号或换行分隔"></textarea></label>
                <label>项目决策<textarea id="memory-brain-model-correction-project-input" rows="3" placeholder="逗号或换行分隔"></textarea></label>
                <label>待确认<textarea id="memory-brain-model-correction-open-input" rows="3" placeholder="逗号或换行分隔"></textarea></label>
                <label>标签<input id="memory-brain-model-correction-labels-input" placeholder="逗号分隔"></label>
                <label>关键词<input id="memory-brain-model-correction-keywords-input" placeholder="逗号分隔"></label>
                <label>置信度%<input id="memory-brain-model-correction-confidence-input" type="number" min="5" max="100" value="82"></label>
                <label>修正原因<input id="memory-brain-model-correction-reason-input" placeholder="为什么这样修正"></label>
                <div class="memory-brain-model-correction-help">会生成新的 active 模型版本，旧版本 superseded；只写 memoryBrain.models，不写旧记忆，不正式注入。</div>
            </div>
            <h3>审查收件箱待修正模型</h3><div class="memory-brain-model-correction-candidates">${candidates || '<div class="memory-brain-empty">暂无来自审查收件箱的待修正长期模型。</div>'}</div>
            <h3>当前活跃模型</h3><div class="memory-brain-model-correction-options">${options || '<div class="memory-brain-empty">暂无 active 长期模型。</div>'}</div>
            <h3>最近修正记录</h3><div class="memory-brain-model-correction-records">${corrections || '<div class="memory-brain-empty">暂无长期模型修正记录。</div>'}</div>
            <h3>运行 / 批次</h3><div class="memory-brain-model-correction-runs">${runs || '<div class="memory-brain-empty">暂无运行记录。</div>'}</div><div class="memory-brain-model-correction-batches">${batches || ''}</div>
        </div>`;
    }
    function bindModelCorrectionPanel(screen, service, helpers) {
        const setStatus = helpers && helpers.setStatus || function() {};
        const showToast = helpers && helpers.showToast || function() {};
        const rerender = helpers && helpers.render || function() {};
        function set(selector, value) { const input = screen.querySelector(selector); if (input) input.value = value || ''; }
        function get(selector) { const input = screen.querySelector(selector); return input ? input.value : ''; }
        screen.querySelectorAll('.memory-brain-load-model-correction-btn').forEach(btn => btn.addEventListener('click', () => {
            set('#memory-brain-model-correction-model-id-input', btn.getAttribute('data-model-id'));
            set('#memory-brain-model-correction-review-id-input', btn.getAttribute('data-review-id'));
            set('#memory-brain-model-correction-title-input', btn.getAttribute('data-title'));
            set('#memory-brain-model-correction-summary-input', btn.getAttribute('data-summary'));
            set('#memory-brain-model-correction-traits-input', btn.getAttribute('data-stable-traits'));
            set('#memory-brain-model-correction-preferences-input', btn.getAttribute('data-preferences'));
            set('#memory-brain-model-correction-boundaries-input', btn.getAttribute('data-boundaries'));
            set('#memory-brain-model-correction-relationship-input', btn.getAttribute('data-relationship-notes'));
            set('#memory-brain-model-correction-project-input', btn.getAttribute('data-project-decisions'));
            set('#memory-brain-model-correction-open-input', btn.getAttribute('data-open-questions'));
            set('#memory-brain-model-correction-labels-input', btn.getAttribute('data-labels'));
            set('#memory-brain-model-correction-keywords-input', btn.getAttribute('data-keywords'));
            set('#memory-brain-model-correction-confidence-input', btn.getAttribute('data-confidence'));
            setStatus(screen, '#memory-brain-model-correction-status', '已载入长期模型，可修正摘要、偏好、边界、待确认等字段。', 'ok');
        }));
        const applyBtn = screen.querySelector('#memory-brain-apply-model-correction-btn');
        if (applyBtn) applyBtn.addEventListener('click', () => { try {
            const result = service.correctModel({ modelId: get('#memory-brain-model-correction-model-id-input'), reviewItemId: get('#memory-brain-model-correction-review-id-input'), title: get('#memory-brain-model-correction-title-input'), summary: get('#memory-brain-model-correction-summary-input'), stableTraits: get('#memory-brain-model-correction-traits-input'), preferences: get('#memory-brain-model-correction-preferences-input'), boundaries: get('#memory-brain-model-correction-boundaries-input'), relationshipNotes: get('#memory-brain-model-correction-relationship-input'), projectDecisions: get('#memory-brain-model-correction-project-input'), openQuestions: get('#memory-brain-model-correction-open-input'), labels: get('#memory-brain-model-correction-labels-input'), keywords: get('#memory-brain-model-correction-keywords-input'), confidence: (Number(get('#memory-brain-model-correction-confidence-input')) || 82) / 100, correctionReason: get('#memory-brain-model-correction-reason-input') });
            showToast(`已修正长期模型：v${result.correction && result.correction.version || ''}`); rerender();
        } catch (error) { setStatus(screen, '#memory-brain-model-correction-status', error.message, 'error'); showToast(error.message); } });
        const rollbackBtn = screen.querySelector('#memory-brain-rollback-model-correction-btn');
        if (rollbackBtn) rollbackBtn.addEventListener('click', () => { try { const result = service.rollbackLatestModelCorrectionBatch(); showToast(`已撤回长期模型修正：${result.newModelId || ''}`); rerender(); } catch (error) { setStatus(screen, '#memory-brain-model-correction-status', error.message, 'error'); showToast(error.message); } });
    }
    feature.modelCorrectionView = { renderModelCorrectionPanel, bindModelCorrectionPanel };
})(window);
