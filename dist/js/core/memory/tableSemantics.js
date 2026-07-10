// --- Memory table semantics owner (V23 canonical owner) ---
// 只负责结构化记忆模板、字段、行和值的纯语义处理；不访问运行时状态、网络或持久化。
(function registerMemoryTableSemantics(app) {
    const core = app.core;
    core.memory = core.memory || {};
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    function createMemoryId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
    function moveArrayItem(list, fromIndex, toIndex) {
        if (!Array.isArray(list) || fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return;
        const [item] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, item);
    }
    function createStarterTemplate() {
        return {
            id: createMemoryId('memory_tpl'),
            name: '基础关系模板',
            description: '可自由改成恋爱、亲友、群像或剧情向结构化记忆。',
            tables: [
                {
                    id: createMemoryId('memory_table'),
                    name: '关系状态',
                    mode: 'keyValue',
                    extractPrompt: '请只更新发生明确变化的字段。优先保持客观、简洁，不要凭空编造没有发生过的设定。',
                    columns: [
                        {
                            id: createMemoryId('memory_field'),
                            key: '当前关系',
                            type: 'enum',
                            options: ['陌生', '朋友', '暧昧', '恋人'],
                            default: '朋友',
                            aiEditable: true,
                            aiHint: '根据对话中双方关系推进情况调整。'
                        },
                        {
                            id: createMemoryId('memory_field'),
                            key: '好感度',
                            type: 'progress',
                            default: 50,
                            min: 0,
                            max: 100,
                            aiEditable: true,
                            aiHint: '根据对话氛围小幅波动，一次变动不宜过大。',
                            conditionalRules: [
                                { op: '<=', value: 20, color: '#ffe7e7' },
                                { op: '>=', value: 80, color: '#e8fff1' }
                            ]
                        },
                        {
                            id: createMemoryId('memory_field'),
                            key: '最近发生的事',
                            type: 'longtext',
                            default: '',
                            aiEditable: true,
                            aiHint: '只记录最近最重要的一件事，简短概括。'
                        },
                        {
                            id: createMemoryId('memory_field'),
                            key: '特别称呼',
                            type: 'text',
                            default: '',
                            aiEditable: true,
                            aiHint: '如果角色开始用新的称呼，可以更新。'
                        }
                    ]
                }
            ]
        };
    }
    function createEmptyFieldDraft() {
        return {
            id: createMemoryId('memory_field'),
            key: '新字段',
            group: '',
            type: 'text',
            default: '',
            options: [],
            min: 0,
            max: 100,
            aiEditable: true,
            aiHint: '',
            displayFormat: '{value}',
            conditionalRules: []
        };
    }
    function createEmptyTableDraft() {
        return {
            id: createMemoryId('memory_table'),
            name: '新表格',
            mode: 'keyValue',
            extractPrompt: '',
            columns: [createEmptyFieldDraft()]
        };
    }
    function normalizeConditionalRule(rule) {
        if (!rule || typeof rule !== 'object') return null;
        const op = typeof rule.op === 'string' ? rule.op : '=';
        const color = typeof rule.color === 'string' ? rule.color : '';
        return { op, value: rule.value, color };
    }
    function normalizeFieldType(type) {
        const normalized = String(type || 'text').toLowerCase();
        const supported = ['text', 'longtext', 'number', 'enum', 'tags', 'progress', 'date', 'boolean'];
        return supported.includes(normalized) ? normalized : 'text';
    }

    function parseOptionText(text) {
        return String(text || '')
            .split(/\r?\n|[,，]/)
            .map(item => item.trim())
            .filter(Boolean);
    }

    function parseConditionalRulesText(text) {
        return String(text || '')
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const [op = '=', value = '', color = ''] = line.split('|').map(item => item.trim());
                return normalizeConditionalRule({
                    op,
                    value: value === '' ? '' : (isNaN(Number(value)) ? value : Number(value)),
                    color
                });
            })
            .filter(Boolean);
    }

    function serializeConditionalRules(rules) {
        return (rules || []).map(rule => `${rule.op || '='}|${rule.value ?? ''}|${rule.color || ''}`).join('\n');
    }

    function getDefaultValueByType(type) {
        switch (type) {
            case 'number':
            case 'progress':
                return 0;
            case 'boolean':
                return false;
            case 'tags':
                return [];
            default:
                return '';
        }
    }

    function clampFieldValue(field, value) {
        let result = value;
        if (typeof field.min === 'number') result = Math.max(field.min, result);
        if (typeof field.max === 'number') result = Math.min(field.max, result);
        return result;
    }

    function normalizeFieldValue(field, rawValue) {
        const type = normalizeFieldType(field && field.type);
        if (rawValue === undefined || rawValue === null) {
            return getDefaultValueByType(type);
        }

        switch (type) {
            case 'number':
            case 'progress': {
                const n = Number(rawValue);
                if (Number.isNaN(n)) return getFieldDefaultValue(field);
                return clampFieldValue(field, n);
            }
            case 'boolean':
                if (typeof rawValue === 'boolean') return rawValue;
                return ['true', '1', 'yes', '是', '开', '开启'].includes(String(rawValue).trim().toLowerCase());
            case 'enum': {
                const value = String(rawValue).trim();
                if (Array.isArray(field.options) && field.options.length > 0 && !field.options.includes(value)) {
                    return field.default !== undefined ? field.default : field.options[0];
                }
                return value;
            }
            case 'tags':
                if (Array.isArray(rawValue)) {
                    return rawValue.map(item => String(item).trim()).filter(Boolean);
                }
                return String(rawValue).split(/[,，、]/).map(item => item.trim()).filter(Boolean);
            case 'date':
                return String(rawValue).trim();
            default:
                return String(rawValue);
        }
    }

    function getFieldDefaultValue(field) {
        if (field && field.default !== undefined) {
            return normalizeFieldValue(field, field.default);
        }
        return getDefaultValueByType(field ? field.type : 'text');
    }

    function normalizeTemplate(rawTemplate, fallbackId) {
        if (!rawTemplate || typeof rawTemplate !== 'object') {
            throw new Error('模板必须是对象');
        }
        const template = {
            id: rawTemplate.id || fallbackId || createMemoryId('memory_tpl'),
            name: (rawTemplate.name || '').trim() || '未命名模板',
            description: typeof rawTemplate.description === 'string' ? rawTemplate.description : '',
            tables: Array.isArray(rawTemplate.tables) ? rawTemplate.tables : []
        };
        if (template.tables.length === 0) template.tables = createStarterTemplate().tables;
        template.tables = template.tables.map((table, tableIndex) => {
            const normalizedTable = {
                id: table.id || createMemoryId('memory_table'),
                name: (table.name || '').trim() || `表格 ${tableIndex + 1}`,
                mode: table.mode === 'rows' ? 'rows' : 'keyValue',
                extractPrompt: typeof table.extractPrompt === 'string' ? table.extractPrompt : '',
                columns: Array.isArray(table.columns) ? table.columns : []
            };
            if (normalizedTable.columns.length === 0) {
                normalizedTable.columns = [{
                    id: createMemoryId('memory_field'),
                    key: '字段1',
                    type: 'text',
                    default: '',
                    aiEditable: true,
                    aiHint: ''
                }];
            }
            normalizedTable.columns = normalizedTable.columns.map((field, fieldIndex) => {
                const type = normalizeFieldType(field.type);
                return {
                    id: field.id || createMemoryId('memory_field'),
                    key: (field.key || '').trim() || `字段${fieldIndex + 1}`,
                    group: typeof field.group === 'string' ? field.group.trim() : '',
                    type,
                    default: field.default !== undefined ? field.default : getDefaultValueByType(type),
                    options: Array.isArray(field.options) ? field.options.map(opt => String(opt)) : [],
                    min: typeof field.min === 'number' ? field.min : (type === 'progress' ? 0 : undefined),
                    max: typeof field.max === 'number' ? field.max : (type === 'progress' ? 100 : undefined),
                    aiEditable: field.aiEditable !== false,
                    aiHint: typeof field.aiHint === 'string' ? field.aiHint : '',
                    displayFormat: typeof field.displayFormat === 'string' ? field.displayFormat : '{value}',
                    conditionalRules: Array.isArray(field.conditionalRules)
                        ? field.conditionalRules.map(normalizeConditionalRule).filter(Boolean)
                        : []
                };
            });
            return normalizedTable;
        });
        return template;
    }

    function isRowsTable(table) {
        return !!table && table.mode === 'rows';
    }

    function createEmptyRow(table) {
        const row = { id: createMemoryId('memory_row'), cells: {} };
        (table.columns || []).forEach(field => {
            row.cells[field.id] = getFieldDefaultValue(field);
        });
        return row;
    }

    function normalizeRowShape(table, rawRow) {
        const row = { id: rawRow && rawRow.id ? rawRow.id : createMemoryId('memory_row'), cells: {} };
        (table.columns || []).forEach(field => {
            const rawValue = rawRow && rawRow.cells && rawRow.cells[field.id] !== undefined
                ? rawRow.cells[field.id]
                : (rawRow && rawRow[field.id] !== undefined ? rawRow[field.id] : undefined);
            row.cells[field.id] = rawValue === undefined ? getFieldDefaultValue(field) : normalizeFieldValue(field, rawValue);
        });
        return row;
    }

    function isSameMemoryValue(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    function buildFieldPath(templateId, tableId, fieldId, rowId = '') {
        return `${templateId}::${tableId}::${rowId || 'single'}::${fieldId}`;
    }

    function getFieldDisplayValue(field, value) {
        const normalized = normalizeFieldValue(field, value);
        const type = normalizeFieldType(field.type);
        if (type === 'tags') return normalized.join(', ');
        if (type === 'boolean') return normalized ? '是' : '否';
        if (type === 'progress') {
            const max = typeof field.max === 'number' ? field.max : 100;
            return `${normalized}/${max}`;
        }
        return String(normalized ?? '');
    }

    function evaluateConditionalColor(field, value) {
        if (!Array.isArray(field.conditionalRules) || field.conditionalRules.length === 0) return '';
        const current = normalizeFieldValue(field, value);
        for (const rule of field.conditionalRules) {
            if (!rule || !rule.color) continue;
            const target = rule.value;
            switch (rule.op) {
                case '>': if (current > target) return rule.color; break;
                case '>=': if (current >= target) return rule.color; break;
                case '<': if (current < target) return rule.color; break;
                case '<=': if (current <= target) return rule.color; break;
                case '!=': if (current !== target) return rule.color; break;
                case 'contains':
                    if (Array.isArray(current) && current.includes(target)) return rule.color;
                    if (String(current).includes(String(target))) return rule.color;
                    break;
                default:
                    if (current === target) return rule.color;
                    break;
            }
        }
        return '';
    }

    function isEmptyMemoryValue(field, value) {
        const normalized = normalizeFieldValue(field, value);
        switch (normalizeFieldType(field.type)) {
            case 'number':
            case 'progress':
                return normalized === 0 || normalized === '' || normalized === null;
            case 'boolean':
                return normalized === false;
            case 'tags':
                return !normalized || normalized.length === 0;
            default:
                return !String(normalized || '').trim();
        }
    }

    function getFieldGroups(fields) {
        const groups = [];
        const order = new Map();
        (fields || []).forEach((field, index) => {
            const groupName = (field.group || '').trim() || '未分组';
            if (!order.has(groupName)) {
                order.set(groupName, groups.length);
                groups.push({ name: groupName, fields: [], ungrouped: !(field.group || '').trim() });
            }
            groups[order.get(groupName)].fields.push({ field, index });
        });
        return groups;
    }

    core.memory.tableSemantics = {
        deepClone,
        createMemoryId,
        moveArrayItem,
        createStarterTemplate,
        createEmptyFieldDraft,
        createEmptyTableDraft,
        normalizeConditionalRule,
        normalizeTemplate,
        normalizeFieldType,
        parseOptionText,
        parseConditionalRulesText,
        serializeConditionalRules,
        getDefaultValueByType,
        getFieldDefaultValue,
        normalizeFieldValue,
        clampFieldValue,
        isRowsTable,
        createEmptyRow,
        normalizeRowShape,
        isSameMemoryValue,
        buildFieldPath,
        getFieldDisplayValue,
        evaluateConditionalColor,
        isEmptyMemoryValue,
        getFieldGroups
    };
})(OwoApp);
