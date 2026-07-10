// --- AI config store / task routing owner (v0.3.9) ---
// 只把旧 API 设置归一化成 provider / model route 视图；不渲染 UI，不直接 fetch。
(function registerAiConfigStore(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;
    const providerConfig = ai.providerConfig;

    const TASK_ROUTE_FALLBACKS = Object.freeze({
        conversation: 'apiSettings',
        'memory-event': 'summaryApiSettings',
        'memory-fact': 'summaryApiSettings',
        'memory-family': 'summaryApiSettings',
        'memory-graph': 'summaryApiSettings',
        'memory-persona': 'summaryApiSettings',
        'memory-injection-preview': 'summaryApiSettings',
        background: 'backgroundApiSettings',
        summary: 'summaryApiSettings',
        embedding: 'vectorApiSettings',
        image: 'imageRecognitionApiSettings'
    });

    function asObject(value) { return value && typeof value === 'object' ? value : {}; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function nowIso() { return new Date().toISOString(); }
    function normalizeTask(task) { return String(task || 'conversation').trim() || 'conversation'; }
    function routeKeyForTask(task) { return TASK_ROUTE_FALLBACKS[normalizeTask(task)] || 'apiSettings'; }

    function makeProviderId(sourceKey, settings) {
        const cfg = providerConfig.normalizeProviderSettings(settings || {});
        return [sourceKey || 'main', cfg.provider || 'custom', cfg.url || 'no-url'].join('::');
    }

    function buildProvider(sourceKey, settings, label) {
        const cfg = providerConfig.normalizeProviderSettings(settings || {});
        return {
            id: makeProviderId(sourceKey, cfg),
            sourceKey: sourceKey || 'apiSettings',
            name: label || sourceKey || 'main',
            provider: cfg.provider,
            protocol: cfg.provider === 'gemini' ? 'gemini' : 'openai-compatible',
            endpoint: cfg.url,
            model: cfg.model,
            hasApiKey: !!cfg.key,
            enabled: providerConfig.isProviderConfigured(cfg),
            legacySettingsKey: sourceKey || 'apiSettings'
        };
    }

    function buildProviders(sourceDb) {
        const db = asObject(sourceDb);
        const specs = [
            ['apiSettings', db.apiSettings, '主聊天 API'],
            ['summaryApiSettings', db.summaryApiSettings, '总结/记忆 API'],
            ['backgroundApiSettings', db.backgroundApiSettings, '后台 API'],
            ['vectorApiSettings', db.vectorApiSettings, '向量 API'],
            ['imageRecognitionApiSettings', db.imageRecognitionApiSettings, '识图 API']
        ];
        const providers = [];
        const seen = new Set();
        specs.forEach(([key, settings, label]) => {
            const provider = buildProvider(key, settings || {}, label);
            if (!provider.enabled && key !== 'apiSettings') return;
            if (seen.has(provider.id)) return;
            seen.add(provider.id);
            providers.push(provider);
        });
        return providers;
    }

    function getLegacySettingsForTask(sourceDb, task) {
        const db = asObject(sourceDb);
        const key = routeKeyForTask(task);
        const preferred = db[key];
        if (providerConfig.isProviderConfigured(preferred)) return { settings: preferred, sourceKey: key };
        if (key !== 'apiSettings' && providerConfig.isProviderConfigured(db.apiSettings)) return { settings: db.apiSettings, sourceKey: 'apiSettings' };
        return { settings: preferred || db.apiSettings || {}, sourceKey: key };
    }

    function buildTaskRoutes(sourceDb) {
        const db = asObject(sourceDb);
        const explicitRoutes = asArray(asObject(db.aiConfig).taskRoutes);
        const routes = [];
        Object.keys(TASK_ROUTE_FALLBACKS).forEach(task => {
            const legacy = getLegacySettingsForTask(db, task);
            const cfg = providerConfig.normalizeProviderSettings(legacy.settings || {});
            routes.push({
                task,
                providerId: makeProviderId(legacy.sourceKey, cfg),
                model: cfg.model,
                sourceKey: legacy.sourceKey,
                enabled: providerConfig.isProviderConfigured(cfg),
                costLevel: task.indexOf('persona') !== -1 ? 'high' : task.indexOf('memory') === 0 ? 'low' : 'default'
            });
        });
        explicitRoutes.forEach(route => {
            if (!route || !route.task) return;
            const index = routes.findIndex(item => item.task === route.task);
            const normalized = Object.assign({}, index >= 0 ? routes[index] : {}, route, { task: normalizeTask(route.task) });
            if (index >= 0) routes[index] = normalized;
            else routes.push(normalized);
        });
        return routes;
    }

    function buildAiConfigSnapshot(sourceDb) {
        return {
            version: '0.3.9',
            generatedAt: nowIso(),
            mode: 'legacy-compatible-router',
            providers: buildProviders(sourceDb),
            taskRoutes: buildTaskRoutes(sourceDb),
            policy: {
                systemPromptOwner: 'user-settings',
                providerFetchOwner: 'platform/ai/requestTraceStore',
                externalBrainOrMcp: false
            }
        };
    }

    function resolveTaskRoute(sourceDb, task) {
        const snapshot = buildAiConfigSnapshot(sourceDb);
        const normalizedTask = normalizeTask(task);
        const route = snapshot.taskRoutes.find(item => item.task === normalizedTask)
            || snapshot.taskRoutes.find(item => item.task === 'conversation')
            || { task: normalizedTask, sourceKey: 'apiSettings' };
        const legacy = getLegacySettingsForTask(sourceDb, route.task || normalizedTask);
        const settings = providerConfig.normalizeProviderSettings(legacy.settings || {});
        return {
            task: normalizedTask,
            route,
            settings,
            provider: snapshot.providers.find(item => item.id === route.providerId) || buildProvider(legacy.sourceKey, settings, legacy.sourceKey),
            snapshot
        };
    }

    ai.aiConfigStore = {
        TASK_ROUTE_FALLBACKS,
        buildProviders,
        buildTaskRoutes,
        buildAiConfigSnapshot,
        resolveTaskRoute,
        normalizeTask
    };
})(window);
