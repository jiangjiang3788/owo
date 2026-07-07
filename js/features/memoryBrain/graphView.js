// --- Memory Brain graph view owner (v0.3.5) ---
// 只渲染轻量关系卡片，不使用重 canvas，不直接改写记忆数据。
(function registerMemoryBrainGraphView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function renderPills(list, className) {
        const items = Array.isArray(list) ? list : [];
        return items.length ? `<div class="${className || 'memory-brain-graph-pills'}">${items.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : '';
    }
    function renderNodeCards(nodes) {
        const list = Array.isArray(nodes) ? nodes : [];
        if (!list.length) return '<div class="memory-brain-graph-node-empty">还没有 graph 节点。</div>';
        return `<div class="memory-brain-graph-node-grid">${list.map(node => `
            <article class="memory-brain-graph-node-card" data-node-type="${escapeHtml(node.type)}">
                <span>${escapeHtml(node.type)}</span><strong>${escapeHtml(node.label)}</strong><em>${escapeHtml(node.degree)} 条关系</em>${renderPills(node.samples, 'memory-brain-graph-mini-pills')}
            </article>`).join('')}</div>`;
    }
    function renderEdgeCard(card) {
        const evidence = (card.evidenceFacts || []).map(item => `<li>${escapeHtml(item)}</li>`).join('');
        return `<article class="memory-brain-graph-edge-card" data-edge-id="${escapeHtml(card.id)}">
            <div class="memory-brain-graph-edge-line">
                <span data-node-type="${escapeHtml(card.sourceType)}">${escapeHtml(card.sourceLabel)}</span>
                <em>${escapeHtml(card.relationLabel)}</em>
                <span data-node-type="${escapeHtml(card.targetType)}">${escapeHtml(card.targetLabel)}</span>
            </div>
            <div class="memory-brain-graph-edge-meta"><strong>强度 ${escapeHtml(card.weightText)}</strong><small>${escapeHtml(card.updatedAt || '')}</small></div>
            ${card.reason ? `<p>${escapeHtml(card.reason)}</p>` : ''}
            ${renderPills(card.keywords)}${renderPills(card.families, 'memory-brain-graph-family-pills')}
            ${evidence ? `<details><summary>证据事实</summary><ul>${evidence}</ul></details>` : ''}
            <button class="memory-brain-graph-retire-btn" data-edge-id="${escapeHtml(card.id)}">撤回这条关系</button>
        </article>`;
    }
    function renderGraphList(graph) {
        const data = graph || {};
        const relations = Array.isArray(data.relationCards) ? data.relationCards : [];
        if (!relations.length) return `<div class="memory-brain-empty">还没有 graph 关系。请先完成事件、事实和记忆家族，然后点击“建立关系图谱”。</div>`;
        return `<div class="memory-brain-graph-summary"><strong>${escapeHtml(data.edgeCount || 0)}</strong><span>条活跃关系边</span><strong>${escapeHtml((data.nodeCards || []).length)}</strong><span>个高频节点</span></div>${renderNodeCards(data.nodeCards)}<div class="memory-brain-graph-edge-list">${relations.map(renderEdgeCard).join('')}</div>`;
    }

    feature.graphView = { renderGraphList };
})(window);
