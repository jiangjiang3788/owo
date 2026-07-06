// --- Theme / night-mode / status-bar settings view (V19) ---
// 外观主题相关 UI 绑定；不处理 API provider / chat 逻辑。
(function registerThemeStatusView(global) {
    const OwoApp = global.OwoApp;
    const appearance = OwoApp.features.settings.appearance;
    const runtime = appearance.runtime;

    function parseTimeToMinutes(str) {
        const parts = (str || '00:00').split(':').map(Number);
        return (parts[0] || 0) * 60 + (parts[1] || 0);
    }

    function applyNightMode() {
        const db = runtime.state();
        const settings = db.nightModeSettings || {};
        let shouldBeNight = false;
        if (settings.enabled) {
            if (settings.auto) {
                const now = new Date();
                const current = now.getHours() * 60 + now.getMinutes();
                const start = parseTimeToMinutes(settings.startTime || '22:00');
                const end = parseTimeToMinutes(settings.endTime || '07:00');
                shouldBeNight = start > end ? (current >= start || current < end) : (current >= start && current < end);
            } else {
                shouldBeNight = true;
            }
        }
        document.body.classList.toggle('night-mode-active', shouldBeNight);
        let styleEl = document.getElementById('night-mode-custom-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'night-mode-custom-style';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = shouldBeNight && settings.customCss ? settings.customCss : '';
    }

    function downloadConfig(payload, filename) {
        const adapter = runtime.fileAdapter();
        if (adapter && typeof adapter.downloadJson === 'function') adapter.downloadJson(payload, filename);
    }

    async function readJsonFile(file) {
        const adapter = runtime.fileAdapter();
        const text = adapter && typeof adapter.readTextFile === 'function'
            ? await adapter.readTextFile(file)
            : await file.text();
        return JSON.parse(text);
    }

    function setupNightModeBindings() {
        const db = runtime.state();
        const enabledCb = document.getElementById('night-mode-enabled');
        const autoCb = document.getElementById('night-mode-auto');
        const scheduleDiv = document.getElementById('night-mode-schedule');
        const startInput = document.getElementById('night-mode-start');
        const endInput = document.getElementById('night-mode-end');
        const cssArea = document.getElementById('night-mode-custom-css');

        if (enabledCb) enabledCb.addEventListener('change', async () => {
            if (!db.nightModeSettings) db.nightModeSettings = {};
            db.nightModeSettings.enabled = enabledCb.checked;
            await runtime.save();
            applyNightMode();
            runtime.toast(enabledCb.checked ? '夜间模式已开启' : '夜间模式已关闭');
        });
        if (autoCb) autoCb.addEventListener('change', async () => {
            if (!db.nightModeSettings) db.nightModeSettings = {};
            db.nightModeSettings.auto = autoCb.checked;
            if (scheduleDiv) scheduleDiv.style.display = autoCb.checked ? 'flex' : 'none';
            await runtime.save();
            applyNightMode();
        });
        if (startInput) startInput.addEventListener('change', async () => {
            if (!db.nightModeSettings) db.nightModeSettings = {};
            db.nightModeSettings.startTime = startInput.value;
            await runtime.save();
            applyNightMode();
        });
        if (endInput) endInput.addEventListener('change', async () => {
            if (!db.nightModeSettings) db.nightModeSettings = {};
            db.nightModeSettings.endTime = endInput.value;
            await runtime.save();
            applyNightMode();
        });
        document.getElementById('night-css-apply-btn')?.addEventListener('click', async () => {
            if (!db.nightModeSettings) db.nightModeSettings = {};
            db.nightModeSettings.customCss = cssArea?.value || '';
            await runtime.save();
            applyNightMode();
            runtime.toast('夜间模式 CSS 已应用');
        });
        document.getElementById('night-css-reset-btn')?.addEventListener('click', async () => {
            if (!db.nightModeSettings) db.nightModeSettings = {};
            db.nightModeSettings.customCss = '';
            if (cssArea) cssArea.value = appearance.model.DEFAULT_NIGHT_MODE_CSS || '';
            await runtime.save();
            applyNightMode();
            runtime.toast('夜间模式 CSS 已重置为默认代码');
        });
        document.getElementById('night-mode-export-btn')?.addEventListener('click', () => {
            downloadConfig({ type: 'night-mode-config', settings: db.nightModeSettings || {} }, '夜间模式配置.json');
            runtime.toast('夜间模式配置已导出');
        });
        document.getElementById('night-mode-import-btn')?.addEventListener('click', () => {
            document.getElementById('night-mode-import-file')?.click();
        });
        document.getElementById('night-mode-import-file')?.addEventListener('change', async event => {
            const file = event.target.files[0];
            if (!file) return;
            try {
                const data = await readJsonFile(file);
                if (!data || data.type !== 'night-mode-config' || !data.settings) {
                    runtime.toast('不是有效的夜间模式配置文件');
                    return;
                }
                db.nightModeSettings = data.settings;
                await runtime.save();
                applyNightMode();
                if (typeof global.renderCustomizeForm === 'function') global.renderCustomizeForm();
                runtime.toast('夜间模式配置已导入');
            } catch (_) {
                runtime.toast('文件解析失败');
            }
            event.target.value = '';
        });
    }

    function updateStatusBarPreviewInSettings() {
        const now = new Date();
        const pad = value => String(value).padStart(2, '0');
        const timeEl = document.getElementById('statusbar-preview-time');
        if (timeEl) timeEl.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                const level = Math.floor(battery.level * 100);
                const levelEl = document.getElementById('statusbar-preview-level');
                const fillEl = document.getElementById('statusbar-preview-battery-fill');
                if (levelEl) levelEl.textContent = level + '%';
                if (fillEl) fillEl.setAttribute('width', 18 * battery.level);
            }).catch(() => {});
        }
    }

    function applyHomeStatusBar() {
        const db = runtime.state();
        const phoneScreen = document.querySelector('.phone-screen');
        if (!phoneScreen) return;
        const settings = db.homeStatusBarSettings || {};
        let bar = phoneScreen.querySelector('.home-top-statusbar');
        if (!settings.enabled) {
            if (bar) bar.remove();
            document.body.classList.remove('has-statusbar');
            const styleEl = document.getElementById('home-statusbar-custom-style');
            if (styleEl) styleEl.textContent = '';
            return;
        }
        document.body.classList.add('has-statusbar');
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'home-top-statusbar';
            bar.innerHTML = '<span class="htsb-time"></span><span class="htsb-battery"><svg width="18" height="11" viewBox="0 0 24 12" fill="none"><path d="M1 2.5C1 1.95 1.45 1.5 2 1.5H20C20.55 1.5 21 1.95 21 2.5V9.5C21 10.05 20.55 10.5 20 10.5H2C1.45 10.5 1 10.05 1 9.5V2.5Z" stroke="currentColor" stroke-width="1"/><path d="M22.5 4V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect class="htsb-battery-fill" x="2" y="2.5" width="18" height="7" rx="0.5" fill="currentColor"/></svg><span class="htsb-battery-level">--%</span></span>';
            phoneScreen.insertBefore(bar, phoneScreen.firstChild);
        }
        refreshStatusBarTime(bar);
        refreshStatusBarBattery(bar);
        let styleEl = document.getElementById('home-statusbar-custom-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'home-statusbar-custom-style';
            document.head.appendChild(styleEl);
        }
        let css = '';
        if (settings.containerCss) css += '.home-top-statusbar { ' + settings.containerCss + ' }\n';
        if (settings.timeCss) css += '.home-top-statusbar .htsb-time { ' + settings.timeCss + ' }\n';
        if (settings.batteryCss) css += '.home-top-statusbar .htsb-battery, .home-top-statusbar .htsb-battery-level { ' + settings.batteryCss + ' }\n';
        styleEl.textContent = css;
    }

    function refreshStatusBarTime(scope) {
        const now = new Date();
        const pad = value => String(value).padStart(2, '0');
        const timeEl = scope.querySelector('.htsb-time');
        if (timeEl) timeEl.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
    }

    function refreshStatusBarBattery(scope) {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                const update = () => {
                    const level = Math.floor(battery.level * 100);
                    const levelEl = scope.querySelector('.htsb-battery-level');
                    const fillEl = scope.querySelector('.htsb-battery-fill');
                    if (levelEl) levelEl.textContent = level + '%';
                    if (fillEl) fillEl.setAttribute('width', 18 * battery.level);
                };
                update();
                battery.addEventListener('levelchange', update);
                battery.addEventListener('chargingchange', update);
            }).catch(() => {});
        }
    }

    function setupStatusBarBindings() {
        const db = runtime.state();
        const enabledCb = document.getElementById('home-statusbar-enabled');
        const containerCssArea = document.getElementById('statusbar-container-css');
        const timeCssArea = document.getElementById('statusbar-time-css');
        const batteryCssArea = document.getElementById('statusbar-battery-css');
        updateStatusBarPreviewInSettings();
        if (enabledCb) enabledCb.addEventListener('change', async () => {
            if (!db.homeStatusBarSettings) db.homeStatusBarSettings = {};
            db.homeStatusBarSettings.enabled = enabledCb.checked;
            await runtime.save();
            applyHomeStatusBar();
            runtime.toast(enabledCb.checked ? '顶栏状态栏已开启' : '顶栏状态栏已关闭');
        });
        document.getElementById('statusbar-apply-btn')?.addEventListener('click', async () => {
            if (!db.homeStatusBarSettings) db.homeStatusBarSettings = {};
            db.homeStatusBarSettings.containerCss = containerCssArea?.value || '';
            db.homeStatusBarSettings.timeCss = timeCssArea?.value || '';
            db.homeStatusBarSettings.batteryCss = batteryCssArea?.value || '';
            await runtime.save();
            applyHomeStatusBar();
            runtime.toast('顶栏样式已应用');
        });
        document.getElementById('statusbar-reset-btn')?.addEventListener('click', async () => {
            if (!db.homeStatusBarSettings) db.homeStatusBarSettings = {};
            db.homeStatusBarSettings.containerCss = '';
            db.homeStatusBarSettings.timeCss = '';
            db.homeStatusBarSettings.batteryCss = '';
            if (containerCssArea) containerCssArea.value = '';
            if (timeCssArea) timeCssArea.value = '';
            if (batteryCssArea) batteryCssArea.value = '';
            await runtime.save();
            applyHomeStatusBar();
            runtime.toast('顶栏样式已重置');
        });
        document.getElementById('statusbar-export-btn')?.addEventListener('click', () => {
            downloadConfig({ type: 'home-statusbar-config', settings: db.homeStatusBarSettings || {} }, '顶栏状态栏配置.json');
            runtime.toast('顶栏配置已导出');
        });
        document.getElementById('statusbar-import-btn')?.addEventListener('click', () => document.getElementById('statusbar-import-file')?.click());
        document.getElementById('statusbar-import-file')?.addEventListener('change', async event => {
            const file = event.target.files[0];
            if (!file) return;
            try {
                const data = await readJsonFile(file);
                if (!data || data.type !== 'home-statusbar-config' || !data.settings) {
                    runtime.toast('不是有效的顶栏配置文件');
                    return;
                }
                db.homeStatusBarSettings = data.settings;
                await runtime.save();
                applyHomeStatusBar();
                if (typeof global.renderCustomizeForm === 'function') global.renderCustomizeForm();
                runtime.toast('顶栏配置已导入');
            } catch (_) {
                runtime.toast('文件解析失败');
            }
            event.target.value = '';
        });
    }

    setInterval(() => {
        const bar = document.querySelector('.phone-screen > .home-top-statusbar');
        if (bar) refreshStatusBarTime(bar);
    }, 30000);

    appearance.themeStatusView = {
        setupNightModeBindings,
        applyNightMode,
        parseTimeToMinutes,
        setupStatusBarBindings,
        updateStatusBarPreviewInSettings,
        applyHomeStatusBar
    };
})(window);
