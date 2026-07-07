// --- AI model registry owner (v0.3.9) ---
// 负责 task → model/provider 的只读注册视图；不保存密钥，不发起请求。
(function registerAiModelRegistry(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;
    const configStore = ai.aiConfigStore;

    const TASK_CAPABILITIES = Object.freeze({
        conversation: ['chat', 'roleplay'],
        background: ['chat', 'background'],
        summary: ['chat', 'summary'],
        'memory-event': ['chat', 'structured-output', 'memory'],
        'memory-fact': ['chat', 'structured-output', 'memory'],
        'memory-family': ['chat', 'structured-output', 'memory'],
        'memory-graph': ['chat', 'structured-output', 'memory'],
        'memory-persona': ['chat', 'long-context', 'memory'],
        'memory-injection-preview': ['chat', 'retrieval', 'memory'],
        embedding: ['embedding'],
        image: ['vision']
    });

    function asObject(value) { return value && typeof value === 'object' ? value : {}; }
    function getCapabilities(task) { return TASK_CAPABILITIES[configStore.normalizeTask(task)] || ['chat']; }

    function buildRegistry(sourceDb) {
        const snapshot = configStore.buildAiConfigSnapshot(sourceDb);
        const models = snapshot.taskRoutes.map(route => ({
            id: [route.task, route.providerId, route.model || ''].join('::'),
            task: route.task,
            providerId: route.providerId,
            model: route.model,
            sourceKey: route.sourceKey,
            enabled: !!route.enabled,
            costLevel: route.costLevel || 'default',
            capabilities: getCapabilities(route.task)
        }));
        return {
            version: snapshot.version,
            providers: snapshot.providers,
            models,
            taskRoutes: snapshot.taskRoutes,
            policy: snapshot.policy
        };
    }

    function resolve(sourceDb, task) {
        const result = configStore.resolveTaskRoute(sourceDb, task);
        const route = asObject(result.route);
        return Object.assign({}, result, {
            modelCard: {
                id: [result.task, route.providerId, route.model || ''].join('::'),
                task: result.task,
                providerId: route.providerId,
                model: result.settings.model,
                sourceKey: route.sourceKey,
                enabled: !!route.enabled,
                costLevel: route.costLevel || 'default',
                capabilities: getCapabilities(result.task)
            }
        });
    }

    ai.modelRegistry = {
        TASK_CAPABILITIES,
        getCapabilities,
        buildRegistry,
        resolve
    };
})(window);
