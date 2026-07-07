// --- Memory Brain history event backfill semantics owner (v0.4.3) ---
// 纯语义：archiveChunk 消息 → 多条历史事件 prompt / JSON 解析 / 来源范围归一化；不访问 DOM、网络或存储。
(function registerHistoryEventBackfillSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clamp(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, Math.max(0, max - 1)) + '…' : text;
    }
    function safeNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }
    function normalizePromptMessage(message, offset) {
        const source = message && typeof message === 'object' ? message : {};
        return {
            id: source.id || '',
            index: safeNumber(source.index, offset + 1),
            role: source.role || 'user',
            speaker: source.speaker || (source.role === 'assistant' ? 'AI' : source.role === 'system' ? '系统' : '用户'),
            content: clamp(source.content || source.text || '', 1200),
            timestamp: source.timestamp || source.time || null
        };
    }
    function transcript(messages) {
        return asArray(messages).map(normalizePromptMessage).filter(item => item.content).map(item => {
            const role = item.speaker || item.role || 'unknown';
            return `#${item.index} ${role}: ${item.content}`;
        }).join('\n');
    }
    function normalizeEventDraft(raw) {
        const eventSemantics = core.memoryBrain.eventSemantics;
        const draft = eventSemantics && typeof eventSemantics.normalizeEventDraft === 'function'
            ? eventSemantics.normalizeEventDraft(raw || {})
            : Object.assign({ title: '未命名历史事件', summary: '', keywords: [] }, raw || {});
        const sourceStart = safeNumber(raw && (raw.sourceStartIndex || raw.startIndex || raw.startMessageIndex), null);
        const sourceEnd = safeNumber(raw && (raw.sourceEndIndex || raw.endIndex || raw.endMessageIndex), null);
        return Object.assign({}, draft, {
            sourceStartIndex: sourceStart,
            sourceEndIndex: sourceEnd,
            historical: true
        });
    }
    function extractJsonText(text) {
        const raw = asText(text);
        const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fence) return fence[1].trim();
        const arrayStart = raw.indexOf('[');
        const objectStart = raw.indexOf('{');
        if (arrayStart >= 0 && (objectStart === -1 || arrayStart < objectStart)) {
            const end = raw.lastIndexOf(']');
            return end > arrayStart ? raw.slice(arrayStart, end + 1) : raw;
        }
        const end = raw.lastIndexOf('}');
        return objectStart >= 0 && end > objectStart ? raw.slice(objectStart, end + 1) : raw;
    }
    function parseHistoricalEventBackfillResponse(text) {
        const jsonText = extractJsonText(text);
        if (!jsonText) return { ok: false, drafts: [], rawText: asText(text), diagnostics: ['empty_response'] };
        try {
            const parsed = JSON.parse(jsonText);
            const rows = Array.isArray(parsed) ? parsed : asArray(parsed.events || parsed.items || parsed.eventSummaries);
            const drafts = rows.map(normalizeEventDraft).filter(item => item && item.summary);
            const diagnostics = [];
            if (!rows.length) diagnostics.push('empty_events');
            if (rows.length && drafts.length < rows.length) diagnostics.push('some_events_missing_summary');
            return { ok: drafts.length > 0 || rows.length === 0, drafts, rawText: asText(text), diagnostics };
        } catch (error) {
            return { ok: false, drafts: [], rawText: asText(text), diagnostics: ['json_parse_failed: ' + error.message] };
        }
    }
    function buildHistoricalEventBackfillPrompt(chunk, messages, options = {}) {
        const list = asArray(messages).map(normalizePromptMessage).filter(item => item.content);
        const first = list[0] || {};
        const last = list[list.length - 1] || first;
        const sourceName = asText(chunk && chunk.sourceName) || asText(options.chatName) || '历史聊天';
        return [
            '你是 OWO Memory Brain 的历史事件回填器。',
            '任务：把一个历史 archiveChunk 整理成 0～多条“事件摘要”，用于长期时间线。',
            '',
            '严格边界：',
            '- 只总结这段消息里发生过的事情，不抽取原子事实，不创建家族，不写人物画像，不参与 prompt 注入。',
            '- 如果这段只是寒暄、重复、无长期意义，可以返回 {"events":[]}。',
            '- 每个事件必须保留来源消息范围。sourceStartIndex/sourceEndIndex 使用下面对话里的绝对 #编号。',
            '- 不要把临时情绪永久化；推测必须放进 sourceReason。',
            '',
            '只输出 JSON，不要 markdown。JSON schema：',
            '{"events":[{"title":"事件标题","summary":"发生了什么","keywords":["关键词"],"emotion":"情绪标签","importance":1,"relationNodes":["自然节点"],"openThreads":["未完成线索"],"promises":["承诺或约定"],"sourceStartIndex":1,"sourceEndIndex":2,"sourceReason":"为什么值得记"}]}',
            '',
            `历史来源：${sourceName}`,
            `archiveChunk：${chunk && chunk.id || ''}`,
            `消息范围：#${first.index || '?'} → #${last.index || '?'}，共 ${list.length} 条。`,
            '',
            '历史原文：',
            transcript(list)
        ].join('\n');
    }
    function ensureHistoricalEventSources(drafts, messages, chunk, job, source) {
        const list = asArray(messages).map(normalizePromptMessage).filter(item => item.content);
        const first = list[0] || {};
        const last = list[list.length - 1] || first;
        const minIndex = safeNumber(first.index, safeNumber(chunk && chunk.messageStartIndex, 0) + 1);
        const maxIndex = safeNumber(last.index, safeNumber(chunk && chunk.messageEndIndex, minIndex - 1) + 1);
        return asArray(drafts).map(draft => {
            const startIndex = Math.max(minIndex, Math.min(maxIndex, safeNumber(draft.sourceStartIndex, minIndex)));
            const endIndex = Math.max(startIndex, Math.min(maxIndex, safeNumber(draft.sourceEndIndex, maxIndex)));
            const eventSemantics = core.memoryBrain.eventSemantics;
            const normalized = eventSemantics && typeof eventSemantics.normalizeEventDraft === 'function' ? eventSemantics.normalizeEventDraft(draft) : normalizeEventDraft(draft);
            return Object.assign({}, normalized, {
                kind: 'history-backfill',
                historical: true,
                source: Object.assign({}, normalized.source || {}, {
                    chatId: chunk && chunk.sourceChatId || source && source.sourceChatId || job && job.sourceChatId || '',
                    chatType: chunk && chunk.sourceType || source && source.sourceType || job && job.sourceType || '',
                    chatName: chunk && chunk.sourceName || source && source.name || job && job.sourceName || '',
                    archiveSourceId: chunk && chunk.archiveSourceId || job && job.archiveSourceId || '',
                    archiveChunkId: chunk && chunk.id || job && job.archiveChunkId || '',
                    backfillJobId: job && job.id || '',
                    startIndex,
                    endIndex,
                    startMessageId: (list.find(item => item.index === startIndex) || first).id || '',
                    endMessageId: (list.find(item => item.index === endIndex) || last).id || '',
                    messageCount: Math.max(1, endIndex - startIndex + 1),
                    startTimestamp: (list.find(item => item.index === startIndex) || first).timestamp || null,
                    endTimestamp: (list.find(item => item.index === endIndex) || last).timestamp || null
                })
            });
        });
    }
    function compactHistoryEventBackfillRunForList(run) {
        return {
            id: run && run.id,
            status: run && run.status || 'completed',
            createdAt: run && run.createdAt || null,
            jobCount: run && run.jobCount || 0,
            eventCount: run && run.eventCount || 0,
            failedCount: run && run.failedCount || 0,
            sourceCount: run && run.sourceCount || 0
        };
    }

    core.memoryBrain.historyEventBackfillSemantics = {
        buildHistoricalEventBackfillPrompt,
        parseHistoricalEventBackfillResponse,
        ensureHistoricalEventSources,
        compactHistoryEventBackfillRunForList
    };
})(OwoApp);
