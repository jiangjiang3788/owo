// --- Memory table view-model helpers (V23) ---
// 只提供列表/展示用 view model 与安全文本格式化；不直接操作 DOM。
(function registerMemoryTableView(app) {
    const feature = app.features.memoryTable = app.features.memoryTable || {};
    const semantics = app.core.memory.tableSemantics;
    const model = feature.model;
    const service = feature.service;

    function getVisibleFieldItems(context) {
        const state = context && context.state;
        const chat = context && context.chat;
        const uiState = context && context.uiState || {};
        const keyword = String(uiState.search || '').trim().toLowerCase();
        const templates = service.getBoundTemplates(state, chat);
        const items = [];
        templates.forEach(template => {
            model.ensureTemplateDataForChat(chat, template);
            template.tables.forEach(table => {
                table.columns.forEach(field => {
                    const value = model.getFieldValue(chat, template.id, table.id, field);
                    const item = {
                        template,
                        table,
                        field,
                        value,
                        locked: model.isFieldLocked(chat, template.id, table.id, field.id),
                        changed: (chat.memoryTables.lastChangedFieldPaths || []).includes(semantics.buildFieldPath(template.id, table.id, field.id))
                    };
                    const haystack = [template.name, template.description, table.name, field.key, semantics.getFieldDisplayValue(field, value)]
                        .join(' ')
                        .toLowerCase();
                    if (!keyword || haystack.includes(keyword)) items.push(item);
                });
            });
        });
        if (uiState.sort === 'name') {
            items.sort((a, b) => a.field.key.localeCompare(b.field.key, 'zh-CN'));
        } else if (uiState.sort === 'changed') {
            items.sort((a, b) => Number(b.changed) - Number(a.changed) || a.field.key.localeCompare(b.field.key, 'zh-CN'));
        } else if (uiState.sort === 'locked') {
            items.sort((a, b) => Number(b.locked) - Number(a.locked) || a.field.key.localeCompare(b.field.key, 'zh-CN'));
        }
        return items;
    }

    function formatDateTime(timestamp) {
        const date = new Date(timestamp);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d} ${hh}:${mm}`;
    }

    function getShortValue(value) {
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'object' && value !== null) return JSON.stringify(value);
        const text = String(value ?? '');
        return text.length > 24 ? `${text.slice(0, 24)}...` : text;
    }

    function escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttribute(text) {
        return escapeHtml(text).replace(/"/g, '&quot;');
    }

    feature.view = {
        getVisibleFieldItems,
        formatDateTime,
        getShortValue,
        escapeHtml,
        escapeAttribute
    };
})(OwoApp);
