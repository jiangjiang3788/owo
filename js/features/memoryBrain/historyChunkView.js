// --- Memory Brain history chunk view owner (v0.4.1) ---
// 只渲染历史切片 / 游标面板；按钮绑定在 memoryBrain/view.js。
(function registerHistoryChunkView(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function formatDate(value) {
        if (!value) return '未知时间';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    function renderPreview(preview) {
        const rows = (preview || []).map(item => `<li><span>${escapeHtml(item.role)}</span><em>${escapeHtml(item.text)}</em></li>`).join('');
        return rows ? `<ul class="memory-brain-chunk-preview">${rows}</ul>` : '<p class="memory-brain-chunk-preview-empty">暂无可预览文本</p>';
    }
    function renderCursor(cursor) {
        return `<article class="memory-brain-cursor-card" data-status="${escapeHtml(cursor.status)}">
            <div class="memory-brain-cursor-top"><h3>${escapeHtml(cursor.sourceName)}</h3><span>${escapeHtml(cursor.status)}</span></div>
            <div class="memory-brain-cursor-bar"><i style="width:${escapeHtml(cursor.progressPercent || 0)}%"></i></div>
            <p>${escapeHtml(cursor.doneChunks)} / ${escapeHtml(cursor.totalChunks)} 完成 · pending ${escapeHtml(cursor.pendingChunks)} · failed ${escapeHtml(cursor.failedChunks)}</p>
            <small>phase：${escapeHtml(cursor.phase)} · next：${escapeHtml(cursor.nextChunkId || '等待 v0.4.2 队列')}</small>
        </article>`;
    }
    function renderChunk(chunk) {
        return `<article class="memory-brain-chunk-card" data-status="${escapeHtml(chunk.status)}">
            <div class="memory-brain-chunk-top"><h3>${escapeHtml(chunk.sourceName)} · #${escapeHtml(chunk.ordinal)}</h3><span>${escapeHtml(chunk.status)}</span></div>
            <div class="memory-brain-chunk-meta"><strong>${escapeHtml(chunk.rangeText)}</strong><span>${escapeHtml(chunk.messageCount)} 条</span><span>overlap ${escapeHtml(chunk.overlapText)}</span><span>${escapeHtml(chunk.estimatedCharCount)} 字符</span></div>
            <p>范围：${escapeHtml(formatDate(chunk.firstMessageAt))} → ${escapeHtml(formatDate(chunk.lastMessageAt))}</p>
            ${renderPreview(chunk.preview)}
        </article>`;
    }
    function renderRun(run) {
        return `<li><span>${escapeHtml(formatDate(run.createdAt))}</span><em>${escapeHtml(run.sourceCount || 0)} 来源 · ${escapeHtml(run.chunkCount || 0)} chunks · ${escapeHtml(run.status || 'completed')}</em></li>`;
    }
    function renderHistoryChunkPanel(cards) {
        const data = cards || { totalText: {}, cursors: [], chunks: [], runs: [] };
        const cursorHtml = (data.cursors || []).length ? data.cursors.map(renderCursor).join('') : '<div class="memory-brain-empty">还没有历史切片游标。先扫描历史来源，再点“准备历史切片”。</div>';
        const chunkHtml = (data.chunks || []).length ? data.chunks.map(renderChunk).join('') : '<div class="memory-brain-empty">还没有 archiveChunks。v0.4.1 只生成切片元数据和小预览，不跑 AI。</div>';
        const runsHtml = (data.runs || []).length ? data.runs.map(renderRun).join('') : '<li><span>暂无切片记录</span><em>下一步会进入 v0.4.2 回填队列。</em></li>';
        return `<div class="memory-brain-chunk-panel">
            <div class="memory-brain-chunk-summary">
                <div><strong>${escapeHtml(data.totalText && data.totalText.chunks || 0)}</strong><span>历史切片</span></div>
                <div><strong>${escapeHtml(data.totalText && data.totalText.pending || 0)}</strong><span>待回填</span></div>
                <div><strong>${escapeHtml(data.totalText && data.totalText.done || 0)}</strong><span>已完成</span></div>
                <div><strong>${escapeHtml(data.totalText && data.totalText.failed || 0)}</strong><span>失败</span></div>
            </div>
            <div class="memory-brain-archive-note">archiveChunks 只保存来源范围、hash 和短预览；真正事件回填从 v0.4.3 开始，v0.4.1 不总结、不注入、不改旧记忆。</div>
            <div class="memory-brain-cursor-grid">${cursorHtml}</div>
            <div class="memory-brain-chunk-grid">${chunkHtml}</div>
            <div class="memory-brain-archive-runs"><h3>切片记录</h3><ul>${runsHtml}</ul></div>
        </div>`;
    }

    feature.historyChunkView = { renderHistoryChunkPanel };
})(window);
