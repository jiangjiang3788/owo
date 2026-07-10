// --- Memory table state/model owner (V23) ---
// 只处理 chat.memoryTables 的状态形状、字段写入、行写入、历史和自动更新游标。
(function registerMemoryTableModel(app) {
    const feature = app.features.memoryTable = app.features.memoryTable || {};
    const semantics = app.core.memory.tableSemantics;
    const DEFAULT_HISTORY_LIMIT = 20;

    function ensureMemoryTableState(chat) {
        if (!chat) return;
        if (!chat.memoryMode) chat.memoryMode = 'journal';
        if (!chat.memoryTables || typeof chat.memoryTables !== 'object') chat.memoryTables = {};
        if (chat.memoryTables.enabled === undefined) chat.memoryTables.enabled = true;
        if (!Array.isArray(chat.memoryTables.boundTemplateIds)) chat.memoryTables.boundTemplateIds = [];
        if (!chat.memoryTables.data || typeof chat.memoryTables.data !== 'object') chat.memoryTables.data = {};
        if (!chat.memoryTables.lockedFields || typeof chat.memoryTables.lockedFields !== 'object') chat.memoryTables.lockedFields = {};
        if (!Array.isArray(chat.memoryTables.history)) chat.memoryTables.history = [];
        if (!Array.isArray(chat.memoryTables.lastChangedFieldPaths)) chat.memoryTables.lastChangedFieldPaths = [];
        if (chat.memoryTables.autoUpdateEnabled === undefined) chat.memoryTables.autoUpdateEnabled = false;
        if (!Number.isFinite(parseInt(chat.memoryTables.autoUpdateInterval, 10))) chat.memoryTables.autoUpdateInterval = 100;
        if (chat.memoryTables.lastUpdateMsgId === undefined) chat.memoryTables.lastUpdateMsgId = null;
        if (chat.memoryTables.lastUpdateMsgTimestamp === undefined) chat.memoryTables.lastUpdateMsgTimestamp = null;
        if (!chat.memoryTables.autoUpdateState) chat.memoryTables.autoUpdateState = 'idle';
        if (chat.memoryTables.autoUpdatePending === undefined) chat.memoryTables.autoUpdatePending = false;
    }

    function ensureTemplateDataForChat(chat, template) {
        ensureMemoryTableState(chat);
        if (!chat.memoryTables.data[template.id] || typeof chat.memoryTables.data[template.id] !== 'object') chat.memoryTables.data[template.id] = {};
        if (!chat.memoryTables.lockedFields[template.id] || typeof chat.memoryTables.lockedFields[template.id] !== 'object') chat.memoryTables.lockedFields[template.id] = {};
        template.tables.forEach(table => {
            if (!chat.memoryTables.data[template.id][table.id] || typeof chat.memoryTables.data[template.id][table.id] !== 'object') {
                chat.memoryTables.data[template.id][table.id] = semantics.isRowsTable(table) ? { __rows: [] } : {};
            }
            if (!Array.isArray(chat.memoryTables.lockedFields[template.id][table.id])) chat.memoryTables.lockedFields[template.id][table.id] = [];
            if (semantics.isRowsTable(table)) {
                const tableData = chat.memoryTables.data[template.id][table.id];
                if (!Array.isArray(tableData.__rows)) {
                    const legacyRow = semantics.normalizeRowShape(table, tableData);
                    const hasLegacyValue = (table.columns || []).some(field => !semantics.isEmptyMemoryValue(field, legacyRow.cells[field.id]));
                    chat.memoryTables.data[template.id][table.id] = { __rows: hasLegacyValue ? [legacyRow] : [] };
                } else {
                    tableData.__rows = tableData.__rows.map(row => semantics.normalizeRowShape(table, row));
                }
                return;
            }
            table.columns.forEach(field => {
                if (chat.memoryTables.data[template.id][table.id][field.id] === undefined) {
                    chat.memoryTables.data[template.id][table.id][field.id] = semantics.getFieldDefaultValue(field);
                }
            });
        });
    }

    function getRows(chat, templateId, table) {
        ensureTemplateDataForChat(chat, { id: templateId, tables: [table] });
        const rows = chat.memoryTables.data?.[templateId]?.[table.id]?.__rows;
        return Array.isArray(rows) ? rows : [];
    }

    function findRowById(chat, templateId, table, rowId) {
        return getRows(chat, templateId, table).find(row => row.id === rowId) || null;
    }

    function getFieldValue(chat, templateId, tableId, field) {
        ensureMemoryTableState(chat);
        const raw = chat.memoryTables.data?.[templateId]?.[tableId]?.[field.id];
        return raw === undefined ? semantics.getFieldDefaultValue(field) : semantics.normalizeFieldValue(field, raw);
    }

    function pushMemoryHistory(chat, changedFields, options = {}) {
        if (!Array.isArray(changedFields) || changedFields.length === 0) return;
        if (!options.skipHistory) {
            chat.memoryTables.history.unshift({
                id: semantics.createMemoryId('memory_history'),
                timestamp: Date.now(),
                source: options.source || 'manual',
                snapshot: semantics.deepClone(chat.memoryTables.data),
                changedFields
            });
            const limit = options.historyLimit || DEFAULT_HISTORY_LIMIT;
            if (chat.memoryTables.history.length > limit) chat.memoryTables.history = chat.memoryTables.history.slice(0, limit);
        }
        chat.memoryTables.lastChangedFieldPaths = changedFields
            .map(item => item.fieldId ? semantics.buildFieldPath(item.templateId, item.tableId, item.fieldId, item.rowId) : '')
            .filter(Boolean);
    }

    function setFieldValue(chat, templateId, tableId, field, value, options = {}) {
        ensureMemoryTableState(chat);
        if (!chat.memoryTables.data[templateId]) chat.memoryTables.data[templateId] = {};
        if (!chat.memoryTables.data[templateId][tableId]) chat.memoryTables.data[templateId][tableId] = {};
        const oldValue = getFieldValue(chat, templateId, tableId, field);
        const normalized = semantics.normalizeFieldValue(field, value);
        chat.memoryTables.data[templateId][tableId][field.id] = normalized;
        if (!semantics.isSameMemoryValue(oldValue, normalized)) {
            pushMemoryHistory(chat, [{ templateId, tableId, fieldId: field.id, label: field.key, oldValue, newValue: normalized }], options);
        }
    }

    function addRow(chat, templateId, table, initialValues = {}, options = {}) {
        const rows = getRows(chat, templateId, table);
        const row = semantics.createEmptyRow(table);
        (table.columns || []).forEach(field => {
            if (initialValues[field.id] !== undefined) row.cells[field.id] = semantics.normalizeFieldValue(field, initialValues[field.id]);
        });
        rows.push(row);
        pushMemoryHistory(chat, (table.columns || []).map(field => ({
            templateId,
            tableId: table.id,
            rowId: row.id,
            fieldId: field.id,
            label: `${table.name} / ${field.key}（新增行）`,
            oldValue: '',
            newValue: row.cells[field.id]
        })), options);
        return row;
    }

    function updateRowFieldValue(chat, templateId, table, rowId, field, value, options = {}) {
        const row = findRowById(chat, templateId, table, rowId);
        if (!row) return false;
        const oldValue = row.cells[field.id];
        const normalized = semantics.normalizeFieldValue(field, value);
        row.cells[field.id] = normalized;
        if (semantics.isSameMemoryValue(oldValue, normalized)) return false;
        pushMemoryHistory(chat, [{ templateId, tableId: table.id, rowId, fieldId: field.id, label: `${table.name} / ${field.key}`, oldValue, newValue: normalized }], options);
        return true;
    }

    function deleteRow(chat, templateId, table, rowId, options = {}) {
        const rows = getRows(chat, templateId, table);
        const index = rows.findIndex(row => row.id === rowId);
        if (index < 0) return false;
        const [removed] = rows.splice(index, 1);
        pushMemoryHistory(chat, (table.columns || []).map(field => ({
            templateId,
            tableId: table.id,
            rowId,
            fieldId: field.id,
            label: `${table.name} / ${field.key}（删除行）`,
            oldValue: removed.cells[field.id],
            newValue: ''
        })), options);
        return true;
    }

    function moveRow(chat, templateId, table, rowId, delta) {
        const rows = getRows(chat, templateId, table);
        const fromIndex = rows.findIndex(row => row.id === rowId);
        const toIndex = fromIndex + delta;
        if (fromIndex < 0 || toIndex < 0 || toIndex >= rows.length) return false;
        semantics.moveArrayItem(rows, fromIndex, toIndex);
        chat.memoryTables.lastChangedFieldPaths = [];
        return true;
    }

    function isFieldLocked(chat, templateId, tableId, fieldId) {
        ensureMemoryTableState(chat);
        return !!(chat.memoryTables.lockedFields?.[templateId]?.[tableId] || []).includes(fieldId);
    }

    function toggleFieldLock(chat, templateId, tableId, fieldId) {
        ensureMemoryTableState(chat);
        if (!chat.memoryTables.lockedFields[templateId]) chat.memoryTables.lockedFields[templateId] = {};
        if (!Array.isArray(chat.memoryTables.lockedFields[templateId][tableId])) chat.memoryTables.lockedFields[templateId][tableId] = [];
        const list = chat.memoryTables.lockedFields[templateId][tableId];
        const index = list.indexOf(fieldId);
        if (index >= 0) list.splice(index, 1);
        else list.push(fieldId);
    }

    function findBestMemoryTableCursorFallback(chat) {
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        if (!history.length || !chat || !chat.memoryTables || !chat.memoryTables.lastUpdateMsgTimestamp) return null;
        for (let index = history.length - 1; index >= 0; index--) {
            const message = history[index];
            if ((message.timestamp || 0) <= chat.memoryTables.lastUpdateMsgTimestamp) return message;
        }
        return null;
    }

    function ensureMemoryTableAutoUpdateState(chat) {
        ensureMemoryTableState(chat);
        const history = Array.isArray(chat.history) ? chat.history : [];
        const memoryTables = chat.memoryTables;
        if (memoryTables.lastUpdateMsgId) {
            const exists = history.some(message => message.id === memoryTables.lastUpdateMsgId);
            if (!exists) {
                const fallback = findBestMemoryTableCursorFallback(chat);
                memoryTables.lastUpdateMsgId = fallback ? fallback.id : null;
                memoryTables.lastUpdateMsgTimestamp = fallback ? (fallback.timestamp || null) : null;
            }
        }
    }

    function getMemoryTableAutoUpdateCursorInfo(chat) {
        ensureMemoryTableAutoUpdateState(chat);
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        const interval = Math.max(10, parseInt(chat?.memoryTables?.autoUpdateInterval, 10) || 100);
        const cursorIndex = chat?.memoryTables?.lastUpdateMsgId ? history.findIndex(message => message.id === chat.memoryTables.lastUpdateMsgId) : -1;
        const nextStartIndex = cursorIndex + 1;
        const unsyncedCount = Math.max(0, history.length - nextStartIndex);
        return { history, interval, cursorIndex, nextStartIndex, unsyncedCount, completedBatchCount: Math.floor(unsyncedCount / interval) };
    }

    function getNextMemoryTableAutoUpdateRange(chat) {
        const info = getMemoryTableAutoUpdateCursorInfo(chat);
        if (info.completedBatchCount <= 0) return null;
        return { start: info.nextStartIndex + 1, end: info.nextStartIndex + info.interval, info };
    }

    function setMemoryTableAutoUpdateCursorByMessage(chat, message) {
        ensureMemoryTableAutoUpdateState(chat);
        chat.memoryTables.lastUpdateMsgId = message ? message.id : null;
        chat.memoryTables.lastUpdateMsgTimestamp = message ? (message.timestamp || null) : null;
        chat.memoryTables.autoUpdateState = 'idle';
    }

    function setMemoryTableAutoUpdateCursorByEndIndex(chat, endIndex) {
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        setMemoryTableAutoUpdateCursorByMessage(chat, history[endIndex - 1] || null);
    }

    function resetMemoryTableAutoUpdateCursorToLatest(chat) {
        const history = Array.isArray(chat && chat.history) ? chat.history : [];
        setMemoryTableAutoUpdateCursorByMessage(chat, history.length ? history[history.length - 1] : null);
        chat.memoryTables.autoUpdatePending = false;
    }

    feature.model = {
        ensureMemoryTableState,
        ensureTemplateDataForChat,
        getRows,
        findRowById,
        getFieldValue,
        pushMemoryHistory,
        setFieldValue,
        addRow,
        updateRowFieldValue,
        deleteRow,
        moveRow,
        isFieldLocked,
        toggleFieldLock,
        findBestMemoryTableCursorFallback,
        ensureMemoryTableAutoUpdateState,
        getMemoryTableAutoUpdateCursorInfo,
        getNextMemoryTableAutoUpdateRange,
        setMemoryTableAutoUpdateCursorByMessage,
        setMemoryTableAutoUpdateCursorByEndIndex,
        resetMemoryTableAutoUpdateCursorToLatest
    };
})(OwoApp);
