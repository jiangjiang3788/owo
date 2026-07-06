// --- Quick dock model (v0.2.8) ---
// 只负责悬浮球面板的展示状态和轻量数据归一化；不访问 DOM、不发请求。
(function registerQuickDockModel(global) {
    const OwoApp = global.OwoApp;
    const quickDock = OwoApp.features.quickDock;

    const DEFAULT_PANEL = 'main';
    const state = {
        isOpen: false,
        activePanel: DEFAULT_PANEL,
        x: null,
        y: null,
        statusText: ''
    };

    function setOpen(open) {
        state.isOpen = !!open;
        if (!state.isOpen) state.activePanel = DEFAULT_PANEL;
        return getState();
    }

    function toggleOpen() {
        return setOpen(!state.isOpen);
    }

    function setActivePanel(panel) {
        state.activePanel = panel || DEFAULT_PANEL;
        state.isOpen = true;
        return getState();
    }

    function setPosition(position) {
        if (!position) return getState();
        state.x = Number.isFinite(position.x) ? position.x : state.x;
        state.y = Number.isFinite(position.y) ? position.y : state.y;
        return getState();
    }

    function setStatusText(text) {
        state.statusText = String(text || '');
        return getState();
    }

    function normalizePromptText(value) {
        return String(value || '').replace(/\\n/g, '\n');
    }

    function getState() {
        return {
            isOpen: state.isOpen,
            activePanel: state.activePanel,
            x: state.x,
            y: state.y,
            statusText: state.statusText
        };
    }

    quickDock.model = {
        DEFAULT_PANEL,
        getState,
        setOpen,
        toggleOpen,
        setActivePanel,
        setPosition,
        setStatusText,
        normalizePromptText
    };
})(window);
