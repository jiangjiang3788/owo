// --- Chat prompt context helpers (V15 canonical owner) ---
// 只负责把已有内存快照整理成 prompt 上下文片段；不访问 DOM、存储、网络或 compat facade。
(function registerChatPromptContext(app) {
    const core = app.core;
    core.chat = core.chat || {};

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function getState(deps) {
        return deps && deps.state ? deps.state : {};
    }

    const worldBookSemantics = app.core.memory.worldBookSemantics;
    const worldBookContextService = app.features.worldBook.contextService;

    function resolveLinkedCharacter(character, deps) {
        return worldBookSemantics.resolveLinkedCharacter(character, getState(deps));
    }

    function getActiveNode(character) {
        return worldBookSemantics.getActiveNode(character);
    }

    function isOfflineNode(character) {
        return worldBookSemantics.isOfflineNode(character);
    }

    // @compat canonical: OwoApp.features.worldBook.contextService.getActiveWorldBooksContents
    function getActiveWorldBooksContents(character, deps) {
        return worldBookContextService.getActiveWorldBooksContents(character, { state: getState(deps) });
    }

    function formatPeekContentForPrompt(entry) {
        if (!entry || !entry.content) return '';
        const c = entry.content;
        const appName = entry.appName || entry.appId || '';
        const maxLen = 600;
        const trunc = (value) => {
            const text = value ? String(value) : '';
            return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
        };
        let text = '';
        switch (entry.appId) {
            case 'messages':
                if (Array.isArray(c.conversations)) {
                    text = c.conversations.map(cv => {
                        const last = cv.history && cv.history.length ? cv.history[cv.history.length - 1] : null;
                        const lastContent = last ? (last.content || '').replace(/\[.*?\]/g, '').trim() : '…';
                        return `与 ${cv.partnerName || '某人'} 的对话，最近一条：${trunc(lastContent)}`;
                    }).join('；');
                }
                break;
            case 'album':
                if (Array.isArray(c.photos)) text = c.photos.map(p => `照片/视频：${trunc(p.imageDescription)}；批注：${trunc(p.description)}`).join('；');
                break;
            case 'memos':
                if (Array.isArray(c.memos)) text = c.memos.map(m => `《${m.title || '无标题'}》${trunc(m.content)}`).join('；');
                break;
            case 'unlock':
                text = `昵称：${c.nickname || ''}；签名：${trunc(c.bio)}；帖子数：${(c.posts && c.posts.length) || 0}。`;
                if (c.posts && c.posts.length) text += ' 最近帖子：' + c.posts.slice(0, 3).map(p => trunc(p.content)).join(' | ');
                break;
            case 'wallet':
                text = `收入 ${(c.income && c.income.length) || 0} 条，支出 ${(c.expense && c.expense.length) || 0} 条。`;
                if (c.summary) text += ' 摘要：' + trunc(c.summary);
                break;
            case 'drafts':
                if (c.draft) text = `收件人：${c.draft.to || ''}；内容：${trunc(c.draft.content)}`;
                break;
            case 'steps':
                text = `当前步数：${c.currentSteps ?? '?'}；${(c.annotation && trunc(c.annotation)) || ''}`;
                break;
            case 'cart':
                if (Array.isArray(c.items)) text = `共 ${c.items.length} 件：` + c.items.map(i => i.name || i.title || '商品').join('、');
                break;
            case 'browser':
                if (Array.isArray(c.history)) text = c.history.slice(0, 5).map(h => h.title || h.url || '').filter(Boolean).join('；');
                break;
            case 'transfer':
                if (Array.isArray(c.entries)) text = c.entries.map(e => e.content || e.title || '').filter(Boolean).map(trunc).join('；');
                break;
            case 'timeThoughts':
                if (Array.isArray(c.thoughts)) text = c.thoughts.map(t => trunc(t.content || t.text)).join('；');
                break;
            default:
                text = trunc(JSON.stringify(c));
        }
        return `【${appName}】${text || '（无内容摘要）'}`;
    }

    function buildUserPhoneStatePrompt(character) {
        if (!character || !character.phoneControlEnabled) return { text: '', consume: [] };
        const pad = (n) => (n < 10 ? '0' + n : '' + n);
        const consume = [];
        let out = '\n<phone_control>\n';
        out += '你现在拥有查看并操控用户手机的权限。你看到的是用户的真实手机。\n\n';
        out += '【你可使用的操控指令】\n';
        out += '- [phone-control:view-chat-list] — 查看用户聊天列表概览（角色名/群聊名及最近一条预览）\n';
        out += '- [phone-control:read-chat|target:角色名或群聊名] — 查看与某对话的最近若干条消息\n';
        out += '- [phone-control:send-message|target:角色名或群聊名|content:消息内容] — 以用户身份向该对话发送消息；content 中换行会拆成多条依次发送\n';
        out += '- [phone-control:delete-character|target:角色名] — 将某角色移入回收站\n';
        out += '- [phone-control:toggle-setting|target:角色名|setting:设置项|value:on或off] — 开关该角色的某项设置\n';
        out += '- [phone-control:clear-history|target:角色名或群聊名] — 清空该对话的聊天记录\n';
        out += '可一次输出多条指令，系统会全部执行。请勿在回复中写出指令的说明文字，仅输出要执行的指令。\n';
        const history = asArray(character.phoneControlHistory);
        if (history.length > 0) {
            out += '\n【你近期的操控记录】\n';
            history.slice(-15).forEach(h => {
                const t = h && h.timestamp ? new Date(h.timestamp) : null;
                const timeStr = t ? `${pad(t.getMonth() + 1)}/${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}` : '';
                out += `- ${timeStr} ${h.type === 'view' ? '查看' : '操作'}：${h.action || ''} ${h.target ? '(' + h.target + ')' : ''} ${h.detail ? '— ' + (String(h.detail).slice(0, 80)) : ''}\n`;
            });
        }
        if (character.phoneControlLastViewChatListResult) {
            out += '\n' + character.phoneControlLastViewChatListResult;
            consume.push('phoneControlLastViewChatListResult');
        }
        if (character.phoneControlLastReadResult) {
            const r = character.phoneControlLastReadResult;
            out += '\n【你刚才查看的对话内容】与「' + (r.targetName || '') + '」的最近' + (r.lines ? r.lines.length : 0) + '条消息：\n';
            asArray(r.lines).forEach(line => { out += line + '\n'; });
            consume.push('phoneControlLastReadResult');
        }
        out += '</phone_control>\n\n';
        return { text: out, consume };
    }

    core.chat.promptContext = {
        resolveLinkedCharacter,
        getActiveNode,
        isOfflineNode,
        getActiveWorldBooksContents,
        formatPeekContentForPrompt,
        buildUserPhoneStatePrompt
    };
})(OwoApp);
