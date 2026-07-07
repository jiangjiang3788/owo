// --- Memory Brain event timeline service owner (v0.3.1) ---
// 编排“最近聊天 → AI 事件摘要 → memoryBrain.events”，不渲染 DOM，不改旧记忆注入路径。
(function registerMemoryBrainEventTimelineService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function rootState(options) { return (options && options.state) || global.db || {}; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clip(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }
    function getCoreApi() { return app.core.memoryBrain.publicApi; }
    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function record(label, data, level) {
        if (feature.service && typeof feature.service.recordOperation === 'function') {
            return feature.service.recordOperation(label, data || {}, level || 'event');
        }
        return null;
    }
    function chatName(chat) { return chat && (chat.remarkName || chat.name || chat.realName || chat.groupName || '未命名聊天'); }
    function getPrivateChat(state, id) { return asArray(state.characters).find(item => item && item.id === id) || null; }
    function getGroupChat(state, id) { return asArray(state.groups).find(item => item && item.id === id) || null; }
    function findFallbackChat(state) {
        const privateChats = asArray(state.characters).map(chat => ({ chat, chatType: 'private' }));
        const groupChats = asArray(state.groups).map(chat => ({ chat, chatType: 'group' }));
        return privateChats.concat(groupChats)
            .filter(item => asArray(item.chat && item.chat.history).length > 0)
            .sort((a, b) => asArray(b.chat.history).length - asArray(a.chat.history).length)[0] || null;
    }
    function resolveActiveChat(options = {}) {
        const state = rootState(options);
        const currentType = options.chatType || global.currentChatType;
        const currentId = options.chatId || global.currentChatId;
        let chat = null;
        let chatType = currentType;
        if (currentType === 'group') chat = getGroupChat(state, currentId);
        else if (currentType === 'private') chat = getPrivateChat(state, currentId);
        if (!chat) {
            const fallback = findFallbackChat(state);
            chat = fallback && fallback.chat;
            chatType = fallback && fallback.chatType;
        }
        if (!chat) throw new Error('没有可整理的聊天。请先打开一个有聊天记录的对象。');
        return { chat, chatType: chatType || 'private', chatId: chat.id, chatName: chatName(chat) };
    }
    function resolveUserName(chat, chatType) {
        if (chatType === 'group') return chat && chat.me && chat.me.nickname || '我';
        return chat && (chat.myName || chat.userName) || '我';
    }
    function resolvePartnerName(chat, chatType) {
        if (chatType === 'group') return chatName(chat);
        return chat && (chat.remarkName || chat.name || chat.realName) || 'AI';
    }
    function groupSenderName(chat, message) {
        if (!chat || !message || message.role === 'user') return '';
        const member = asArray(chat.members).find(item => item && item.id === message.senderId);
        return member && (member.groupNickname || member.realName || member.name) || '';
    }
    function messageSpeaker(chat, chatType, message) {
        const role = message && message.role;
        if (role === 'system') return '系统';
        if (role === 'user') return resolveUserName(chat, chatType);
        return groupSenderName(chat, message) || resolvePartnerName(chat, chatType);
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
    function normalizeMessages(chatInfo, limit) {
        const history = asArray(chatInfo.chat.history);
        const normalized = history.map((message, index) => ({
            id: message && message.id || '',
            index: index + 1,
            role: message && message.role || 'user',
            speaker: messageSpeaker(chatInfo.chat, chatInfo.chatType, message || {}),
            content: clip(messageContent(message), 1200),
            timestamp: message && (message.timestamp || message.time) || null
        })).filter(item => item.content && item.role !== 'thinking');
        const count = Math.max(1, Math.min(120, Number(limit) || 30));
        return normalized.slice(-count);
    }
    function inputPreview(messages) {
        return messages.map(item => ({ index: item.index, role: item.role, speaker: item.speaker, content: clip(item.content, 180), timestamp: item.timestamp }));
    }
    function getProviderConfig(state) {
        const providerConfig = app.platform.ai && app.platform.ai.providerConfig;
        if (!providerConfig || typeof providerConfig.selectChatProviderConfig !== 'function') throw new Error('AI providerConfig 尚未加载');
        const config = providerConfig.selectChatProviderConfig(state, { isSummary: true });
        if (!providerConfig.isProviderConfigured(config)) throw new Error('请先配置总结 API 或主 API，再生成事件时间线。');
        config.streamEnabled = false;
        return config;
    }
    function buildRequest(config, prompt, options = {}) {
        const adapter = app.platform.ai && app.platform.ai.providerRequestAdapter;
        if (!adapter || typeof adapter.buildPromptCompletionRequest !== 'function') throw new Error('AI providerRequestAdapter 尚未加载');
        return adapter.buildPromptCompletionRequest(config, { prompt, temperature: options.temperature === undefined ? 0.2 : options.temperature, stream: false });
    }
    function extractModelText(data, provider) {
        if (!data) return '';
        if (typeof data === 'string') return data;
        if (data.output_text) return data.output_text;
        if (provider === 'gemini') {
            const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
            return asArray(parts).map(part => part && part.text || '').join('');
        }
        return data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
    }
    async function requestSummaryText(config, prompt, options) {
        const request = buildRequest(config, prompt, options);
        const traceStore = app.platform.ai && app.platform.ai.requestTraceStore;
        const response = traceStore && typeof traceStore.trackedFetch === 'function'
            ? await traceStore.trackedFetch(request, {
                source: 'features/memoryBrain/eventTimelineService',
                label: '记忆脑事件摘要 AI 请求',
                provider: config.provider,
                model: config.model,
                stream: false,
                requestBody: request.requestBody
            })
            : await global.fetch(request.endpoint, request.fetchOptions);
        const text = await response.text();
        if (!response.ok) throw new Error(`事件摘要 API 失败：${response.status} ${text.slice(0, 400)}`);
        try { return extractModelText(JSON.parse(text), config.provider); }
        catch (error) { throw new Error(`事件摘要响应不是 JSON：${text.slice(0, 300)}`); }
    }

    async function generateEventFromRecentMessages(options = {}) {
        const state = rootState(options);
        const chatInfo = resolveActiveChat(options);
        const limit = Number(options.limit) || 30;
        const messages = normalizeMessages(chatInfo, limit);
        if (messages.length < 2) throw new Error('可整理消息少于 2 条，暂时不生成事件。');
        const prompt = getCoreApi().buildEventSummaryPrompt(messages, {
            chatName: chatInfo.chatName,
            userName: resolveUserName(chatInfo.chat, chatInfo.chatType),
            partnerName: resolvePartnerName(chatInfo.chat, chatInfo.chatType)
        });
        const input = {
            chatId: chatInfo.chatId,
            chatType: chatInfo.chatType,
            chatName: chatInfo.chatName,
            limit,
            sourceRange: { startIndex: messages[0].index, endIndex: messages[messages.length - 1].index, messageCount: messages.length },
            messages: inputPreview(messages),
            prompt
        };
        record('记忆脑事件整理输入', input);
        try {
            const config = getProviderConfig(state);
            const rawOutput = await requestSummaryText(config, prompt, options);
            record('记忆脑事件整理模型输出', { chatName: chatInfo.chatName, rawOutput }, 'success');
            const parsed = getCoreApi().parseEventSummaryResponse(rawOutput);
            record('记忆脑事件整理解析结果', { ok: parsed.ok, diagnostics: parsed.diagnostics, draft: parsed.draft }, parsed.ok ? 'success' : 'error');
            if (!parsed.ok) {
                getPlatformApi().appendEventSummaryBatch({ input, rawOutput, parserDiagnostics: parsed.diagnostics, errorMessage: '事件摘要 JSON 解析失败' }, options);
                throw new Error('事件摘要 JSON 解析失败：' + parsed.diagnostics.join('；'));
            }
            const eventDraft = getCoreApi().ensureEventSourceRange(parsed.draft, messages);
            eventDraft.source = Object.assign({}, eventDraft.source, {
                chatId: chatInfo.chatId,
                chatType: chatInfo.chatType,
                chatName: chatInfo.chatName
            });
            const stored = getPlatformApi().appendEventSummaryBatch({
                input,
                rawOutput,
                parsedDraft: parsed.draft,
                parserDiagnostics: parsed.diagnostics,
                event: eventDraft
            }, options);
            record('记忆脑事件整理应用结果', { eventId: stored.event && stored.event.id, batchId: stored.batch && stored.batch.id, title: eventDraft.title }, 'success');
            return Object.assign({ diagnostics: parsed.diagnostics }, stored);
        } catch (error) {
            record('记忆脑事件整理错误', { chatName: chatInfo.chatName, message: error.message }, 'error');
            if (!/JSON 解析失败/.test(error.message || '')) {
                getPlatformApi().appendEventSummaryBatch({ input, errorMessage: error.message }, options);
            }
            throw error;
        }
    }
    function getTimelineEvents(options = {}) { return getPlatformApi().listEvents(options).map(getCoreApi().compactEventForTimeline); }
    function getEventById(id, options = {}) { return getPlatformApi().listEvents(options).find(event => event && event.id === id) || null; }

    feature.eventTimelineService = { generateEventFromRecentMessages, getTimelineEvents, getEventById, resolveActiveChat };
})(window);
