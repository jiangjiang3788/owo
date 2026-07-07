// --- Memory Brain history event backfill store owner (v0.4.3) ---
// 读取 archiveChunk 对应原文并应用历史事件回填结果；只写 memoryBrain.*，不改旧聊天、不接正式 prompt。
(function registerHistoryEventBackfillStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[historyEventBackfillStore] memoryBrainStore 尚未加载');

    function getCoreApi() { return app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi; }
    function getRootState(options) { return (options && options.state) || global.db || {}; }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() { return typeof platform.memoryBrainStore.saveRootState === 'function' ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function clip(value, max) { const text = String(value == null ? '' : value); return text.length > max ? text.slice(0, max - 1) + '…' : text; }

    function chatId(chat) { return chat && (chat.id || chat.contactId || chat.groupId || chat.uid || chat._id); }
    function chatName(chat) { return chat && (chat.remarkName || chat.name || chat.realName || chat.groupName || '未命名聊天'); }
    function collectChats(rootState) {
        const rows = [];
        asArray(rootState.characters).forEach((chat, index) => rows.push({ chat, type: 'character', index, id: String(chatId(chat) || `character-${index + 1}`) }));
        asArray(rootState.groups).forEach((chat, index) => rows.push({ chat, type: 'group', index, id: String(chatId(chat) || `group-${index + 1}`) }));
        return rows;
    }
    function findChat(source, rows) { return asArray(rows).find(row => row.type === source.sourceType && row.id === String(source.sourceChatId)) || null; }
    function groupSenderName(chat, message) {
        if (!chat || !message || message.role === 'user') return '';
        const member = asArray(chat.members).find(item => item && item.id === message.senderId);
        return member && (member.groupNickname || member.realName || member.name) || '';
    }
    function speakerName(row, message) {
        if (!row || !message) return 'unknown';
        if (message.role === 'system') return '系统';
        if (message.role === 'user') return row.type === 'group' ? (row.chat && row.chat.me && row.chat.me.nickname || '我') : (row.chat && (row.chat.myName || row.chat.userName) || '我');
        return groupSenderName(row.chat, message) || chatName(row.chat);
    }
    function messageContent(message) {
        const msg = message || {};
        if (msg.isVoice && msg.voiceText) return msg.voiceText;
        if (msg.locationData && msg.locationData.name) return `[分享位置：${msg.locationData.name}]`;
        if (msg.transferData && msg.transferData.amount) return `[转账：${msg.transferData.amount}] ${msg.content || ''}`;
        if (msg.giftData && msg.giftData.name) return `[礼物：${msg.giftData.name}] ${msg.content || ''}`;
        const parts = asArray(msg.parts).map(part => {
            if (!part) return '';
            if (part.type === 'text') return part.text || part.content || '';
            if (part.type === 'image' || part.type === 'image_url') return '[图片]';
            if (part.type === 'audio') return '[语音]';
            return '';
        }).filter(Boolean).join('\n');
        return parts || msg.content || msg.text || '';
    }
    function buildMessagesForChunk(row, chunk) {
        const history = asArray(row && row.chat && row.chat.history);
        const start = Math.max(0, Number(chunk && chunk.messageStartIndex) || 0);
        const end = Math.max(start, Number(chunk && chunk.messageEndIndex) || start);
        return history.slice(start, end + 1).map((message, offset) => ({
            id: message && message.id || '',
            index: start + offset + 1,
            role: message && message.role || 'user',
            speaker: speakerName(row, message || {}),
            content: clip(messageContent(message), 1200),
            timestamp: message && (message.timestamp || message.time) || null
        })).filter(item => item.content && item.role !== 'thinking');
    }
    function selectJobs(state, options) {
        const ids = new Set(asArray(options && options.jobIds).map(String));
        const limit = Math.max(1, Math.min(50, Number(options && options.limit) || 3));
        let jobs = asArray(state.backfillJobs).filter(job => job && job.kind === 'event-backfill' && job.status === 'running');
        if (ids.size) jobs = jobs.filter(job => ids.has(String(job.id)));
        return jobs.slice().sort((a, b) => String(a.sourceName || '').localeCompare(String(b.sourceName || '')) || (a.priority || 0) - (b.priority || 0)).slice(0, limit);
    }
    function selectHistoryEventBackfillWork(options = {}) {
        const state = ensureState(options);
        const root = getRootState(options);
        const rows = collectChats(root);
        const chunkById = new Map(asArray(state.archiveChunks).map(chunk => [chunk && chunk.id, chunk]));
        const sourceById = new Map(asArray(state.archiveSources).map(source => [source && source.id, source]));
        const api = getCoreApi();
        const jobs = selectJobs(state, options);
        const items = jobs.map(job => {
            const chunk = chunkById.get(job.archiveChunkId) || {};
            const source = sourceById.get(job.archiveSourceId) || { sourceType: job.sourceType, sourceChatId: job.sourceChatId, name: job.sourceName };
            const row = findChat(source, rows);
            const messages = row ? buildMessagesForChunk(row, chunk) : [];
            const prompt = api.buildHistoricalEventBackfillPrompt(chunk, messages, { chatName: source.name || job.sourceName });
            return { job: clone(job), chunk: clone(chunk), source: clone(source), messages: clone(messages), prompt };
        });
        return clone({ items, selectedCount: items.length, formalPromptInjection: false, writesLegacyMemory: false });
    }
    function updateCursors(cursors, chunks) {
        const chunksBySource = new Map();
        asArray(chunks).forEach(chunk => {
            if (!chunk || chunk.status === 'retired') return;
            const list = chunksBySource.get(chunk.archiveSourceId) || [];
            list.push(chunk);
            chunksBySource.set(chunk.archiveSourceId, list);
        });
        return asArray(cursors).map(cursor => {
            const list = chunksBySource.get(cursor && cursor.archiveSourceId) || [];
            const pending = list.filter(chunk => (chunk.backfillStatus || 'pending') === 'pending').length;
            const running = list.filter(chunk => chunk.backfillStatus === 'running').length;
            const failed = list.filter(chunk => chunk.backfillStatus === 'failed').length;
            const done = list.filter(chunk => chunk.backfillStatus === 'done').length;
            const next = list.filter(chunk => (chunk.backfillStatus || 'pending') === 'pending').sort((a, b) => (a.index || 0) - (b.index || 0))[0] || null;
            return Object.assign({}, cursor, {
                backfillStatus: running ? 'running' : failed ? 'needs-review' : pending ? 'queued' : done && list.length === done ? 'done' : cursor.backfillStatus || cursor.status,
                backfillPendingChunks: pending,
                backfillRunningChunks: running,
                backfillFailedChunks: failed,
                backfillDoneChunks: done,
                nextBackfillChunkId: next ? next.id : null,
                updatedAt: nowIso()
            });
        });
    }
    function appendHistoryEventBackfillBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const api = getCoreApi();
        const createdAt = nowIso();
        const runId = payload.runId || nextId('history-event-run');
        const results = asArray(payload.results);
        const jobIds = new Set(results.map(result => result && result.job && result.job.id).filter(Boolean));
        const chunkIds = new Set(results.map(result => result && result.chunk && result.chunk.id).filter(Boolean));
        const beforeJobs = asArray(state.backfillJobs).filter(job => jobIds.has(job && job.id));
        const beforeChunks = asArray(state.archiveChunks).filter(chunk => chunkIds.has(chunk && chunk.id));
        const beforeCursors = asArray(state.archiveCursors).filter(cursor => asArray(beforeChunks).some(chunk => chunk && chunk.archiveSourceId === cursor.archiveSourceId));
        const beforeEvents = asArray(state.events).filter(event => event && event.source && chunkIds.has(event.source.archiveChunkId));
        const eventIds = [];
        const nextEvents = [];
        const failedJobIds = [];
        const jobUpdates = new Map();
        const chunkUpdates = new Map();
        results.forEach(result => {
            const job = result && result.job || {};
            const chunk = result && result.chunk || {};
            const ok = !!(result && result.ok);
            const parsedEvents = ok ? api.ensureHistoricalEventSources(result.drafts || [], result.messages || [], chunk, job, result.source || {}) : [];
            const localEventIds = [];
            parsedEvents.forEach(draft => {
                const event = Object.assign({ id: nextId('memory-event'), layer: 'event', kind: 'history-backfill', status: 'active', mode: state.settings && state.settings.mode || 'shadow', createdAt, updatedAt: createdAt, batchId: payload.batchId || null }, clone(draft));
                event.batchId = payload.batchId || event.batchId;
                eventIds.push(event.id);
                localEventIds.push(event.id);
                nextEvents.push(event);
            });
            if (!ok) failedJobIds.push(job.id);
            jobUpdates.set(job.id, Object.assign({}, job, {
                status: ok ? 'done' : 'failed',
                completedAt: ok ? createdAt : job.completedAt || null,
                failedAt: ok ? null : createdAt,
                updatedAt: createdAt,
                errorMessage: ok ? '' : result.errorMessage || '历史事件回填失败',
                eventIds: ok ? localEventIds : asArray(job.eventIds),
                eventCount: ok ? parsedEvents.length : job.eventCount || 0,
                lastEventBackfillRunId: runId
            }));
            chunkUpdates.set(chunk.id, Object.assign({}, chunk, {
                backfillStatus: ok ? 'done' : 'failed',
                eventBackfillStatus: ok ? 'done' : 'failed',
                eventIds: ok ? localEventIds : asArray(chunk.eventIds),
                eventCount: ok ? parsedEvents.length : chunk.eventCount || 0,
                eventBackfilledAt: ok ? createdAt : chunk.eventBackfilledAt || null,
                errorMessage: ok ? '' : result.errorMessage || chunk.errorMessage || '',
                updatedAt: createdAt,
                lastEventBackfillRunId: runId
            }));
        });
        const batchId = payload.batchId || nextId('memory-brain-batch');
        nextEvents.forEach(event => { event.batchId = batchId; });
        state.backfillJobs = asArray(state.backfillJobs).map(job => jobUpdates.get(job && job.id) || job);
        state.archiveChunks = asArray(state.archiveChunks).map(chunk => chunkUpdates.get(chunk && chunk.id) || chunk);
        state.archiveCursors = updateCursors(state.archiveCursors, state.archiveChunks);
        state.events = asArray(state.events).filter(event => !(event && event.source && chunkIds.has(event.source.archiveChunkId))).concat(nextEvents).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        const run = {
            id: runId,
            kind: 'history-event-backfill',
            action: 'run',
            status: failedJobIds.length && failedJobIds.length === results.length ? 'failed' : failedJobIds.length ? 'partial' : 'completed',
            createdAt,
            updatedAt: createdAt,
            jobCount: results.length,
            eventCount: eventIds.length,
            failedCount: failedJobIds.length,
            sourceCount: new Set(results.map(result => result && result.source && result.source.id || result && result.job && result.job.archiveSourceId).filter(Boolean)).size,
            jobIds: Array.from(jobIds),
            chunkIds: Array.from(chunkIds),
            eventIds,
            failedJobIds,
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
        const batch = {
            id: batchId,
            kind: 'history-event-backfill',
            status: 'applied',
            createdAt,
            updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            historyEventRunId: runId,
            jobIds: run.jobIds,
            chunkIds: run.chunkIds,
            eventIds,
            failedJobIds,
            input: clone(payload.input || {}),
            resultPreview: results.map(result => ({ jobId: result && result.job && result.job.id, ok: !!(result && result.ok), eventCount: asArray(result && result.drafts).length, diagnostics: result && result.diagnostics || [], errorMessage: result && result.errorMessage || '' })),
            beforeJobs: clone(beforeJobs),
            beforeChunks: clone(beforeChunks),
            beforeCursors: clone(beforeCursors),
            beforeEvents: clone(beforeEvents),
            writesLegacyMemory: false,
            formalPromptInjection: false
        };
        state.historyEventBackfillRuns = [run].concat(asArray(state.historyEventBackfillRuns)).slice(0, 80);
        state.backfillRuns = [run].concat(asArray(state.backfillRuns)).slice(0, 120);
        state.lastBackfillRun = run;
        state.batches = [batch].concat(asArray(state.batches));
        state.updatedAt = createdAt;
        saveRootState();
        return clone({ run, events: nextEvents, batch });
    }
    function rollbackHistoryEventBackfillBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'history-event-backfill');
        if (!batch) throw new Error('找不到历史事件回填批次');
        const eventIds = new Set(asArray(batch.eventIds));
        const jobMap = new Map(asArray(batch.beforeJobs).map(job => [job.id, job]));
        const chunkMap = new Map(asArray(batch.beforeChunks).map(chunk => [chunk.id, chunk]));
        const cursorMap = new Map(asArray(batch.beforeCursors).map(cursor => [cursor.id, cursor]));
        state.events = asArray(state.events).filter(event => !eventIds.has(event && event.id)).concat(asArray(batch.beforeEvents));
        state.backfillJobs = asArray(state.backfillJobs).map(job => jobMap.get(job && job.id) || job);
        state.archiveChunks = asArray(state.archiveChunks).map(chunk => chunkMap.get(chunk && chunk.id) || chunk);
        state.archiveCursors = asArray(state.archiveCursors).map(cursor => cursorMap.get(cursor && cursor.id) || cursor);
        state.historyEventBackfillRuns = asArray(state.historyEventBackfillRuns).map(run => run && run.id === batch.historyEventRunId ? Object.assign({}, run, { status: 'rolled-back', rolledBackAt: nowIso() }) : run);
        state.backfillRuns = asArray(state.backfillRuns).map(run => run && run.id === batch.historyEventRunId ? Object.assign({}, run, { status: 'rolled-back', rolledBackAt: nowIso() }) : run);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', rolledBackAt: nowIso() }) : item);
        state.lastBackfillRun = asArray(state.backfillRuns).find(run => run && run.status === 'completed') || null;
        state.updatedAt = nowIso();
        saveRootState();
        return clone({ ok: true, eventCount: eventIds.size, jobCount: asArray(batch.jobIds).length, batchId: batch.id });
    }
    function listHistoryEventRuns(options = {}) { return asArray(ensureState(options).historyEventBackfillRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map(clone); }
    function getRoutingReport() {
        return { owner: 'platform/memoryBrain/historyEventBackfillStore', release: 'v0.4.3', eventBackfillWrite: 'memoryBrain.events + backfillJobs + archiveChunks + archiveCursors + backfillRuns + batches(kind=history-event-backfill)', noLegacyMutation: true, formalPromptInjection: false };
    }

    platform.historyEventBackfillStore = { selectHistoryEventBackfillWork, appendHistoryEventBackfillBatch, rollbackHistoryEventBackfillBatch, listHistoryEventRuns, getRoutingReport };
})(window);
