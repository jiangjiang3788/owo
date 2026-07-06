// --- Debug console view (v0.2.17) ---
// 唯一控制台 renderer：quickDock 作为宿主，dataManagement 只保留入口，二者不能复制控制台 UI 逻辑。
(function registerDebugConsoleView(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.debugConsole;
    const service = feature.service;
    const toast = OwoApp.shared && OwoApp.shared.ui && OwoApp.shared.ui.showToast;
    const embeddedMounts = new Map();

    function showToast(message) {
        if (typeof toast === 'function') toast(message);
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
    }

    function safeClassPart(value) {
        return String(value || 'pending').replace(/[^a-z0-9_-]/gi, '');
    }

    function normalizeVisibleText(value) {
        let text = String(value == null ? '' : value)
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
        for (let i = 0; i < 3; i += 1) {
            const next = text
                .replace(/\\{1,3}r\\{1,3}n/g, '\n')
                .replace(/\\{1,3}n/g, '\n')
                .replace(/\\{1,3}r/g, '\n');
            if (next === text) break;
            text = next;
        }
        return text;
    }


    function formatTime(trace) {
        if (!trace || !trace.startedAt) return '--:--';
        return new Date(trace.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function formatDuration(trace) {
        if (!trace || trace.durationMs === undefined) return '';
        return trace.durationMs ? trace.durationMs + 'ms' : '';
    }

    function getDiagnosticEvent(trace) {
        const diagnostic = trace && trace.diagnostic;
        if (!diagnostic || typeof diagnostic !== 'object') return null;
        return diagnostic.event || diagnostic;
    }

    function readablePreview(value) {
        return normalizeVisibleText(value)
            .split('\n')
            .filter(Boolean)
            .slice(0, 3)
            .join(' / ');
    }

    function getOption(options, key, fallback) {
        return options && Object.prototype.hasOwnProperty.call(options, key) ? options[key] : fallback;
    }

    function buildTraceCard(trace) {
        const category = service.getTraceCategory(trace);
        const categoryLabel = service.getCategoryLabel(category);
        const event = getDiagnosticEvent(trace);
        const provider = [trace.provider, trace.model].filter(Boolean).join(' / ')
            || (event && [event.chatType, event.role].filter(Boolean).join(' / '))
            || '本地记录';
        const preview = readablePreview((event && (event.preview || event.content)) || trace.endpoint || trace.content || (trace.message && trace.message.content) || trace.event || trace.errorMessage || '无详情');
        return `<article class="request-trace-card request-trace-card--${safeClassPart(trace.status)} request-trace-card--cat-${safeClassPart(category)}" data-trace-id="${escapeHtml(trace.id)}">
            <div class="request-trace-main">
                <div class="request-trace-title"><span class="request-trace-category">${escapeHtml(categoryLabel)}</span>${escapeHtml(trace.label || trace.source || '控制台记录')}</div>
                <div class="request-trace-meta">${escapeHtml(provider + ' · ' + formatTime(trace) + ' · ' + formatDuration(trace))}</div>
                <div class="request-trace-endpoint">${escapeHtml(preview)}</div>
            </div>
            <div class="request-trace-actions">
                <span class="request-trace-status">${escapeHtml(service.getStatusLabel(trace.status || category))}</span>
                <button type="button" class="request-console-mini-btn" data-dc-action="copy-one">复制</button>
                <button type="button" class="request-console-mini-btn" data-dc-action="open-detail">详情</button>
            </div>
        </article>`;
    }

    function buildHeaderActions(options, mode) {
        const actions = [];
        const backLabel = escapeHtml(getOption(options, 'backLabel', '返回'));
        const closeLabel = escapeHtml(getOption(options, 'closeLabel', '×'));
        if (mode === 'list') actions.push('<button type="button" data-dc-action="copy-all">复制全部</button>', '<button type="button" data-dc-action="clear">清空</button>');
        if (mode === 'detail') actions.push('<button type="button" data-dc-action="copy-detail">复制详情</button>', '<button type="button" data-dc-action="list">返回列表</button>');
        if (mode === 'list' && options && typeof options.onBack === 'function') actions.push(`<button type="button" data-dc-action="back">${backLabel}</button>`);
        if (getOption(options, 'showClose', true) && options && typeof options.onClose === 'function') actions.push(`<button type="button" data-dc-action="close">${closeLabel}</button>`);
        return actions.join('');
    }

    function buildListPanelHtml(options) {
        const traces = service.listTraces();
        const maxCount = service.getMaxTraceCount ? service.getMaxTraceCount() : 80;
        const cards = traces.map(buildTraceCard).join('');
        const empty = traces.length ? 'hidden' : '';
        const compactHost = !!getOption(options, 'compactHost', false);
        const title = getOption(options, 'title', '控制台');
        const subtitle = getOption(options, 'subtitle', '发送 / 回复 / 请求 / 错误 / 诊断');
        const note = getOption(options, 'hideNote', false) ? false : getOption(options, 'note', '用户发送、AI 回复、AI/API 请求、模型返回、错误和表格记忆诊断都会汇总到这里。普通详情把反斜杠 n 转成真实换行；原始记录仍保留在详情末尾。');
        const header = compactHost
            ? `<div class="request-console-toolbar request-console-toolbar--compact">
                <span class="request-console-count">${traces.length}/${maxCount}</span>
                ${buildHeaderActions(options, 'list')}
            </div>`
            : `<header class="request-console-header">
                <div class="request-console-title"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(subtitle)}</span></div>
                <div class="request-console-header-actions">
                    <span class="request-console-count">${traces.length}/${maxCount}</span>
                    ${buildHeaderActions(options, 'list')}
                </div>
            </header>`;
        return `${header}
        ${note === false ? '' : `<p class="request-console-note">${escapeHtml(note)}</p>`}
        <div class="request-console-empty" ${empty}>暂无控制台记录。发送消息、获取回复、识图、总结或表格记忆后会自动出现。</div>
        <div class="request-console-list">${cards}</div>`;
    }

    function buildDetailPanelHtml(traceId, options) {
        const compactHost = !!getOption(options, 'compactHost', false);
        const trace = service.findTrace(traceId);
        if (!trace) {
            const header = compactHost
                ? `<div class="request-console-toolbar request-console-toolbar--compact"><button type="button" data-dc-action="list">返回列表</button></div>`
                : `<header class="request-console-header request-console-header--detail">
                    <div class="request-console-title"><strong>${escapeHtml(getOption(options, 'detailTitle', '控制台详情'))}</strong><span>记录不存在或已清空</span></div>
                    <div class="request-console-header-actions">
                        <button type="button" data-dc-action="list">返回列表</button>
                        ${getOption(options, 'showClose', true) && options && typeof options.onClose === 'function' ? '<button type="button" data-dc-action="close">×</button>' : ''}
                    </div>
                </header>`;
            return `${header}<div class="request-console-detail-empty">这条记录已经不存在。</div>`;
        }
        const category = service.getTraceCategory(trace);
        const title = trace.label || service.getCategoryLabel(category);
        const meta = [service.getCategoryLabel(category), trace.provider, trace.model, formatTime(trace), formatDuration(trace)].filter(Boolean).join(' · ');
        const detail = normalizeVisibleText(service.formatTraceForDisplay(trace));
        const header = compactHost
            ? `<div class="request-console-toolbar request-console-toolbar--compact request-console-toolbar--detail">
                <span class="request-console-detail-title">${escapeHtml(title)}</span>
                ${buildHeaderActions(options, 'detail')}
            </div>`
            : `<header class="request-console-header request-console-header--detail">
                <div class="request-console-title"><strong>${escapeHtml(getOption(options, 'detailTitle', '控制台详情'))}</strong><span>${escapeHtml(title + ' · ' + meta)}</span></div>
                <div class="request-console-header-actions">
                    ${buildHeaderActions(options, 'detail')}
                </div>
            </header>`;
        return `${header}<pre class="request-console-full-detail">${escapeHtml(detail)}</pre>`;
    }

    function buildPanelHtml(options, state) {
        if (state && state.selectedTraceId) return buildDetailPanelHtml(state.selectedTraceId, options);
        return buildListPanelHtml(options);
    }

    async function copyText(text) {
        if (!text) return false;
        const normalized = normalizeVisibleText(text);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(normalized);
                return true;
            }
        } catch (error) {
            console.warn('[debugConsole] clipboard api failed:', error);
        }
        const textarea = document.createElement('textarea');
        textarea.value = normalized;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        let ok = false;
        try { ok = document.execCommand('copy'); }
        finally { textarea.remove(); }
        return ok;
    }

    async function copyTrace(traceId) {
        const ok = await copyText(service.formatTraceForDisplay(traceId));
        showToast(ok ? '已复制控制台记录' : '复制失败，请展开后手动复制');
    }

    async function copyAll() {
        const ok = await copyText(service.formatAllTracesForCopy());
        showToast(ok ? '已复制全部控制台记录' : '复制失败，请手动复制');
    }

    function handlePanelClick(event, options, mount) {
        const actionEl = event.target && event.target.closest ? event.target.closest('[data-dc-action]') : null;
        if (!actionEl) return;
        const action = actionEl.dataset.dcAction;
        if (action === 'close') {
            if (options && typeof options.onClose === 'function') options.onClose();
            return;
        }
        if (action === 'back') {
            if (options && typeof options.onBack === 'function') options.onBack();
            return;
        }
        if (action === 'list') {
            mount.state.selectedTraceId = '';
            mount.renderIntoContainer();
            return;
        }
        if (action === 'copy-all') { copyAll(); return; }
        if (action === 'clear') {
            service.clearTraces();
            showToast('控制台记录已清空');
            return;
        }
        if (action === 'copy-detail') { copyTrace(mount.state.selectedTraceId); return; }
        const card = actionEl.closest('.request-trace-card');
        const traceId = card ? card.dataset.traceId : '';
        if (action === 'copy-one') { copyTrace(traceId); return; }
        if (action === 'open-detail' && traceId) {
            mount.state.selectedTraceId = traceId;
            mount.renderIntoContainer();
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
        const mount = {
            state: { selectedTraceId: '' },
            renderIntoContainer: null,
            clickHandler: null,
            unsubscribe: null
        };
        mount.renderIntoContainer = () => { container.innerHTML = buildPanelHtml(normalizedOptions, mount.state); };
        mount.clickHandler = event => handlePanelClick(event, normalizedOptions, mount);
        container.classList.add('request-console-host');
        container.addEventListener('click', mount.clickHandler);
        mount.unsubscribe = service.subscribe(mount.renderIntoContainer);
        embeddedMounts.set(container, mount);
        mount.renderIntoContainer();
    }

    function destroy() {
        Array.from(embeddedMounts.keys()).forEach(destroyEmbedded);
    }

    feature.view = {
        renderEmbedded,
        destroyEmbedded,
        open: function open() {},
        close: function close() {},
        toggle: function toggle() {},
        destroy
    };
})(window);
