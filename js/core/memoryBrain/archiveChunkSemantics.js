// --- Memory Brain archive chunk semantics owner (v0.4.1) ---
// 纯计算：把历史来源切成可续跑 archiveChunks / archiveCursors；不访问存储、网络或界面。
(function registerArchiveChunkSemantics(app) {
    const core = app.core.memoryBrain;

    const DEFAULT_POLICY = Object.freeze({ messageLimit: 60, overlap: 8, minMessages: 1, previewLimit: 3 });
    const OWNER_MODE = Object.freeze({ mode: 'shadow', formalInjection: false, writesLegacyMemory: false });

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function cleanText(value, max) {
        const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
        if (!max || text.length <= max) return text;
        return text.slice(0, Math.max(0, max - 1)) + '…';
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
    function hashText(value) {
        const text = String(value == null ? '' : value);
        let hash = 5381;
        for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
        return (hash >>> 0).toString(36);
    }
    function normalizeChunkPolicy(options) {
        const source = options || {};
        const messageLimit = Math.min(220, Math.max(8, Number(source.chunkSize || source.messageLimit || DEFAULT_POLICY.messageLimit) || DEFAULT_POLICY.messageLimit));
        const overlap = Math.min(messageLimit - 1, Math.max(0, Number(source.overlap || DEFAULT_POLICY.overlap) || 0));
        return {
            messageLimit,
            overlap,
            minMessages: Math.max(0, Number(source.minMessages == null ? DEFAULT_POLICY.minMessages : source.minMessages) || 0),
            previewLimit: Math.max(0, Math.min(8, Number(source.previewLimit || DEFAULT_POLICY.previewLimit) || DEFAULT_POLICY.previewLimit))
        };
    }
    function summarizeSlice(slice) {
        let userCount = 0, assistantCount = 0, systemCount = 0, unknownCount = 0, nonEmptyTextCount = 0, charCount = 0;
        let firstAt = null, lastAt = null;
        asArray(slice).forEach(message => {
            const role = getMessageRole(message);
            if (role === 'user') userCount += 1;
            else if (role === 'assistant') assistantCount += 1;
            else if (role === 'system') systemCount += 1;
            else unknownCount += 1;
            const text = getMessageText(message);
            if (cleanText(text, 1)) nonEmptyTextCount += 1;
            charCount += String(text || '').length;
            const time = toTimestamp(getMessageTime(message));
            if (time != null && (firstAt == null || time < firstAt)) firstAt = time;
            if (time != null && (lastAt == null || time > lastAt)) lastAt = time;
        });
        return {
            userCount, assistantCount, systemCount, unknownCount, nonEmptyTextCount,
            estimatedCharCount: charCount,
            firstMessageAt: firstAt == null ? null : new Date(firstAt).toISOString(),
            lastMessageAt: lastAt == null ? null : new Date(lastAt).toISOString()
        };
    }
    function buildPreview(slice, previewLimit) {
        return asArray(slice).map((message, offset) => ({
            offset,
            role: getMessageRole(message),
            time: toIso(getMessageTime(message)),
            text: cleanText(getMessageText(message), 90)
        })).filter(item => item.text).slice(0, Number(previewLimit) || DEFAULT_POLICY.previewLimit);
    }
    function buildRangeHash(source, startIndex, endIndex, slice) {
        const first = slice[0] || null;
        const last = slice[slice.length - 1] || null;
        return hashText([
            source && source.id || '',
            startIndex,
            endIndex,
            getMessageTime(first) || '',
            getMessageText(first).slice(0, 80),
            getMessageTime(last) || '',
            getMessageText(last).slice(0, 80)
        ].join('|'));
    }
    function buildArchiveChunks(source, messages, options) {
        const policy = normalizeChunkPolicy(Object.assign({}, source && source.chunkPolicy || {}, options || {}));
        const list = asArray(messages);
        if (!source || !source.id || list.length < policy.minMessages) return [];
        const chunks = [];
        const step = Math.max(1, policy.messageLimit - policy.overlap);
        for (let start = 0, ordinal = 1; start < list.length; start += step, ordinal += 1) {
            const endExclusive = Math.min(list.length, start + policy.messageLimit);
            const slice = list.slice(start, endExclusive);
            if (!slice.length) break;
            const summary = summarizeSlice(slice);
            const rangeHash = buildRangeHash(source, start, endExclusive - 1, slice);
            chunks.push({
                id: `archive-chunk-${source.id}-${String(start + 1).padStart(6, '0')}-${rangeHash}`,
                layer: 'archive',
                kind: 'archive-chunk',
                status: 'pending',
                archiveSourceId: source.id,
                sourceChatId: source.sourceChatId,
                sourceType: source.sourceType,
                sourceName: source.name,
                ordinal,
                index: ordinal - 1,
                messageStartIndex: start,
                messageEndIndex: endExclusive - 1,
                messageStartNo: start + 1,
                messageEndNo: endExclusive,
                messageCount: slice.length,
                overlapBefore: start === 0 ? 0 : Math.min(policy.overlap, start),
                overlapAfter: endExclusive >= list.length ? 0 : Math.min(policy.overlap, list.length - endExclusive),
                rangeHash,
                firstMessageAt: summary.firstMessageAt,
                lastMessageAt: summary.lastMessageAt,
                userCount: summary.userCount,
                assistantCount: summary.assistantCount,
                systemCount: summary.systemCount,
                unknownCount: summary.unknownCount,
                nonEmptyTextCount: summary.nonEmptyTextCount,
                estimatedCharCount: summary.estimatedCharCount,
                preview: buildPreview(slice, policy.previewLimit),
                policy: { messageLimit: policy.messageLimit, overlap: policy.overlap, minMessages: policy.minMessages },
                cursorPhase: 'event-backfill',
                retryCount: 0,
                mode: OWNER_MODE.mode,
                formalInjection: OWNER_MODE.formalInjection,
                writesLegacyMemory: OWNER_MODE.writesLegacyMemory
            });
            if (endExclusive >= list.length) break;
        }
        return chunks;
    }
    function buildArchiveCursor(source, chunks, options) {
        const policy = normalizeChunkPolicy(Object.assign({}, source && source.chunkPolicy || {}, options || {}));
        const list = asArray(chunks).filter(chunk => chunk && chunk.archiveSourceId === source.id && chunk.status !== 'retired');
        const doneCount = list.filter(chunk => chunk.status === 'done').length;
        const failedCount = list.filter(chunk => chunk.status === 'failed').length;
        const runningCount = list.filter(chunk => chunk.status === 'running').length;
        const pending = list.filter(chunk => chunk.status === 'pending').sort((a, b) => (a.index || 0) - (b.index || 0));
        const next = pending[0] || null;
        return {
            id: `archive-cursor-${source.id}`,
            archiveSourceId: source.id,
            sourceChatId: source.sourceChatId,
            sourceType: source.sourceType,
            sourceName: source.name,
            phase: 'event-backfill',
            status: list.length ? (pending.length ? 'pending' : failedCount ? 'needs-review' : 'done') : 'empty',
            totalChunks: list.length,
            pendingChunks: pending.length,
            runningChunks: runningCount,
            doneChunks: doneCount,
            failedChunks: failedCount,
            currentChunkIndex: next ? next.index : null,
            nextChunkId: next ? next.id : null,
            messageCount: source.messageCount || 0,
            policy: { messageLimit: policy.messageLimit, overlap: policy.overlap, minMessages: policy.minMessages },
            mode: OWNER_MODE.mode,
            formalInjection: OWNER_MODE.formalInjection,
            writesLegacyMemory: OWNER_MODE.writesLegacyMemory
        };
    }
    function buildArchiveCursors(sources, chunks, options) {
        return asArray(sources).map(source => buildArchiveCursor(source, chunks, options));
    }
    function buildArchiveChunkRunReport(chunks, cursors, options) {
        const list = asArray(chunks);
        const cursorList = asArray(cursors);
        const totals = list.reduce((acc, chunk) => {
            acc.chunks += 1;
            acc.messages += chunk.messageCount || 0;
            acc.estimatedChars += chunk.estimatedCharCount || 0;
            if (chunk.status === 'pending') acc.pending += 1;
            return acc;
        }, { chunks: 0, messages: 0, estimatedChars: 0, pending: 0 });
        return {
            id: options && options.id || null,
            kind: 'history-archive-chunking',
            status: 'completed',
            chunkCount: totals.chunks,
            sourceCount: cursorList.length,
            totalChunkMessages: totals.messages,
            estimatedCharCount: totals.estimatedChars,
            pendingChunkCount: totals.pending,
            cursorCount: cursorList.length,
            policy: normalizeChunkPolicy(options || {}),
            nextVersion: 'v0.4.2 backfill queue / resumable runs',
            mode: OWNER_MODE.mode,
            formalInjection: OWNER_MODE.formalInjection,
            writesLegacyMemory: OWNER_MODE.writesLegacyMemory
        };
    }
    function compactArchiveChunkForList(chunk) {
        return {
            id: chunk.id,
            archiveSourceId: chunk.archiveSourceId,
            sourceName: chunk.sourceName,
            status: chunk.status,
            ordinal: chunk.ordinal,
            rangeText: `#${chunk.messageStartNo || (chunk.messageStartIndex + 1)}-#${chunk.messageEndNo || (chunk.messageEndIndex + 1)}`,
            messageCount: chunk.messageCount || 0,
            firstMessageAt: chunk.firstMessageAt || null,
            lastMessageAt: chunk.lastMessageAt || null,
            overlapText: `${chunk.overlapBefore || 0}/${chunk.overlapAfter || 0}`,
            estimatedCharCount: chunk.estimatedCharCount || 0,
            preview: asArray(chunk.preview).slice(0, 3)
        };
    }
    function compactArchiveCursorForList(cursor) {
        const total = Number(cursor.totalChunks) || 0;
        const done = Number(cursor.doneChunks) || 0;
        const failed = Number(cursor.failedChunks) || 0;
        return {
            id: cursor.id,
            archiveSourceId: cursor.archiveSourceId,
            sourceName: cursor.sourceName,
            status: cursor.status,
            phase: cursor.phase,
            totalChunks: total,
            pendingChunks: Number(cursor.pendingChunks) || 0,
            doneChunks: done,
            failedChunks: failed,
            progressPercent: total ? Math.round((done / total) * 100) : 0,
            nextChunkId: cursor.nextChunkId || null,
            policy: cursor.policy || {}
        };
    }

    core.archiveChunkSemantics = {
        DEFAULT_POLICY,
        normalizeChunkPolicy,
        buildArchiveChunks,
        buildArchiveCursor,
        buildArchiveCursors,
        buildArchiveChunkRunReport,
        compactArchiveChunkForList,
        compactArchiveCursorForList
    };
})(OwoApp);
