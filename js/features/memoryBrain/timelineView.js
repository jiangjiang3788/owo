// --- Memory Brain timeline view owner (v0.3.1) ---
// 只负责事件时间线卡片展示；不请求 AI，不写 store。
(function registerMemoryBrainTimelineView(global) {
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
    function renderImportance(value) {
        const importance = Math.max(1, Math.min(5, Number(value) || 1));
        return `${'★'.repeat(importance)}${'☆'.repeat(5 - importance)}`;
    }
    function renderEventCard(event) {
        return `
            <article class="memory-brain-event-card" data-event-id="${escapeHtml(event.id)}">
                <div class="memory-brain-event-ribbon"></div>
                <div class="memory-brain-event-body">
                    <div class="memory-brain-event-meta">
                        <span>${escapeHtml(event.dateText || '未知时间')}</span>
                        <em>${escapeHtml(event.sourceRangeText || '来源待补齐')}</em>
                    </div>
                    <h3>${escapeHtml(event.title || '未命名事件')}</h3>
                    <p>${escapeHtml(event.summary || '暂无摘要')}</p>
                    <div class="memory-brain-event-badges">
                        <span>情绪：${escapeHtml(event.emotion || '平静')}</span>
                        <span aria-label="重要度">${escapeHtml(renderImportance(event.importance))}</span>
                    </div>
                    <details class="memory-brain-event-detail">
                        <summary>展开事件来源与线索</summary>
                        <div class="memory-brain-event-detail-grid">
                            <div><strong>关键词</strong><div>${renderPills(event.keywords, 'memory-brain-chip')}</div></div>
                            <div><strong>未完成线索</strong><div>${renderPills(event.openThreads, 'memory-brain-thread-chip')}</div></div>
                            <div><strong>来源范围</strong><p>${escapeHtml(event.sourceRangeText || '未知')}</p></div>
                        </div>
                    </details>
                </div>
            </article>
        `;
    }
    function renderTimeline(events) {
        const list = Array.isArray(events) ? events : [];
        if (!list.length) {
            return `<div class="memory-brain-empty memory-brain-timeline-empty">还没有事件卡片。打开某个聊天后点“整理最近聊天”，这里会出现第一条时间线记忆。</div>`;
        }
        return `<div class="memory-brain-timeline-list">${list.map(renderEventCard).join('')}</div>`;
    }

    feature.timelineView = { renderTimeline, renderEventCard };
})(window);
