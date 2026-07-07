// --- Memory Brain fact semantics owner (v0.3.2) ---
// 只处理“事件摘要 → 原子事实候选”的纯语义：prompt、JSON 解析、事实归一化和列表 compact。
(function registerMemoryBrainFactSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clampText(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }
    function asArray(value, max) {
        const list = Array.isArray(value) ? value : asText(value).split(/[，,、;；\n]+/);
        const seen = new Set();
        return list.map(item => clampText(item, 80)).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, max || 12);
    }
    function normalizeConfidence(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return 0.7;
        const normalized = number > 1 ? number / 100 : number;
        return Math.max(0.05, Math.min(1, Math.round(normalized * 100) / 100));
    }
    function normalizePolarity(value) {
        const text = asText(value).toLowerCase();
        if (['negative', 'avoid', 'dislike', 'no', '反感', '避免', '不喜欢'].includes(text)) return 'negative';
        if (['positive', 'like', 'want', 'yes', '喜欢', '希望', '偏好'].includes(text)) return 'positive';
        if (['disputed', 'conflict', '冲突', '矛盾'].includes(text)) return 'disputed';
        return 'neutral';
    }
    function timestampLabel(value) {
        const time = Number(value);
        if (!Number.isFinite(time)) return '';
        const date = new Date(time);
        if (Number.isNaN(date.getTime())) return '';
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
    function eventLine(event) {
        const source = event && event.source || {};
        return [
            `事件ID：${asText(event && event.id) || 'unknown'}`,
            `标题：${asText(event && event.title) || '未命名事件'}`,
            `摘要：${asText(event && event.summary)}`,
            `关键词：${asArray(event && event.keywords, 12).join('、')}`,
            `情绪：${asText(event && event.emotion) || '未知'}`,
            `重要度：${asText(event && event.importance) || '未知'}`,
            `未完成线索：${asArray(event && event.openThreads, 10).join('；')}`,
            `承诺/约定：${asArray(event && event.promises, 10).join('；')}`,
            `来源：${asText(source.chatName) || '未知聊天'} #${source.startIndex || '?'}-#${source.endIndex || '?'}`,
            `理由：${asText(event && event.sourceReason)}`
        ].join('\n');
    }
    function buildFactExtractionPrompt(event, options = {}) {
        const eventText = eventLine(event || {});
        const maxFacts = Math.max(1, Math.min(18, Number(options.maxFacts) || 8));
        return [
            '你是 OWO 小手机 App 的长期记忆脑“原子事实”整理器。',
            '任务：只根据下面一条事件摘要，提取可长期保存、可追溯、可独立判断真假的原子事实候选。',
            '',
            '整理原则：',
            '- 事实必须来自事件，不要编造，不要把轻度推测写成确定事实。',
            '- 复合句必须拆开；例如“用户喜欢购物但为了断舍离控制消费”要拆成“用户喜欢购物”和“用户在断舍离目标下控制消费”。',
            '- 不要做记忆家族、graph、人物画像、AI 自我、世界观或 prompt 注入。',
            '- factType / labels / keywords 可以自然生成，不要套固定分类柜。',
            '- confidence 为 0-1：明确说过 0.85-1，多次暗示 0.65-0.84，轻度推测 0.35-0.64。',
            '- 只保留对未来陪伴、项目、偏好、边界、关系连续性或未完成事项有价值的事实。',
            '',
            `最多输出 ${maxFacts} 条。只输出 JSON，不要 markdown，不要解释。JSON schema：`,
            '{',
            '  "facts": [',
            '    {',
            '      "content": "一句完整的原子事实",',
            '      "subject": "user / assistant / project / relationship / other 自然主体",',
            '      "predicate": "prefers / avoids / wants / decided / promised / works_on / feels / other 自然关系",',
            '      "object": "事实对象",',
            '      "factType": "自然事实类型，不要写死分类",',
            '      "labels": ["自然标签"],',
            '      "keywords": ["召回关键词"],',
            '      "polarity": "positive / negative / neutral / disputed",',
            '      "confidence": 0.85,',
            '      "evidenceQuote": "事件中支持该事实的短证据",',
            '      "sourceReason": "为什么这是一条值得长期保存的原子事实"',
            '    }',
            '  ]',
            '}',
            '',
            '事件摘要：',
            eventText
        ].join('\n');
    }
    function normalizeFactDraft(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        return {
            content: clampText(source.content || source.fact || source.summary || '', 280),
            subject: clampText(source.subject || 'user', 60),
            predicate: clampText(source.predicate || source.relation || 'relates_to', 80),
            object: clampText(source.object || source.target || '', 180),
            factType: clampText(source.factType || source.type || source.kind || 'natural', 80),
            labels: asArray(source.labels || source.tags || source.categories, 10),
            keywords: asArray(source.keywords || source.searchTerms, 12),
            polarity: normalizePolarity(source.polarity || source.sentiment),
            confidence: normalizeConfidence(source.confidence),
            evidenceQuote: clampText(source.evidenceQuote || source.evidence || source.quote, 260),
            sourceReason: clampText(source.sourceReason || source.reason || '', 360),
            status: 'candidate'
        };
    }
    function parseFactExtractionResponse(text) {
        const diagnostics = [];
        const jsonText = extractJsonText(text);
        if (!jsonText) return { ok: false, drafts: [], rawText: asText(text), diagnostics: ['empty_response'] };
        try {
            const parsed = JSON.parse(jsonText);
            const list = Array.isArray(parsed) ? parsed : (parsed.facts || parsed.items || parsed.candidates || []);
            if (!Array.isArray(list)) return { ok: false, drafts: [], rawText: asText(text), diagnostics: ['facts_not_array'] };
            const seen = new Set();
            const drafts = list.map(normalizeFactDraft).filter(fact => {
                if (!fact.content) return false;
                const key = fact.content.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            if (!drafts.length) diagnostics.push('empty_facts');
            drafts.forEach((fact, index) => {
                if (!fact.object) diagnostics.push(`fact_${index + 1}_missing_object`);
                if (!fact.evidenceQuote) diagnostics.push(`fact_${index + 1}_missing_evidence`);
            });
            return { ok: drafts.length > 0, drafts, rawText: asText(text), diagnostics };
        } catch (error) {
            return { ok: false, drafts: [], rawText: asText(text), diagnostics: ['json_parse_failed: ' + error.message] };
        }
    }
    function ensureFactsSource(facts, event) {
        const list = Array.isArray(facts) ? facts : [];
        const source = event && event.source || {};
        return list.map(fact => Object.assign({}, normalizeFactDraft(fact), {
            source: {
                eventId: event && event.id || '',
                eventTitle: event && event.title || '',
                eventBatchId: event && event.batchId || '',
                chatId: source.chatId || '',
                chatType: source.chatType || '',
                chatName: source.chatName || '',
                startIndex: source.startIndex || null,
                endIndex: source.endIndex || null,
                messageCount: source.messageCount || 0,
                startTimestamp: source.startTimestamp || null,
                endTimestamp: source.endTimestamp || null
            },
            evidence: event && event.id ? [event.id] : []
        }));
    }
    function compactFactForList(fact) {
        const source = fact && fact.source || {};
        const confidence = normalizeConfidence(fact && fact.confidence);
        return {
            id: fact && fact.id,
            content: fact && fact.content || '未命名事实',
            subject: fact && fact.subject || 'user',
            predicate: fact && fact.predicate || 'relates_to',
            object: fact && fact.object || '',
            atomText: `${fact && fact.subject || 'user'} · ${fact && fact.predicate || 'relates_to'} · ${fact && fact.object || ''}`,
            factType: fact && fact.factType || 'natural',
            labels: asArray(fact && fact.labels, 8),
            keywords: asArray(fact && fact.keywords, 8),
            polarity: normalizePolarity(fact && fact.polarity),
            confidence,
            confidenceText: Math.round(confidence * 100) + '%',
            evidenceQuote: clampText(fact && fact.evidenceQuote, 160),
            sourceReason: clampText(fact && fact.sourceReason, 180),
            status: fact && fact.status || 'active',
            reviewStatus: fact && fact.reviewStatus || 'auto-applied',
            sourceTitle: source.eventTitle || '来源事件',
            sourceRangeText: `来源 #${source.startIndex || '?'}-#${source.endIndex || '?'} · ${source.messageCount || 0} 条`,
            dateText: timestampLabel(source.endTimestamp) || asText(fact && fact.createdAt).slice(0, 10)
        };
    }

    core.memoryBrain.factSemantics = {
        buildFactExtractionPrompt,
        parseFactExtractionResponse,
        normalizeFactDraft,
        ensureFactsSource,
        compactFactForList
    };
})(OwoApp);
