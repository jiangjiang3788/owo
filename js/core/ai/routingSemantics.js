// --- AI routing semantics owner (v0.9.0 canonical owner) ---
// 只处理 task pattern、候选顺序和能力匹配；不读取配置、不请求网络。
(function registerAiRoutingSemantics(app) {
    app.core = app.core || {};
    app.core.ai = app.core.ai || {};

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function normalizePattern(value) { return String(value || '').trim(); }

    function matchTaskPattern(pattern, taskType) {
        const rule = normalizePattern(pattern);
        const task = normalizePattern(taskType);
        if (!rule || !task) return false;
        if (rule === task || rule === '*') return true;
        if (rule.endsWith('.*')) return task.startsWith(rule.slice(0, -1));
        return false;
    }

    function routeSpecificity(pattern, taskType) {
        const rule = normalizePattern(pattern);
        const task = normalizePattern(taskType);
        if (rule === task) return 3000 + rule.length;
        if (rule.endsWith('.*') && matchTaskPattern(rule, task)) return 2000 + rule.length;
        if (rule === '*') return 1000;
        return -1;
    }

    function selectTaskRoute(routes, taskType) {
        return asArray(routes)
            .map((route, index) => ({ route, index, score: routeSpecificity(route && (route.taskPattern || route.task), taskType) }))
            .filter(item => item.route && item.score >= 0 && item.route.enabled !== false)
            .sort((a, b) => b.score - a.score || a.index - b.index)
            .map(item => item.route)[0] || null;
    }

    function dedupeCandidates(candidates) {
        const output = [];
        const seen = new Set();
        asArray(candidates).forEach(candidate => {
            if (!candidate || candidate.enabled === false) return;
            const key = [candidate.providerId || candidate.sourceKey || '', candidate.model || ''].join('::');
            if (seen.has(key)) return;
            seen.add(key);
            output.push(candidate);
        });
        return output;
    }

    function hasRequiredCapabilities(modelProfile, required) {
        const available = new Set(asArray(modelProfile && modelProfile.capabilities));
        return asArray(required).every(capability => available.has(capability));
    }

    function orderRouteCandidates(candidates, requiredCapabilities) {
        const required = asArray(requiredCapabilities);
        return dedupeCandidates(candidates).map((candidate, index) => ({
            ...candidate,
            fallbackIndex: index,
            capabilityCompatible: !candidate.modelProfile || hasRequiredCapabilities(candidate.modelProfile, required)
        })).sort((a, b) => {
            if (a.capabilityCompatible !== b.capabilityCompatible) return a.capabilityCompatible ? -1 : 1;
            return a.fallbackIndex - b.fallbackIndex;
        });
    }

    app.core.ai.routingSemantics = {
        matchTaskPattern,
        routeSpecificity,
        selectTaskRoute,
        dedupeCandidates,
        hasRequiredCapabilities,
        orderRouteCandidates
    };
})(OwoApp);
