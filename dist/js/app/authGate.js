// --- App auth gate (V20) ---
// 账号/密码解锁门禁暂时暂停：默认直接初始化应用，不渲染登录遮罩，不请求远端验证 API。
(function registerAppAuthGate(global) {
    const OwoApp = global.OwoApp;
    const app = OwoApp.app;

    const AUTH_GATE_ENABLED = false;

    function isEnabled() {
        return AUTH_GATE_ENABLED;
    }

    function isPaused() {
        return !AUTH_GATE_ENABLED;
    }

    function markAuthenticated() {
        try { global.localStorage.setItem('ephone_auth', 'true'); } catch (error) { /* noop */ }
    }

    function clearAuthentication() {
        try { global.localStorage.removeItem('ephone_auth'); } catch (error) { /* noop */ }
    }

    function removeLoginOverlay() {
        const overlay = global.document && global.document.getElementById('login-overlay');
        if (overlay) overlay.remove();
    }

    function startDirectly(deps) {
        removeLoginOverlay();
        deps.initDatabase();
        return Promise.resolve(deps.init()).catch(error => {
            console.error('[AuthGate] 应用初始化失败:', error);
        });
    }

    function start(deps) {
        if (!deps || typeof deps.initDatabase !== 'function' || typeof deps.init !== 'function') {
            throw new Error('[AuthGate] start 需要 initDatabase 和 init');
        }

        if (!AUTH_GATE_ENABLED) {
            console.info('[AuthGate] 账号密码解锁已暂停，直接进入应用。');
            return startDirectly(deps);
        }

        const isAuth = global.localStorage && global.localStorage.getItem('ephone_auth');
        if (isAuth === 'true') {
            try {
                deps.initDatabase();
                return deps.init();
            } catch (error) {
                console.error('[AuthGate] 自动登录出错，重置状态:', error);
                clearAuthentication();
                if (typeof deps.renderLoginOverlay === 'function') deps.renderLoginOverlay();
                return null;
            }
        }

        if (typeof deps.renderLoginOverlay === 'function') deps.renderLoginOverlay();
        return null;
    }

    app.authGate = {
        isEnabled,
        isPaused,
        start,
        startDirectly,
        markAuthenticated,
        clearAuthentication,
        getMode: function getMode() { return AUTH_GATE_ENABLED ? 'enabled' : 'paused'; }
    };
})(window);
