// --- Journal semantics owner (V25 canonical owner) ---
// 只负责回忆日记的纯语义：ID、range、导入项归一化、排序、筛选、prompt pieces。
(function registerJournalSemantics(app) {
    const core = app.core;
    core.memory = core.memory || {};

    function createJournalId(prefix) {
        return `${prefix || 'journal'}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    function toNumber(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function normalizeRange(range) {
        const source = range && typeof range === 'object' ? range : {};
        return {
            start: Math.max(0, toNumber(source.start, 0)),
            end: Math.max(0, toNumber(source.end, 0))
        };
    }

    function normalizeJournal(raw, context) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const ctx = context || {};
        const title = String(source.title || '').trim();
        const content = String(source.content || '').trim();
        if (!title || !content) return null;
        const createdAt = toNumber(source.createdAt, Date.now());
        const journal = {
            id: source.id || createJournalId(ctx.imported ? 'journal_imp' : 'journal'),
            range: normalizeRange(source.range),
            title,
            content,
            createdAt,
            chatId: ctx.currentChatId || source.chatId || null,
            chatType: ctx.currentChatType || source.chatType || 'private',
            isFavorited: !!source.isFavorited
        };
        if (source.isNodeSummary) {
            journal.isNodeSummary = true;
            journal.nodeId = source.nodeId || createJournalId('node_imp');
        }
        return journal;
    }

    function createManualJournal(input, context) {
        const ctx = Object.assign({}, context || {}, { imported: false });
        return normalizeJournal({
            title: input && input.title,
            content: input && input.content,
            range: { start: 0, end: 0 },
            createdAt: Date.now(),
            isFavorited: false
        }, ctx);
    }

    function normalizeImportedJournals(items, context) {
        if (!Array.isArray(items)) return [];
        const ctx = Object.assign({}, context || {}, { imported: true });
        return items.map(item => normalizeJournal(item, ctx)).filter(Boolean);
    }

    function filterJournalsBySearch(journals, searchQuery) {
        const list = Array.isArray(journals) ? journals : [];
        const query = String(searchQuery || '').trim().toLowerCase();
        if (!query) return list.slice();
        return list.filter(item => String(item.title || '').toLowerCase().includes(query));
    }

    function sortJournals(journals, options) {
        const list = Array.isArray(journals) ? journals.slice() : [];
        const favoriteTop = !options || options.favoriteTop !== false;
        return list.sort((a, b) => {
            if (favoriteTop) {
                if (a && a.isFavorited && !(b && b.isFavorited)) return -1;
                if (!(a && a.isFavorited) && b && b.isFavorited) return 1;
            }
            return toNumber(a && a.createdAt, 0) - toNumber(b && b.createdAt, 0);
        });
    }

    function getJournalsForDisplay(journals, searchQuery, options) {
        return sortJournals(filterJournalsBySearch(journals, searchQuery), options);
    }

    function formatYmd(timestamp) {
        const date = new Date(toNumber(timestamp, Date.now()));
        const pad2 = value => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    }

    function buildFavoritedJournalsText(journals) {
        return (Array.isArray(journals) ? journals : [])
            .filter(item => item && item.isFavorited)
            .map(item => `标题：${item.title}\n内容：${item.content}`)
            .join('\n\n---\n\n');
    }

    function buildFavoritedJournalsPrompt(journals) {
        const text = buildFavoritedJournalsText(journals);
        if (!text) return '';
        return `【过往回顾】\n这是你之前已经写下的内容，请参考它们，以确保新内容的连续性，并避免重复记录已经记录过的事件。\n\n${text}\n\n`;
    }

    function getJournalRangeStart(item) {
        return toNumber(item && item.range && item.range.start, 0);
    }

    function getJournalRangeEnd(item) {
        return toNumber(item && item.range && item.range.end, getJournalRangeStart(item));
    }

    function selectJournalsByIds(journals, ids) {
        const idSet = new Set(Array.isArray(ids) ? ids : []);
        return (Array.isArray(journals) ? journals : [])
            .filter(item => item && idSet.has(item.id))
            .sort((a, b) => getJournalRangeStart(a) - getJournalRangeStart(b));
    }

    function buildMergeJournalPrompt(journals, options) {
        const selected = Array.isArray(journals) ? journals : [];
        const realName = (options && options.realName) || '角色';
        const combinedContent = selected.map(item => `【${item.title}】\n${item.content}`).join('\n\n---\n\n');
        return [
            '你是一个专业的档案记录员。请将以下多篇日记合并整理成一篇连贯、精简的“回忆录”。',
            '',
            '【核心要求】',
            '1. **体现时间进程**：正文内容必须按时间顺序组织，并明确指出时间点。**格式规范：**请严格按照“x年x月x日，发生了[事件]”的格式进行叙述，确保时间线清晰。',
            '2. **客观平实**：使用第三人称视角，客观陈述事实。**绝对禁止使用强烈的情绪词汇**（如“极度愤怒”、“痛彻心扉”、“欣喜若狂”等），保持冷静、克制的叙述风格。',
            '3. **抓取重点**：识别对话中的核心事件、重要话题转折、关键决策或信息。忽略无关的闲聊和琐碎细节。',
            '4. **关键原话摘录（重要）**：',
            '    - 仅当出现具有**极高情感价值**（如表白、郑重承诺、极具感染力的情感宣泄）或**重大剧情价值**（如揭示核心秘密、决定性瞬间）的对话时，请**直接引用角色的原话**。',
            `    - **引用格式**：使用引号包裹原话，例如：${realName}说：“我永远不会离开你。”`,
            '    - **严格控制数量**：只摘录最闪光、最不可替代的那几句。如果聊天记录平淡无奇或全是日常琐事，**请不要摘录任何原话**，以免破坏摘要的精简性。',
            '5. **无升华**：不要进行价值升华、感悟或总结性评价，仅记录发生了什么。',
            '',
            '请严格使用以下 XML 标签格式输出你的结果，不要输出任何其他多余的解释：',
            '<journal>',
            '    <title>一个概括性的标题，例如“1月上旬·关于旅行的筹备与出发”</title>',
            '    <content>合并后的正文内容</content>',
            '</journal>',
            '',
            `待合并的日记内容如下：\n\n${combinedContent}`
        ].join('\n');
    }

    function parseJournalXml(rawContent, fallbackTitle) {
        const content = String(rawContent || '');
        const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
        const bodyMatch = content.match(/<content>([\s\S]*?)<\/content>/i);
        return {
            title: titleMatch ? titleMatch[1].trim() : (fallbackTitle || '回忆日记'),
            content: bodyMatch ? bodyMatch[1].trim() : '内容提取失败。'
        };
    }

    core.memory.journalSemantics = {
        createJournalId,
        normalizeRange,
        normalizeJournal,
        createManualJournal,
        normalizeImportedJournals,
        filterJournalsBySearch,
        sortJournals,
        getJournalsForDisplay,
        formatYmd,
        buildFavoritedJournalsText,
        buildFavoritedJournalsPrompt,
        selectJournalsByIds,
        buildMergeJournalPrompt,
        parseJournalXml,
        getJournalRangeStart,
        getJournalRangeEnd
    };
})(OwoApp);
