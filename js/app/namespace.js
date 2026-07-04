// --- OwoApp namespace bootstrap ---
// V1 架构过渡期使用的唯一新命名空间。
// 当前项目仍是 script 顺序加载，不在第一版强行引入 ESM/import。
(function bootstrapOwoNamespace(global) {
    const app = global.OwoApp || {};

    app.app = app.app || {};
    app.core = app.core || {};
    app.features = app.features || {};
    app.platform = app.platform || {};
    app.shared = app.shared || {};
    app.compat = app.compat || {};

    app.shared.utils = app.shared.utils || {};
    app.shared.ui = app.shared.ui || {};

    app.compat.registry = app.compat.registry || {};

    /**
     * 登记旧全局 API 的 canonical owner。
     * 注意：这里不实现业务，只记录所有权，帮助避免两套路径。
     */
    app.compat.register = function registerCompatSymbol(name, meta) {
        if (!name || !meta || !meta.owner) {
            throw new Error('[OwoApp.compat] register 需要 name 和 meta.owner');
        }
        app.compat.registry[name] = {
            state: meta.state || 'legacy-owner',
            owner: meta.owner,
            legacy: meta.legacy || ('window.' + name),
            note: meta.note || ''
        };
    };

    /**
     * 暴露旧 window API。
     * 规则：只能暴露 canonical 实现，不允许在这里写业务逻辑。
     */
    app.compat.expose = function exposeLegacySymbol(name, fn, meta) {
        if (typeof fn !== 'function') {
            throw new Error('[OwoApp.compat] ' + name + ' 的 canonical 实现必须是函数');
        }
        app.compat.register(name, Object.assign({ legacy: 'window.' + name }, meta || {}));
        global[name] = fn;
        return fn;
    };

    global.OwoApp = app;
})(window);
