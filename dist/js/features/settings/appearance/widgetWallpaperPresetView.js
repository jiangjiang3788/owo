// --- Widget wallpaper preset view/service (V20) ---
// 主屏幕壁纸/小组件方案 UI 继续在 appearance；通用预设 CRUD 统一走 presetEngine。
(function registerWidgetWallpaperPresetView(global) {
    const OwoApp = global.OwoApp;
    const appearance = OwoApp.features.settings.appearance;
    const model = appearance.model;
    const runtime = appearance.runtime;
    const presetEngine = OwoApp.features.settings.presetEngine.publicApi;

    function clone(value, fallback) {
        return model.clone(value, fallback);
    }

    function store() {
        return presetEngine.createStateStore({
            key: 'widgetWallpaperPresets',
            getState: runtime.state,
            options: { wrapData: false }
        });
    }

    function getPresets() {
        return store().get();
    }

    async function savePresets(presets) {
        store().replace(presets || []);
        return runtime.save();
    }

    function createSchemePreset(name, scheme) {
        return presetEngine.createPreset(name, scheme || {}, { wrapData: false });
    }

    function currentCharacter() {
        const db = runtime.state();
        if (typeof global.currentChatId === 'undefined' || !db.characters) return null;
        return db.characters.find(character => character.id === global.currentChatId) || null;
    }

    function captureCurrentScheme() {
        const db = runtime.state();
        let peekCustomIcons = {};
        const char = currentCharacter();
        if (char && char.peekScreenSettings && char.peekScreenSettings.customIcons) {
            peekCustomIcons = clone(char.peekScreenSettings.customIcons, {});
        }
        return {
            wallpaper: db.wallpaper || model.DEFAULT_WALLPAPER_URL,
            homeWidgetSettings: clone(db.homeWidgetSettings, {}),
            homeSignature: db.homeSignature !== undefined ? db.homeSignature : model.DEFAULT_HOME_SIGNATURE,
            insWidgetSettings: clone(db.insWidgetSettings, model.DEFAULT_INS_WIDGET),
            customIcons: clone(db.customIcons, {}),
            customAppNames: clone(db.customAppNames, {}),
            peekCustomIcons
        };
    }

    function populateWidgetWallpaperPresetSelect() {
        const select = document.getElementById('widget-wallpaper-preset-select');
        if (!select) return;
        select.textContent = '';
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '— 选择方案 —';
        select.appendChild(empty);
        getPresets().forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.name;
            option.textContent = preset.name;
            select.appendChild(option);
        });
    }

    async function saveCurrentWidgetWallpaperAsPreset() {
        const scheme = captureCurrentScheme();
        const name = prompt('请输入方案名称（将覆盖同名方案）：');
        if (!name || !name.trim()) return;
        const nextPreset = createSchemePreset(name, scheme);
        if (!nextPreset) return;
        store().upsert(nextPreset);
        await runtime.save();
        populateWidgetWallpaperPresetSelect();
        runtime.toast('方案已保存到预设库');
    }

    async function applyWidgetWallpaperPreset(name) {
        const db = runtime.state();
        const preset = getPresets().find(item => item.name === name);
        if (!preset) return runtime.toast('未找到该方案');
        db.wallpaper = preset.wallpaper || model.DEFAULT_WALLPAPER_URL;
        if (typeof global.applyWallpaper === 'function') global.applyWallpaper(db.wallpaper);
        db.homeWidgetSettings = clone(preset.homeWidgetSettings, {});
        db.homeSignature = preset.homeSignature !== undefined ? preset.homeSignature : model.DEFAULT_HOME_SIGNATURE;
        db.insWidgetSettings = clone(preset.insWidgetSettings, model.DEFAULT_INS_WIDGET);
        if (preset.customIcons && typeof preset.customIcons === 'object') db.customIcons = clone(preset.customIcons, {});
        if (preset.customAppNames && typeof preset.customAppNames === 'object') db.customAppNames = clone(preset.customAppNames, {});

        if (preset.peekCustomIcons && typeof preset.peekCustomIcons === 'object' && Object.keys(preset.peekCustomIcons).length > 0) {
            const char = currentCharacter();
            if (char) {
                if (!char.peekScreenSettings) {
                    char.peekScreenSettings = { wallpaper: '', customIcons: {}, unlockAvatar: '', unlockCommentsEnabled: false, charAwarePeek: false, refreshCounts: {} };
                }
                char.peekScreenSettings.customIcons = clone(preset.peekCustomIcons, {});
            }
        }

        await runtime.save();
        if (typeof global.setupHomeScreen === 'function') global.setupHomeScreen();
        if (typeof global.updatePolaroidImage === 'function' && db.homeWidgetSettings.polaroidImage) {
            global.updatePolaroidImage(db.homeWidgetSettings.polaroidImage);
        }
        const preview = document.getElementById('wallpaper-preview');
        if (preview) {
            preview.style.backgroundImage = 'url(' + db.wallpaper + ')';
            preview.textContent = '';
        }
        if (typeof global.renderCustomizeForm === 'function') global.renderCustomizeForm();
        runtime.toast('已应用方案');
    }

    function createActionButton(text, className, onClick) {
        const button = document.createElement('button');
        button.className = className || 'btn';
        button.style.cssText = 'padding:6px 8px;border-radius:8px;';
        button.textContent = text;
        button.onclick = onClick;
        return button;
    }

    function openWidgetWallpaperManageModal() {
        const modal = document.getElementById('widget-wallpaper-presets-modal');
        const list = document.getElementById('widget-wallpaper-presets-list');
        if (!modal || !list) return;
        list.textContent = '';
        const presets = getPresets();
        if (!presets.length) {
            const empty = document.createElement('p');
            empty.style.cssText = 'color:#888;margin:6px 0;';
            empty.textContent = '暂无方案';
            list.appendChild(empty);
        }
        presets.forEach((preset, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;';
            const nameDiv = document.createElement('div');
            nameDiv.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            nameDiv.textContent = preset.name;
            row.appendChild(nameDiv);
            const wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex;gap:8px;';
            wrap.appendChild(createActionButton('应用', 'btn btn-primary', function () {
                applyWidgetWallpaperPreset(preset.name);
                modal.style.display = 'none';
            }));
            wrap.appendChild(createActionButton('重命名', 'btn', async function () {
                const newName = prompt('输入新名称：', preset.name);
                if (!newName || !newName.trim()) return;
                store().renameAt(idx, newName);
                await runtime.save();
                openWidgetWallpaperManageModal();
                populateWidgetWallpaperPresetSelect();
            }));
            const del = createActionButton('删除', 'btn', async function () {
                if (!confirm('确认删除该方案？')) return;
                store().removeAt(idx);
                await runtime.save();
                openWidgetWallpaperManageModal();
                populateWidgetWallpaperPresetSelect();
            });
            del.style.color = '#e53935';
            wrap.appendChild(del);
            row.appendChild(wrap);
            list.appendChild(row);
        });
        modal.style.display = 'flex';
    }

    function exportWidgetWallpaperScheme() {
        const presets = getPresets();
        const select = document.getElementById('widget-wallpaper-preset-select');
        const chosen = select && select.value;
        let payload;
        if (chosen) {
            const preset = presets.find(item => item.name === chosen);
            if (!preset) return runtime.toast('未找到所选方案');
            const schemeName = prompt('请输入导出方案名称（留空则使用预设名称）：', preset.name);
            if (schemeName === null) return;
            const exportPreset = clone(preset, {});
            if (schemeName.trim()) exportPreset.name = schemeName.trim();
            payload = { type: 'widget-wallpaper-scheme', version: 1, preset: exportPreset };
        } else {
            const current = captureCurrentScheme();
            const schemeName = prompt('请输入导出方案名称（留空则使用默认名称）：', '当前主屏');
            if (schemeName === null) return;
            payload = { type: 'widget-wallpaper-scheme', version: 1, preset: { name: schemeName.trim() || '当前主屏', ...current } };
        }
        const adapter = runtime.fileAdapter();
        if (adapter && typeof adapter.downloadJson === 'function') adapter.downloadJson(payload, (payload.preset.name || '主屏幕预设方案') + '.json');
        runtime.toast('方案已导出');
    }

    async function importWidgetWallpaperScheme(file) {
        if (!file) return;
        try {
            const adapter = runtime.fileAdapter();
            const text = adapter && typeof adapter.readTextFile === 'function'
                ? await adapter.readTextFile(file)
                : await file.text();
            const data = JSON.parse(text);
            if (!data || data.type !== 'widget-wallpaper-scheme' || !data.preset) {
                runtime.toast('不是有效的主屏幕预设方案文件');
                return;
            }
            const preset = data.preset;
            const toAdd = createSchemePreset(preset.name || '导入的方案', { wallpaper: preset.wallpaper, homeWidgetSettings: preset.homeWidgetSettings || {}, homeSignature: preset.homeSignature, insWidgetSettings: preset.insWidgetSettings || {}, customIcons: preset.customIcons || {}, customAppNames: preset.customAppNames || {}, peekCustomIcons: preset.peekCustomIcons || {} });
            if (!toAdd) return runtime.toast('方案名称无效');
            store().upsert(toAdd);
            await runtime.save();
            populateWidgetWallpaperPresetSelect();
            if (confirm('已加入预设库。是否立即应用该方案？')) await applyWidgetWallpaperPreset(toAdd.name);
            else runtime.toast('方案已导入到预设库');
        } catch (error) {
            runtime.toast('导入失败：' + (error.message || '文件格式错误'));
        }
    }

    async function resetWidgetWallpaperToDefault() {
        if (!confirm('确定要恢复默认吗？将清除当前所有主屏幕预设设置（小组件、壁纸、应用图标）。')) return;
        const db = runtime.state();
        db.wallpaper = model.DEFAULT_WALLPAPER_URL;
        if (typeof global.applyWallpaper === 'function') global.applyWallpaper(model.DEFAULT_WALLPAPER_URL);
        db.homeWidgetSettings = clone(global.defaultWidgetSettings, {});
        db.homeSignature = model.DEFAULT_HOME_SIGNATURE;
        db.insWidgetSettings = clone(model.DEFAULT_INS_WIDGET, {});
        db.customIcons = {};
        db.customAppNames = {};
        const char = currentCharacter();
        if (char && char.peekScreenSettings) char.peekScreenSettings.customIcons = {};
        await runtime.save();
        if (typeof global.setupHomeScreen === 'function') global.setupHomeScreen();
        const preview = document.getElementById('wallpaper-preview');
        if (preview) {
            preview.style.backgroundImage = 'url(' + model.DEFAULT_WALLPAPER_URL + ')';
            preview.textContent = '';
        }
        if (typeof global.renderCustomizeForm === 'function') global.renderCustomizeForm();
        runtime.toast('已恢复默认（主屏幕预设）');
    }

    appearance.widgetWallpaperPresetView = {
        getPresets,
        savePresets,
        captureCurrentScheme,
        populateWidgetWallpaperPresetSelect,
        saveCurrentWidgetWallpaperAsPreset,
        applyWidgetWallpaperPreset,
        openWidgetWallpaperManageModal,
        exportWidgetWallpaperScheme,
        importWidgetWallpaperScheme,
        resetWidgetWallpaperToDefault
    };
})(window);
