// --- Memory table service owner (V23) ---
// 只负责把 memory table model 绑定到当前运行时 state；不渲染 DOM，不改 chat_ai prompt。
(function registerMemoryTableService(app) {
    const feature = app.features.memoryTable = app.features.memoryTable || {};
    const model = feature.model;

    function ensureMemoryTemplateStore(state) {
        if (!state) return [];
        if (!Array.isArray(state.memoryTableTemplates)) state.memoryTableTemplates = [];
        return state.memoryTableTemplates;
    }

    function getCurrentMemoryTableChat(context) {
        const state = context && context.state;
        const currentChatId = context && context.currentChatId;
        const currentChatType = context && context.currentChatType;
        if (!state || !currentChatId || currentChatType !== 'private') return null;
        const chat = (state.characters || []).find(c => c.id === currentChatId);
        if (chat) model.ensureMemoryTableState(chat);
        return chat || null;
    }

    function getBoundTemplates(state, chat) {
        const templates = ensureMemoryTemplateStore(state);
        model.ensureMemoryTableState(chat);
        return templates.filter(template => chat.memoryTables.boundTemplateIds.includes(template.id));
    }

    function persistTemplateNormalized(state, rawTemplate, normalizeTemplate) {
        const templates = ensureMemoryTemplateStore(state);
        const template = normalizeTemplate(rawTemplate);
        const existingIndex = templates.findIndex(item => item.id === template.id);
        if (existingIndex >= 0) templates.splice(existingIndex, 1, template);
        else templates.push(template);
        return template;
    }

    function bindTemplateToChat(state, chat, templateId) {
        ensureMemoryTemplateStore(state);
        model.ensureMemoryTableState(chat);
        if (!chat.memoryTables.boundTemplateIds.includes(templateId)) {
            chat.memoryTables.boundTemplateIds.push(templateId);
        }
        return chat.memoryTables.boundTemplateIds;
    }

    function unbindTemplateFromChat(chat, templateId) {
        model.ensureMemoryTableState(chat);
        chat.memoryTables.boundTemplateIds = chat.memoryTables.boundTemplateIds.filter(id => id !== templateId);
        return chat.memoryTables.boundTemplateIds;
    }

    feature.service = {
        ensureMemoryTemplateStore,
        getCurrentMemoryTableChat,
        getBoundTemplates,
        persistTemplateNormalized,
        bindTemplateToChat,
        unbindTemplateFromChat
    };
})(OwoApp);
