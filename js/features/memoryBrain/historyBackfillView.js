// --- Memory Brain history backfill view owner (v0.4.2) ---
// 只渲染回填队列 / 断点续跑面板；按钮绑定在 memoryBrain/view.js。
(function registerHistoryBackfillView(global) {
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
    function renderJob(job) {
        return `<article class="memory-brain-backfill-job" data-status="${escapeHtml(job.status)}">
            <div class="memory-brain-backfill-job-top"><h3>${escapeHtml(job.sourceName || '未知来源')} · ${escapeHtml(job.chunkRangeText || '')}</h3><span>${escapeHtml(job.status)}</span></div>
            <div class="memory-brain-backfill-job-meta"><strong>${escapeHtml(job.kind)}</strong><em>${escapeHtml(job.messageCount || 0)} 条</em><em>尝试 ${escapeHtml(job.attemptCount || 0)}/${escapeHtml(job.maxAttempts || 0)}</em></div>
            <p>${escapeHtml(job.previewText || '暂无预览')}</p>
            ${job.errorMessage ? `<small class="memory-brain-backfill-error">${escapeHtml(job.errorMessage)}</small>` : `<small>下一步：${escapeHtml(job.nextAction || 'v0.4.3')}</small>`}
        </article>`;
    }
    function renderRun(run) {
        return `<li><span>${escapeHtml(formatDate(run.createdAt))}</span><em>${escapeHtml(run.action)} · ${escapeHtml(run.jobCount || 0)} jobs · pending ${escapeHtml(run.pendingCount || 0)} · failed ${escapeHtml(run.failedCount || 0)}</em></li>`;
    }
    function renderHistoryBackfillPanel(cards) {
        const data = cards || { totalText: {}, jobs: [], runs: [] };
        const jobHtml = (data.jobs || []).length ? data.jobs.map(renderJob).join('') : '<div class="memory-brain-empty">还没有 backfillJobs。先准备历史切片，再点“建立回填队列”。</div>';
        const runsHtml = (data.runs || []).length ? data.runs.map(renderRun).join('') : '<li><span>暂无回填队列记录</span><em>v0.4.2 只排队，不跑 AI。</em></li>';
        return `<div class="memory-brain-backfill-panel">
            <div class="memory-brain-backfill-summary">
                <div><strong>${escapeHtml(data.totalText && data.totalText.jobs || 0)}</strong><span>回填任务</span></div>
                <div><strong>${escapeHtml(data.totalText && data.totalText.pending || 0)}</strong><span>待运行</span></div>
                <div><strong>${escapeHtml(data.totalText && data.totalText.running || 0)}</strong><span>运行中</span></div>
                <div><strong>${escapeHtml(data.totalText && data.totalText.paused || 0)}</strong><span>已暂停</span></div>
                <div><strong>${escapeHtml(data.totalText && data.totalText.failed || 0)}</strong><span>失败</span></div>
                <div><strong>${escapeHtml(data.totalText && data.totalText.done || 0)}</strong><span>完成</span></div>
            </div>
            <div class="memory-brain-archive-note">backfillJobs 只保存任务元数据、chunk 引用和断点状态；v0.4.2 不总结历史，不调用模型，不写旧记忆。</div>
            <div class="memory-brain-backfill-grid">${jobHtml}</div>
            <div class="memory-brain-archive-runs"><h3>回填运行记录</h3><ul>${runsHtml}</ul></div>
        </div>`;
    }

    feature.historyBackfillView = { renderHistoryBackfillPanel };
})(window);
