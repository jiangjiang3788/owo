// --- Memory table update XML semantics owner (v0.2.3) ---
// 只负责模型返回文本的清洗、XML 片段提取和诊断对象归一化；不访问运行时状态、网络或持久化。
(function registerMemoryTableUpdateXmlSemantics(app) {
    const core = app.core;
    core.memory = core.memory || {};

    const ROOT_TAG = 'memory_updates';

    function asText(value) {
        if (value === undefined || value === null) return '';
        return String(value);
    }

    function normalizeLineEndings(text) {
        return asText(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
    }

    function createIssue(code, message, severity = 'warning', detail = {}) {
        return {
            code: asText(code || 'UNKNOWN'),
            severity: severity === 'error' ? 'error' : 'warning',
            message: asText(message || ''),
            detail: detail && typeof detail === 'object' ? detail : {}
        };
    }

    function createWarning(code, message, detail = {}) {
        return createIssue(code, message, 'warning', detail);
    }

    function createError(code, message, detail = {}) {
        return createIssue(code, message, 'error', detail);
    }

    function extractFirstCodeFence(text) {
        const source = normalizeLineEndings(text);
        const fenceRe = /```(?:xml|html|text)?\s*\n([\s\S]*?)\n```/i;
        const match = source.match(fenceRe);
        if (!match) return null;
        return {
            content: normalizeLineEndings(match[1]),
            languageHint: (match[0].match(/^```([^\n]*)/) || [])[1] || ''
        };
    }

    function stripHtmlShell(text) {
        return normalizeLineEndings(text)
            .replace(/^<pre[^>]*>/i, '')
            .replace(/<\/pre>$/i, '')
            .replace(/^<code[^>]*>/i, '')
            .replace(/<\/code>$/i, '')
            .trim();
    }

    function findTaggedBlock(text, tagName) {
        const source = asText(text);
        const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const openRe = new RegExp('<\\s*' + escaped + '\\b[^>]*>', 'i');
        const openMatch = openRe.exec(source);
        if (!openMatch) return null;
        const closeRe = new RegExp('<\\/\\s*' + escaped + '\\s*>', 'i');
        const afterOpen = source.slice(openMatch.index + openMatch[0].length);
        const closeMatch = closeRe.exec(afterOpen);
        if (!closeMatch) {
            return {
                block: source.slice(openMatch.index),
                start: openMatch.index,
                end: source.length,
                complete: false
            };
        }
        const end = openMatch.index + openMatch[0].length + closeMatch.index + closeMatch[0].length;
        return {
            block: source.slice(openMatch.index, end),
            start: openMatch.index,
            end,
            complete: true
        };
    }

    function hasRootTag(text) {
        return /<\s*memory_updates\b[^>]*>/i.test(asText(text));
    }

    function hasRootCloseTag(text) {
        return /<\/\s*memory_updates\s*>/i.test(asText(text));
    }

    function hasUpdateNode(text) {
        return /<\s*memory_update\b[^>]*>/i.test(asText(text));
    }

    function wrapRootlessUpdates(text) {
        return '<memory_updates>\n' + normalizeLineEndings(text) + '\n</memory_updates>';
    }

    function extractMemoryUpdatesXml(rawContent) {
        const rawText = asText(rawContent);
        const warnings = [];
        let cleanedContent = normalizeLineEndings(rawText);
        let extractionMode = 'full_text';

        const fenced = extractFirstCodeFence(cleanedContent);
        if (fenced) {
            cleanedContent = fenced.content;
            extractionMode = 'code_fence';
            warnings.push(createWarning('CODE_FENCE_REMOVED', '模型返回包含 Markdown 代码块，已优先使用代码块内容。', {
                languageHint: fenced.languageHint
            }));
        }

        cleanedContent = stripHtmlShell(cleanedContent);

        const tagged = findTaggedBlock(cleanedContent, ROOT_TAG);
        let extractedXml = '';
        let hasExplicitRoot = false;
        let rootComplete = false;
        if (tagged) {
            extractedXml = normalizeLineEndings(tagged.block);
            hasExplicitRoot = true;
            rootComplete = tagged.complete;
            extractionMode = extractionMode === 'code_fence' ? 'code_fence_root' : 'root_block';
            if (tagged.start > 0 || tagged.end < cleanedContent.length) {
                warnings.push(createWarning('EXTRA_TEXT_IGNORED', '模型返回在 memory_updates 根节点前后包含解释文字，已只提取根节点内容。', {
                    beforeLength: tagged.start,
                    afterLength: Math.max(0, cleanedContent.length - tagged.end)
                }));
            }
            if (!tagged.complete) {
                warnings.push(createWarning('ROOT_CLOSE_MISSING', 'memory_updates 缺少闭合标签，解析阶段会继续给出详细错误。'));
            }
        } else if (hasUpdateNode(cleanedContent)) {
            extractedXml = wrapRootlessUpdates(cleanedContent);
            extractionMode = extractionMode === 'code_fence' ? 'code_fence_root_repaired' : 'root_repaired';
            warnings.push(createWarning('ROOT_REPAIRED', '模型返回缺少 memory_updates 根节点，但包含 memory_update，已临时包裹根节点用于诊断。'));
        } else {
            extractedXml = cleanedContent;
            if (cleanedContent) {
                warnings.push(createWarning('ROOT_NOT_FOUND', '模型返回中没有找到 memory_updates 根节点。'));
            }
        }

        return {
            rawContent: rawText,
            cleanedContent,
            extractedXml,
            extractionMode,
            hasExplicitRoot,
            rootComplete,
            hasRootCloseTag: hasRootCloseTag(extractedXml),
            hasUpdateNode: hasUpdateNode(extractedXml),
            warnings
        };
    }

    function buildWrappedMemoryUpdatesXml(extractedXml) {
        return '<root>' + asText(extractedXml) + '</root>';
    }

    function getParserErrorText(parsedXml) {
        if (!parsedXml || typeof parsedXml.querySelector !== 'function') return '';
        const parserError = parsedXml.querySelector('parsererror');
        return parserError ? normalizeLineEndings(parserError.textContent || 'XML parser error') : '';
    }

    function createMemoryUpdateDiagnostic(payload = {}) {
        const extraction = payload.extraction || extractMemoryUpdatesXml(payload.rawContent || '');
        const warnings = []
            .concat(Array.isArray(extraction.warnings) ? extraction.warnings : [])
            .concat(Array.isArray(payload.warnings) ? payload.warnings : []);
        const issues = Array.isArray(payload.issues) ? payload.issues : [];
        const parserError = asText(payload.parserError || '');
        const ok = payload.ok === undefined
            ? !parserError && !issues.some(issue => issue && issue.severity === 'error')
            : !!payload.ok;
        return {
            version: 'v0.2.3',
            kind: 'memory_table_update_xml',
            ok,
            source: payload.source || 'memory_table',
            stage: payload.stage || (ok ? 'parsed' : 'failed'),
            parserError,
            extractionMode: extraction.extractionMode,
            hasExplicitRoot: !!extraction.hasExplicitRoot,
            rootComplete: !!extraction.rootComplete,
            hasUpdateNode: !!extraction.hasUpdateNode,
            rawLength: asText(extraction.rawContent).length,
            cleanedLength: asText(extraction.cleanedContent).length,
            extractedLength: asText(extraction.extractedXml).length,
            rawContent: extraction.rawContent,
            cleanedContent: extraction.cleanedContent,
            extractedXml: extraction.extractedXml,
            targetTemplateIds: Array.isArray(payload.targetTemplateIds) ? payload.targetTemplateIds.slice() : [],
            updateCount: Number.isFinite(payload.updateCount) ? payload.updateCount : 0,
            validTargetCount: Number.isFinite(payload.validTargetCount) ? payload.validTargetCount : 0,
            warnings,
            issues
        };
    }

    function summarizeDiagnostic(diagnostic) {
        if (!diagnostic) return '没有诊断信息';
        const lines = [];
        lines.push(diagnostic.ok ? '表格记忆 XML 诊断：通过' : '表格记忆 XML 诊断：失败');
        lines.push('阶段：' + (diagnostic.stage || 'unknown'));
        lines.push('提取方式：' + (diagnostic.extractionMode || 'unknown'));
        lines.push('原始长度：' + (diagnostic.rawLength || 0) + '，提取长度：' + (diagnostic.extractedLength || 0));
        if (diagnostic.parserError) lines.push('解析错误：' + diagnostic.parserError);
        const allIssues = []
            .concat(Array.isArray(diagnostic.issues) ? diagnostic.issues : [])
            .concat(Array.isArray(diagnostic.warnings) ? diagnostic.warnings : []);
        allIssues.slice(0, 8).forEach(issue => {
            lines.push('- [' + (issue.severity || 'warning') + '] ' + issue.code + '：' + issue.message);
        });
        if (allIssues.length > 8) lines.push('- 还有 ' + (allIssues.length - 8) + ' 条诊断，可在请求控制台复制完整数据。');
        return lines.join('\n');
    }

    function formatDiagnosticForError(diagnostic) {
        const summary = summarizeDiagnostic(diagnostic);
        return summary + '\n\n已写入请求控制台，可复制 rawContent / cleanedContent / extractedXml 定位模型返回格式。';
    }

    core.memory.tableUpdateXmlSemantics = {
        ROOT_TAG,
        asText,
        normalizeLineEndings,
        createIssue,
        createWarning,
        createError,
        extractFirstCodeFence,
        findTaggedBlock,
        hasRootTag,
        hasRootCloseTag,
        hasUpdateNode,
        extractMemoryUpdatesXml,
        buildWrappedMemoryUpdatesXml,
        getParserErrorText,
        createMemoryUpdateDiagnostic,
        summarizeDiagnostic,
        formatDiagnosticForError
    };
})(OwoApp);
