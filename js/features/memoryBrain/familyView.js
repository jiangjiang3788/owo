// --- Memory Brain family view owner (v0.3.5) ---
// 只负责记忆家族卡片展示；不请求 AI，不写 store，不做 graph。
(function registerMemoryBrainFamilyView(global) {
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
    function renderMembers(items) {
        const list = Array.isArray(items) ? items : [];
        if (!list.length) return '<li>还没有成员预览。</li>';
        return list.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    }
    function renderFamilyCard(family) {
        return `
            <article class="memory-brain-family-card" data-family-id="${escapeHtml(family.id)}">
                <div class="memory-brain-family-glow"></div>
                <div class="memory-brain-family-topline">
                    <span>${escapeHtml(family.memoryTone || '自然主题')}</span>
                    <em>${escapeHtml(family.factCount || 0)} 条事实 · ${escapeHtml(family.confidenceText || '70%')}</em>
                </div>
                <h3>${escapeHtml(family.title || '未命名家族')}</h3>
                <p>${escapeHtml(family.summary || '这个家族还在长大，后续新事实会继续更新摘要。')}</p>
                <div class="memory-brain-family-keywords">${renderPills(family.keywords, 'memory-brain-family-chip')}</div>
                <details class="memory-brain-family-detail">
                    <summary>展开成员事实和整理理由</summary>
                    <div class="memory-brain-family-detail-grid">
                        <div><strong>成员事实</strong><ul>${renderMembers(family.memberFacts)}</ul></div>
                        <div><strong>标签</strong><div>${renderPills(family.labels, 'memory-brain-chip')}</div></div>
                        <div><strong>为什么成团</strong><p>${escapeHtml(family.sourceReason || '通过关键词、标签或向量相似度聚成候选家族。')}</p></div>
                    </div>
                    <button class="memory-brain-family-retire-btn" data-family-id="${escapeHtml(family.id)}">撤回这个家族</button>
                </details>
            </article>
        `;
    }
    function renderFamilyList(families) {
        const list = Array.isArray(families) ? families : [];
        if (!list.length) {
            return `<div class="memory-brain-empty memory-brain-family-empty">还没有记忆家族。先提取原子事实，再点“整理记忆家族”，事实会按关键词/向量相似度自动成团。</div>`;
        }
        return `<div class="memory-brain-family-list">${list.map(renderFamilyCard).join('')}</div>`;
    }

    feature.familyView = { renderFamilyList, renderFamilyCard };
})(window);
