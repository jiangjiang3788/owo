// --- Theater prompt semantics owner (V29 canonical owner) ---
// 只负责小剧场 prompt pieces 和上下文组装；不发请求、不保存、不处理流。
(function registerTheaterPromptSemantics(app) {
    app.core = app.core || {};
    app.core.theater = app.core.theater || {};

    const scene = app.core.theater.sceneSemantics;

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asObject(value) { return value && typeof value === 'object' ? value : {}; }
    function toText(value) { return String(value == null ? '' : value); }
    function trimText(value) { return toText(value).trim(); }
    function clampInt(value, min, max) {
        const n = parseInt(value, 10);
        const safe = Number.isFinite(n) ? n : 0;
        return Math.max(min, Math.min(safe, max));
    }

    function getManualSystemPrompt(mode) {
        if (scene.isHtmlMode(mode)) {
            return `你精通HTML/CSS。请根据用户提供的提示词，结合可能的角色设定和世界观，以 HTML 格式输出。

【最高优先级规则 —— 必须包含完整 CSS】
你的输出第一行必须是 <style> 标签，里面包含本次所有 class / id 的完整 CSS 规则。
绝对禁止只输出 HTML 结构而省略 CSS！没有 CSS 的 HTML 等于白纸，用户什么都看不到。
如果用户提示词里附带了 CSS 模板/示例代码，你必须将该 CSS 原样保留在 <style> 中，不可删减、不可省略、不可拆分。

其他要求：
1. 输出纯 HTML+CSS，禁止使用 <script> 标签或任何 JavaScript。
2. 允许包含交互与动画效果，可用方案：
   - <details><summary>点击展开</summary><div>折叠内容</div></details>
   - <input type="checkbox" id="x"><label for="x">切换</label> 配合 :checked 选择器控制显示/隐藏/样式切换
   - <input type="radio" name="grp" id="r1"><label for="r1">选项</label> 配合 :checked 实现选项卡/分支选择
   - :hover 悬停动画、:target 锚点定位变化
   - CSS transition / animation / @keyframes 制作渐变、淡入淡出、滑动等动画
3. 用 <style> 标签在输出最开头集中书写 CSS，所有视觉效果（布局、颜色、字体、间距、动画、交互状态）全部写在这个 <style> 里。
4. 如果用户提示词中包含了"必须原样输出"的 HTML/CSS 模板代码，你必须逐字保留模板结构与 CSS（标签、属性、ID、class、顺序都不改），只替换占位符文本（如：[中文占位符]）。禁止省略 <style> 或任何关键节点。
5. 直接输出 HTML，不要输出开场白、说明文字或 markdown 代码块包裹（不要写 \`\`\`html ... \`\`\`）。`;
        }
        return `你是一名擅长写短篇小说的作家。请根据用户提供的提示词，结合可能的角色设定和世界观，生成一段完整而精彩的短篇小说。要求：
1. 剧情结构完整，有开端、发展和结尾。
2. 如果提示词中没有明确的世界观和设定，可以自行补充，但不要偏离提示词的核心需求。
3. 直接输出剧本正文，不要输出任何开场白或说明（例如不要输出「好的，作家。这是一段根据你提供的提示词和设定生成的短篇小说。」等句子）。`;
    }

    function formatCharacterInfo(characters) {
        const list = asArray(characters).filter(Boolean);
        if (!list.length) return '';
        return list.map(char => `角色名：${char.realName || char.remarkName || '未命名角色'}\n角色人设：${char.persona || '未设定'}`).join('\n\n');
    }

    function formatPersonaInfo(persona) {
        if (!persona) return '';
        return `名称：${persona.name || ''}\n人设内容：${persona.content || ''}`;
    }

    function formatWorldBookText(worldBooks, limit) {
        const max = Number(limit) || 0;
        return asArray(worldBooks)
            .filter(book => book && !book.disabled)
            .map(book => {
                const content = toText(book.content || '');
                return `【${book.name || book.title || '未命名世界书'}】\n${max > 0 ? content.slice(0, max) : content}`;
            })
            .join('\n\n');
    }

    function messageContentToText(message) {
        const msg = asObject(message);
        if (Array.isArray(msg.parts) && msg.parts.length > 0) {
            return msg.parts.map(part => part && (part.text || '[图片]')).join('');
        }
        return msg.content || '';
    }

    function formatManualHistoryBlocks(characters, options) {
        const config = asObject(options);
        const count = clampInt(config.chatHistoryCount, 0, 200);
        const userName = config.userName || '用户';
        const filterHistory = typeof config.filterHistory === 'function' ? config.filterHistory : null;
        const blocks = [];
        let total = 0;
        if (count <= 0) return { blocks, total };
        asArray(characters).forEach(char => {
            let recent = asArray(char && char.history).slice(-count);
            if (filterHistory) recent = filterHistory(char, recent);
            recent = recent.filter(m => m && !m.isContextDisabled).filter(m => m.role === 'user' || m.role === 'assistant');
            if (!recent.length) return;
            const charName = char.realName || char.remarkName || '角色';
            const text = recent.map(m => `${m.role === 'user' ? userName : charName}: ${messageContentToText(m)}`).join('\n');
            blocks.push(`【${charName}的聊天记录（共${recent.length}条）】\n${text}`);
            total += recent.length;
        });
        return { blocks, total };
    }

    function formatManualJournalBlocks(characters, journalCount) {
        const count = clampInt(journalCount, 0, 50);
        const blocks = [];
        let total = 0;
        if (count <= 0) return { blocks, total };
        asArray(characters).forEach(char => {
            const journals = asArray(char && char.memoryJournals).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, count);
            if (!journals.length) return;
            const charName = char.realName || char.remarkName || '角色';
            const text = journals.map(j => `标题：${j.title || '无标题'}\n内容：${j.content || ''}`).join('\n\n---\n\n');
            blocks.push(`【${charName}的日记总结（共${journals.length}条）】\n${text}`);
            total += journals.length;
        });
        return { blocks, total };
    }

    function buildManualPrompt(input) {
        const source = asObject(input);
        const characters = asArray(source.characters).filter(Boolean);
        const persona = source.persona || null;
        const worldBooks = asArray(source.worldBooks).filter(Boolean);
        const userName = persona ? (persona.name || '用户') : '用户';
        let prompt = trimText(source.customPrompt);
        const characterInfo = formatCharacterInfo(characters);
        if (characterInfo) prompt = `【角色信息】\n${characterInfo}\n\n【用户提示】\n${prompt}`;
        const personaInfo = formatPersonaInfo(persona);
        if (personaInfo) {
            prompt += `\n\n【用户人设】\n${personaInfo}\n\n注意：在生成的小说中，如果提到用户角色，请使用"${persona.name}"作为用户的名字，或使用{{user_name}}占位符（后续会自动替换）。`;
        }
        const worldBookText = formatWorldBookText(worldBooks);
        if (worldBookText) prompt += `\n\n【世界观设定参考】\n${worldBookText}`;
        if (source.contextEnabled && characters.length > 0) {
            const history = formatManualHistoryBlocks(characters, {
                chatHistoryCount: source.chatHistoryCount,
                userName,
                filterHistory: source.filterHistory
            });
            const journals = formatManualJournalBlocks(characters, source.journalCount);
            if (history.blocks.length) prompt += `\n\n【用户与所有角色的最近聊天记录（共${history.total}条）】\n${history.blocks.join('\n\n---\n\n')}`;
            if (journals.blocks.length) prompt += `\n\n【用户与所有角色的日记总结（共${journals.total}条）】\n${journals.blocks.join('\n\n---\n\n')}`;
        }
        return prompt;
    }

    function decideCharacterMode(format, randomValue) {
        const mode = format || 'text';
        const useHtml = mode === 'html' || (mode === 'both' && Number(randomValue) < 0.5);
        return useHtml ? 'html' : 'text';
    }

    function buildCharacterSystemPrompt(character, mode) {
        const charName = (character && (character.realName || character.remarkName)) || '角色';
        if (scene.isHtmlMode(mode)) {
            return `你是"${charName}"，一个有自己独立想法和情感的角色。你平时喜欢写作，会把自己的感受和与身边人的故事写成小剧场。
现在，你要基于自己的人设和最近与用户的聊天，主动写一段你自己的HTML小剧场作品。

【最高优先级规则 —— 必须包含完整 CSS】
你的输出第一行必须是 <style> 标签，里面包含本次所有 class / id 的完整 CSS 规则。
绝对禁止只输出 HTML 结构而省略 CSS！

其他要求：
1. 以角色自己的视角写作——就像角色亲手写的，不要透露"你是AI"。
2. 输出纯 HTML+CSS，禁止使用 <script> 标签或 JavaScript。
3. 可以包含 :hover、:checked 选择器等纯CSS交互效果。
4. 直接输出 HTML，不要输出开场白、说明文字或 markdown 代码块包裹（不要写 \`\`\`html）。`;
        }
        return `你是"${charName}"，一个有自己独立想法和情感的角色。你平时喜欢写作，会把自己的感受和与身边人的故事写成小短篇。
现在，你要基于自己的人设和最近与用户的聊天，主动写一段你自己的小剧场作品（纯文字短篇故事）。

要求：
1. 以角色自己的视角写作——就像角色亲手写的，用第一人称或全知视角均可，体现角色独特性格。
2. 剧情结构完整，有开端、发展和结尾。
3. 直接输出正文，不要输出任何开场白或"这是根据……生成的"等说明。`;
    }

    function buildCharacterPrompt(input) {
        const source = asObject(input);
        const char = source.character || {};
        const charName = char.realName || char.remarkName || '角色';
        const myName = char.myName || '用户';
        const chatCount = clampInt(char.charTheaterChatCount || 20, 0, 200);
        const recentHistory = chatCount > 0
            ? asArray(char.history)
                .filter(m => m && !m.isContextDisabled && !m.isThinking && (m.role === 'user' || m.role === 'assistant'))
                .slice(-chatCount)
                .map(m => {
                    let content = messageContentToText(m).replace(/\[system[^\]]*\]/gi, '').replace(/\[小剧场分享:[^\]]*\]/gi, '').trim();
                    const sender = m.role === 'user' ? myName : charName;
                    return `${sender}：${content.slice(0, 300)}`;
                })
                .filter(line => line.length > 4)
                .join('\n')
            : '';
        const journalCount = clampInt(char.charTheaterJournalCount || 0, 0, 50);
        const journalText = journalCount > 0
            ? asArray(char.memoryJournals).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, journalCount)
                .map(j => `【${j.title || '日记'}】${toText(j.content).slice(0, 400)}`)
                .join('\n\n')
            : '';
        const worldBookText = formatWorldBookText(source.worldBooks, 600);
        let userPersonaText = trimText(char.myPersona);
        if (!userPersonaText && source.defaultPersona) {
            userPersonaText = `${source.defaultPersona.name}：${source.defaultPersona.content || ''}`;
        }
        let userPrompt = `【我的角色设定（${charName}）】\n${char.persona || '（未设定）'}`;
        if (userPersonaText) userPrompt += `\n\n【与我互动的用户人设】\n用户名：${myName}\n${userPersonaText}`;
        if (worldBookText) userPrompt += `\n\n【世界观参考设定】\n${worldBookText}`;
        if (journalText) userPrompt += `\n\n【我们之间的记忆总结】\n${journalText}`;
        userPrompt += `\n\n【最近的聊天记录（共${chatCount}条）】\n${recentHistory || '（暂无聊天记录）'}`;
        const customPrompt = trimText(char.charTheaterPrompt);
        if (customPrompt) userPrompt += `\n\n【额外创作要求】\n${customPrompt}`;
        userPrompt += `\n\n请现在写一段小剧场作品，题材和风格由你自由发挥，但需要体现你（${charName}）的性格特点，以及你与用户（${myName}）之间的关系和最近发生的事。`;
        return { userPrompt, chatCount, journalCount, customPrompt, charName, myName };
    }

    app.core.theater.promptSemantics = {
        getManualSystemPrompt,
        formatCharacterInfo,
        formatPersonaInfo,
        formatWorldBookText,
        formatManualHistoryBlocks,
        formatManualJournalBlocks,
        buildManualPrompt,
        decideCharacterMode,
        buildCharacterSystemPrompt,
        buildCharacterPrompt
    };
})(OwoApp);
