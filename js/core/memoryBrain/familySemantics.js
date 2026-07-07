// --- Memory Brain family semantics owner (v0.3.3) ---
// 只处理“facts → family drafts / family naming”的纯语义；不访问 DOM、网络、运行时状态、features 或 platform。
(function registerMemoryBrainFamilySemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    const STOPWORDS = Object.freeze(['user', 'assistant', 'project', 'other', 'natural', 'relates_to', 'prefers', 'wants', 'the', 'and']);

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clampText(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }
    function asArray(value, max) {
        const list = Array.isArray(value) ? value : asText(value).split(/[，,、;；\n]+/);
        const seen = new Set();
        return list.map(item => clampText(item, 80)).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, max || 18);
    }
    function normalizeNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }
    function clamp01(value) { return Math.max(0, Math.min(1, Math.round(normalizeNumber(value, 0) * 100) / 100)); }
    function extractJsonText(text) {
        const raw = asText(text);
        const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fence) return fence[1].trim();
        const objectStart = raw.indexOf('{');
        const arrayStart = raw.indexOf('[');
        const starts = [objectStart, arrayStart].filter(index => index >= 0);
        if (!starts.length) return raw;
        const start = Math.min.apply(null, starts);
        const isArray = start === arrayStart && (objectStart === -1 || arrayStart < objectStart);
        const end = isArray ? raw.lastIndexOf(']') : raw.lastIndexOf('}');
        return end > start ? raw.slice(start, end + 1) : raw.slice(start);
    }
    function textTokens(text) {
        const raw = asText(text).toLowerCase();
        const words = raw.match(/[a-z0-9][a-z0-9_-]{1,}/g) || [];
        const cjk = raw.replace(/[\x00-\x7F]/g, ' ').split(/[\s，,。.!！?？、;；:：()（）【】\[\]《》"'“”‘’]+/)
            .map(item => item.trim()).filter(item => item.length >= 2 && item.length <= 18);
        const bigrams = [];
        cjk.forEach(item => {
            if (item.length <= 6) bigrams.push(item);
            for (let index = 0; index < item.length - 1 && index < 20; index += 2) bigrams.push(item.slice(index, index + 2));
        });
        return words.concat(cjk, bigrams).filter(token => !STOPWORDS.includes(token));
    }
    function factTokens(fact) {
        const source = fact && typeof fact === 'object' ? fact : {};
        return unique(asArray(source.keywords, 12).concat(asArray(source.labels, 10), [source.factType, source.subject, source.predicate, source.object], textTokens(source.content)));
    }
    function familyTokens(family) {
        const source = family && typeof family === 'object' ? family : {};
        return unique(asArray(source.keywords, 18).concat(asArray(source.labels, 12), textTokens(source.title || source.name), textTokens(source.summary), textTokens(source.seedText)));
    }
    function focusedFactTokens(fact) {
        const source = fact && typeof fact === 'object' ? fact : {};
        return unique(asArray(source.keywords, 12).concat(asArray(source.labels, 10), [source.factType, source.object]), 24);
    }
    function focusedFamilyTokens(family) {
        const source = family && typeof family === 'object' ? family : {};
        return unique(asArray(source.keywords, 18).concat(asArray(source.labels, 12), textTokens(source.title || source.name)), 28);
    }
    function unique(list, max) {
        const seen = new Set();
        return (Array.isArray(list) ? list : []).map(item => asText(item)).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key) || STOPWORDS.includes(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, max || 32);
    }
    function cosineSimilarity(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b) || !a.length || a.length !== b.length) return 0;
        let dot = 0, normA = 0, normB = 0;
        for (let index = 0; index < a.length; index++) {
            const av = Number(a[index]) || 0;
            const bv = Number(b[index]) || 0;
            dot += av * bv; normA += av * av; normB += bv * bv;
        }
        return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
    }
    function overlapScore(leftTokens, rightTokens) {
        const left = unique(leftTokens);
        const right = unique(rightTokens);
        if (!left.length || !right.length) return 0;
        const rightSet = new Set(right.map(item => item.toLowerCase()));
        const hit = left.filter(item => rightSet.has(item.toLowerCase())).length;
        const coverage = hit / Math.min(left.length, right.length);
        const jaccard = hit / Math.max(1, left.length + right.length - hit);
        return clamp01(coverage * 0.7 + jaccard * 0.3);
    }
    function scoreFactToFamily(fact, family) {
        const lexical = Math.max(overlapScore(factTokens(fact), familyTokens(family)), overlapScore(focusedFactTokens(fact), focusedFamilyTokens(family)));
        const vector = cosineSimilarity(fact && fact.vector, family && family.vector);
        const score = vector > 0 ? vector * 0.65 + lexical * 0.35 : lexical;
        return { score: clamp01(score), lexicalScore: lexical, vectorScore: clamp01(vector) };
    }
    function scoreFactToFact(left, right) {
        const lexical = Math.max(overlapScore(factTokens(left), factTokens(right)), overlapScore(focusedFactTokens(left), focusedFactTokens(right)));
        const vector = cosineSimilarity(left && left.vector, right && right.vector);
        const sameType = asText(left && left.factType) && asText(left && left.factType) === asText(right && right.factType) ? 0.08 : 0;
        return clamp01((vector > 0 ? vector * 0.65 + lexical * 0.35 : lexical) + sameType);
    }
    function summarizeKeywords(facts) {
        const counts = new Map();
        (Array.isArray(facts) ? facts : []).forEach(fact => factTokens(fact).forEach(token => counts.set(token, (counts.get(token) || 0) + 1)));
        return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).map(item => item[0]).slice(0, 10);
    }
    function buildFallbackTitle(keywords) {
        const list = asArray(keywords, 3).filter(item => item.length >= 2);
        return list.length ? list.slice(0, 2).join(' / ') : '新的记忆家族';
    }
    function createDraft(action, facts, family, scoreInfo) {
        const keywords = summarizeKeywords(facts);
        const factIds = facts.map(fact => fact.id).filter(Boolean);
        const draftKey = family && family.id ? `update:${family.id}` : `create:${keywords.slice(0, 3).join('|') || factIds.join('|')}`;
        return {
            draftKey,
            action,
            familyId: family && family.id || '',
            currentTitle: family && (family.title || family.name) || '',
            title: family && (family.title || family.name) || buildFallbackTitle(keywords),
            summary: family && family.summary || `围绕「${buildFallbackTitle(keywords)}」形成的记忆主题，当前包含 ${factIds.length} 条事实。`,
            keywords,
            labels: unique(facts.flatMap(fact => asArray(fact.labels, 8)), 12),
            factIds,
            facts: facts.map(fact => ({ id: fact.id, content: clampText(fact.content, 180), confidence: fact.confidence || 0.7 })),
            confidence: clamp01(facts.reduce((sum, fact) => sum + normalizeNumber(fact.confidence, 0.7), 0) / Math.max(1, facts.length)),
            match: scoreInfo || null,
            sourceReason: action === 'update' ? '新事实与已有家族相似，自动并入候选。' : '多条事实共享关键词、标签或向量相似度，形成新家族候选。'
        };
    }
    function buildFamilyDrafts(facts, families, options = {}) {
        const activeFacts = (Array.isArray(facts) ? facts : []).filter(fact => fact && fact.status !== 'retired' && fact.content);
        const activeFamilies = (Array.isArray(families) ? families : []).filter(family => family && family.status !== 'retired');
        const threshold = Math.max(0.35, Math.min(0.95, normalizeNumber(options.threshold, 0.7)));
        const newFamilyThreshold = Math.max(0.25, Math.min(0.9, normalizeNumber(options.newFamilyThreshold, 0.28)));
        const minNewFacts = Math.max(1, Number(options.minNewFacts) || 2);
        const byFamily = new Map();
        const unassigned = [];
        activeFacts.forEach(fact => {
            if (!options.rebuild && Array.isArray(fact.familyIds) && fact.familyIds.length) return;
            let best = null;
            activeFamilies.forEach(family => {
                const result = scoreFactToFamily(fact, family);
                if (!best || result.score > best.score) best = Object.assign({ family }, result);
            });
            if (best && best.score >= threshold) {
                const key = best.family.id;
                if (!byFamily.has(key)) byFamily.set(key, { family: best.family, facts: [], scores: [] });
                byFamily.get(key).facts.push(fact);
                byFamily.get(key).scores.push(best);
            } else {
                unassigned.push(fact);
            }
        });
        const drafts = [];
        byFamily.forEach(group => drafts.push(createDraft('update', group.facts, group.family, { threshold, scores: group.scores })));
        const used = new Set();
        unassigned.forEach(seed => {
            if (used.has(seed.id)) return;
            const group = [seed]; used.add(seed.id);
            unassigned.forEach(other => {
                if (used.has(other.id)) return;
                if (scoreFactToFact(seed, other) >= newFamilyThreshold) { group.push(other); used.add(other.id); }
            });
            if (group.length >= minNewFacts || options.allowSingleSeed) drafts.push(createDraft('create', group, null, { threshold: newFamilyThreshold }));
        });
        return drafts;
    }
    function buildFamilyNamingPrompt(drafts, allFacts, options = {}) {
        const maxFamilies = Math.max(1, Math.min(12, Number(options.maxFamilies) || 8));
        const payload = (Array.isArray(drafts) ? drafts : []).slice(0, maxFamilies).map(draft => ({
            draftKey: draft.draftKey,
            action: draft.action,
            currentTitle: draft.currentTitle,
            titleHint: draft.title,
            keywords: draft.keywords,
            labels: draft.labels,
            facts: draft.facts
        }));
        return [
            '你是 OWO 小手机 App 的长期记忆脑“记忆家族”命名器。',
            '任务：给每个 family draft 起自然、温柔、可长期使用的家族名，并写 1-2 句摘要。不要固定分类，不要做 graph，不要写人物画像或 prompt 注入。',
            '原则：忠于 facts；名称像“个人 AI 外置大脑 / 关系连续性 / 小手机 App 开发”这种自然主题，不要企业知识库腔。',
            '只输出 JSON，不要 markdown。JSON schema：',
            '{ "families": [{ "draftKey": "原 draftKey", "title": "家族名", "summary": "家族摘要", "labels": ["自然标签"], "keywords": ["召回关键词"], "memoryTone": "这组记忆的情绪/关系调性", "sourceReason": "为什么这些事实属于同一家族" }] }',
            '',
            'Family drafts:',
            JSON.stringify(payload, null, 2)
        ].join('\n');
    }
    function normalizeNamedFamily(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        return {
            draftKey: asText(source.draftKey || source.id),
            title: clampText(source.title || source.name || '新的记忆家族', 80),
            summary: clampText(source.summary || source.description || '', 420),
            labels: asArray(source.labels || source.tags, 12),
            keywords: asArray(source.keywords || source.searchTerms, 14),
            memoryTone: clampText(source.memoryTone || source.tone || '', 80),
            sourceReason: clampText(source.sourceReason || source.reason || '', 360)
        };
    }
    function parseFamilyNamingResponse(text) {
        const jsonText = extractJsonText(text);
        if (!jsonText) return { ok: false, families: [], rawText: asText(text), diagnostics: ['empty_response'] };
        try {
            const parsed = JSON.parse(jsonText);
            const list = Array.isArray(parsed) ? parsed : (parsed.families || parsed.items || []);
            if (!Array.isArray(list)) return { ok: false, families: [], rawText: asText(text), diagnostics: ['families_not_array'] };
            const families = list.map(normalizeNamedFamily).filter(item => item.draftKey && item.title);
            return { ok: families.length > 0, families, rawText: asText(text), diagnostics: families.length ? [] : ['empty_families'] };
        } catch (error) {
            return { ok: false, families: [], rawText: asText(text), diagnostics: ['json_parse_failed: ' + error.message] };
        }
    }
    function applyFamilyNames(drafts, names) {
        const byKey = new Map((Array.isArray(names) ? names : []).map(item => [item.draftKey, item]));
        return (Array.isArray(drafts) ? drafts : []).map(draft => {
            const named = byKey.get(draft.draftKey) || {};
            return Object.assign({}, draft, {
                title: named.title || draft.title,
                summary: named.summary || draft.summary,
                labels: unique((named.labels || []).concat(draft.labels || []), 12),
                keywords: unique((named.keywords || []).concat(draft.keywords || []), 14),
                memoryTone: named.memoryTone || draft.memoryTone || '',
                sourceReason: named.sourceReason || draft.sourceReason
            });
        });
    }
    function compactFamilyForList(family, facts) {
        const factMap = new Map((Array.isArray(facts) ? facts : []).map(fact => [fact.id, fact]));
        const factIds = asArray(family && family.factIds, 60);
        const members = factIds.map(id => factMap.get(id)).filter(Boolean).slice(0, 6).map(fact => clampText(fact.content, 120));
        return {
            id: family && family.id,
            title: family && (family.title || family.name) || '未命名家族',
            summary: clampText(family && family.summary, 260),
            labels: asArray(family && family.labels, 10),
            keywords: asArray(family && family.keywords, 10),
            memoryTone: family && family.memoryTone || '',
            factCount: factIds.length,
            confidenceText: Math.round(clamp01(family && family.confidence || 0.7) * 100) + '%',
            sourceReason: clampText(family && family.sourceReason, 180),
            memberFacts: members,
            status: family && family.status || 'active',
            updatedAt: family && family.updatedAt || family && family.createdAt || ''
        };
    }

    core.memoryBrain.familySemantics = {
        factTokens,
        familyTokens,
        scoreFactToFamily,
        scoreFactToFact,
        buildFamilyDrafts,
        buildFamilyNamingPrompt,
        parseFamilyNamingResponse,
        applyFamilyNames,
        compactFamilyForList
    };
})(OwoApp);
