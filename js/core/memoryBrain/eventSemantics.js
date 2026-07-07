// --- Memory Brain event semantics owner (v0.3.1) ---
// 只处理“聊天范围 → 事件摘要”的纯语义：prompt、JSON 解析、字段归一化和时间线压缩。
(function registerMemoryBrainEventSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    const EMOTION_ALIASES = Object.freeze({
        neutral: '平静', calm: '平静', peaceful: '平静', happy: '开心', excited: '期待',
        tender: '亲密', intimate: '亲密', sad: '低落', anxious: '不安', angry: '生气',
        tense: '紧张', bittersweet: '复杂', vulnerable: '脆弱', playful: '轻快', serious: '认真',
        平和: '平静', 中性: '平静', 高兴: '开心', 快乐: '开心', 期待: '期待', 认真: '认真',
        亲密: '亲密', 低落: '低落', 难过: '低落', 焦虑: '不安', 不安: '不安',
        生气: '生气', 愤怒: '生气', 紧张: '紧张', 复杂: '复杂', 轻快: '轻快'
    });

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clampText(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }
    function asArray(value, max) {
        const list = Array.isArray(value)
            ? value
            : asText(value).split(/[，,、;；\n]+/);
        const seen = new Set();
        return list.map(item => clampText(item, 80)).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, max || 12);
    }
    function normalizeImportance(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return 2;
        return Math.max(1, Math.min(5, Math.round(number)));
    }
    function mapEmotionLabel(raw) {
        const text = asText(raw) || '平静';
        const key = text.toLowerCase();
        return EMOTION_ALIASES[key] || EMOTION_ALIASES[text] || clampText(text, 12);
    }
    function roleLabel(role) {
        if (role === 'assistant' || role === 'char' || role === 'ai') return 'AI';
        if (role === 'system') return '系统';
        return '用户';
    }
    function timestampLabel(value) {
        const time = Number(value);
        if (!Number.isFinite(time)) return '';
        const date = new Date(time);
        if (Number.isNaN(date.getTime())) return '';
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    function normalizePromptMessage(message, offset) {
        const source = message && typeof message === 'object' ? message : {};
        const content = clampText(source.content || source.text || source.voiceText || '', 1200);
        return {
            id: source.id || '',
            index: Number.isFinite(Number(source.index)) ? Number(source.index) : offset + 1,
            role: source.role || source.sender || 'user',
            speaker: source.speaker || roleLabel(source.role || source.sender),
            content,
            timestamp: source.timestamp || source.time || null,
            timeText: source.timeText || timestampLabel(source.timestamp || source.time)
        };
    }
    function buildMessageTranscript(messages) {
        return (Array.isArray(messages) ? messages : []).map(normalizePromptMessage).filter(m => m.content).map(m => {
            const time = m.timeText ? ` [${m.timeText}]` : '';
            return `#${m.index}${time} ${m.speaker}: ${m.content}`;
        }).join('\n');
    }
    function buildEventSummaryPrompt(messages, options = {}) {
        const list = (Array.isArray(messages) ? messages : []).map(normalizePromptMessage).filter(m => m.content);
        const first = list[0] || {};
        const last = list[list.length - 1] || first;
        const chatName = asText(options.chatName) || '当前聊天';
        const userName = asText(options.userName) || '用户';
        const partnerName = asText(options.partnerName) || 'AI / 对方';
        return [
            '你是 OWO 小手机 App 的长期记忆脑事件整理器。',
            '任务：只把下面一个消息范围整理成一条“事件摘要”，用于时间线。不要拆原子事实，不要创建记忆家族，不要写长期人物画像，不要参与 prompt 注入。',
            '',
            '整理原则：',
            '- 忠于原文，只总结这段范围发生了什么。',
            '- 不要把一时情绪永久化；模型推测必须放在 sourceReason 或 assumptions 里。',
            '- 保留承诺、计划、争执、和好、未完成线索、重要时间点。',
            '- 分类不要写死，keywords / relationNodes 可以自然生成。',
            '- importance 为 1-5：日常 1-2，重要个人分享 3，关系转折/承诺/冲突 4，里程碑 5。',
            '',
            '只输出 JSON，不要 markdown，不要解释。JSON schema：',
            '{',
            '  "title": "一句话事件标题",',
            '  "summary": "这段对话发生了什么",',
            '  "keywords": ["关键词"],',
            '  "emotion": "认真/期待/不满/亲密/低落/平静/其他自然标签",',
            '  "importance": 1,',
            '  "relationNodes": ["承诺/争执/和好/项目/其他自然节点"],',
            '  "openThreads": ["后续要继续的线索"],',
            '  "promises": ["明确承诺或约定，没有则空数组"],',
            '  "sourceReason": "为什么这段值得成为事件；哪些是明确说过，哪些只是轻度推测"',
            '}',
            '',
            `聊天：${chatName}`,
            `身份提示：${userName} = 用户，${partnerName} = AI/对方。`,
            `消息范围：#${first.index || 1} → #${last.index || list.length}，共 ${list.length} 条。`,
            '',
            '对话原文：',
            buildMessageTranscript(list)
        ].join('\n');
    }
    function extractJsonText(text) {
        const raw = asText(text);
        const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fence) return fence[1].trim();
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    }
    function normalizeEventDraft(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        return {
            title: clampText(source.title || source.eventTitle || '未命名事件', 80),
            summary: clampText(source.summary || source.content || source.description || '', 1200),
            keywords: asArray(source.keywords || source.tags, 12),
            emotion: mapEmotionLabel(source.emotion || source.tone),
            importance: normalizeImportance(source.importance),
            relationNodes: asArray(source.relationNodes || source.relationshipNodes || source.nodes, 12),
            openThreads: asArray(source.openThreads || source.followUps || source.nextThreads, 10),
            promises: asArray(source.promises || source.commitments, 10),
            sourceReason: clampText(source.sourceReason || source.reason || source.evidence || '', 500)
        };
    }
    function parseEventSummaryResponse(text) {
        const diagnostics = [];
        const jsonText = extractJsonText(text);
        if (!jsonText) return { ok: false, draft: null, rawText: asText(text), diagnostics: ['empty_response'] };
        try {
            const parsed = JSON.parse(jsonText);
            const value = Array.isArray(parsed) ? parsed[0] : parsed;
            const draft = normalizeEventDraft(value);
            if (!draft.summary) diagnostics.push('missing_summary');
            if (!draft.keywords.length) diagnostics.push('missing_keywords');
            return { ok: Boolean(draft.summary), draft, rawText: asText(text), diagnostics };
        } catch (error) {
            return { ok: false, draft: null, rawText: asText(text), diagnostics: ['json_parse_failed: ' + error.message] };
        }
    }
    function ensureEventSourceRange(eventDraft, messages) {
        const list = (Array.isArray(messages) ? messages : []).map(normalizePromptMessage);
        const first = list[0] || {};
        const last = list[list.length - 1] || first;
        return Object.assign({}, normalizeEventDraft(eventDraft), {
            source: Object.assign({}, eventDraft && eventDraft.source || {}, {
                startIndex: first.index || 1,
                endIndex: last.index || list.length,
                startMessageId: first.id || '',
                endMessageId: last.id || '',
                messageCount: list.length,
                startTimestamp: first.timestamp || null,
                endTimestamp: last.timestamp || null
            })
        });
    }
    function compactEventForTimeline(event) {
        const source = event && event.source || {};
        const created = event && (source.endTimestamp || event.createdAt || event.updatedAt);
        return {
            id: event && event.id,
            title: event && event.title || '未命名事件',
            summary: clampText(event && event.summary, 180),
            emotion: event && event.emotion || '平静',
            importance: normalizeImportance(event && event.importance),
            keywords: asArray(event && event.keywords, 8),
            openThreads: asArray(event && event.openThreads, 6),
            sourceRangeText: `来源 #${source.startIndex || '?'}-#${source.endIndex || '?'} · ${source.messageCount || 0} 条`,
            dateText: timestampLabel(created) || asText(event && event.createdAt).slice(0, 16)
        };
    }

    core.memoryBrain.eventSemantics = {
        normalizeEventDraft,
        parseEventSummaryResponse,
        buildEventSummaryPrompt,
        ensureEventSourceRange,
        mapEmotionLabel,
        compactEventForTimeline
    };
})(OwoApp);
