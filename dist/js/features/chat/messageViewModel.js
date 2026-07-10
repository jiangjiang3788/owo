// --- Chat message view model owner (V16 canonical owner) ---
// 只负责消息渲染前的 view model 归一化；不保存消息、不发起 AI 请求、不处理 stream。
(function registerChatMessageViewModel(global) {
    const OwoApp = global.OwoApp;
    const chatFeature = OwoApp.features.chat;

    function asObject(value) {
        return value && typeof value === 'object' ? value : {};
    }

    function getChat(sourceDb, currentChatType, currentChatId) {
        const state = asObject(sourceDb);
        if (currentChatType === 'private') {
            return Array.isArray(state.characters)
                ? state.characters.find(character => character.id === currentChatId)
                : null;
        }
        return Array.isArray(state.groups)
            ? state.groups.find(group => group.id === currentChatId)
            : null;
    }

    function formatTimestampByFormat(timestamp, chat, padFn) {
        const d = new Date(timestamp);
        const pad = typeof padFn === 'function'
            ? padFn
            : value => String(value).padStart(2, '0');
        const fmt = asObject(chat).timestampFormat || 'hm';
        if (fmt === 'hms') {
            return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
        if (fmt === 'ymd') {
            return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
        }
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function normalizeMessageForView(message, chat) {
        const source = asObject(message);
        const normalized = Object.assign({}, source);
        let content = normalized.content;
        let isThinking = Boolean(normalized.isThinking);

        if (normalized.role === 'assistant' && chat && chat.myName && typeof content === 'string') {
            content = content.replace(/\{\{user\}\}/g, chat.myName);
        }
        if (content && typeof content === 'string' && content.trim().startsWith('<thinking>')) {
            isThinking = true;
        }

        normalized.content = content;
        normalized.isThinking = isThinking;
        return normalized;
    }

    function getAvatarClass(chat, role, isContinuous) {
        const avatarMode = asObject(chat).avatarMode || 'full';
        let avatarClass = 'message-avatar';
        if (avatarMode === 'hidden') {
            avatarClass += ' avatar-hidden';
        } else if (avatarMode === 'kkt') {
            if (role === 'user') {
                avatarClass += ' avatar-hidden';
            } else if (isContinuous) {
                avatarClass += ' avatar-invisible';
            }
        } else if (avatarMode === 'merge' && isContinuous) {
            avatarClass += ' avatar-invisible';
        }
        return avatarClass;
    }

    function resolveSenderView(chat, currentChatType, message) {
        const sourceChat = asObject(chat);
        const sourceMessage = asObject(message);
        let avatarUrl = sourceMessage.role === 'user' ? sourceChat.myAvatar : sourceChat.avatar;
        let senderNickname = '';

        if (currentChatType === 'group') {
            if (sourceMessage.role === 'user') {
                avatarUrl = asObject(sourceChat.me).avatar;
                senderNickname = asObject(sourceChat.me).nickname || '';
            } else {
                const members = Array.isArray(sourceChat.members) ? sourceChat.members : [];
                const sender = members.find(member => member.id === sourceMessage.senderId);
                if (sender) {
                    avatarUrl = sender.avatar;
                    senderNickname = sender.groupNickname;
                } else {
                    avatarUrl = 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg';
                }
            }
        }

        return { avatarUrl, senderNickname };
    }

    function parseBilingualContent(content, message, chat) {
        if (!asObject(chat).bilingualModeEnabled || asObject(message).role !== 'assistant' || asObject(message).isThinking) {
            return null;
        }
        if (typeof content !== 'string') return null;

        const contentMatch = content.match(/^\[.*?(?:消息|回复)[：:]([\s\S]+)\]$/);
        if (!contentMatch) return null;
        const mainText = contentMatch[1].trim();

        const bracketMatch = parseTrailingPair(mainText, '「', '」');
        if (bracketMatch) return bracketMatch;
        return parseTrailingParenPair(mainText);
    }

    function parseTrailingPair(text, openMark, closeMark) {
        const lastClose = text.lastIndexOf(closeMark);
        if (lastClose <= -1) return null;
        const lastOpen = text.lastIndexOf(openMark, lastClose);
        if (lastOpen <= -1) return null;
        const chineseText = text.substring(lastOpen + openMark.length, lastClose).trim();
        const foreignText = text.substring(0, lastOpen).trim();
        if (!foreignText || !chineseText) return null;
        return { foreignText, chineseText };
    }

    function parseTrailingParenPair(text) {
        const lastClose = Math.max(text.lastIndexOf(')'), text.lastIndexOf('）'));
        if (lastClose <= -1) return null;
        const lastOpen = Math.max(text.lastIndexOf('(', lastClose), text.lastIndexOf('（', lastClose));
        if (lastOpen <= -1) return null;
        const chineseText = text.substring(lastOpen + 1, lastClose).trim();
        const foreignText = text.substring(0, lastOpen).trim();
        if (!foreignText || !chineseText) return null;
        return { foreignText, chineseText };
    }

    function createMessageViewModel(message, context = {}) {
        const chat = context.chat || getChat(context.state, context.currentChatType, context.currentChatId);
        const normalizedMessage = normalizeMessageForView(message, chat);
        const isContinuous = Boolean(context.isContinuous);
        const senderView = resolveSenderView(chat, context.currentChatType, normalizedMessage);

        return {
            chat,
            message: normalizedMessage,
            role: normalizedMessage.role,
            content: normalizedMessage.content,
            isThinking: normalizedMessage.isThinking,
            isSent: normalizedMessage.role === 'user',
            isDebugMode: Boolean(context.isDebugMode),
            isContinuous,
            avatarClass: getAvatarClass(chat, normalizedMessage.role, isContinuous),
            timeString: formatTimestampByFormat(normalizedMessage.timestamp, chat, context.pad),
            bilingual: parseBilingualContent(normalizedMessage.content, normalizedMessage, chat),
            senderView
        };
    }

    chatFeature.messageViewModel = {
        getChat,
        formatTimestampByFormat,
        normalizeMessageForView,
        getAvatarClass,
        resolveSenderView,
        parseBilingualContent,
        createMessageViewModel
    };
})(window);
