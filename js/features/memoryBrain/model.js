// --- Memory Brain model owner (v0.3.0) ---
// 只把 store/core 状态整理为展示模型，不访问 DOM。
(function registerMemoryBrainModel(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function getCorePublic() {
        return app.core.memoryBrain.publicApi;
    }

    function formatNumber(value) {
        const number = Number(value) || 0;
        return number.toLocaleString('zh-CN');
    }

    function buildLayerCards(snapshot) {
        const layers = getCorePublic().getLayers();
        const counts = {
            raw: snapshot.lastLegacyScan ? snapshot.lastLegacyScan.totals.messages : 0,
            event: snapshot.events.length,
            fact: snapshot.facts.length,
            family: snapshot.families.length,
            graph: snapshot.edges.length,
            model: snapshot.models.length,
            injection: snapshot.injectionPreviews.length
        };
        return layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            goal: layer.goal,
            status: layer.status,
            count: counts[layer.id] || 0,
            countText: formatNumber(counts[layer.id] || 0)
        }));
    }

    function buildReplacementCards(plan) {
        return plan.map((stage, index) => ({
            index: index + 1,
            id: stage.id,
            name: stage.name,
            targetVersion: stage.targetVersion,
            goal: stage.goal,
            oldSystemMode: stage.oldSystemMode,
            brainMode: stage.brainMode
        }));
    }

    function buildDashboard(snapshot, legacyScan, replacementPlan) {
        const settings = snapshot.settings || {};
        const scan = legacyScan || snapshot.lastLegacyScan || null;
        return {
            release: snapshot.release || 'v0.3.0',
            mode: settings.mode || 'shadow',
            currentStageId: settings.currentStageId || 'shadow',
            thresholdText: Math.round((settings.familySimilarityThreshold || 0.7) * 100) + '%',
            familySummaryMinFacts: settings.familySummaryMinFacts || 5,
            processingMode: settings.processingMode || 'balanced',
            legacyBridgeMode: settings.legacyBridgeMode || 'read-only-source',
            layerCards: buildLayerCards(snapshot),
            replacementCards: buildReplacementCards(replacementPlan),
            legacyScan: scan,
            totals: scan ? scan.totals : { messages: 0, journals: 0, vectorEntries: 0, tableCells: 0 }
        };
    }

    feature.model = {
        buildDashboard,
        buildLayerCards,
        buildReplacementCards,
        formatNumber
    };
})(window);
