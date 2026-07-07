// --- Memory Brain archive source semantics owner (v0.4.0) ---
// 纯计算：把聊天对象概括成可回填历史来源；不访问存储、网络或界面。
(function registerArchiveSourceSemantics(app) {
    const core = app.core.memoryBrain;

    const SOURCE_TYPES = Object.freeze([
        Object.freeze({ id: 'character', name: '单人聊天' }),
        Object.freeze({ id: 'group', name: '群聊' })
    ]);
    const OWNER_MODE = Object.freeze({ mode: 'shadow', formalInjection: false, writesLegacyMemory: false });

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function cleanText(value, max) {
        const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
        if (!max || text.length <= max) return text;
        return text.slice(0, Math.max(0, max - 1)) + '…';
    }
    function safeId(value, fallback) {
        const text = cleanText(value, 80).replace(/[^a-zA-Z0-9_\-一-龥]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        return text || fallback;
    }
    function toTimestamp(value) {
        if (value == null || value === '') return null;
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        const parsed = Date.parse(String(value));
        return Number.isFinite(parsed) ? parsed : null;
    }
    function toIso(value) {
        const timestamp = toTimestamp(value);
        return timestamp == null ? null : new Date(timestamp).toISOString();
    }
    function getMessageTime(message) {
        if (!message || typeof message !== 'object') return null;
        return message.timestamp || message.time || message.createdAt || message.updatedAt || message.date || null;
    }
    function getMessageText(message) {
        if (typeof message === 'string') return message;
        if (!message || typeof message !== 'object') return '';
        return message.content || message.text || message.message || message.body || message.displayText || '';
    }
    function getMessageRole(message) {
        if (!message || typeof message !== 'object') return 'unknown';
        const role = String(message.role || message.sender || message.type || '').toLowerCase();
        if (role === 'user' || role === 'u' || message.isUser === true || message.senderType === 'user') return 'user';
        if (role === 'assistant' || role === 'char' || role === 'character' || message.isUser === false || message.senderType === 'character') return 'assistant';
        if (role === 'system' || role === 'notice') return 'system';
        return 'unknown';
    }
    function isAttachmentLike(message) {
        if (!message || typeof message !== 'object') return false;
        const type = String(message.type || message.kind || message.mediaType || '').toLowerCase();
        return /image|photo|video|audio|voice|file|gift|transfer|location|sticker|emoji|quote/.test(type) || !!(message.imageUrl || message.audioUrl || message.videoUrl || message.fileUrl || message.gift || message.location);
    }
    function summarizeMessages(history) {
        const messages = asArray(history);
        let firstAt = null, lastAt = null;
        let userCount = 0, assistantCount = 0, systemCount = 0, unknownCount = 0, attachmentCount = 0;
        let nonEmptyTextCount = 0, charCount = 0;
        messages.forEach(message => {
            const time = toTimestamp(getMessageTime(message));
            if (time != null && (firstAt == null || time < firstAt)) firstAt = time;
            if (time != null && (lastAt == null || time > lastAt)) lastAt = time;
            const role = getMessageRole(message);
            if (role === 'user') userCount += 1;
            else if (role === 'assistant') assistantCount += 1;
            else if (role === 'system') systemCount += 1;
            else unknownCount += 1;
            if (isAttachmentLike(message)) attachmentCount += 1;
            const text = getMessageText(message);
            if (cleanText(text, 1)) nonEmptyTextCount += 1;
            charCount += String(text || '').length;
        });
        return {
            messageCount: messages.length,
            userCount,
            assistantCount,
            systemCount,
            unknownCount,
            attachmentCount,
            nonEmptyTextCount,
            estimatedCharCount: charCount,
            firstMessageAt: firstAt == null ? null : new Date(firstAt).toISOString(),
            lastMessageAt: lastAt == null ? null : new Date(lastAt).toISOString()
        };
    }
    function countTableCells(chat) {
        const tables = chat && chat.memoryTables && chat.memoryTables.data;
        if (!tables || typeof tables !== 'object') return 0;
        let count = 0;
        Object.keys(tables).forEach(tableId => {
            const table = tables[tableId];
            if (!table || typeof table !== 'object') return;
            if (Array.isArray(table.rows)) table.rows.forEach(row => { count += row && typeof row === 'object' ? Object.keys(row).length : 0; });
            else count += Object.keys(table).length;
        });
        return count;
    }
    function classifyPriority(source) {
        if (!source.messageCount) return 'empty';
        if (source.messageCount >= 5000) return 'huge';
        if (source.messageCount >= 1000) return 'large';
        if (source.messageCount >= 120) return 'normal';
        return 'small';
    }
    function estimateChunkCount(messageCount, chunkSize, overlap) {
        const size = Math.max(8, Number(chunkSize) || 60);
        const step = Math.max(1, size - Math.max(0, Number(overlap) || 8));
        if (!messageCount) return 0;
        return Math.max(1, Math.ceil(Math.max(0, messageCount - size) / step) + 1);
    }
    function buildArchiveSourceFromChat(chat, type, index, options) {
        const opts = options || {};
        const chatId = chat && (chat.id || chat.contactId || chat.groupId || chat.uid || chat._id) || `${type}-${index + 1}`;
        const name = chat && (chat.remarkName || chat.name || chat.realName || chat.groupName || chat.title || chat.nickname) || `${type === 'group' ? '群聊' : '聊天'} ${index + 1}`;
        const messageSummary = summarizeMessages(chat && chat.history);
        const source = {
            id: `archive-${safeId(type, 'chat')}-${safeId(chatId, String(index + 1))}`,
            sourceChatId: String(chatId),
            sourceType: type,
            sourceTypeName: SOURCE_TYPES.find(item => item.id === type)?.name || type,
            name: cleanText(name, 80),
            status: messageSummary.messageCount ? 'ready' : 'empty',
            scanStatus: 'scanned',
            priority: 'empty',
            messageCount: messageSummary.messageCount,
            userCount: messageSummary.userCount,
            assistantCount: messageSummary.assistantCount,
            systemCount: messageSummary.systemCount,
            unknownCount: messageSummary.unknownCount,
            attachmentCount: messageSummary.attachmentCount,
            nonEmptyTextCount: messageSummary.nonEmptyTextCount,
            estimatedCharCount: messageSummary.estimatedCharCount,
            firstMessageAt: messageSummary.firstMessageAt,
            lastMessageAt: messageSummary.lastMessageAt,
            lastModifiedAt: toIso(chat && (chat.updatedAt || chat.modifiedAt || chat.lastModifiedAt || chat.lastActiveAt || chat.lastMessageAt)) || messageSummary.lastMessageAt,
            journalCount: asArray(chat && chat.memoryJournals).length,
            vectorEntryCount: asArray(chat && chat.vectorMemory && chat.vectorMemory.entries).length,
            tableCellCount: countTableCells(chat),
            estimatedChunkCount: estimateChunkCount(messageSummary.messageCount, opts.chunkSize, opts.overlap),
            chunkPolicy: { messageLimit: Number(opts.chunkSize) || 60, overlap: Number(opts.overlap) || 8 },
            nextAction: messageSummary.messageCount ? 'prepare-chunks-v0.4.1' : 'skip-empty',
            mode: OWNER_MODE.mode,
            formalInjection: OWNER_MODE.formalInjection,
            writesLegacyMemory: OWNER_MODE.writesLegacyMemory
        };
        source.priority = classifyPriority(source);
        return source;
    }
    function buildArchiveScanReport(sources, options) {
        const opts = options || {};
        const items = asArray(sources);
        const totals = items.reduce((acc, source) => {
            acc.messages += source.messageCount || 0;
            acc.sources += 1;
            acc.readySources += source.status === 'ready' ? 1 : 0;
            acc.emptySources += source.status === 'empty' ? 1 : 0;
            acc.estimatedChunks += source.estimatedChunkCount || 0;
            acc.journals += source.journalCount || 0;
            acc.vectorEntries += source.vectorEntryCount || 0;
            acc.tableCells += source.tableCellCount || 0;
            return acc;
        }, { sources: 0, readySources: 0, emptySources: 0, messages: 0, estimatedChunks: 0, journals: 0, vectorEntries: 0, tableCells: 0 });
        return {
            id: opts.id || null,
            kind: 'history-archive-scan',
            status: 'completed',
            scannedAt: opts.scannedAt || new Date().toISOString(),
            sourceCount: totals.sources,
            readySourceCount: totals.readySources,
            emptySourceCount: totals.emptySources,
            totalMessages: totals.messages,
            estimatedChunkCount: totals.estimatedChunks,
            totals,
            topSources: items.slice().sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0)).slice(0, Number(opts.topLimit) || 12),
            warnings: items.filter(source => source.priority === 'huge').map(source => ({ sourceId: source.id, message: `${source.name} 有 ${source.messageCount} 条消息，需要分批回填。` })),
            nextVersion: 'v0.4.1 archive chunks / cursor'
        };
    }
    function compactArchiveSourceForList(source) {
        return {
            id: source.id,
            name: source.name,
            sourceType: source.sourceType,
            sourceTypeName: source.sourceTypeName,
            status: source.status,
            priority: source.priority,
            messageCount: source.messageCount || 0,
            estimatedChunkCount: source.estimatedChunkCount || 0,
            firstMessageAt: source.firstMessageAt,
            lastMessageAt: source.lastMessageAt,
            legacyCounts: {
                journals: source.journalCount || 0,
                vectors: source.vectorEntryCount || 0,
                tableCells: source.tableCellCount || 0
            },
            nextAction: source.nextAction
        };
    }

    core.archiveSourceSemantics = {
        SOURCE_TYPES,
        OWNER_MODE,
        summarizeMessages,
        buildArchiveSourceFromChat,
        buildArchiveScanReport,
        compactArchiveSourceForList,
        estimateChunkCount
    };
})(OwoApp);
