// --- Memory Brain fact view owner (v0.3.5) ---
// 只负责原子事实卡片展示；不请求 AI，不写 store。
(function registerMemoryBrainFactView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function renderPills(items, className) {
        const list = Array.isArray(items) ? items : [];
        if (!list.length) return '<span class="memory-brain-muted">暂无</span>';
        return list.map(item => `<span class="${className || 'memory-brain-chip'}">${escapeHtml(item)}</span>`).join('');
    }
    function polarityText(value) {
        if (value === 'positive') return '正向';
        if (value === 'negative') return '边界/反感';
        if (value === 'disputed') return '待核对';
        return '中性';
    }
    function renderFactCard(fact) {
        return `
            <article class="memory-brain-fact-card" data-fact-id="${escapeHtml(fact.id)}">
                <div class="memory-brain-fact-topline">
                    <span>${escapeHtml(fact.factType || '自然事实')}</span>
                    <em>${escapeHtml(fact.confidenceText || '70%')}</em>
                </div>
                <h3>${escapeHtml(fact.content || '未命名事实')}</h3>
                <p class="memory-brain-fact-atom">${escapeHtml(fact.atomText || '')}</p>
                <div class="memory-brain-fact-badges">
                    <span>${escapeHtml(polarityText(fact.polarity))}</span>
                    <span>${escapeHtml(fact.reviewStatus || 'auto-applied')}</span>
                    <span>${escapeHtml(fact.sourceRangeText || '来源待补齐')}</span>
                </div>
                <details class="memory-brain-fact-detail">
                    <summary>证据、标签和来源</summary>
                    <div class="memory-brain-fact-detail-grid">
                        <div><strong>证据</strong><p>${escapeHtml(fact.evidenceQuote || '暂无短证据')}</p></div>
                        <div><strong>为什么保存</strong><p>${escapeHtml(fact.sourceReason || '暂无说明')}</p></div>
                        <div><strong>标签</strong><div>${renderPills(fact.labels, 'memory-brain-chip')}</div></div>
                        <div><strong>关键词</strong><div>${renderPills(fact.keywords, 'memory-brain-thread-chip')}</div></div>
                        <div><strong>来源事件</strong><p>${escapeHtml(fact.sourceTitle || '来源事件')} · ${escapeHtml(fact.dateText || '')}</p></div>
                    </div>
                    <button class="memory-brain-fact-retire-btn" data-fact-id="${escapeHtml(fact.id)}">撤回这条事实</button>
                </details>
            </article>
        `;
    }
    function renderFactList(facts) {
        const list = Array.isArray(facts) ? facts : [];
        if (!list.length) {
            return `<div class="memory-brain-empty memory-brain-fact-empty">还没有原子事实。先生成事件时间线，再点“从事件提取事实”，AI 会把复合事件拆成可回滚的事实候选。</div>`;
        }
        return `<div class="memory-brain-fact-list">${list.map(renderFactCard).join('')}</div>`;
    }

    feature.factView = { renderFactList, renderFactCard };
})(window);
