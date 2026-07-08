// --- Memory Brain owner recovery service (v0.6.4) ---
// 一键关闭 Memory Brain 影子候选 / 回退 legacy owner；只记录演练与新脑设置，不改旧表格/日记/向量。
(function registerMemoryBrainOwnerRecoveryService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function api() { return app.platform.memoryBrain.publicApi; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function getState(options) { return (options && options.state) || global.db || {}; }
    function activeChat(options = {}) { const state = getState(options); const chatId = options.chatId || global.currentChatId; const chatType = options.chatType || global.currentChatType; if (chatType === 'group') return asArray(state.groups).find(item => item && item.id === chatId) || null; if (chatType === 'private') return asArray(state.characters).find(item => item && item.id === chatId) || null; return asArray(state.characters).find(item => item && item.id === chatId) || asArray(state.characters)[0] || asArray(state.groups)[0] || null; }
    function resolveLegacyMode(options = {}) { const chat = activeChat(options); const mode = String((chat && chat.memoryMode) || options.activeLegacyMemoryMode || 'table').trim(); return ['journal', 'vector', 'none', 'off'].includes(mode) ? (mode === 'off' ? 'none' : mode) : 'table'; }
    function record(label, data, level) { if (feature.service && typeof feature.service.recordOperation === 'function') return feature.service.recordOperation(label, data || {}, level || 'event'); return null; }
    function getOwnerRecoveryCards(options = {}) { const snapshot = api().getOwnerRecoverySnapshot(options); const core = app.core && app.core.memoryBrain && app.core.memoryBrain.ownerRecoverySemantics; return core && typeof core.compactOwnerRecoveryForList === 'function' ? core.compactOwnerRecoveryForList(snapshot) : snapshot; }
    function runOwnerRecoveryAction(action, options = {}) { const activeLegacyMemoryMode = resolveLegacyMode(options); record('记忆脑一键关闭 / 回退输入', { action, activeLegacyMemoryMode, tableMemoryStillSummarizes: activeLegacyMemoryMode === 'table', formalPromptInjection: false, blockedUntil: 'v0.9' }); const result = api().appendOwnerRecoveryRun({ action, activeLegacyMemoryMode }, options); record('记忆脑一键关闭 / 回退应用结果', { action: result.run && result.run.action, reportId: result.report && result.report.id, shadowInjectionEnabled: result.settings && result.settings.shadowInjectionEnabled !== false, effectiveOwner: result.ownerState && result.ownerState.effectiveOwner, activeLegacyMemoryMode, tableMemoryStillSummarizes: activeLegacyMemoryMode === 'table', formalPromptInjection: false }, 'success'); return result; }
    function rollbackLatestOwnerRecoveryBatch(options = {}) { const result = api().rollbackLatestOwnerRecoveryBatch(options); record('记忆脑一键关闭 / 回退批次回滚', { result, formalPromptInjection: false, writesLegacyMemory: false }, 'success'); return result; }
    feature.ownerRecoveryService = { getOwnerRecoveryCards, runOwnerRecoveryAction, rollbackLatestOwnerRecoveryBatch };
})(window);
