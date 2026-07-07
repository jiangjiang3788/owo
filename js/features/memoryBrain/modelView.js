// --- Memory Brain long-term model view owner (v0.4.7) ---
// 只渲染长期模型卡片，不访问 store、不发请求。
(function registerMemoryBrainModelView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function pills(list, className) {
        return (Array.isArray(list) ? list : []).map(item => `<span class="${className || 'memory-brain-model-pill'}">${escapeHtml(item)}</span>`).join('');
    }
    function listBlock(title, list) {
        const items = (Array.isArray(list) ? list : []).filter(Boolean);
        if (!items.length) return '';
        return `<div class="memory-brain-model-list"><strong>${escapeHtml(title)}</strong>${items.map(item => `<p>${escapeHtml(item)}</p>`).join('')}</div>`;
    }
    function typeLabel(type) {
        return ({ 'user-profile': '用户画像', 'ai-self': 'AI 自我', 'world-model': '世界观', 'project-brain': '项目脑', 'interaction-preferences': '互动偏好', 'relationship-continuity': '关系连续性' })[type] || type || '长期模型';
    }
    function renderModelList(cards) {
        const list = Array.isArray(cards) ? cards : [];
        if (!list.length) return `<div class="memory-brain-empty">还没有长期模型。先完成事件、事实、家族、graph，然后点“生成长期模型”。</div>`;
        return `<div class="memory-brain-model-grid">${list.map(card => `
            <article class="memory-brain-model-card" data-model-type="${escapeHtml(card.type)}">
                <div class="memory-brain-model-top"><span>${escapeHtml(typeLabel(card.type))}</span><em>v${escapeHtml(card.version)} · ${escapeHtml(card.confidence)}%</em></div>
                <h3>${escapeHtml(card.title)}</h3>
                <p class="memory-brain-model-summary">${escapeHtml(card.summary)}</p>
                <div class="memory-brain-model-meta"><span>证据 ${escapeHtml(card.evidenceCount || 0)}</span><span>${escapeHtml(card.status)}</span><span>${escapeHtml(String(card.updatedAt || '').slice(0, 16))}</span></div>
                <div class="memory-brain-model-pills">${pills(card.keywords, 'memory-brain-model-pill')}</div>
                ${listBlock('稳定理解', card.stableTraits)}
                ${listBlock('偏好', card.preferences)}
                ${listBlock('边界', card.boundaries)}
                ${listBlock('项目决策', card.projectDecisions)}
                ${listBlock('待确认', card.openQuestions)}
                <div class="memory-brain-card-actions"><button class="memory-brain-model-retire-btn" data-model-id="${escapeHtml(card.id)}">撤回这个模型</button></div>
            </article>`).join('')}</div>`;
    }

    feature.modelView = { renderModelList };
})(window);
