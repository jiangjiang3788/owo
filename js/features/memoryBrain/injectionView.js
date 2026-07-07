// --- Memory Brain injection preview view owner (v0.3.7) ---
// 只渲染 shadow injection preview 卡片，不参与正式 prompt 组装。
(function registerMemoryBrainInjectionView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function renderRefs(title, list) {
        if (!asArray(list).length) return '';
        const items = list.map(item => `<li><strong>${escapeHtml(item.title || item.id)}</strong><span>${escapeHtml(item.text || '')}</span><em>${escapeHtml(item.score || 0)}%</em></li>`).join('');
        return `<div class="memory-brain-injection-refs"><h4>${escapeHtml(title)}</h4><ul>${items}</ul></div>`;
    }
    function renderLegacy(comparison) {
        if (!comparison) return '<div class="memory-brain-injection-legacy">暂无旧记忆对照。</div>';
        const totals = comparison.totals || {};
        const snippets = asArray(comparison.snippets).map(text => `<li>${escapeHtml(text)}</li>`).join('');
        return `<div class="memory-brain-injection-legacy"><div><strong>旧记忆只读对照</strong><span>${escapeHtml(comparison.chatName || '未命名聊天')}</span></div>
            <p>日记 ${escapeHtml(totals.journals || 0)} · 向量 ${escapeHtml(totals.vectorEntries || 0)} · 表格项 ${escapeHtml(totals.tableCells || 0)}</p>
            ${snippets ? `<ul>${snippets}</ul>` : '<small>当前聊天没有可展示的旧记忆片段。</small>'}</div>`;
    }
    function renderInjectionList(cards) {
        const list = asArray(cards);
        if (!list.length) return '<div class="memory-brain-empty">还没有注入预览。输入当前聊天问题后点“生成影子注入预览”，先看它准备想起什么。</div>';
        return `<div class="memory-brain-injection-grid">${list.map(card => `
            <article class="memory-brain-injection-card" data-preview-id="${escapeHtml(card.id)}">
                <div class="memory-brain-injection-top"><span>Shadow Injection</span><em>${escapeHtml(card.createdAt || '')}</em></div>
                <h3>${escapeHtml(card.queryText || '未填写当前输入')}</h3>
                <div class="memory-brain-injection-counts"><span>模型 ${escapeHtml(card.modelCount)}</span><span>事实 ${escapeHtml(card.factCount)}</span><span>家族 ${escapeHtml(card.familyCount)}</span><span>关系 ${escapeHtml(card.edgeCount)}</span><span>事件 ${escapeHtml(card.eventCount)}</span></div>
                <pre>${escapeHtml(card.memoryBlock || '')}</pre>
                ${renderRefs('命中长期模型', card.models)}
                ${renderRefs('命中事实', card.facts)}
                ${renderRefs('命中家族', card.families)}
                ${renderRefs('命中关系', card.edges)}
                ${renderLegacy(card.legacyComparison)}
                <div class="memory-brain-injection-foot"><span>预览字符 ${escapeHtml(card.blockCharCount || 0)} · 不进入正式 prompt</span><button class="memory-brain-injection-retire-btn" data-preview-id="${escapeHtml(card.id)}">撤回预览</button></div>
            </article>`).join('')}</div>`;
    }

    feature.injectionView = { renderInjectionList };
})(window);
