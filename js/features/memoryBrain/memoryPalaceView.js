// --- Memory Brain palace view owner (v0.3.8) ---
// 只渲染记忆小屋 / 收口安全卡片，不直接读写 store。
(function registerMemoryBrainPalaceView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function renderRooms(rooms) {
        if (!rooms || !rooms.length) return '<div class="memory-brain-empty">记忆小屋还没有房间数据。</div>';
        return `<div class="memory-brain-palace-rooms">${rooms.map(room => `
            <article class="memory-brain-palace-room" data-status="${escapeHtml(room.status)}">
                <div class="memory-brain-room-icon">${escapeHtml(room.icon)}</div>
                <div><h3>${escapeHtml(room.name)} <span>${escapeHtml(room.countText)}</span></h3><p>${escapeHtml(room.role)}</p><small>${escapeHtml(room.status === 'lit' ? '已点亮' : '待整理')}</small></div>
            </article>`).join('')}</div>`;
    }
    function renderHighlights(highlights) {
        if (!highlights || !highlights.length) return '<div class="memory-brain-empty">还没有可浮现的记忆。先生成事件、事实或长期模型。</div>';
        return `<div class="memory-brain-palace-highlights">${highlights.map(item => `
            <article class="memory-brain-highlight-card" data-type="${escapeHtml(item.type)}">
                <div class="memory-brain-highlight-score">${Math.round((Number(item.score) || 0) * 100)}</div>
                <div><span>${escapeHtml(item.type)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p></div>
            </article>`).join('')}</div>`;
    }
    function renderSafety(safety) {
        const gates = safety && safety.gates || [];
        return `<div class="memory-brain-safety-head"><strong>${escapeHtml(safety && safety.summary || '等待安全检查')}</strong><span>正式接管：${safety && safety.readyForFormalCutover ? '允许' : '禁止'}</span></div>
            <div class="memory-brain-safety-grid">${gates.map(gate => `
                <article class="memory-brain-safety-card" data-passed="${gate.passed ? 'yes' : 'no'}">
                    <strong>${gate.passed ? '✓' : '·'}</strong><div><h3>${escapeHtml(gate.name)}</h3><p>${escapeHtml(gate.note)}</p></div>
                </article>`).join('')}</div>`;
    }
    function renderExports(exports) {
        if (!exports || !exports.length) return '<div class="memory-brain-empty">还没有导出预览记录。点“复制导出包”会生成一次 manifest 记录。</div>';
        return `<div class="memory-brain-export-list">${exports.map(item => `
            <article class="memory-brain-export-card">
                <h3>${escapeHtml(item.id)}</h3>
                <p>${escapeHtml(item.safetySummary)}</p>
                <div class="memory-brain-export-counts">
                    <span>事件 ${escapeHtml(item.counts.events || 0)}</span><span>事实 ${escapeHtml(item.counts.facts || 0)}</span><span>家族 ${escapeHtml(item.counts.families || 0)}</span><span>模型 ${escapeHtml(item.counts.models || 0)}</span>
                </div>
                <small>${escapeHtml(item.createdAt)} · ${escapeHtml(item.storedData)}</small>
            </article>`).join('')}</div>`;
    }
    function renderMemoryPalace(palace, exports) {
        const data = palace || { rooms: [], highlights: [], safety: null };
        return `
            <div class="memory-brain-palace-panel">
                <section class="memory-brain-palace-block"><div class="memory-brain-palace-title"><h3>记忆小屋</h3><p>把 v0.3.x 的技术层收成可以长期打开看的房间。</p></div>${renderRooms(data.rooms)}</section>
                <section class="memory-brain-palace-block"><div class="memory-brain-palace-title"><h3>今日浮现</h3><p>按权重、活跃度、置信度和连接数量挑出此刻最该被看见的记忆。</p></div>${renderHighlights(data.highlights)}</section>
                <section class="memory-brain-palace-block"><div class="memory-brain-palace-title"><h3>切换前安全门</h3><p>v0.3.8 只做收口，所有 gate 都必须明确禁止直接正式换脑。</p></div>${renderSafety(data.safety)}</section>
                <section class="memory-brain-palace-block"><div class="memory-brain-palace-title"><h3>导出 / 备份路线</h3><p>导出包只包含 memoryBrain 新脑状态；App 内只保存 manifest，不保存完整导出副本。</p></div>${renderExports(exports)}</section>
            </div>`;
    }

    feature.memoryPalaceView = { renderMemoryPalace };
})(window);
