// --- platform/browser/notificationAdapter.js ---
// 只连接浏览器通知和 Service Worker，不放业务语义。
(function registerBrowserNotificationAdapter(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.browser) {
        throw new Error('js/app/namespace.js 必须在 platform/browser/notificationAdapter.js 之前加载');
    }

    async function showSystemNotification({ title, body, icon }) {
        if (!('Notification' in global)) return;
        if (Notification.permission !== 'granted') return;
        if (!navigator.serviceWorker) return;

        try {
            const reg = await navigator.serviceWorker.ready;
            if (reg && reg.active) {
                reg.active.postMessage({
                    type: 'SHOW_NOTIFICATION',
                    payload: { title, body: body || '', icon: icon || undefined, tag: 'ovo-message' }
                });
            }
        } catch (e) {
            console.warn('showSystemNotification error:', e);
        }
    }

    app.platform.browser.showSystemNotification = showSystemNotification;
})(window);
