// --- Browser haptic adapter owner (V11) ---
// 只封装 navigator.vibrate；业务开关通过依赖注入传入。
(function registerHapticAdapter(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.browser) {
        throw new Error('[hapticAdapter] OwoApp.platform.browser 尚未初始化');
    }

    function getPattern(type) {
        switch (type) {
            case 'light': return 5;
            case 'medium': return 15;
            case 'heavy': return 30;
            case 'success': return [10, 30, 10];
            case 'error': return [50, 30, 50, 30, 50];
            case 'selection': return 10;
            default: return 5;
        }
    }

    function isHapticEnabled(value) {
        // 历史默认是开启；只有显式 false 才关闭。这样既兼容旧数据，也允许用户关掉并持久化。
        return value !== false;
    }

    function createHapticFeedback(options = {}) {
        const isEnabled = typeof options.isEnabled === 'function' ? options.isEnabled : () => true;
        const getNavigator = typeof options.getNavigator === 'function' ? options.getNavigator : () => global.navigator;

        return function triggerHapticFeedback(type = 'light') {
            if (!isEnabled()) return;
            const nav = getNavigator();
            if (!nav || !nav.vibrate) return;

            try {
                nav.vibrate(getPattern(type));
            } catch (e) {
                // 忽略不支持或被禁用的情况
            }
        };
    }

    app.platform.browser.hapticAdapter = {
        getPattern,
        isHapticEnabled,
        createHapticFeedback,
        triggerHapticFeedback: createHapticFeedback()
    };
})(window);
