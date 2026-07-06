// --- Quick dock view (v0.2.17) ---
// 悬浮球承载控制台宿主；控制台列表/详情仍由 debugConsole renderer 统一输出。
(function registerQuickDockView(global) {
    const OwoApp = global.OwoApp;
    const quickDock = OwoApp.features.quickDock;
    const model = quickDock.model;
    const service = quickDock.service;

    let rootEl = null;
    let panelEl = null;
    let ballEl = null;
    let consoleMountEl = null;
    let dragState = null;

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
    }

    function setBusy(isBusy) {
        if (!rootEl) return;
        rootEl.classList.toggle('quick-dock--busy', !!isBusy);
    }

    function destroyConsoleMount() {
        if (consoleMountEl) service.destroyConsole(consoleMountEl);
        consoleMountEl = null;
    }

    function currentModelLabel() {
        const current = service.getCurrentModel() || {};
        return current.model || '未选择模型';
    }

    function renderMainPanel() {
        destroyConsoleMount();
        const candidates = service.listModels();
        const options = candidates.length
            ? candidates.map(item => `<option value="${escapeHtml(item.id)}" ${item.isCurrent ? 'selected' : ''}>${escapeHtml(item.displayLabel || item.model || item.label)}</option>`).join('')
            : '<option value="">未发现候选模型</option>';
        const status = model.getState().statusText;
        panelEl.innerHTML = `
            <header class="quick-dock-panel-header">
                <div><strong>快捷悬浮球</strong><span>${escapeHtml(currentModelLabel())}</span></div>
                <button type="button" class="quick-dock-icon-btn" data-qd-action="close">×</button>
            </header>
            <div class="quick-dock-section">
                <label class="quick-dock-label">快速切换模型</label>
                <div class="quick-dock-model-row">
                    <select id="quick-dock-model-select">${options}</select>
                    <button type="button" data-qd-action="switch-model">切换</button>
                </div>
            </div>
            <div class="quick-dock-grid">
                <button type="button" data-qd-action="open-console">控制台</button>
                <button type="button" data-qd-action="open-prompt">提示词</button>
                <button type="button" data-qd-action="backup-now">立即备份</button>
                <button type="button" data-qd-action="restore-latest">恢复备份</button>
            </div>
            <p class="quick-dock-status">${escapeHtml(status || '提示：控制台在悬浮球内直接查看；数据管理只保留入口，不再重复嵌套面板。')}</p>`;
    }

    function renderPromptPanel() {
        destroyConsoleMount();
        const prompt = service.getPromptState();
        panelEl.innerHTML = `
            <header class="quick-dock-panel-header">
                <div><strong>提示词</strong><span>真实换行展示，不使用反斜杠 n</span></div>
                <button type="button" class="quick-dock-icon-btn" data-qd-action="close">×</button>
            </header>
            <div class="quick-dock-prompt-toolbar">
                <label><input type="checkbox" id="quick-dock-prompt-enabled" ${prompt.enabled ? 'checked' : ''}> 启用自定义系统提示词</label>
                <span>预设 ${prompt.presetCount} 个</span>
            </div>
            <textarea id="quick-dock-prompt-textarea" class="quick-dock-prompt-textarea" spellcheck="false">${escapeHtml(prompt.template)}</textarea>
            <div class="quick-dock-panel-footer">
                <button type="button" data-qd-action="save-prompt">保存提示词</button>
                <button type="button" data-qd-action="main">返回</button>
                <button type="button" data-qd-action="close">关闭</button>
            </div>`;
    }

    function renderConsolePanel() {
        destroyConsoleMount();
        panelEl.innerHTML = '<div id="quick-dock-console-mount" class="quick-dock-console-mount"></div>';
        consoleMountEl = panelEl.querySelector('#quick-dock-console-mount');
        service.renderConsole(consoleMountEl, {
            onBack: () => { model.setActivePanel('main'); render(); },
            onClose: () => { model.setOpen(false); render(); },
            showClose: true
        });
    }

    function render() {
        if (!panelEl || !rootEl) return;
        const state = model.getState();
        rootEl.classList.toggle('quick-dock--open', state.isOpen);
        panelEl.classList.toggle('quick-dock-panel--prompt', state.activePanel === 'prompt');
        panelEl.classList.toggle('quick-dock-panel--console', state.activePanel === 'console');
        panelEl.hidden = !state.isOpen;
        if (!state.isOpen) {
            destroyConsoleMount();
            return;
        }
        if (state.activePanel === 'prompt') renderPromptPanel();
        else if (state.activePanel === 'console') renderConsolePanel();
        else renderMainPanel();
    }

    async function runAction(action) {
        if (action === 'close') {
            model.setOpen(false);
            render();
            return;
        }
        if (action === 'main') {
            model.setActivePanel('main');
            render();
            return;
        }
        if (action === 'open-prompt') {
            model.setActivePanel('prompt');
            render();
            return;
        }
        if (action === 'open-console') {
            service.openConsolePanel();
            render();
            return;
        }
        setBusy(true);
        try {
            if (action === 'switch-model') {
                const select = document.getElementById('quick-dock-model-select');
                await service.switchModel(select ? select.value : '');
            } else if (action === 'backup-now') {
                await service.backupNow();
            } else if (action === 'restore-latest') {
                if (!confirm('确定恢复 GitHub 最新备份吗？当前本地数据会被导入数据覆盖。')) return;
                await service.restoreLatest();
            } else if (action === 'save-prompt') {
                const enabled = document.getElementById('quick-dock-prompt-enabled');
                const textarea = document.getElementById('quick-dock-prompt-textarea');
                await service.savePromptState({ enabled: !!(enabled && enabled.checked), template: textarea ? textarea.value : '' });
            }
        } catch (error) {
            service.toast(error.message || '操作失败');
        } finally {
            setBusy(false);
            render();
        }
    }

    function handleClick(event) {
        const actionEl = event.target && event.target.closest ? event.target.closest('[data-qd-action]') : null;
        if (!actionEl) return;
        runAction(actionEl.dataset.qdAction);
    }

    function onPointerDown(event) {
        if (!ballEl || event.button > 0) return;
        const rect = ballEl.getBoundingClientRect();
        dragState = { startX: event.clientX, startY: event.clientY, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, moved: false };
        ballEl.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
        if (!dragState || !rootEl) return;
        const dx = Math.abs(event.clientX - dragState.startX);
        const dy = Math.abs(event.clientY - dragState.startY);
        if (dx + dy > 8) dragState.moved = true;
        const x = Math.max(8, Math.min(window.innerWidth - 64, event.clientX - dragState.offsetX));
        const y = Math.max(8, Math.min(window.innerHeight - 64, event.clientY - dragState.offsetY));
        model.setPosition({ x, y });
        rootEl.style.left = x + 'px';
        rootEl.style.top = y + 'px';
        rootEl.style.right = 'auto';
        rootEl.style.bottom = 'auto';
    }

    function onPointerUp() {
        if (!dragState) return;
        const wasMoved = dragState.moved;
        dragState = null;
        if (!wasMoved) {
            model.toggleOpen();
            render();
        }
    }

    function mount() {
        if (rootEl || !document.body) return;
        rootEl = document.createElement('div');
        rootEl.className = 'quick-dock-root';
        rootEl.innerHTML = '<section class="quick-dock-panel" hidden></section><button type="button" class="quick-dock-ball" aria-label="快捷悬浮球">悬</button>';
        document.body.appendChild(rootEl);
        panelEl = rootEl.querySelector('.quick-dock-panel');
        ballEl = rootEl.querySelector('.quick-dock-ball');
        rootEl.addEventListener('click', handleClick);
        ballEl.addEventListener('pointerdown', onPointerDown);
        ballEl.addEventListener('pointermove', onPointerMove);
        ballEl.addEventListener('pointerup', onPointerUp);
        ballEl.addEventListener('pointercancel', () => { dragState = null; });
        render();
    }

    function open(panel) {
        model.setActivePanel(panel || 'main');
        render();
    }

    function close() {
        model.setOpen(false);
        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();

    quickDock.view = { mount, open, close, render };
})(window);
