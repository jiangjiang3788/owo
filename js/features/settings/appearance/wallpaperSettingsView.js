// --- Wallpaper settings view (V19) ---
// 只负责壁纸设置 UI 绑定；不写 API provider / chat 逻辑。
(function registerWallpaperSettingsView(global) {
    const OwoApp = global.OwoApp;
    const appearance = OwoApp.features.settings.appearance;
    const model = appearance.model;
    const runtime = appearance.runtime;

    function setPreviewImage(preview, url) {
        if (!preview) return;
        preview.style.backgroundImage = url ? 'url(' + url + ')' : '';
        preview.textContent = '';
    }

    function refreshOptionalPreview(preview, previewText, url) {
        if (!preview) return;
        if (url) {
            preview.style.backgroundImage = 'url(' + url + ')';
            if (previewText) previewText.style.display = 'none';
        } else {
            preview.style.backgroundImage = '';
            if (previewText) previewText.style.display = '';
        }
    }

    function setupOptionalWallpaperControls(options) {
        const db = runtime.state();
        const preview = document.getElementById(options.previewId);
        const previewText = document.getElementById(options.previewTextId);
        const localBtn = document.getElementById(options.localBtnId);
        const urlBtn = document.getElementById(options.urlBtnId);
        const resetBtn = document.getElementById(options.resetBtnId);
        const urlRow = document.getElementById(options.urlRowId);
        const urlInput = document.getElementById(options.urlInputId);
        const urlApply = document.getElementById(options.urlApplyId);
        const fileInput = document.getElementById(options.fileInputId);

        function refresh() {
            refreshOptionalPreview(preview, previewText, db[options.stateKey] || '');
        }

        refresh();

        if (localBtn && fileInput) {
            localBtn.addEventListener('click', function () { fileInput.click(); });
            fileInput.addEventListener('change', async function () {
                const file = this.files && this.files[0];
                if (!file) return;
                try {
                    db[options.stateKey] = await runtime.compressImage(file, { quality: 0.85, maxWidth: 1080, maxHeight: 1920 });
                    await runtime.save();
                    refresh();
                    runtime.toast(options.updatedMessage);
                } catch (_) {
                    runtime.toast('图片压缩失败');
                }
                this.value = '';
            });
        }

        if (urlBtn) {
            urlBtn.addEventListener('click', function () {
                if (urlRow) urlRow.style.display = urlRow.style.display === 'none' ? 'flex' : 'none';
                if (urlRow && urlRow.style.display === 'flex' && urlInput) urlInput.focus();
            });
        }

        if (urlApply && urlInput) {
            urlApply.addEventListener('click', async function () {
                const url = urlInput.value.trim();
                if (!url) return;
                if (!url.startsWith('http')) {
                    runtime.toast('请输入有效的 http/https 链接');
                    return;
                }
                db[options.stateKey] = url;
                await runtime.save();
                refresh();
                if (urlRow) urlRow.style.display = 'none';
                runtime.toast(options.updatedMessage);
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', async function () {
                db[options.stateKey] = '';
                await runtime.save();
                refresh();
                runtime.toast(options.resetMessage);
            });
        }
    }

    function setupGlobalChatWallpaperInWallpaperScreen() {
        setupOptionalWallpaperControls({
            stateKey: 'globalChatWallpaper',
            previewId: 'global-chat-wallpaper-preview',
            previewTextId: 'global-chat-wallpaper-preview-text',
            localBtnId: 'global-chat-wallpaper-local-btn',
            urlBtnId: 'global-chat-wallpaper-url-btn',
            resetBtnId: 'global-chat-wallpaper-reset-btn',
            urlRowId: 'global-chat-wallpaper-url-row',
            urlInputId: 'global-chat-wallpaper-url-input',
            urlApplyId: 'global-chat-wallpaper-url-apply',
            fileInputId: 'global-chat-wallpaper-file-input',
            updatedMessage: '全局聊天壁纸已更新',
            resetMessage: '已恢复默认全局聊天壁纸'
        });
    }

    function setupGlobalCallWallpaperInWallpaperScreen() {
        setupOptionalWallpaperControls({
            stateKey: 'globalCallWallpaper',
            previewId: 'global-call-wallpaper-preview',
            previewTextId: 'global-call-wallpaper-preview-text',
            localBtnId: 'global-call-wallpaper-local-btn',
            urlBtnId: 'global-call-wallpaper-url-btn',
            resetBtnId: 'global-call-wallpaper-reset-btn',
            urlRowId: 'global-call-wallpaper-url-row',
            urlInputId: 'global-call-wallpaper-url-input',
            urlApplyId: 'global-call-wallpaper-url-apply',
            fileInputId: 'global-call-wallpaper-file-input',
            updatedMessage: '全局通话壁纸已更新',
            resetMessage: '已恢复默认全局通话壁纸'
        });
    }

    function setupWallpaperApp() {
        const db = runtime.state();
        const upload = document.getElementById('wallpaper-upload');
        const preview = document.getElementById('wallpaper-preview');
        setPreviewImage(preview, db.wallpaper);

        const resetBtn = document.getElementById('wallpaper-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', async () => {
                db.wallpaper = model.DEFAULT_WALLPAPER_URL;
                if (typeof global.applyWallpaper === 'function') global.applyWallpaper(model.DEFAULT_WALLPAPER_URL);
                setPreviewImage(preview, model.DEFAULT_WALLPAPER_URL);
                if (upload) upload.value = '';
                await runtime.save();
                runtime.toast('已恢复默认壁纸');
            });
        }

        if (upload) {
            upload.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                try {
                    const dataUrl = await runtime.compressImage(file, { quality: 0.85, maxWidth: 1080, maxHeight: 1920 });
                    db.wallpaper = dataUrl;
                    if (typeof global.applyWallpaper === 'function') global.applyWallpaper(dataUrl);
                    setPreviewImage(preview, dataUrl);
                    await runtime.save();
                    runtime.toast('壁纸已更新');
                } catch (_) {
                    runtime.toast('壁纸压缩失败');
                }
            });
        }

        setupGlobalChatWallpaperInWallpaperScreen();
        setupGlobalCallWallpaperInWallpaperScreen();
    }

    appearance.wallpaperSettingsView = {
        setupWallpaperApp,
        setupGlobalChatWallpaperInWallpaperScreen,
        setupGlobalCallWallpaperInWallpaperScreen
    };
})(window);
