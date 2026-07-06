// --- Chat message bubble render facade (V16 canonical owner) ---
// 只提供 renderMessageBubble 稳定入口和 view model 注入；旧 DOM 细节暂由 chat_render.js 注册的 legacy renderer 承接。
(function registerChatRenderMessageBubble(global) {
    const OwoApp = global.OwoApp;
    const chatFeature = OwoApp.features.chat;
    const viewModelOwner = chatFeature.messageViewModel;
    let legacyRenderer = null;
    let legacyRendererMeta = null;

    function setLegacyRenderer(renderer, meta = {}) {
        if (legacyRenderer) {
            throw new Error('[chat.renderMessageBubble] legacy renderer 已注册，禁止第二套 renderer');
        }
        if (typeof renderer !== 'function') {
            throw new Error('[chat.renderMessageBubble] legacy renderer 必须是函数');
        }
        legacyRenderer = renderer;
        legacyRendererMeta = {
            state: meta.state || 'legacy-dom-renderer',
            owner: meta.owner || 'js/modules/chat_render.js',
            note: meta.note || 'V16: DOM 细节暂留 legacy renderer，canonical 入口统一为 renderMessageBubble'
        };
    }

    function createRenderContext(message, options = {}) {
        const viewModel = options.viewModel || viewModelOwner.createMessageViewModel(message, options);
        return Object.assign({}, options, {
            viewModel,
            isContinuous: Boolean(options.isContinuous)
        });
    }

    function renderMessageBubble(message, options = {}) {
        if (!legacyRenderer) {
            throw new Error('[chat.renderMessageBubble] 尚未注册 legacy renderer');
        }
        const renderContext = createRenderContext(message, options);
        return legacyRenderer(message, renderContext);
    }

    function getLegacyRendererMeta() {
        return legacyRendererMeta ? Object.assign({}, legacyRendererMeta) : null;
    }

    chatFeature.renderMessageBubble = {
        setLegacyRenderer,
        createRenderContext,
        renderMessageBubble,
        getLegacyRendererMeta
    };
})(window);
