// --- Theater scene semantics owner (V29 canonical owner) ---
// 只负责小剧场 scene/model 的纯语义：模式、列表 key、场景归一化、排序、占位符和生成内容清理。
(function registerTheaterSceneSemantics(app) {
    app.core = app.core || {};
    app.core.theater = app.core.theater || {};

    const TEXT_MODE = 'text';
    const HTML_MODE = 'html';

    function now() { return Date.now(); }
    function createId(prefix) { return String(prefix || 'theater') + '_' + now() + '_' + Math.floor(Math.random() * 10000); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asObject(value) { return value && typeof value === 'object' ? value : {}; }
    function toText(value) { return String(value == null ? '' : value); }
    function trimText(value) { return toText(value).trim(); }

    function escapeHtml(value) {
        return toText(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeMode(mode) {
        return mode === HTML_MODE ? HTML_MODE : TEXT_MODE;
    }

    function isHtmlMode(mode) {
        return normalizeMode(mode) === HTML_MODE;
    }

    function getScenarioListKey(mode) {
        return isHtmlMode(mode) ? 'theaterHtmlScenarios' : 'theaterScenarios';
    }

    function getPromptPresetListKey(mode) {
        return isHtmlMode(mode) ? 'theaterHtmlPromptPresets' : 'theaterPromptPresets';
    }

    function normalizeCharIdForScenario(charIds) {
        const ids = asArray(charIds).filter(Boolean);
        if (ids.length === 1) return ids[0];
        if (ids.length > 1) return ids;
        return null;
    }

    function normalizeScenario(raw, fallback) {
        const source = asObject(raw);
        const defaults = asObject(fallback);
        const mode = normalizeMode(source.mode || defaults.mode);
        const normalized = {
            id: trimText(source.id) || createId('scenario'),
            title: trimText(source.title) || (isHtmlMode(mode) ? 'HTML 剧情' : '剧情'),
            content: toText(source.content || defaults.content || ''),
            category: trimText(source.category) || defaults.category || '未分类',
            charId: source.charId !== undefined ? source.charId : (defaults.charId !== undefined ? defaults.charId : null),
            personaId: source.personaId !== undefined ? source.personaId : (defaults.personaId !== undefined ? defaults.personaId : null),
            worldBookIds: asArray(source.worldBookIds !== undefined ? source.worldBookIds : defaults.worldBookIds),
            customPrompt: source.customPrompt !== undefined ? source.customPrompt : (defaults.customPrompt || null),
            createdAt: Number(source.createdAt || source.timestamp || defaults.createdAt) || now(),
            mode
        };
        if (source.isFavorite !== undefined) normalized.isFavorite = Boolean(source.isFavorite);
        if (source.charGenerated !== undefined) normalized.charGenerated = Boolean(source.charGenerated);
        if (source.charGeneratedBy !== undefined) normalized.charGeneratedBy = source.charGeneratedBy;
        return normalized;
    }

    function createScenario(input) {
        return normalizeScenario(Object.assign({}, input || {}, {
            id: (input && input.id) || now().toString(),
            createdAt: (input && input.createdAt) || now()
        }));
    }

    function getScenarioCharIds(scenario) {
        const source = asObject(scenario);
        if (!source.charId) return [];
        return Array.isArray(source.charId) ? source.charId.filter(Boolean) : [source.charId];
    }

    function getCharactersByIds(characters, ids) {
        const list = asArray(characters);
        return asArray(ids).map(id => list.find(item => item && item.id === id)).filter(Boolean);
    }

    function getCharacterDisplayName(scenario, characters) {
        const matched = getCharactersByIds(characters, getScenarioCharIds(scenario));
        if (!matched.length) return '未指定';
        return matched.map(char => char.realName || char.remarkName || '未知角色').join('、');
    }

    function getScenarioCategories(scenarios) {
        return [...new Set(asArray(scenarios).map(item => (item && item.category) || '未分类'))];
    }

    function sortScenariosForList(scenarios) {
        return asArray(scenarios).slice().sort((a, b) => {
            const aFav = a && a.isFavorite ? 1 : 0;
            const bFav = b && b.isFavorite ? 1 : 0;
            if (aFav !== bFav) return bFav - aFav;
            return (Number(b && (b.createdAt || b.timestamp)) || 0) - (Number(a && (a.createdAt || a.timestamp)) || 0);
        });
    }

    function filterScenariosByCategory(scenarios, category) {
        const selected = trimText(category);
        const list = sortScenariosForList(scenarios);
        if (!selected) return list;
        return list.filter(item => ((item && item.category) || '未分类') === selected);
    }

    function replaceScenarioPlaceholders(content, names) {
        const data = asObject(names);
        let text = toText(content);
        if (data.userName) {
            text = text.replace(/\{\{\s*(user|User|USER|user_name)\s*\}\}/g, data.userName);
        }
        if (data.charName) {
            text = text.replace(/\{\{\s*(char|Char|CHAR|char_name)\s*\}\}/g, data.charName);
        }
        return text;
    }

    function stripIntro(text) {
        if (!text || typeof text !== 'string') return text;
        let value = text.trim();
        const introRe = /^好的[，,]?\s*编剧[。.]?\s*[^\n]*?(根据你提供的提示词|根据提示词|根据设定)[^\n]*(短剧脚本|剧情脚本|脚本)[^\n]*[。.！!\s]*\n?/i;
        value = value.replace(introRe, '');
        const firstLineRe = /^[^\n]*(这是一段|下面是根据|以下是)[^\n]*(根据你提供的提示词|短剧脚本|剧情脚本)[^\n]*[。.！!\s]*\n?/im;
        value = value.replace(firstLineRe, '');
        return value.trim();
    }

    function stripHtmlCodeFence(content) {
        return toText(content).trim().replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    }

    function normalizeGeneratedContent(content, options) {
        const config = asObject(options);
        const mode = normalizeMode(config.mode);
        let value = toText(content).trim();
        const report = { content: value, mode, missingStyle: false };
        if (isHtmlMode(mode)) {
            value = stripHtmlCodeFence(value);
            const hasClassOrId = /class\s*=\s*["']/i.test(value);
            const hasStyleTag = /<style\b/i.test(value);
            if (hasClassOrId && !hasStyleTag) {
                const styleMatch = toText(config.customPrompt).match(/<style\b[^>]*>[\s\S]*?<\/style>/i);
                if (styleMatch) {
                    value = styleMatch[0] + '\n' + value;
                } else if (config.fallbackStyle) {
                    value = config.fallbackStyle + '\n' + value;
                } else {
                    report.missingStyle = true;
                }
            }
        } else {
            value = stripIntro(value);
        }
        value = value
            .replace(/\{\{\s*(user|User|USER)\s*\}\}/g, '{{user_name}}')
            .replace(/\{\{\s*(char|Char|CHAR)\s*\}\}/g, '{{char_name}}');
        if (!isHtmlMode(mode)) {
            value = value.replace(/\b(user|User|USER)\b/g, '{{user_name}}').replace(/\b(char|Char|CHAR)\b/g, '{{char_name}}');
        }
        if (config.userName) value = value.replace(/\{\{user_name\}\}/g, config.userName);
        if (config.charName) value = value.replace(/\{\{char_name\}\}/g, config.charName);
        report.content = value;
        return report;
    }

    app.core.theater.sceneSemantics = {
        TEXT_MODE,
        HTML_MODE,
        escapeHtml,
        normalizeMode,
        isHtmlMode,
        getScenarioListKey,
        getPromptPresetListKey,
        normalizeCharIdForScenario,
        normalizeScenario,
        createScenario,
        getScenarioCharIds,
        getCharactersByIds,
        getCharacterDisplayName,
        getScenarioCategories,
        sortScenariosForList,
        filterScenariosByCategory,
        replaceScenarioPlaceholders,
        stripIntro,
        stripTheaterIntro: stripIntro,
        stripHtmlCodeFence,
        normalizeGeneratedContent
    };
})(OwoApp);
