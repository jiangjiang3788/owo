// --- App screen registry (V34) ---
// 只负责 screen id / init / mount / unmount 生命周期登记与验收；不拆 index.html DOM，不实现具体业务。
(function registerScreenRegistry(global) {
    const app = global.OwoApp;
    if (!app || !app.app) {
        throw new Error('[screenRegistry] OwoApp namespace 尚未初始化');
    }

    const registry = new Map();
    const lifecycleState = {
        activeScreenId: null,
        legacyInitCompleted: false,
        initResults: []
    };

    function normalizeHookSpec(hook) {
        if (!hook) return [];
        if (Array.isArray(hook)) return hook.filter(Boolean);
        return [hook];
    }

    function cloneDefinition(definition) {
        return Object.assign({}, definition, {
            init: normalizeHookSpec(definition.init),
            mount: normalizeHookSpec(definition.mount),
            unmount: normalizeHookSpec(definition.unmount),
            dependencies: Array.isArray(definition.dependencies) ? definition.dependencies.slice() : []
        });
    }

    function resolvePath(path) {
        if (typeof path === 'function') return path;
        if (typeof path !== 'string' || !path.trim()) return null;
        const parts = path.split('.').filter(Boolean);
        let cursor = global;
        for (const part of parts) {
            if (cursor && Object.prototype.hasOwnProperty.call(cursor, part)) {
                cursor = cursor[part];
            } else {
                return null;
            }
        }
        return typeof cursor === 'function' ? cursor : null;
    }

    function callHookSpec(screen, phase, spec, context) {
        const fn = resolvePath(spec);
        if (typeof fn !== 'function') {
            return { screenId: screen.id, phase, hook: String(spec), handled: false, skipped: true, reason: 'missing hook' };
        }
        try {
            const result = fn.call(global, Object.assign({ screenId: screen.id, phase }, context || {}));
            return { screenId: screen.id, phase, hook: String(spec), handled: true, skipped: false, result };
        } catch (error) {
            console.error('[screenRegistry] ' + phase + ' failed for ' + screen.id + ' via ' + spec, error);
            return { screenId: screen.id, phase, hook: String(spec), handled: true, skipped: false, error };
        }
    }

    function runHooks(screen, phase, context) {
        const hooks = normalizeHookSpec(screen[phase]);
        if (!hooks.length) return { screenId: screen.id, phase, handled: false, results: [] };
        const results = hooks.map(spec => callHookSpec(screen, phase, spec, context));
        return {
            screenId: screen.id,
            phase,
            handled: results.some(item => item.handled),
            results
        };
    }

    function registerScreen(definition) {
        if (!definition || !definition.id) {
            throw new Error('[screenRegistry] registerScreen 需要 id');
        }
        const normalized = cloneDefinition(definition);
        const existing = registry.get(normalized.id);
        registry.set(normalized.id, Object.assign({}, existing || {}, normalized));
        return getScreen(normalized.id);
    }

    function registerScreens(definitions) {
        (definitions || []).forEach(registerScreen);
        return listScreens();
    }

    function registerManifest(manifest) {
        if (!manifest || typeof manifest.getScreens !== 'function') {
            throw new Error('[screenRegistry] registerManifest 需要 screenManifest.getScreens()');
        }
        return registerScreens(manifest.getScreens());
    }

    function getScreen(id) {
        const found = registry.get(id);
        return found ? cloneDefinition(found) : null;
    }

    function listScreens() {
        return Array.from(registry.values()).map(cloneDefinition);
    }

    function getCurrentScreenId() {
        if (lifecycleState.activeScreenId) return lifecycleState.activeScreenId;
        const active = global.document && global.document.querySelector
            ? global.document.querySelector('.screen.active')
            : null;
        return active ? active.id : null;
    }

    function setActiveScreenId(id) {
        lifecycleState.activeScreenId = id || null;
        return lifecycleState.activeScreenId;
    }

    function initScreen(id, context) {
        const screen = registry.get(id);
        if (!screen) return { screenId: id, phase: 'init', handled: false, missing: true };
        if (screen.__initialized) return { screenId: id, phase: 'init', handled: false, skipped: true, reason: 'already initialized' };
        const result = runHooks(screen, 'init', context);
        screen.__initialized = true;
        lifecycleState.initResults.push(result);
        return result;
    }

    function initAll(context, options) {
        const onlyWithHooks = !options || options.onlyWithHooks !== false;
        return listScreens()
            .filter(screen => !onlyWithHooks || normalizeHookSpec(screen.init).length)
            .map(screen => initScreen(screen.id, context));
    }

    function mountScreen(id, context) {
        const screen = registry.get(id);
        if (!screen) return { screenId: id, phase: 'mount', handled: false, missing: true };
        return runHooks(screen, 'mount', context);
    }

    function unmountScreen(id, context) {
        const screen = registry.get(id);
        if (!screen) return { screenId: id, phase: 'unmount', handled: false, missing: true };
        return runHooks(screen, 'unmount', context);
    }

    function transitionTo(targetId, context) {
        const previousScreenId = context && context.previousScreenId ? context.previousScreenId : getCurrentScreenId();
        const unmountResult = previousScreenId && previousScreenId !== targetId
            ? unmountScreen(previousScreenId, context)
            : { screenId: previousScreenId, phase: 'unmount', handled: false, skipped: true, reason: 'same screen or no previous screen' };
        setActiveScreenId(targetId);
        const mountResult = mountScreen(targetId, context);
        return {
            from: previousScreenId,
            to: targetId,
            unmount: unmountResult,
            mount: mountResult,
            handledMount: Boolean(mountResult && mountResult.handled)
        };
    }

    function markLegacyInitComplete(note) {
        lifecycleState.legacyInitCompleted = true;
        lifecycleState.legacyInitNote = note || 'legacy main.js init completed';
        return getRoutingReport();
    }

    function getDomScreenIds() {
        if (!global.document || !global.document.querySelectorAll) return [];
        return Array.from(global.document.querySelectorAll('.screen[id]')).map(node => node.id);
    }

    function getRoutingReport() {
        const registered = listScreens();
        const domScreenIds = getDomScreenIds();
        const registeredIds = registered.map(screen => screen.id);
        return {
            version: 'V34',
            registeredCount: registeredIds.length,
            domScreenCount: domScreenIds.length,
            activeScreenId: getCurrentScreenId(),
            legacyInitCompleted: lifecycleState.legacyInitCompleted,
            missingInRegistry: domScreenIds.filter(id => !registry.has(id)),
            missingInDom: registeredIds.filter(id => !domScreenIds.includes(id)),
            screens: registered
        };
    }

    function assertDomScreens(options) {
        const report = getRoutingReport();
        const problems = [];
        if (report.missingInRegistry.length) problems.push('未登记 screen：' + report.missingInRegistry.join(', '));
        if (report.missingInDom.length) problems.push('登记但 DOM 不存在：' + report.missingInDom.join(', '));
        if (problems.length && !(options && options.warnOnly)) {
            throw new Error('[screenRegistry] ' + problems.join('；'));
        }
        if (problems.length) console.warn('[screenRegistry] ' + problems.join('；'));
        return report;
    }

    const publicApi = {
        registerScreen,
        registerScreens,
        registerManifest,
        getScreen,
        listScreens,
        initScreen,
        initAll,
        mountScreen,
        unmountScreen,
        transitionTo,
        getCurrentScreenId,
        setActiveScreenId,
        markLegacyInitComplete,
        getRoutingReport,
        assertDomScreens
    };

    app.app.screenRegistry = publicApi;

    if (app.app.screenManifest && typeof app.app.screenManifest.getScreens === 'function') {
        registerManifest(app.app.screenManifest);
    }
})(window);
