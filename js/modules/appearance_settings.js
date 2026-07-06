// --- 外观设置 (Appearance Settings) ---
// 整体 UI 切换：论坛、设置、APP 布局、小组件等（聊天列表与聊天详情页保持不变）

const APPEARANCE_STORAGE_KEY = 'ovo_appearance_ui_mode';
const CUSTOM_TUTORIAL_CSS_KEY = 'ovo_custom_tutorial_css';
const CUSTOM_TUTORIAL_CSS_ENABLED_KEY = 'ovo_custom_tutorial_css_enabled';

function getAppearanceMode() {
    try {
        return localStorage.getItem(APPEARANCE_STORAGE_KEY) || 'classic';
    } catch (_) {
        return 'classic';
    }
}

function setAppearanceMode(mode) {
    try {
        localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
    } catch (_) {}
}

function getCustomTutorialCss() {
    try {
        return localStorage.getItem(CUSTOM_TUTORIAL_CSS_KEY) || '';
    } catch (_) {
        return '';
    }
}

function setCustomTutorialCss(css) {
    try {
        localStorage.setItem(CUSTOM_TUTORIAL_CSS_KEY, css);
    } catch (_) {}
}

function isCustomTutorialCssEnabled() {
    try {
        return localStorage.getItem(CUSTOM_TUTORIAL_CSS_ENABLED_KEY) === 'true';
    } catch (_) {
        return false;
    }
}

function setCustomTutorialCssEnabled(enabled) {
    try {
        localStorage.setItem(CUSTOM_TUTORIAL_CSS_ENABLED_KEY, enabled ? 'true' : 'false');
    } catch (_) {}
}

function applyCustomTutorialCss() {
    const styleId = 'ovo-custom-tutorial-style';
    let styleEl = document.getElementById(styleId);
    if (isCustomTutorialCssEnabled()) {
        const css = getCustomTutorialCss();
        if (css.trim()) {
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = css;
        } else if (styleEl) {
            styleEl.remove();
        }
    } else if (styleEl) {
        styleEl.remove();
    }
}

function renderAppearanceSettingsScreen() {
    const screen = document.getElementById('appearance-settings-screen');
    if (!screen) return;

    screen.innerHTML = '';

    const inner = document.createElement('div');
    inner.className = 'appearance-settings-inner';

    const currentMode = getAppearanceMode();

    inner.innerHTML = `
        <header class="app-header">
            <button class="back-btn" data-target="home-screen">‹</button>
            <div class="title-container">
                <h1 class="title">外观设置</h1>
            </div>
            <div class="placeholder"></div>
        </header>
        <main class="content appearance-content">
            <section class="appearance-hub-section">
                <details class="appearance-hub-details" open>
                    <summary>壁纸与背景</summary>
                    <div class="appearance-hub-body">
                        <p>主屏、聊天和通话壁纸直接在这里修改，不再跳转到旧壁纸页。</p>
                        <div id="appearance-wallpaper-mount" class="appearance-inline-mount"></div>
                    </div>
                </details>
                <details class="appearance-hub-details">
                    <summary>主屏自定义</summary>
                    <div class="appearance-hub-body">
                        <p>主屏小组件、图标和布局自定义直接在这里修改。</p>
                        <div id="appearance-customize-mount" class="appearance-inline-mount"></div>
                    </div>
                </details>
                <details class="appearance-hub-details">
                    <summary>白昼 / 夜间模式</summary>
                    <div class="appearance-hub-body">
                        <p>快速切换主屏白昼或夜间显示。更细的状态栏和夜间样式设置保留在下方。</p>
                        <div class="appearance-hub-actions">
                            <button type="button" class="btn btn-secondary" data-appearance-hub="day">白昼模式</button>
                            <button type="button" class="btn btn-secondary" data-appearance-hub="night">夜间模式</button>
                        </div>
                    </div>
                </details>
            </section>
            
            <!-- 教程排版设置区 -->
            <div class="appearance-section">
                <div class="appearance-section-header">
                    <h2 class="appearance-section-title">教程排版</h2>
                    <span class="appearance-section-desc">选择数据管理中教程内容的显示风格</span>
                </div>
                
                <div class="appearance-thumbnail-container">
                    <div class="appearance-thumbnail-item ${currentMode === 'classic' ? 'selected' : ''}" data-mode="classic">
                        <div class="appearance-thumbnail-box">
                            <div class="thumb-screen thumb-classic">
                                <div class="thumb-header"></div>
                                <div class="thumb-card"></div>
                                <div class="thumb-card"></div>
                                <div class="thumb-card"></div>
                            </div>
                            <div class="thumbnail-check-icon">✓</div>
                        </div>
                        <div class="appearance-thumbnail-label">经典</div>
                    </div>
                    <div class="appearance-thumbnail-item ${currentMode === 'modern' ? 'selected' : ''}" data-mode="modern">
                        <div class="appearance-thumbnail-box">
                            <div class="thumb-screen thumb-modern">
                                <div class="thumb-header"></div>
                                <div class="thumb-group">
                                    <div class="thumb-row"></div>
                                    <div class="thumb-row"></div>
                                </div>
                                <div class="thumb-group">
                                    <div class="thumb-row"></div>
                                </div>
                            </div>
                            <div class="thumbnail-check-icon">✓</div>
                        </div>
                        <div class="appearance-thumbnail-label">简约</div>
                    </div>
                    <div class="appearance-thumbnail-item ${currentMode === 'rabbit' ? 'selected' : ''}" data-mode="rabbit">
                        <div class="appearance-thumbnail-box">
                            <div class="thumb-screen thumb-rabbit">
                                <div class="thumb-rabbit-bg"></div>
                                <div class="thumb-header"></div>
                                <div class="thumb-rabbit-card"></div>
                                <div class="thumb-rabbit-card"></div>
                            </div>
                            <div class="thumbnail-check-icon">✓</div>
                        </div>
                        <div class="appearance-thumbnail-label">白兔岛</div>
                    </div>
                </div>
            </div>

            <!-- 自定义 CSS 区 -->
            <div class="appearance-section">
                <div class="appearance-section-header">
                    <h2 class="appearance-section-title">自定义美化</h2>
                    <span class="appearance-section-desc">输入 CSS 代码自定义数据管理内教程内容样式</span>
                </div>
                <div class="custom-css-area">
                    <div class="custom-css-toggle-row">
                        <span class="custom-css-toggle-label">启用自定义 CSS</span>
                        <label class="custom-css-switch">
                            <input type="checkbox" id="custom-tutorial-css-toggle" ${isCustomTutorialCssEnabled() ? 'checked' : ''}>
                            <span class="custom-css-switch-slider"></span>
                        </label>
                    </div>
                    <textarea id="custom-tutorial-css-input" class="custom-css-textarea" placeholder="/* 在此输入自定义 CSS */&#10;&#10;/* 例如修改教程内容背景色: */&#10;#data-management-tutorial-content-area {&#10;  background: #1a1a2e;&#10;  color: #eee;&#10;}" spellcheck="false">${getCustomTutorialCss()}</textarea>
                    <div class="custom-css-btn-row">
                        <button type="button" id="custom-tutorial-css-save" class="custom-css-btn primary">保存并应用</button>
                        <button type="button" id="custom-tutorial-css-reset" class="custom-css-btn neutral">清空</button>
                    </div>
                    <div class="custom-css-hint">
                        <span>💡</span> 自定义 CSS 会叠加在数据管理里的教程内容之上。可用浏览器开发者工具查看元素类名。
                    </div>
                </div>
            </div>
        </main>
    `;

    screen.appendChild(inner);
    embedWallpaperContent(inner.querySelector('#appearance-wallpaper-mount'));
    embedCustomizeContent(inner.querySelector('#appearance-customize-mount'));
    bindAppearanceEvents(inner);
}

function refreshAppearanceModeSelection(root) {
    const currentMode = getAppearanceMode();
    root.querySelectorAll('.appearance-thumbnail-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.mode === currentMode);
    });
}

function embedWallpaperContent(mount) {
    if (!mount) return;
    const legacyWallpaperMain = document.querySelector('#wallpaper-screen main.content');
    if (legacyWallpaperMain && !mount.contains(legacyWallpaperMain)) {
        legacyWallpaperMain.innerHTML = '<div class="dm-empty-note">壁纸设置已合并到外观设置。</div>';
    }
    mount.innerHTML = `
        <div class="wallpaper-section-label">主屏幕壁纸</div>
        <div class="wallpaper-preview" id="wallpaper-preview"><span>当前壁纸预览</span></div>
        <button type="button" id="wallpaper-reset-btn" class="btn btn-secondary" style="margin-bottom: 12px;">重置为默认壁纸</button>
        <input type="file" id="wallpaper-upload" accept="image/*" style="display: none;">
        <label for="wallpaper-upload" class="btn btn-primary">从相册选择新壁纸</label>

        <div class="wallpaper-section-label" style="margin-top:28px;">全局聊天壁纸</div>
        <div class="wallpaper-preview" id="global-chat-wallpaper-preview"><span id="global-chat-wallpaper-preview-text">当前聊天壁纸预览</span></div>
        <div class="wallpaper-music-actions">
            <button type="button" id="global-chat-wallpaper-local-btn" class="btn btn-primary">本地上传</button>
            <button type="button" id="global-chat-wallpaper-url-btn" class="btn btn-secondary">输入 URL</button>
            <button type="button" id="global-chat-wallpaper-reset-btn" class="btn btn-secondary">恢复默认</button>
        </div>
        <div class="music-wallpaper-url-row" id="global-chat-wallpaper-url-row" style="display:none;">
            <input type="text" id="global-chat-wallpaper-url-input" class="form-group" placeholder="输入背景图片链接 (http/https)" style="flex:1;margin:0;">
            <button type="button" id="global-chat-wallpaper-url-apply" class="btn btn-primary btn-small">使用</button>
        </div>
        <input type="file" id="global-chat-wallpaper-file-input" accept="image/*" hidden>

        <div class="wallpaper-section-label" style="margin-top:28px;">全局通话壁纸</div>
        <div class="wallpaper-preview" id="global-call-wallpaper-preview"><span id="global-call-wallpaper-preview-text">当前通话壁纸预览</span></div>
        <div class="wallpaper-music-actions">
            <button type="button" id="global-call-wallpaper-local-btn" class="btn btn-primary">本地上传</button>
            <button type="button" id="global-call-wallpaper-url-btn" class="btn btn-secondary">输入 URL</button>
            <button type="button" id="global-call-wallpaper-reset-btn" class="btn btn-secondary">恢复默认</button>
        </div>
        <div class="music-wallpaper-url-row" id="global-call-wallpaper-url-row" style="display:none;">
            <input type="text" id="global-call-wallpaper-url-input" class="form-group" placeholder="输入背景图片链接 (http/https)" style="flex:1;margin:0;">
            <button type="button" id="global-call-wallpaper-url-apply" class="btn btn-primary btn-small">使用</button>
        </div>
        <input type="file" id="global-call-wallpaper-file-input" accept="image/*" hidden>
    `;
    const appearanceApi = window.OwoApp && window.OwoApp.features && window.OwoApp.features.settings && window.OwoApp.features.settings.appearance && window.OwoApp.features.settings.appearance.publicApi;
    if (appearanceApi && typeof appearanceApi.setupWallpaperApp === 'function') appearanceApi.setupWallpaperApp();
}

function embedCustomizeContent(mount) {
    if (!mount) return;
    const existing = document.getElementById('customize-form');
    if (existing && !mount.contains(existing)) existing.removeAttribute('id');
    mount.innerHTML = '<form id="customize-form"></form>';
    if (typeof setupCustomizeApp === 'function') setupCustomizeApp();
    if (typeof renderCustomizeForm === 'function') renderCustomizeForm();
}

function bindAppearanceEvents(inner) {
    inner.querySelectorAll('[data-appearance-hub]').forEach(button => {
        button.addEventListener('click', async () => {
            const action = button.dataset.appearanceHub;
            if (action === 'day' && typeof applyHomeScreenMode === 'function') {
                await applyHomeScreenMode('day');
                if (typeof showToast === 'function') showToast('已切换白昼模式');
            }
            if (action === 'night' && typeof applyHomeScreenMode === 'function') {
                await applyHomeScreenMode('night');
                if (typeof showToast === 'function') showToast('已切换夜间模式');
            }
        });
    });

    const items = inner.querySelectorAll('.appearance-thumbnail-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            if (!item.dataset.mode) return;
            const container = item.closest('.appearance-thumbnail-container');
            container.querySelectorAll('.appearance-thumbnail-item').forEach(c => c.classList.remove('selected'));
            item.classList.add('selected');
            setAppearanceMode(item.dataset.mode);
            const dataManagementApi = window.OwoApp && window.OwoApp.features && window.OwoApp.features.dataManagement && window.OwoApp.features.dataManagement.publicApi;
            const tutorialMount = document.getElementById('data-management-tutorial-content-area');
            if (dataManagementApi && tutorialMount && typeof dataManagementApi.renderTutorialPanel === 'function') {
                dataManagementApi.renderTutorialPanel(tutorialMount);
            }
        });
    });

    const cssToggle = inner.querySelector('#custom-tutorial-css-toggle');
    const cssTextarea = inner.querySelector('#custom-tutorial-css-input');
    const cssSaveBtn = inner.querySelector('#custom-tutorial-css-save');
    const cssResetBtn = inner.querySelector('#custom-tutorial-css-reset');

    if (cssToggle) {
        cssTextarea.disabled = !cssToggle.checked;
        cssToggle.addEventListener('change', () => {
            const enabled = cssToggle.checked;
            setCustomTutorialCssEnabled(enabled);
            cssTextarea.disabled = !enabled;
            applyCustomTutorialCss();
        });
    }

    if (cssSaveBtn) {
        cssSaveBtn.addEventListener('click', () => {
            setCustomTutorialCss(cssTextarea.value);
            applyCustomTutorialCss();
            if (typeof showToast === 'function') showToast('自定义 CSS 已保存并应用');
        });
    }

    if (cssResetBtn) {
        cssResetBtn.addEventListener('click', () => {
            if (!confirm('确定要清空自定义 CSS 吗？')) return;
            cssTextarea.value = '';
            setCustomTutorialCss('');
            applyCustomTutorialCss();
            if (typeof showToast === 'function') showToast('自定义 CSS 已清空');
        });
    }
}

(function initAppearanceSettings() {
    function applyWhenReady() {
        // v0.2.14: 外观页内容在进入页面时再渲染，避免旧壁纸/自定义表单在 db 加载前重复绑定。
        applyCustomTutorialCss();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyWhenReady);
    } else {
        applyWhenReady();
    }
})();
