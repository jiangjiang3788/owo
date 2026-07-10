// --- Appearance settings model/constants (V19) ---
// 只放外观/壁纸/字体模块的稳定默认值，不写 DOM / 持久化逻辑。
(function registerAppearanceModel(global) {
    const OwoApp = global.OwoApp;
    const appearance = OwoApp.features.settings.appearance;

    const DEFAULT_WALLPAPER_URL = 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg';
    const DEFAULT_HOME_SIGNATURE = '编辑个性签名...';
    const DEFAULT_NIGHT_MODE_CSS = `/* 基础颜色变量 */
body.night-mode-active {
    --bg-color: #121212;
    --text-color: #e0e0e0;
    --white-color: #e0e0e0;
    --primary-color: #1e1e1e;
    --secondary-color: #666;
    --accent-color: #1e1e1e;
    --top-pinned-bg: #1a1a1a;
    --panel-bg: #181818;
    --chat-bottom-bar-bg: #181818;
    --folder-pill-bg: #1e1e1e;
    --folder-pill-text: #bbb;
    --folder-pill-active-bg: #333;
    --folder-pill-active-text: #fff;
    --global-title-color: #e0e0e0;
    --nav-icon-color: #777;
    --nav-active-icon-color: #e0e0e0;
    --kkt-icon-color: #e0e0e0;
    --func-icon-color: #e0e0e0;
}

/* 背景色设置 */
body.night-mode-active, 
body.night-mode-active .phone-screen, 
body.night-mode-active .screen, 
body.night-mode-active .content,
body.night-mode-active .chat-item {
    background-color: #121212 !important;
}

/* 头部栏与底部栏 */
body.night-mode-active .app-header,
body.night-mode-active .bottom-nav {
    background-color: #181818 !important;
    border-color: #222 !important;
}

/* 聊天气泡 */
body.night-mode-active .message-bubble {
    background-color: #1e1e1e !important;
    color: #e0e0e0 !important;
}
body.night-mode-active .message-wrapper.sent .message-bubble {
    background-color: #2a2a2a !important;
}

/* 输入区域 */
body.night-mode-active .message-input-area {
    background-color: #181818 !important;
    border-top-color: #222 !important;
}
body.night-mode-active .message-input-area textarea {
    background-color: #1e1e1e !important;
    color: #e0e0e0 !important;
}`;

    const DEFAULT_INS_WIDGET = {
        avatar1: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
        bubble1: 'love u.',
        avatar2: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg',
        bubble2: 'miss u.'
    };

    function clone(value, fallback) {
        const source = value === undefined ? fallback : value;
        return JSON.parse(JSON.stringify(source || {}));
    }

    appearance.model = {
        DEFAULT_WALLPAPER_URL,
        DEFAULT_HOME_SIGNATURE,
        DEFAULT_INS_WIDGET,
        DEFAULT_NIGHT_MODE_CSS,
        clone
    };
})(window);
