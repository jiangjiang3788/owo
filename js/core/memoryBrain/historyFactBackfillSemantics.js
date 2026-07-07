// --- Memory Brain history fact backfill semantics owner (v0.4.4) ---
// 纯语义：历史事件 → 原子事实 prompt / JSON 解析 / 来源归一化；不访问 DOM、网络或存储。
(function registerHistoryFactBackfillSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clamp(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, Math.max(0, max - 1)) + '…' : text;
    }
    function safeNumber(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
    function facts() { return core.memoryBrain.factSemantics; }

    function eventText(event) {
        const source = event && event.source || {};
        return [
            `事件ID：${asText(event && event.id) || 'unknown'}`,
            `标题：${asText(event && event.title) || '未命名历史事件'}`,
            `摘要：${asText(event && event.summary)}`,
            `关键词：${asArray(event && event.keywords).join('、')}`,
            `情绪：${asText(event && event.emotion) || '未知'}`,
            `重要度：${asText(event && event.importance) || '未知'}`,
            `未完成线索：${asArray(event && event.openThreads).join('；')}`,
            `承诺/约定：${asArray(event && event.promises).join('；')}`,
            `来源：${asText(source.chatName) || '历史聊天'} #${source.startIndex || '?'}-#${source.endIndex || '?'}`,
            `archiveSourceId：${source.archiveSourceId || ''}`,
            `archiveChunkId：${source.archiveChunkId || ''}`,
            `来源理由：${asText(event && event.sourceReason)}`
        ].join('\n');
    }
    function extractJsonText(text) {
        const raw = asText(text);
        const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fence) return fence[1].trim();
        const objectStart = raw.indexOf('{');
        const arrayStart = raw.indexOf('[');
        const starts = [objectStart, arrayStart].filter(index => index >= 0);
        if (!starts.length) return raw;
        const start = Math.min.apply(null, starts);
        const isArray = start === arrayStart && (objectStart === -1 || arrayStart < objectStart);
        const end = isArray ? raw.lastIndexOf(']') : raw.lastIndexOf('}');
        return end > start ? raw.slice(start, end + 1) : raw.slice(start);
    }
    function buildHistoricalFactBackfillPrompt(event, options = {}) {
        const maxFacts = Math.max(1, Math.min(24, safeNumber(options.maxFacts, 8)));
        return [
            '你是 OWO Memory Brain 的历史事实回填器。',
            '任务：只根据一条“历史事件摘要”，抽取可长期保存的原子事实。',
            '',
            '严格边界：',
            '- 只抽取事实，不创建家族、不建 graph、不更新长期模型、不参与 prompt 注入。',
            '- 如果这条事件没有长期价值事实，可以返回 {"facts":[]}。',
            '- 事实必须来自事件本身；不要把临时情绪、猜测或角色修辞写成确定事实。',
            '- 每条事实要独立、可追溯、可判断真假；复合事实必须拆开。',
            '- factType / labels / keywords 自然生成，不要使用固定分类柜。',
            '- confidence 为 0-1：明确说过 0.85-1，多次暗示 0.65-0.84，轻度推测 0.35-0.64。',
            '',
            `最多输出 ${maxFacts} 条。只输出 JSON，不要 markdown。JSON schema：`,
            '{"facts":[{"content":"一句完整原子事实","subject":"user / assistant / project / relationship / other","predicate":"prefers / avoids / wants / decided / promised / works_on / feels / other","object":"事实对象","factType":"自然事实类型","labels":["自然标签"],"keywords":["召回关键词"],"polarity":"positive / negative / neutral / disputed","confidence":0.85,"evidenceQuote":"事件中支持该事实的短证据","sourceReason":"为什么值得长期保存"}]}',
            '',
            '历史事件：',
            eventText(event || {})
        ].join('\n');
    }
    function parseHistoricalFactBackfillResponse(text) {
        const jsonText = extractJsonText(text);
        if (!jsonText) return { ok: false, drafts: [], rawText: asText(text), diagnostics: ['empty_response'] };
        try {
            const parsed = JSON.parse(jsonText);
            const rows = Array.isArray(parsed) ? parsed : asArray(parsed.facts || parsed.items || parsed.candidates);
            const diagnostics = [];
            const seen = new Set();
            const drafts = rows.map(row => facts().normalizeFactDraft(row || {})).filter(fact => {
                if (!fact.content) return false;
                const key = fact.content.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            if (!rows.length) diagnostics.push('empty_facts');
            if (rows.length && drafts.length < rows.length) diagnostics.push('some_facts_dropped');
            drafts.forEach((fact, index) => {
                if (!fact.object) diagnostics.push(`fact_${index + 1}_missing_object`);
                if (!fact.evidenceQuote) diagnostics.push(`fact_${index + 1}_missing_evidence`);
            });
            return { ok: drafts.length > 0 || rows.length === 0, drafts, rawText: asText(text), diagnostics };
        } catch (error) {
            return { ok: false, drafts: [], rawText: asText(text), diagnostics: ['json_parse_failed: ' + error.message] };
        }
    }
    function ensureHistoricalFactSources(factDrafts, event, job) {
        const eventSource = event && event.source || {};
        return asArray(factDrafts).map(raw => Object.assign({}, facts().normalizeFactDraft(raw), {
            historical: true,
            source: {
                eventId: event && event.id || job && job.eventId || '',
                eventTitle: event && event.title || job && job.eventTitle || '',
                eventBatchId: event && event.batchId || '',
                chatId: eventSource.chatId || job && job.sourceChatId || '',
                chatType: eventSource.chatType || job && job.sourceType || '',
                chatName: eventSource.chatName || job && job.sourceName || '',
                archiveSourceId: eventSource.archiveSourceId || job && job.archiveSourceId || '',
                archiveChunkId: eventSource.archiveChunkId || job && job.archiveChunkId || '',
                backfillJobId: job && job.id || '',
                startIndex: eventSource.startIndex || null,
                endIndex: eventSource.endIndex || null,
                messageCount: eventSource.messageCount || 0,
                startTimestamp: eventSource.startTimestamp || null,
                endTimestamp: eventSource.endTimestamp || null
            },
            evidence: event && event.id ? [event.id] : []
        }));
    }
    function compactHistoryFactBackfillRunForList(run) {
        return {
            id: run && run.id,
            status: run && run.status || 'completed',
            createdAt: run && run.createdAt || null,
            jobCount: run && run.jobCount || 0,
            factCount: run && run.factCount || 0,
            failedCount: run && run.failedCount || 0,
            eventCount: run && run.eventCount || 0
        };
    }

    core.memoryBrain.historyFactBackfillSemantics = {
        buildHistoricalFactBackfillPrompt,
        parseHistoricalFactBackfillResponse,
        ensureHistoricalFactSources,
        compactHistoryFactBackfillRunForList
    };
})(OwoApp);
