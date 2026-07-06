// --- Debug console view (v0.2.2) ---
// 只负责请求控制台展示、复制、清空；不承担 AI 请求、解析或持久化职责。
(function registerDebugConsoleView(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.debugConsole;
    const service = feature.service;
    const toast = OwoApp.shared && OwoApp.shared.ui && OwoApp.shared.ui.showToast;
    let rootEl = null;
    let panelEl = null;
    let listEl = null;
    let countEl = null;
    let emptyEl = null;
    let unsubscribe = null;

    function showToast(message) {
        if (typeof toast === 'function') toast(message);
    }

    function safeClassPart(value) {
        return String(value || 'pending').replace(/[^a-z0-9_-]/gi, '');
    }

    function formatTime(trace) {
        if (!trace || !trace.startedAt) return '--:--';
        const date = new Date(trace.startedAt);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function formatDuration(trace) {
        if (!trace || trace.durationMs === undefined) return '进行中';
        return trace.durationMs + 'ms';
    }

    function setText(el, text) {
        if (el) el.textContent = text == null ? '' : String(text);
    }

    function createButton(action, text, className) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = className || 'request-console-mini-btn';
        btn.dataset.action = action;
        btn.textContent = text;
        return btn;
    }

    function createTraceCard(trace) {
        const card = document.createElement('article');
        card.className = 'request-trace-card request-trace-card--' + safeClassPart(trace.status);
        card.dataset.traceId = trace.id;

        const main = document.createElement('div');
        main.className = 'request-trace-main';
        const title = document.createElement('div');
        title.className = 'request-trace-title';
        setText(title, trace.label || trace.source || 'AI 请求');
        const meta = document.createElement('div');
        meta.className = 'request-trace-meta';
        const provider = [trace.provider, trace.model].filter(Boolean).join(' / ') || '未标记模型';
        setText(meta, provider + ' · ' + formatTime(trace) + ' · ' + formatDuration(trace));
        const endpoint = document.createElement('div');
        endpoint.className = 'request-trace-endpoint';
        setText(endpoint, trace.endpoint || '无 endpoint');
        main.appendChild(title);
        main.appendChild(meta);
        main.appendChild(endpoint);

        const actions = document.createElement('div');
        actions.className = 'request-trace-actions';
        const status = document.createElement('span');
        status.className = 'request-trace-status';
        setText(status, service.getStatusLabel(trace.status));
        actions.appendChild(status);
        actions.appendChild(createButton('copy-one', '复制'));
        actions.appendChild(createButton('toggle-detail', '详情'));

        const detail = document.createElement('pre');
        detail.className = 'request-trace-detail';
        detail.hidden = true;
        setText(detail, service.formatTraceForCopy(trace));

        card.appendChild(main);
        card.appendChild(actions);
        card.appendChild(detail);
        return card;
    }

    function render() {
        if (!listEl) return;
        const traces = service.listTraces();
        setText(countEl, traces.length + '/' + (OwoApp.platform.ai.requestTraceStore.getMaxTraceCount() || 80));
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.hidden = traces.length > 0;
        traces.forEach(trace => listEl.appendChild(createTraceCard(trace)));
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
        const text = service.formatTraceForCopy(traceId);
        const ok = await copyText(text);
        showToast(ok ? '已复制请求数据' : '复制失败，请展开后手动复制');
    }

    async function copyAll() {
        const text = service.formatAllTracesForCopy();
        const ok = await copyText(text);
        showToast(ok ? '已复制全部请求数据' : '复制失败，请手动复制');
    }

    function closestAction(target) {
        return target && target.closest ? target.closest('[data-action]') : null;
    }

    function handleClick(event) {
        const actionEl = closestAction(event.target);
        if (!actionEl) return;
        const action = actionEl.dataset.action;
        if (action === 'toggle') {
            toggle();
            return;
        }
        if (action === 'close') {
            close();
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

    function mount() {
        if (rootEl || !document.body) return;
        rootEl = document.createElement('div');
        rootEl.className = 'request-console-root';
        rootEl.innerHTML = '<button type="button" class="request-console-entry" data-action="toggle" title="请求控制台">请求</button>'
            + '<section class="request-console-panel" aria-label="请求控制台" hidden>'
            + '<header class="request-console-header"><div><strong>请求控制台</strong><span>AI 请求完整数据</span></div>'
            + '<div class="request-console-header-actions"><span class="request-console-count"></span>'
            + '<button type="button" data-action="copy-all">复制全部</button><button type="button" data-action="clear">清空</button><button type="button" data-action="close">×</button></div></header>'
            + '<p class="request-console-note">请求体和模型返回会记录到这里；密钥类 header 和 URL 参数默认打码。</p>'
            + '<div class="request-console-empty">暂无请求。发送聊天、总结、识图或表格记忆后会自动出现。</div>'
            + '<div class="request-console-list"></div></section>';
        document.body.appendChild(rootEl);
        panelEl = rootEl.querySelector('.request-console-panel');
        listEl = rootEl.querySelector('.request-console-list');
        countEl = rootEl.querySelector('.request-console-count');
        emptyEl = rootEl.querySelector('.request-console-empty');
        rootEl.addEventListener('click', handleClick);
        unsubscribe = service.subscribe(render);
        render();
    }

    function open() {
        mount();
        if (!panelEl) return;
        panelEl.hidden = false;
        rootEl.classList.add('request-console-root--open');
        render();
    }

    function close() {
        if (!panelEl) return;
        panelEl.hidden = true;
        rootEl.classList.remove('request-console-root--open');
    }

    function toggle() {
        mount();
        if (!panelEl || panelEl.hidden) open();
        else close();
    }

    function destroy() {
        if (unsubscribe) unsubscribe();
        unsubscribe = null;
        if (rootEl) rootEl.remove();
        rootEl = null;
        panelEl = null;
        listEl = null;
        countEl = null;
        emptyEl = null;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
        mount();
    }

    feature.view = { mount, open, close, toggle, destroy, render };
})(window);
