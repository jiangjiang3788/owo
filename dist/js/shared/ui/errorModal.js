// --- Shared error modal UI owner (V11) ---
// 只负责通用错误文案映射和错误弹窗展示。
(function registerErrorModal(global) {
    const app = global.OwoApp;
    if (!app || !app.shared || !app.shared.ui) {
        throw new Error('[errorModal] OwoApp.shared.ui 尚未初始化');
    }

    function getFriendlyErrorMessage(error) {
        if (!error) return '发生了一个未知错误。';
        if (error.name === 'AbortError') return '请求超时了，请检查您的网络或稍后再试。';
        if (error instanceof SyntaxError) return '服务器返回的数据格式不对，建议您重试一次。';

        if (error.response) {
            const status = error.response.status;
            switch (status) {
                case 400: return '请求参数有误 (400)，通常是模型版本不对或发送内容过长。';
                case 401: return 'API密钥无效 (401)，请检查API设置中的Key是否正确。';
                case 403: return '访问被拒绝 (403)，可能是密钥权限不足或账号被封禁。';
                case 404: return 'API地址错误 (404)，找不到请求的接口，请检查Base URL。';
                case 429: return '请求太频繁啦 (429)，触发了速率限制，请稍等一会再试。';
                case 500: return '服务器内部错误 (500)，服务商那边出问题了。';
                case 502: return '网关错误 (502)，服务商网络异常。';
                case 503: return '服务暂时不可用 (503)，服务器可能正在维护或过载。';
                case 504: return '网关超时 (504)，服务器响应太慢了，请检查网络。';
                default: return `服务器返回了一个错误 (状态码: ${status})，请稍后再试。`;
            }
        }

        if (error instanceof TypeError && error.message && error.message.includes('Failed to fetch')) {
            return '无法连接到服务器，请检查您的网络连接或API地址是否正确。';
        }

        return `发生了一个未知错误：${error.message || String(error)}`;
    }

    function showErrorModal(friendlyMessage, fullError) {
        const error = fullError || new Error(String(friendlyMessage || 'Unknown error'));
        const oldModal = document.getElementById('error-modal-overlay');
        if (oldModal) oldModal.remove();

        let logContent = `Error: ${error.name}: ${error.message}\n`;
        if (error.stack) logContent += `\nStack:\n${error.stack}\n`;
        if (error.response) {
            logContent += `\nResponse Status: ${error.response.status}\n`;
        }

        const modalHtml = `
        <div id="error-modal-overlay" class="modal-overlay visible" style="z-index: 30000; align-items: center; justify-content: center; display: flex;">
            <div class="modal-window" style="max-width: 90%; width: 380px; padding: 0; overflow: hidden; display: flex; flex-direction: column; max-height: 85vh; border-radius: 16px; background: #fff; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                <div style="padding: 25px 20px 15px; text-align: center; flex-shrink: 0;">
                    <div style="width: 56px; height: 56px; background: #ffebee; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                        <svg style="width: 32px; height: 32px; color: #d32f2f;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                    <h3 style="margin: 0; color: #333; font-size: 18px; font-weight: 700;">出错了</h3>
                    <p style="margin: 10px 0 0; color: #666; font-size: 15px; line-height: 1.5;">${friendlyMessage}</p>
                </div>
                <div style="flex-grow: 1; overflow-y: auto; padding: 0 20px 10px;">
                    <div class="collapsible-section" style="border: 1px solid #eee; background: #f9f9f9; margin: 0; border-radius: 8px;">
                        <div class="collapsible-header" style="padding: 12px; background: #f5f5f5; border-bottom: 1px solid #eee;" onclick="this.parentElement.classList.toggle('open')">
                            <span style="font-size: 13px; color: #666; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                                <svg style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                查看详细日志
                            </span>
                            <span class="collapsible-arrow" style="color: #999;">▼</span>
                        </div>
                        <div class="collapsible-content" style="padding: 0 12px;">
                            <pre id="error-log-content" style="font-family: 'Menlo', 'Monaco', 'Courier New', monospace; font-size: 11px; color: #444; white-space: pre-wrap; word-break: break-all; margin: 10px 0; background: #fff; padding: 10px; border: 1px solid #eee; border-radius: 4px; max-height: 200px; overflow-y: auto; line-height: 1.4;">${logContent}</pre>
                            <button id="copy-error-btn" class="btn btn-small btn-neutral" style="margin-bottom: 10px; font-size: 12px; padding: 6px 12px; width: 100%; display: flex; justify-content: center; background: #eee; color: #555; border: none;">
                                <svg style="width: 14px; height: 14px; margin-right: 5px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                复制完整日志
                            </button>
                        </div>
                    </div>
                </div>
                <div style="padding: 15px 20px 20px; border-top: none; text-align: center; background: #fff; flex-shrink: 0;">
                    <button class="btn btn-primary" style="width: 100%; border-radius: 12px; font-weight: 600; font-size: 16px; padding: 12px;" onclick="document.getElementById('error-modal-overlay').remove()">知道了</button>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('copy-error-btn').addEventListener('click', function() {
            navigator.clipboard.writeText(logContent).then(() => {
                this.innerHTML = `<svg style="width: 14px; height: 14px; margin-right: 5px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>已复制`;
                this.style.background = '#e8f5e9';
                this.style.color = '#2e7d32';
                setTimeout(() => {
                    this.innerHTML = `<svg style="width: 14px; height: 14px; margin-right: 5px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>复制完整日志`;
                    this.style.background = '#eee';
                    this.style.color = '#555';
                }, 2000);
            });
        });
    }

    function showApiError(error) {
        console.error('API Error:', error);
        const friendlyMessage = getFriendlyErrorMessage(error);
        showErrorModal(friendlyMessage, error);
    }

    app.shared.ui.errorModal = {
        getFriendlyErrorMessage,
        showErrorModal,
        showApiError
    };
    app.shared.ui.getFriendlyErrorMessage = getFriendlyErrorMessage;
    app.shared.ui.showErrorModal = showErrorModal;
    app.shared.ui.showApiError = showApiError;
})(window);
