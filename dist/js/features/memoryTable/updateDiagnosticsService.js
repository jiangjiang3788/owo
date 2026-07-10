// --- Memory table update diagnostics service (v0.2.3) ---
// 负责把模型返回的 memory_updates XML 转成可复制诊断；不渲染 UI、不发起 AI 请求、不保存数据。
(function registerMemoryTableUpdateDiagnosticsService(app) {
    const feature = app.features.memoryTable = app.features.memoryTable || {};
    const xmlSemantics = app.core.memory.tableUpdateXmlSemantics;

    function toArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function tagNameOf(node) {
        return String((node && (node.localName || node.tagName)) || '').toLowerCase();
    }

    function directChildren(node, tagName) {
        return Array.from((node && node.children) || []).filter(child => tagNameOf(child) === tagName);
    }

    function getTemplates(context) {
        return toArray(context && context.templates);
    }

    function findTemplate(context, templateId) {
        return getTemplates(context).find(item => item && item.id === templateId) || null;
    }

    function findTable(template, tableId) {
        return template ? toArray(template.tables).find(item => item && item.id === tableId) || null : null;
    }

    function findField(table, fieldId) {
        return table ? toArray(table.columns).find(item => item && item.id === fieldId) || null : null;
    }

    function isRowsTable(table) {
        return !!table && table.mode === 'rows';
    }

    function isFieldLocked(context, templateId, tableId, fieldId) {
        const lockedFields = context && context.chat && context.chat.memoryTables && context.chat.memoryTables.lockedFields;
        const list = lockedFields && lockedFields[templateId] && lockedFields[templateId][tableId];
        return Array.isArray(list) && list.includes(fieldId);
    }

    function findRow(context, templateId, tableId, rowId) {
        const data = context && context.chat && context.chat.memoryTables && context.chat.memoryTables.data;
        const rows = data && data[templateId] && data[templateId][tableId] && data[templateId][tableId].__rows;
        return Array.isArray(rows) ? rows.find(row => row && row.id === rowId) || null : null;
    }

    function hasTargetFilter(context) {
        return Array.isArray(context && context.targetTemplateIds) && context.targetTemplateIds.length > 0;
    }

    function isTargetTemplate(context, templateId) {
        if (!hasTargetFilter(context)) return true;
        return context.targetTemplateIds.includes(templateId);
    }

    function validateFieldNode(fieldNode, context, template, table, issues, parentDetail) {
        const templateId = template && template.id;
        const tableId = table && table.id;
        const fieldId = fieldNode.getAttribute('fieldId') || '';
        if (!fieldId) {
            issues.push(xmlSemantics.createWarning('FIELD_ID_MISSING', 'field 节点缺少 fieldId，应用时会被忽略。', parentDetail));
            return false;
        }
        const field = findField(table, fieldId);
        if (!field) {
            issues.push(xmlSemantics.createWarning('FIELD_UNKNOWN', 'fieldId 不存在于目标表格，应用时会被忽略。', Object.assign({}, parentDetail, { fieldId })));
            return false;
        }
        if (field.aiEditable === false) {
            issues.push(xmlSemantics.createWarning('FIELD_NOT_AI_EDITABLE', '字段不允许 AI 编辑，应用时会被忽略。', Object.assign({}, parentDetail, { fieldId, fieldName: field.key })));
            return false;
        }
        if (isFieldLocked(context, templateId, tableId, fieldId)) {
            issues.push(xmlSemantics.createWarning('FIELD_LOCKED', '字段已锁定，应用时会被忽略。', Object.assign({}, parentDetail, { fieldId, fieldName: field.key })));
            return false;
        }
        return true;
    }

    function validateRowNode(rowNode, context, template, table, issues, parentDetail) {
        const op = String(rowNode.getAttribute('op') || 'update').trim().toLowerCase();
        const rowId = rowNode.getAttribute('rowId') || '';
        const detail = Object.assign({}, parentDetail, { op, rowId });
        if (!['add', 'update', 'delete'].includes(op)) {
            issues.push(xmlSemantics.createWarning('ROW_OP_UNKNOWN', 'row op 不是 add/update/delete，应用时会按 update 路径处理或被忽略。', detail));
        }
        if ((op === 'update' || op === 'delete') && !rowId) {
            issues.push(xmlSemantics.createWarning('ROW_ID_MISSING', 'update/delete 行缺少 rowId，应用时会被忽略。', detail));
            return false;
        }
        if ((op === 'update' || op === 'delete') && !findRow(context, template.id, table.id, rowId)) {
            issues.push(xmlSemantics.createWarning('ROW_UNKNOWN', 'rowId 不存在于当前 rows 表，应用时会被忽略。', detail));
            return false;
        }
        if (op === 'delete') return true;
        const fieldNodes = directChildren(rowNode, 'field');
        if (fieldNodes.length === 0) {
            issues.push(xmlSemantics.createWarning('ROW_FIELD_EMPTY', 'row 节点里没有 field 子节点，应用时不会产生变化。', detail));
            return false;
        }
        return fieldNodes.some(fieldNode => validateFieldNode(fieldNode, context, template, table, issues, detail));
    }

    function validateUpdateNode(updateNode, context, issues) {
        const templateId = updateNode.getAttribute('templateId') || '';
        const tableId = updateNode.getAttribute('tableId') || '';
        const detail = { templateId, tableId };
        if (!templateId) {
            issues.push(xmlSemantics.createError('TEMPLATE_ID_MISSING', 'memory_update 缺少 templateId，无法定位模板。', detail));
            return false;
        }
        if (!tableId) {
            issues.push(xmlSemantics.createError('TABLE_ID_MISSING', 'memory_update 缺少 tableId，无法定位表格。', detail));
            return false;
        }
        if (!isTargetTemplate(context, templateId)) {
            issues.push(xmlSemantics.createWarning('TEMPLATE_OUT_OF_TARGET', 'templateId 不在本次目标模板列表内，应用时会被忽略。', detail));
            return false;
        }
        const template = findTemplate(context, templateId);
        if (!template) {
            issues.push(xmlSemantics.createWarning('TEMPLATE_UNKNOWN', 'templateId 不存在于当前模板库，应用时会被忽略。', detail));
            return false;
        }
        const table = findTable(template, tableId);
        if (!table) {
            issues.push(xmlSemantics.createWarning('TABLE_UNKNOWN', 'tableId 不存在于目标模板，应用时会被忽略。', detail));
            return false;
        }

        const fieldNodes = directChildren(updateNode, 'field');
        const rowNodes = directChildren(updateNode, 'row');
        if (isRowsTable(table)) {
            if (fieldNodes.length > 0) {
                issues.push(xmlSemantics.createWarning('ROWS_TABLE_FIELD_NODE', 'rows 表应使用 row 节点，直接 field 节点会被忽略。', detail));
            }
            if (rowNodes.length === 0) {
                issues.push(xmlSemantics.createWarning('ROWS_TABLE_ROW_EMPTY', 'rows 表的 memory_update 里没有 row 节点。', detail));
                return false;
            }
            return rowNodes.some(rowNode => validateRowNode(rowNode, context, template, table, issues, detail));
        }

        if (rowNodes.length > 0) {
            issues.push(xmlSemantics.createWarning('KEY_VALUE_ROW_NODE', 'keyValue 表应使用直接 field 节点，row 节点会被忽略。', detail));
        }
        if (fieldNodes.length === 0) {
            issues.push(xmlSemantics.createWarning('KEY_VALUE_FIELD_EMPTY', 'keyValue 表的 memory_update 里没有直接 field 节点。', detail));
            return false;
        }
        return fieldNodes.some(fieldNode => validateFieldNode(fieldNode, context, template, table, issues, detail));
    }

    function parseMemoryUpdates(rawContent, context = {}) {
        const extraction = xmlSemantics.extractMemoryUpdatesXml(rawContent);
        const issues = [];
        let parsedXml = null;
        let parserError = '';
        let updates = [];
        let validTargetCount = 0;

        if (!extraction.hasExplicitRoot && !extraction.hasUpdateNode) {
            issues.push(xmlSemantics.createError('ROOT_NOT_FOUND', '没有找到 memory_updates 根节点，无法确认模型是否按要求输出 XML。'));
        }

        if (typeof DOMParser === 'undefined') {
            parserError = 'DOMParser unavailable';
        } else {
            try {
                parsedXml = new DOMParser().parseFromString(xmlSemantics.buildWrappedMemoryUpdatesXml(extraction.extractedXml), 'text/xml');
                parserError = xmlSemantics.getParserErrorText(parsedXml);
                if (!parserError) {
                    updates = Array.from(parsedXml.querySelectorAll('memory_update'));
                    validTargetCount = updates.filter(updateNode => validateUpdateNode(updateNode, context, issues)).length;
                    if (updates.length > 0 && validTargetCount === 0) {
                        issues.push(xmlSemantics.createError('NO_VALID_UPDATE_TARGET', '模型返回了 memory_update，但没有任何一条能应用到当前模板/表格/字段。'));
                    }
                }
            } catch (error) {
                parserError = error && error.message ? error.message : String(error || 'XML parse failed');
            }
        }

        const diagnostic = xmlSemantics.createMemoryUpdateDiagnostic({
            ok: !parserError && !issues.some(issue => issue.severity === 'error'),
            source: context.source || 'memory_table',
            stage: parserError ? 'parser' : 'validation',
            parserError,
            extraction,
            issues,
            targetTemplateIds: context.targetTemplateIds,
            updateCount: updates.length,
            validTargetCount
        });
        return {
            ok: diagnostic.ok,
            xmlDoc: parsedXml,
            updates,
            extraction,
            diagnostic
        };
    }

    function shouldRecordDiagnostic(diagnostic, options = {}) {
        if (options.force) return true;
        if (!diagnostic || !diagnostic.ok) return true;
        return toArray(diagnostic.issues).length > 0 || toArray(diagnostic.warnings).length > 0;
    }

    function recordMemoryTableDiagnostic(diagnostic, options = {}) {
        if (!shouldRecordDiagnostic(diagnostic, options)) return null;
        const traceStore = app.platform && app.platform.ai && app.platform.ai.requestTraceStore;
        if (!traceStore || typeof traceStore.recordDiagnostic !== 'function') return null;
        return traceStore.recordDiagnostic({
            status: diagnostic && diagnostic.ok ? 'diagnostic' : 'error',
            label: options.label || (diagnostic && diagnostic.ok ? '表格记忆 XML 诊断' : '表格记忆 XML 解析失败'),
            source: 'features.memoryTable.updateDiagnosticsService',
            endpoint: 'memory-table://update-xml-diagnostic',
            diagnostic,
            requestBody: {
                rawContent: diagnostic && diagnostic.rawContent,
                cleanedContent: diagnostic && diagnostic.cleanedContent,
                extractedXml: diagnostic && diagnostic.extractedXml
            },
            responseJson: { diagnostic },
            errorMessage: diagnostic && diagnostic.ok ? '' : xmlSemantics.summarizeDiagnostic(diagnostic)
        });
    }

    function assertParsedMemoryUpdates(rawContent, context = {}) {
        const result = parseMemoryUpdates(rawContent, context);
        recordMemoryTableDiagnostic(result.diagnostic, { force: !result.ok });
        if (result.ok) return result;
        const error = new Error(xmlSemantics.formatDiagnosticForError(result.diagnostic));
        error.memoryTableDiagnostic = result.diagnostic;
        throw error;
    }

    feature.updateDiagnosticsService = {
        parseMemoryUpdates,
        assertParsedMemoryUpdates,
        recordMemoryTableDiagnostic
    };
})(OwoApp);
