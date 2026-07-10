// --- Settings shell registry (V22 legacy shell close) ---
// 只保存尚未迁移的 legacy settings.js 实现引用；已迁移入口必须走对应 feature public facade。
// 不写设置业务逻辑，不碰 DOM / storage / API。
(function registerSettingsShell(global) {
    const OwoApp = global.OwoApp;
    const settingsFeature = OwoApp.features.settings;
    const registry = Object.create(null);
    const metaRegistry = Object.create(null);

    const MIGRATED_CANONICAL_API_NAMES = new Set([
        'setupApiSettingsApp',
        'setupWallpaperApp',
        'setupNightModeBindings',
        'setupStatusBarBindings',
        'initCotSettings'
    ]);

    function assertFunction(name, fn) {
        if (typeof fn !== 'function') {
            throw new Error('[settingsShell] ' + name + ' 必须注册为函数');
        }
    }

    function assertNotMigrated(name) {
        if (MIGRATED_CANONICAL_API_NAMES.has(name)) {
            throw new Error('[settingsShell] ' + name + ' 已迁移到 canonical 子模块，禁止再注册为 legacy settings 实现');
        }
    }

    function registerLegacyApi(api, meta = {}) {
        if (!api || typeof api !== 'object') {
            throw new Error('[settingsShell] registerLegacyApi 需要 api 对象');
        }
        Object.keys(api).forEach(name => {
            assertNotMigrated(name);
            const fn = api[name];
            assertFunction(name, fn);
            if (registry[name] && registry[name] !== fn) {
                throw new Error('[settingsShell] ' + name + ' 已注册，禁止第二套 settings 实现');
            }
            registry[name] = fn;
            metaRegistry[name] = {
                state: meta.state || 'legacy-settings-owner',
                owner: meta.owner || 'js/settings.js',
                note: meta.note || 'V22: 只有未迁移 settings API 才允许注册到 legacy shell'
            };
        });
        return listRegisteredApiNames();
    }

    function has(name) {
        return typeof registry[name] === 'function';
    }

    function get(name) {
        if (!has(name)) {
            throw new Error('[settingsShell] 尚未注册 settings API: ' + name);
        }
        return registry[name];
    }

    function call(name, argsLike, thisArg) {
        const fn = get(name);
        return fn.apply(thisArg || global, Array.prototype.slice.call(argsLike || []));
    }

    function getMeta(name) {
        return metaRegistry[name] ? Object.assign({}, metaRegistry[name]) : null;
    }

    function listRegisteredApiNames() {
        return Object.keys(registry).sort();
    }

    function listMigratedCanonicalApiNames() {
        return Array.from(MIGRATED_CANONICAL_API_NAMES).sort();
    }

    function getLegacyApiReport() {
        return listRegisteredApiNames().map(name => ({
            name,
            meta: getMeta(name)
        }));
    }

    settingsFeature.settingsShell = {
        registerLegacyApi,
        has,
        get,
        call,
        getMeta,
        listRegisteredApiNames,
        listMigratedCanonicalApiNames,
        getLegacyApiReport
    };
})(window);
