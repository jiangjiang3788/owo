// --- Font preset view/service (V20) ---
// 字体预设 UI 继续在 appearance；通用预设 CRUD 统一走 presetEngine。
(function registerFontPresetView(global) {
    const OwoApp = global.OwoApp;
    const appearance = OwoApp.features.settings.appearance;
    const runtime = appearance.runtime;
    const presetEngine = OwoApp.features.settings.presetEngine.publicApi;

    function store() {
        return presetEngine.createStateStore({
            key: 'fontPresets',
            getState: runtime.state,
            options: { wrapData: false }
        });
    }

    function getFontPresets() {
        return store().get();
    }

    async function saveFontPresets(presets) {
        store().replace(presets || []);
        return runtime.save();
    }

    function createFontPreset(name, url, localFontName) {
        return presetEngine.createPreset(name, {
            url: url || '',
            localFontName: localFontName || ''
        }, { wrapData: false });
    }

    function populateFontPresetSelect() {
        const select = document.getElementById('font-preset-select');
        if (!select) return;
        select.textContent = '';
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '— 选择预设 —';
        select.appendChild(empty);
        getFontPresets().forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.name;
            option.textContent = preset.name;
            select.appendChild(option);
        });
    }

    async function saveCurrentFontAsPreset() {
        const db = runtime.state();
        const fontUrlInput = document.getElementById('customize-font-url');
        const urlValue = fontUrlInput ? fontUrlInput.value.trim() : '';
        const currentFont = urlValue || db.fontUrl || '';
        if (!currentFont) return runtime.toast('当前无字体可保存');

        const name = prompt('请输入预设名称（将覆盖同名预设）：');
        const preset = createFontPreset(name, currentFont, db.localFontName || '');
        if (!preset) return;

        store().upsert(preset);
        await runtime.save();
        populateFontPresetSelect();
        runtime.toast('字体预设已保存');
    }

    async function applyFontPreset(name) {
        const db = runtime.state();
        const preset = getFontPresets().find(item => item.name === name);
        if (!preset) return runtime.toast('未找到该预设');

        const fontUrlInput = document.getElementById('customize-font-url');
        const isLocal = preset.url && preset.url.startsWith('data:');
        if (fontUrlInput) fontUrlInput.value = isLocal ? '' : preset.url;

        db.fontUrl = preset.url;
        db.localFontName = preset.localFontName || '';
        await runtime.save();
        if (typeof global.applyGlobalFont === 'function') global.applyGlobalFont(preset.url);

        const nameEl = document.getElementById('local-font-name');
        if (nameEl) {
            if (isLocal && preset.localFontName) {
                nameEl.textContent = '已加载本地字体：' + preset.localFontName;
                nameEl.style.display = 'block';
            } else {
                nameEl.style.display = 'none';
            }
        }
        runtime.toast('已应用字体预设');
    }

    function createButton(text, className, onClick) {
        const button = document.createElement('button');
        button.className = className || 'btn';
        button.style.padding = '6px 8px';
        button.style.borderRadius = '8px';
        button.textContent = text;
        button.onclick = onClick;
        return button;
    }

    function openFontManageModal() {
        const modal = document.getElementById('font-presets-modal');
        const list = document.getElementById('font-presets-list');
        if (!modal || !list) return;

        list.textContent = '';
        const presets = getFontPresets();
        if (!presets.length) {
            const empty = document.createElement('p');
            empty.style.color = '#888';
            empty.style.margin = '6px 0';
            empty.textContent = '暂无预设';
            list.appendChild(empty);
        }

        presets.forEach((preset, idx) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '8px 0';
            row.style.borderBottom = '1px solid #f0f0f0';

            const nameDiv = document.createElement('div');
            nameDiv.style.flex = '1';
            nameDiv.style.whiteSpace = 'nowrap';
            nameDiv.style.overflow = 'hidden';
            nameDiv.style.textOverflow = 'ellipsis';
            nameDiv.textContent = preset.name;
            row.appendChild(nameDiv);

            const buttonWrap = document.createElement('div');
            buttonWrap.style.display = 'flex';
            buttonWrap.style.gap = '6px';
            buttonWrap.appendChild(createButton('应用', 'btn btn-primary', function () {
                applyFontPreset(preset.name);
                modal.style.display = 'none';
            }));
            buttonWrap.appendChild(createButton('重命名', 'btn', async function () {
                const newName = prompt('输入新名称：', preset.name);
                if (!newName) return;
                store().renameAt(idx, newName);
                await runtime.save();
                openFontManageModal();
                populateFontPresetSelect();
            }));
            const deleteButton = createButton('删除', 'btn', async function () {
                if (!confirm('确认删除该预设？')) return;
                store().removeAt(idx);
                await runtime.save();
                openFontManageModal();
                populateFontPresetSelect();
            });
            deleteButton.style.color = '#e53935';
            buttonWrap.appendChild(deleteButton);
            row.appendChild(buttonWrap);
            list.appendChild(row);
        });

        modal.style.display = 'flex';
    }

    appearance.fontPresetView = {
        getFontPresets,
        saveFontPresets,
        populateFontPresetSelect,
        saveCurrentFontAsPreset,
        applyFontPreset,
        openFontManageModal
    };
})(window);
