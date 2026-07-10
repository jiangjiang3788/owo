// --- AI config store / task routing owner (v0.9.0) ---
// 将旧 API 设置归一化为 Provider Account、Model Profile 与 Task Route；不渲染 UI，不直接 fetch。
(function registerAiConfigStore(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;
    const providerConfig = ai.providerConfig;
    const taskContracts = OwoApp.core.ai.taskContracts;
    const routingSemantics = OwoApp.core.ai.routingSemantics;

    const LEGACY_PROVIDER_SPECS = Object.freeze([
        ['apiSettings', '主聊天 API'],
        ['summaryApiSettings', '总结/整理 API'],
        ['backgroundApiSettings', '后台 API'],
        ['vectorApiSettings', '向量 API'],
        ['imageRecognitionApiSettings', '识图 API']
    ]);

    const TASK_ROUTE_FALLBACKS = Object.freeze(taskContracts.listDefinitions().reduce((output, definition) => {
        output[definition.id] = definition.legacySettingsKey;
        return output;
    }, {}));

    function asObject(value) { return value && typeof value === 'object' ? value : {}; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function nowIso() { return new Date().toISOString(); }
    function normalizeTask(task) { return taskContracts.normalizeTaskType(task); }
    function routeKeyForTask(task) { return taskContracts.getDefinition(task).legacySettingsKey || 'apiSettings'; }

    function makeProviderId(sourceKey, settings) {
        const cfg = providerConfig.normalizeProviderSettings(settings || {});
        return [sourceKey || 'main', cfg.provider || 'custom', cfg.url || 'no-url'].join('::');
    }

    function makeModelProfileId(sourceKey, settings) {
        const cfg = providerConfig.normalizeProviderSettings(settings || {});
        return [makeProviderId(sourceKey, cfg), cfg.model || 'no-model'].join('::');
    }

    function buildProviderAccount(sourceKey, settings, label) {
        const cfg = providerConfig.normalizeProviderSettings(settings || {});
        return {
            id: makeProviderId(sourceKey, cfg),
            sourceKey: sourceKey || 'apiSettings',
            name: label || sourceKey || 'main',
            providerType: cfg.provider,
            provider: cfg.provider,
            protocol: cfg.provider === 'gemini' ? 'gemini' : 'openai-compatible',
            baseUrl: cfg.url,
            endpoint: cfg.url,
            hasApiKey: !!cfg.key,
            enabled: providerConfig.isProviderConfigured(cfg),
            legacySettingsKey: sourceKey || 'apiSettings'
        };
    }

    function inferProfileCapabilities(sourceKey, settings) {
        const cfg = providerConfig.normalizeProviderSettings(settings || {});
        const capabilities = ['text'];
        if (sourceKey === 'imageRecognitionApiSettings') capabilities.push('vision');
        if (sourceKey === 'vectorApiSettings') capabilities.push('embedding');
        if (sourceKey !== 'vectorApiSettings') capabilities.push('chat', 'streaming');
        if (sourceKey === 'summaryApiSettings' || sourceKey === 'backgroundApiSettings') {
            capabilities.push('summary', 'structured-output', 'classification', 'ranking', 'memory');
        }
        if (/vision|vl|gpt-4o|gemini|claude-3/i.test(cfg.model || '')) capabilities.push('vision');
        return [...new Set(capabilities)];
    }

    function buildModelProfile(sourceKey, settings, label) {
        const cfg = providerConfig.normalizeProviderSettings(settings || {});
        const provider = buildProviderAccount(sourceKey, cfg, label);
        return {
            id: makeModelProfileId(sourceKey, cfg),
            providerAccountId: provider.id,
            providerId: provider.id,
            sourceKey,
            name: `${label || sourceKey || '模型'} · ${cfg.model || '未配置'}`,
            modelName: cfg.model,
            model: cfg.model,
            enabled: provider.enabled,
            capabilities: inferProfileCapabilities(sourceKey, cfg),
            contextTokens: Number(asObject(settings).contextTokens || 0),
            outputTokens: Number(asObject(settings).outputTokens || 0),
            costClass: sourceKey === 'summaryApiSettings' || sourceKey === 'backgroundApiSettings' ? 'low' : 'default',
            speedClass: sourceKey === 'backgroundApiSettings' ? 'fast' : 'default'
        };
    }

    function buildProviders(sourceDb) {
        const root = asObject(sourceDb);
        const providers = [];
        const seen = new Set();
        LEGACY_PROVIDER_SPECS.forEach(([sourceKey, label]) => {
            const account = buildProviderAccount(sourceKey, root[sourceKey] || {}, label);
            if (!account.enabled && sourceKey !== 'apiSettings') return;
            if (seen.has(account.id)) return;
            seen.add(account.id);
            providers.push(account);
        });
        return providers;
    }

    function buildModelProfiles(sourceDb) {
        const root = asObject(sourceDb);
        return LEGACY_PROVIDER_SPECS.map(([sourceKey, label]) => buildModelProfile(sourceKey, root[sourceKey] || {}, label))
            .filter((profile, index) => profile.enabled || index === 0);
    }

    function getLegacySettingsForSource(sourceDb, sourceKey) {
        const root = asObject(sourceDb);
        const preferred = root[sourceKey];
        if (providerConfig.isProviderConfigured(preferred)) return { settings: preferred, sourceKey };
        if (sourceKey !== 'apiSettings' && providerConfig.isProviderConfigured(root.apiSettings)) {
            return { settings: root.apiSettings, sourceKey: 'apiSettings' };
        }
        return { settings: preferred || root.apiSettings || {}, sourceKey };
    }

    function getLegacySettingsForTask(sourceDb, task) {
        return getLegacySettingsForSource(sourceDb, routeKeyForTask(task));
    }

    function normalizeExplicitRoute(route) {
        const source = asObject(route);
        const taskPattern = String(source.taskPattern || source.task || '*').trim() || '*';
        const primarySourceKey = source.primarySourceKey || source.sourceKey || '';
        const fallbackSourceKeys = asArray(source.fallbackSourceKeys || source.fallbacks).filter(Boolean);
        const primaryModelProfileId = source.primaryModelProfileId || source.modelProfileId || '';
        const fallbackModelProfileIds = asArray(source.fallbackModelProfileIds).filter(Boolean);
        return {
            ...source,
            id: source.id || `route:${taskPattern}`,
            taskPattern,
            task: taskPattern,
            primarySourceKey,
            fallbackSourceKeys,
            primaryModelProfileId,
            fallbackModelProfileIds,
            enabled: source.enabled !== false
        };
    }

    function buildDefaultTaskRoutes() {
        return taskContracts.listDefinitions().map(definition => ({
            id: `route:${definition.id}`,
            taskPattern: definition.id,
            task: definition.id,
            primarySourceKey: definition.legacySettingsKey,
            sourceKey: definition.legacySettingsKey,
            fallbackSourceKeys: definition.legacySettingsKey === 'apiSettings' ? [] : ['apiSettings'],
            requiredCapabilities: definition.capabilities.slice(),
            enabled: true,
            costLevel: definition.legacySettingsKey === 'summaryApiSettings' || definition.legacySettingsKey === 'backgroundApiSettings' ? 'low' : 'default'
        }));
    }

    function buildTaskRoutes(sourceDb) {
        const explicitRoutes = asArray(asObject(asObject(sourceDb).aiConfig).taskRoutes).map(normalizeExplicitRoute);
        const routes = buildDefaultTaskRoutes();
        explicitRoutes.forEach(route => {
            const index = routes.findIndex(item => item.taskPattern === route.taskPattern);
            if (index >= 0) routes[index] = { ...routes[index], ...route };
            else routes.push(route);
        });
        return routes;
    }

    function buildRouteCandidates(sourceDb, route, taskType) {
        const definition = taskContracts.getDefinition(taskType);
        const normalizedRoute = normalizeExplicitRoute(route || {});
        const profiles = buildModelProfiles(sourceDb);
        const profileSourceKey = profileId => {
            const profile = profiles.find(item => item.id === profileId);
            return profile && profile.sourceKey;
        };
        const primarySourceKey = profileSourceKey(normalizedRoute.primaryModelProfileId)
            || normalizedRoute.primarySourceKey
            || definition.legacySettingsKey;
        const profileFallbackKeys = normalizedRoute.fallbackModelProfileIds.map(profileSourceKey).filter(Boolean);
        const sourceKeys = [primarySourceKey, ...profileFallbackKeys, ...normalizedRoute.fallbackSourceKeys];
        if (!sourceKeys.includes('apiSettings') && primarySourceKey !== 'apiSettings') sourceKeys.push('apiSettings');
        const candidates = sourceKeys.map(sourceKey => {
            const selected = getLegacySettingsForSource(sourceDb, sourceKey);
            const settings = providerConfig.normalizeProviderSettings(selected.settings || {});
            const account = buildProviderAccount(selected.sourceKey, settings, selected.sourceKey);
            const modelProfile = buildModelProfile(selected.sourceKey, settings, selected.sourceKey);
            return {
                sourceKey: selected.sourceKey,
                providerId: account.id,
                modelProfileId: modelProfile.id,
                provider: account,
                modelProfile,
                model: settings.model,
                settings,
                enabled: providerConfig.isProviderConfigured(settings)
            };
        });
        return routingSemantics.orderRouteCandidates(candidates, normalizedRoute.requiredCapabilities || definition.capabilities);
    }

    function buildAiConfigSnapshot(sourceDb) {
        const providers = buildProviders(sourceDb);
        return {
            version: '0.9.3',
            generatedAt: nowIso(),
            mode: 'task-runtime-compatible',
            providerAccounts: providers,
            providers,
            modelProfiles: buildModelProfiles(sourceDb),
            taskRoutes: buildTaskRoutes(sourceDb),
            policy: {
                taskRuntimeOwner: 'features/aiRuntime',
                providerFetchOwner: 'features/aiRuntime/service',
                apiSecretOwner: 'platform/ai/providerConfig',
                legacySettingsCompatible: true,
                externalBrainOrMcp: false
            }
        };
    }

    function resolveTaskRoute(sourceDb, task) {
        const snapshot = buildAiConfigSnapshot(sourceDb);
        const normalizedTask = normalizeTask(task);
        const definition = taskContracts.getDefinition(normalizedTask);
        const route = routingSemantics.selectTaskRoute(snapshot.taskRoutes, normalizedTask) || normalizeExplicitRoute({
            taskPattern: normalizedTask,
            primarySourceKey: definition.legacySettingsKey,
            fallbackSourceKeys: definition.legacySettingsKey === 'apiSettings' ? [] : ['apiSettings']
        });
        const candidates = buildRouteCandidates(sourceDb, route, normalizedTask);
        const selected = candidates.find(candidate => candidate.enabled) || candidates[0] || {};
        return {
            task: normalizedTask,
            taskType: normalizedTask,
            definition,
            route,
            candidates,
            settings: selected.settings || providerConfig.normalizeProviderSettings({}),
            provider: selected.provider || null,
            modelProfile: selected.modelProfile || null,
            snapshot
        };
    }

    ai.aiConfigStore = {
        LEGACY_PROVIDER_SPECS,
        TASK_ROUTE_FALLBACKS,
        buildProviderAccount,
        buildModelProfile,
        buildProviders,
        buildProviderAccounts: buildProviders,
        buildModelProfiles,
        buildTaskRoutes,
        buildRouteCandidates,
        buildAiConfigSnapshot,
        resolveTaskRoute,
        getLegacySettingsForTask,
        normalizeTask,
        routeKeyForTask,
        makeProviderId,
        makeModelProfileId
    };
})(window);
