// --- Memory Brain history archive view owner (v0.4.1) ---
// 只渲染历史源扫描概览；按钮绑定仍在 memoryBrain/view.js。
(function registerHistoryArchiveView(global) {
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
    function renderSourceCard(source) {
        return `<article class="memory-brain-archive-source" data-priority="${escapeHtml(source.priority)}">
            <div class="memory-brain-archive-source-top"><h3>${escapeHtml(source.name)}</h3><span>${escapeHtml(source.sourceTypeName || source.sourceType)}</span></div>
            <div class="memory-brain-archive-metrics"><strong>${escapeHtml(source.messageCount)}</strong><span>消息</span><strong>${escapeHtml(source.estimatedChunkCount)}</strong><span>预计切片</span><strong>${escapeHtml(source.legacyCounts && source.legacyCounts.journals || 0)}</strong><span>日记</span></div>
            <p>范围：${escapeHtml(formatDate(source.firstMessageAt))} → ${escapeHtml(formatDate(source.lastMessageAt))}</p>
            <small>状态：${escapeHtml(source.status)} · 优先级：${escapeHtml(source.priority)} · 下一步：${escapeHtml(source.nextAction)}</small>
        </article>`;
    }
    function renderRun(run) {
        return `<li><span>${escapeHtml(formatDate(run.createdAt || run.scannedAt))}</span><em>${escapeHtml(run.sourceCount || 0)} 个来源 · ${escapeHtml(run.totalMessages || 0)} 条消息 · ${escapeHtml(run.estimatedChunkCount || 0)} 个预计切片</em></li>`;
    }
    function renderHistoryArchivePanel(cards) {
        const data = cards || { totalText: {}, sources: [], runs: [] };
        const sourceHtml = (data.sources || []).length ? data.sources.map(renderSourceCard).join('') : '<div class="memory-brain-empty">还没有历史来源索引。点击“扫描全部历史”后，只建立索引；再点“准备历史切片”会生成 archiveChunks。</div>';
        const runsHtml = (data.runs || []).length ? data.runs.map(renderRun).join('') : '<li><span>暂无扫描记录</span><em>v0.4.0 盘点来源，v0.4.1 可准备切片。</em></li>';
        return `<div class="memory-brain-archive-panel">
            <div class="memory-brain-archive-summary">
                <div><strong>${escapeHtml(data.totalText && data.totalText.sources || 0)}</strong><span>聊天来源</span></div>
                <div><strong>${escapeHtml(data.totalText && data.totalText.messages || 0)}</strong><span>历史消息</span></div>
                <div><strong>${escapeHtml(data.totalText && data.totalText.estimatedChunks || 0)}</strong><span>预计切片</span></div>
                <div><strong>${escapeHtml(data.totalText && data.totalText.hugeSources || 0)}</strong><span>超大聊天</span></div>
            </div>
            <div class="memory-brain-archive-note">Memory Brain 到 v0.9 前仍是可读取 / 可整理的新脑；正式注入仍由你当前选择的档案记忆等旧 owner 负责。</div>
            <div class="memory-brain-archive-grid">${sourceHtml}</div>
            <div class="memory-brain-archive-runs"><h3>扫描记录</h3><ul>${runsHtml}</ul></div>
        </div>`;
    }

    feature.historyArchiveView = { renderHistoryArchivePanel };
})(window);
