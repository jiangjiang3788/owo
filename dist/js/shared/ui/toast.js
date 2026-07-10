// --- Shared toast UI owner (V11) ---
// 只负责通用 Toast 展示队列，不包含业务语义。
(function registerToastUi(global) {
    const app = global.OwoApp;
    if (!app || !app.shared || !app.shared.ui) {
        throw new Error('[toast] OwoApp.shared.ui 尚未初始化');
    }

    const notificationQueue = [];
    let isToastVisible = false;

    function processToastQueue() {
        if (isToastVisible || notificationQueue.length === 0) {
            return;
        }

        isToastVisible = true;
        const notification = notificationQueue.shift();

        const toastElement = document.getElementById('toast-notification');
        const avatarEl = toastElement.querySelector('.toast-avatar');
        const nameEl = toastElement.querySelector('.toast-name');
        const messageEl = toastElement.querySelector('.toast-message');

        const isRichNotification = typeof notification === 'object' && notification !== null && notification.name;
        const isMutedSimple = typeof notification === 'object' && notification !== null && notification.muted && notification.text != null;

        if (isRichNotification) {
            toastElement.classList.remove('simple', 'toast-muted');
            avatarEl.style.display = 'block';
            nameEl.style.display = 'block';
            messageEl.style.textAlign = 'left';
            avatarEl.src = notification.avatar || 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
            nameEl.textContent = notification.name;
            messageEl.textContent = notification.message;
        } else if (isMutedSimple) {
            toastElement.classList.add('simple', 'toast-muted');
            avatarEl.style.display = 'none';
            nameEl.style.display = 'none';
            messageEl.style.textAlign = 'center';
            messageEl.textContent = notification.text;
        } else {
            toastElement.classList.add('simple');
            toastElement.classList.remove('toast-muted');
            avatarEl.style.display = 'none';
            nameEl.style.display = 'none';
            messageEl.style.textAlign = 'center';
            messageEl.textContent = typeof notification === 'string' ? notification : (notification && notification.text) || '';
        }

        toastElement.classList.add('show');

        setTimeout(() => {
            toastElement.classList.remove('show', 'toast-muted');
            setTimeout(() => {
                isToastVisible = false;
                processToastQueue();
            }, 500);
        }, 3000);
    }

    function showToast(notification) {
        notificationQueue.push(notification);
        processToastQueue();
    }

    app.shared.ui.toast = {
        showToast,
        processToastQueue
    };
    app.shared.ui.showToast = showToast;
})(window);
