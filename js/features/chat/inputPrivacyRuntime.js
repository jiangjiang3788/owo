// --- Chat input privacy owner (v0.6.1) ---
// 只负责聊天输入框的浏览器自动填充抑制属性；不处理发送逻辑、不读取消息内容。
(function registerChatInputPrivacy(global) {
    const app = global.OwoApp;
    if (!app) {
        throw new Error('[chatInputPrivacy] OwoApp 尚未初始化');
    }

    const CHAT_INPUT_SELECTORS = ['#message-input', '#private-chat-input', '#forum-dm-input'];
    const BASE_ATTRS = Object.freeze({
        autocomplete: 'new-password',
        autocorrect: 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
        inputmode: 'text',
        enterkeyhint: 'send',
        'aria-autocomplete': 'none',
        'data-lpignore': 'true',
        'data-form-type': 'other',
        'data-1p-ignore': 'true'
    });

    function applyToInput(input, index) {
        if (!input || input.dataset.owoInputPrivacyApplied === 'true') return false;
        Object.keys(BASE_ATTRS).forEach(key => input.setAttribute(key, BASE_ATTRS[key]));
        if (!input.getAttribute('name') || /message|password|card|phone|mail|user/i.test(input.getAttribute('name'))) {
            input.setAttribute('name', `owo_text_entry_${index || 0}_${Date.now().toString(36)}`);
        }
        input.dataset.owoInputPrivacyApplied = 'true';
        return true;
    }

    function applyInputPrivacy(root) {
        const scope = root && root.querySelectorAll ? root : document;
        let count = 0;
        CHAT_INPUT_SELECTORS.forEach((selector, selectorIndex) => {
            scope.querySelectorAll(selector).forEach((input, index) => {
                if (applyToInput(input, selectorIndex * 10 + index)) count += 1;
            });
        });
        return count;
    }

    function observe() {
        if (!document || !document.body || typeof MutationObserver !== 'function') return null;
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                Array.prototype.forEach.call(mutation.addedNodes || [], node => applyInputPrivacy(node));
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return observer;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { applyInputPrivacy(document); observe(); }, { once: true });
    } else {
        applyInputPrivacy(document);
        observe();
    }

    app.features = app.features || {};
    app.features.chat = app.features.chat || {};
    app.features.chat.inputPrivacyRuntime = { applyInputPrivacy, selectors: CHAT_INPUT_SELECTORS.slice() };
})(window);
