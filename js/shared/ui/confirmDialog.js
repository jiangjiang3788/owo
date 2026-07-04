// --- shared/ui/confirmDialog.js ---
// 只放通用确认弹窗展示逻辑，不放业务语义或持久化逻辑。
(function registerSharedConfirmDialog(global) {
    const app = global.OwoApp;
    if (!app || !app.shared || !app.shared.ui) {
        throw new Error('js/app/namespace.js 必须在 shared/ui/confirmDialog.js 之前加载');
    }

    function showAppConfirmDialog(options = {}) {
        const {
            title = '请确认',
            message = '',
            confirmText = '确定',
            cancelText = '取消',
            dismissText = '稍后再说',
            allowBackdropClose = true
        } = options;

        return new Promise((resolve) => {
            let overlay = document.getElementById('app-confirm-dialog');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'app-confirm-dialog';
                overlay.className = 'modal-overlay app-confirm-dialog';
                overlay.innerHTML = `
                    <div class="modal-window app-confirm-dialog-window" role="dialog" aria-modal="true" aria-labelledby="app-confirm-dialog-title">
                        <h3 id="app-confirm-dialog-title" class="app-confirm-dialog-title"></h3>
                        <div class="app-confirm-dialog-message"></div>
                        <div class="app-confirm-dialog-actions">
                            <button type="button" class="app-confirm-dialog-btn secondary" data-action="dismiss"></button>
                            <button type="button" class="app-confirm-dialog-btn ghost" data-action="cancel"></button>
                            <button type="button" class="app-confirm-dialog-btn primary" data-action="confirm"></button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
            }

            const titleEl = overlay.querySelector('.app-confirm-dialog-title');
            const messageEl = overlay.querySelector('.app-confirm-dialog-message');
            const confirmBtn = overlay.querySelector('[data-action="confirm"]');
            const cancelBtn = overlay.querySelector('[data-action="cancel"]');
            const dismissBtn = overlay.querySelector('[data-action="dismiss"]');
            const dialogWindow = overlay.querySelector('.app-confirm-dialog-window');

            titleEl.textContent = title;
            messageEl.textContent = message;
            confirmBtn.textContent = confirmText;
            cancelBtn.textContent = cancelText;
            dismissBtn.textContent = dismissText;
            dismissBtn.style.display = dismissText ? '' : 'none';

            let settled = false;

            const cleanup = () => {
                overlay.classList.remove('visible');
                overlay.removeEventListener('click', handleOverlayClick);
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                dismissBtn.removeEventListener('click', onDismiss);
                document.removeEventListener('keydown', handleKeydown, true);
            };

            const finish = (result) => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(result);
            };

            const handleOverlayClick = (event) => {
                if (event.target === overlay && allowBackdropClose) {
                    finish('dismiss');
                }
            };

            const handleKeydown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    finish(allowBackdropClose ? 'dismiss' : 'cancel');
                }
            };

            const onConfirm = () => finish('confirm');
            const onCancel = () => finish('cancel');
            const onDismiss = () => finish('dismiss');

            overlay.addEventListener('click', handleOverlayClick);
            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
            dismissBtn.addEventListener('click', onDismiss);
            document.addEventListener('keydown', handleKeydown, true);

            overlay.classList.add('visible');
            requestAnimationFrame(() => {
                (confirmBtn || dialogWindow).focus();
            });
        });
    }

    app.shared.ui.showAppConfirmDialog = showAppConfirmDialog;
})(window);
