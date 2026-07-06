// --- Debug console view (v0.2.8) ---
// 只负责请求记录展示、复制、清空；入口完全交给 quickDock，不再创建独立“请求”悬浮按钮。
(function registerDebugConsoleView(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.debugConsole;
    const service = feature.service;
    const toast = OwoApp.shared && OwoApp.shared.ui && OwoApp.shared.ui.showToast;
    let standaloneRootEl = null;
    let standalonePanelEl = null;
    const embeddedMounts = new Map();

    function showToast(message) {
        if (typeof toast === 'function') toast(message);
    }

    function safeClassPart(value) {
        return String(value || 'pending').replace(/[^a-z0-9_-]/gi, '');
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
    }

    function formatTime(trace) {
        if (!trace || !trace.startedAt) return '--:--';
        return new Date(trace.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function formatDuration(trace) {
        if (!trace || trace.durationMs === undefined) return '进行中';
        return trace.durationMs + 'ms';
    }

    function buildTraceCard(trace) {
        const provider = [trace.provider, trace.model].filter(Boolean).join(' / ') || '未标记模型';
        const detail = service.formatTraceForCopy(trace);
        return `<article class="request-trace-card request-trace-card--${safeClassPart(trace.status)}" data-trace-id="${escapeHtml(trace.id)}">
            <div class="request-trace-main">
                <div class="request-trace-title">${escapeHtml(trace.label || trace.source || 'AI 请求')}</div>
                <div class="request-trace-meta">${escapeHtml(provider + ' · ' + formatTime(trace) + ' · ' + formatDuration(trace))}</div>
                <div class="request-trace-endpoint">${escapeHtml(trace.endpoint || '无 endpoint')}</div>
            </div>
            <div class="request-trace-actions">
                <span class="request-trace-status">${escapeHtml(service.getStatusLabel(trace.status))}</span>
                <button type="button" class="request-console-mini-btn" data-dc-action="copy-one">复制</button>
                <button type="button" class="request-console-mini-btn" data-dc-action="toggle-detail">详情</button>
            </div>
            <pre class="request-trace-detail" hidden>${escapeHtml(detail)}</pre>
        </article>`;
    }

    function buildPanelHtml(options) {
        const traces = service.listTraces();
        const maxCount = OwoApp.platform.ai.requestTraceStore.getMaxTraceCount() || 80;
        const cards = traces.map(buildTraceCard).join('');
        const empty = traces.length ? 'hidden' : '';
        const backButton = options && options.onBack
            ? '<button type="button" data-dc-action="back">返回</button>'
            : '';
        return `<header class="request-console-header">
            <div><strong>请求控制台</strong><span>AI 请求 / 诊断完整数据</span></div>
            <div class="request-console-header-actions">
                <span class="request-console-count">${traces.length}/${maxCount}</span>
                <button type="button" data-dc-action="copy-all">复制全部</button>
                <button type="button" data-dc-action="clear">清空</button>
                ${backButton}
                <button type="button" data-dc-action="close">×</button>
            </div>
        </header>
        <p class="request-console-note">请求体、模型返回和表格记忆 XML 诊断会记录到这里；密钥类 header 和 URL 参数默认打码。这个面板现在完全挂在悬浮球里。</p>
        <div class="request-console-empty" ${empty}>暂无请求。发送聊天、总结、识图或表格记忆后会自动出现。</div>
        <div class="request-console-list">${cards}</div>`;
    }

    async function copyText(text) {
        if (!text) return false;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (error) {
            console.warn('[debugConsole] clipboard api failed:', error);
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } finally {
            textarea.remove();
        }
        return ok;
    }

    async function copyTrace(traceId) {
        const ok = await copyText(service.formatTraceForCopy(traceId));
        showToast(ok ? '已复制请求数据' : '复制失败，请展开后手动复制');
    }

    async function copyAll() {
        const ok = await copyText(service.formatAllTracesForCopy());
        showToast(ok ? '已复制全部请求数据' : '复制失败，请手动复制');
    }

    function handlePanelClick(event, options) {
        const actionEl = event.target && event.target.closest ? event.target.closest('[data-dc-action]') : null;
        if (!actionEl) return;
        const action = actionEl.dataset.dcAction;
        if (action === 'close') {
            if (options && typeof options.onClose === 'function') options.onClose();
            else closeStandalone();
            return;
        }
        if (action === 'back') {
            if (options && typeof options.onBack === 'function') options.onBack();
            return;
        }
        if (action === 'copy-all') {
            copyAll();
            return;
        }
        if (action === 'clear') {
            service.clearTraces();
            showToast('请求记录已清空');
            return;
        }
        const card = actionEl.closest('.request-trace-card');
        const traceId = card ? card.dataset.traceId : '';
        if (action === 'copy-one') {
            copyTrace(traceId);
            return;
        }
        if (action === 'toggle-detail' && card) {
            const detail = card.querySelector('.request-trace-detail');
            if (detail) detail.hidden = !detail.hidden;
        }
    }

    function destroyEmbedded(container) {
        const mount = embeddedMounts.get(container);
        if (!mount) return;
        container.removeEventListener('click', mount.clickHandler);
        if (mount.unsubscribe) mount.unsubscribe();
        embeddedMounts.delete(container);
    }

    function renderEmbedded(container, options) {
        if (!container) return;
        destroyEmbedded(container);
        const normalizedOptions = options || {};
        const renderIntoContainer = () => {
            container.innerHTML = buildPanelHtml(normalizedOptions);
        };
        const clickHandler = event => handlePanelClick(event, normalizedOptions);
        container.addEventListener('click', clickHandler);
        const unsubscribe = service.subscribe(renderIntoContainer);
        embeddedMounts.set(container, { clickHandler, unsubscribe });
        renderIntoContainer();
    }

    function openStandalone() {
        if (!document.body) return;
        if (!standaloneRootEl) {
            standaloneRootEl = document.createElement('div');
            standaloneRootEl.className = 'request-console-root request-console-root--standalone';
            standaloneRootEl.innerHTML = '<section class="request-console-panel"></section>';
            document.body.appendChild(standaloneRootEl);
            standalonePanelEl = standaloneRootEl.querySelector('.request-console-panel');
        }
        renderEmbedded(standalonePanelEl, { onClose: closeStandalone });
        standaloneRootEl.hidden = false;
    }

    function closeStandalone() {
        if (!standaloneRootEl) return;
        destroyEmbedded(standalonePanelEl);
        standaloneRootEl.hidden = true;
    }

    function toggleStandalone() {
        if (!standaloneRootEl || standaloneRootEl.hidden) openStandalone();
        else closeStandalone();
    }

    function destroy() {
        Array.from(embeddedMounts.keys()).forEach(destroyEmbedded);
        if (standaloneRootEl) standaloneRootEl.remove();
        standaloneRootEl = null;
        standalonePanelEl = null;
    }

    feature.view = {
        renderEmbedded,
        destroyEmbedded,
        open: openStandalone,
        close: closeStandalone,
        toggle: toggleStandalone,
        destroy
    };
})(window);
