// --- AI model registry owner (v0.9.0) ---
// 提供 Provider Account / Model Profile / Task Route 的只读注册视图；不保存密钥，不发起请求。
(function registerAiModelRegistry(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;
    const configStore = ai.aiConfigStore;
    const taskContracts = OwoApp.core.ai.taskContracts;

    const TASK_CAPABILITIES = Object.freeze(taskContracts.listDefinitions().reduce((output, definition) => {
        output[definition.id] = definition.capabilities.slice();
        return output;
    }, {}));

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function getCapabilities(task) { return taskContracts.getDefinition(task).capabilities.slice(); }

    function buildRegistry(sourceDb) {
        const snapshot = configStore.buildAiConfigSnapshot(sourceDb);
        return {
            version: snapshot.version,
            providerAccounts: snapshot.providerAccounts,
            providers: snapshot.providers,
            modelProfiles: snapshot.modelProfiles,
            models: snapshot.modelProfiles,
            taskRoutes: snapshot.taskRoutes,
            policy: snapshot.policy
        };
    }

    function resolve(sourceDb, task) {
        const result = configStore.resolveTaskRoute(sourceDb, task);
        const selected = result.candidates.find(candidate => candidate.enabled) || result.candidates[0] || {};
        const fallbackCandidates = result.candidates.filter(candidate => candidate !== selected && candidate.enabled);
        return {
            ...result,
            modelCard: selected.modelProfile || {
                id: configStore.makeModelProfileId(selected.sourceKey || 'apiSettings', result.settings),
                task: result.taskType,
                providerId: selected.providerId || '',
                model: result.settings.model,
                sourceKey: selected.sourceKey || '',
                enabled: !!selected.enabled,
                costLevel: result.route.costLevel || 'default',
                capabilities: getCapabilities(result.taskType)
            },
            fallbackModelCards: fallbackCandidates.map(candidate => candidate.modelProfile).filter(Boolean)
        };
    }

    function supportsTask(modelProfile, taskType) {
        const required = new Set(getCapabilities(taskType));
        const available = new Set(asArray(modelProfile && modelProfile.capabilities));
        return [...required].every(capability => available.has(capability));
    }

    ai.modelRegistry = {
        TASK_CAPABILITIES,
        getCapabilities,
        buildRegistry,
        resolve,
        supportsTask
    };
})(window);
