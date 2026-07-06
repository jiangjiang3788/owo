// --- App screen template registry (V36) ---
// 只负责低风险 screen 静态模板登记和 hydration；不写业务逻辑、不接管 screen 切换。
(function registerScreenTemplateRegistry(global) {
    const app = global.OwoApp;
    if (!app || !app.app) {
        throw new Error('[screenTemplateRegistry] OwoApp namespace 尚未初始化');
    }

    const templates = new Map();
    const hydrated = new Set();

    function normalizeHtml(html) {
        return typeof html === 'string' ? html : '';
    }

    function registerTemplate(screenId, html, meta) {
        if (!screenId || typeof screenId !== 'string') {
            throw new Error('[screenTemplateRegistry] registerTemplate 需要 screenId');
        }
        const normalizedHtml = normalizeHtml(html);
        const existing = templates.get(screenId);
        if (existing && existing.html !== normalizedHtml) {
            throw new Error('[screenTemplateRegistry] screen template 重复注册且内容不同：' + screenId);
        }
        templates.set(screenId, {
            screenId,
            html: normalizedHtml,
            owner: meta && meta.owner ? meta.owner : 'unknown',
            version: meta && meta.version ? meta.version : 'V36'
        });
        hydrateTemplate(screenId);
        return getTemplate(screenId);
    }

    function getTemplate(screenId) {
        const entry = templates.get(screenId);
        return entry ? Object.assign({}, entry) : null;
    }

    function getTemplateIds() {
        return Array.from(templates.keys());
    }

    function getPlaceholder(screenId) {
        if (!global.document || !global.document.getElementById) return null;
        return global.document.getElementById(screenId);
    }

    function hydrateTemplate(screenId) {
        const entry = templates.get(screenId);
        const node = getPlaceholder(screenId);
        if (!entry || !node) return false;
        if (node.dataset && node.dataset.templateHydrated === 'true') return true;
        node.innerHTML = entry.html;
        if (node.dataset) {
            node.dataset.templateHydrated = 'true';
            node.dataset.screenTemplate = screenId;
            node.dataset.screenTemplateOwner = entry.owner;
        }
        hydrated.add(screenId);
        return true;
    }

    function hydrateAll() {
        return getTemplateIds().map(id => ({ screenId: id, hydrated: hydrateTemplate(id) }));
    }

    function getHydratedIds() {
        return Array.from(hydrated.values());
    }

    function getRoutingReport() {
        const templateIds = getTemplateIds();
        const pendingPlaceholders = global.document && global.document.querySelectorAll
            ? Array.from(global.document.querySelectorAll('[data-screen-template][data-template-hydrated="pending"]')).map(node => node.id)
            : [];
        return {
            version: 'V36',
            templateCount: templateIds.length,
            templateIds,
            hydratedIds: getHydratedIds(),
            pendingPlaceholders,
            templates: templateIds.map(id => getTemplate(id))
        };
    }

    function assertHydrated(requiredIds, options) {
        hydrateAll();
        const required = Array.isArray(requiredIds) && requiredIds.length ? requiredIds : getTemplateIds();
        const missing = required.filter(id => !hydrated.has(id));
        if (missing.length && !(options && options.warnOnly)) {
            throw new Error('[screenTemplateRegistry] screen template 未 hydrate：' + missing.join(', '));
        }
        if (missing.length) console.warn('[screenTemplateRegistry] screen template 未 hydrate：' + missing.join(', '));
        return getRoutingReport();
    }

    const publicApi = {
        registerTemplate,
        getTemplate,
        getTemplateIds,
        hydrateTemplate,
        hydrateAll,
        getHydratedIds,
        getRoutingReport,
        assertHydrated
    };

    app.app.screenTemplates = publicApi;

    if (global.document) {
        if (global.document.readyState === 'loading') {
            global.document.addEventListener('DOMContentLoaded', hydrateAll, { once: true });
        } else {
            hydrateAll();
        }
    }
})(window);
