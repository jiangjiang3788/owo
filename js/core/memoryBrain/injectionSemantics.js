// --- Memory Brain injection semantics owner (v0.6.1) ---
// 只负责 snapshot + 当前输入 → 影子注入包的纯语义；不访问 DOM、网络、运行时状态、features、platform 或正式 prompt。
(function registerMemoryBrainInjectionSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function rawArray(value) { return Array.isArray(value) ? value : []; }
    function clampText(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }
    function unique(list, max) {
        const seen = new Set();
        return rawArray(list).map(asText).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, max || 100);
    }
    function asArray(value, max) {
        const list = Array.isArray(value) ? value : asText(value).split(/[，,、;；\n]+/);
        return unique(list, max || 24);
    }
    function normalizeConfidence(value, fallback) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(0, Math.min(1, number > 1 ? number / 100 : number));
    }
    function cjkBigrams(text) {
        const chunks = asText(text).match(/[\u3400-\u9fff]{2,}/g) || [];
        const grams = [];
        chunks.forEach(chunk => {
            for (let index = 0; index < chunk.length - 1; index += 1) grams.push(chunk.slice(index, index + 2));
        });
        return grams;
    }
    function tokenize(value) {
        const text = asText(value).toLowerCase();
        const words = text.match(/[a-z0-9_\-]{2,}/g) || [];
        return unique(words.concat(cjkBigrams(text)), 120);
    }
    function tokenScore(queryTokens, candidateText) {
        const text = asText(candidateText).toLowerCase();
        if (!queryTokens.length || !text) return 0;
        const candidateTokens = new Set(tokenize(text));
        let score = 0;
        queryTokens.forEach(token => {
            if (candidateTokens.has(token)) score += 1;
            else if (token.length >= 2 && text.includes(token)) score += 0.65;
        });
        return score / Math.max(3, queryTokens.length);
    }
    function itemText(item, fields) {
        return fields.map(field => {
            const value = item && item[field];
            return Array.isArray(value) ? value.join(' ') : value;
        }).join(' ');
    }
    function numberScore(value, fallback) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback || 0;
        return Math.max(0, Math.min(1, number > 1 ? number / 100 : number));
    }
    function freshnessScore(item) {
        const time = Date.parse(item && (item.updatedAt || item.lastWeightAt || item.createdAt || item.source && item.source.createdAt) || '');
        if (!Number.isFinite(time)) return 0.04;
        const days = Math.max(0, (Date.now() - time) / 86400000);
        if (days <= 7) return 0.16;
        if (days <= 30) return 0.11;
        if (days <= 180) return 0.06;
        return 0.02;
    }
    function trustScore(item, fallback) {
        const level = asText(item && item.trustLevel).toLowerCase();
        if (level === 'high' || level === '高可信') return 0.16;
        if (level === 'medium' || level === '中可信') return 0.09;
        if (level === 'low' || level === '低可信') return -0.12;
        if (level === 'risky' || level === 'high-risk' || level === '高风险') return -0.22;
        return numberScore(item && item.trustScore, fallback || 0.58) * 0.14 - 0.04;
    }
    function weightScore(item) {
        return Math.max(numberScore(item && item.weight, 0), numberScore(item && item.activation, 0)) * 0.12;
    }
    function lifecyclePenalty(item) {
        const status = asText(item && (item.lifecycleStatus || item.status)).toLowerCase();
        if (/retired|duplicate|obsolete|merged/.test(status)) return -1;
        if (/disputed|needs-edit|low-trust/.test(status)) return -0.35;
        if (item && item.sourceStale) return -0.18;
        if (item && item.needsRebuildReason) return -0.14;
        return 0;
    }
    function scoreFact(fact, queryTokens) {
        const text = itemText(fact, ['content', 'subject', 'predicate', 'object', 'factType', 'keywords', 'labels', 'evidenceQuote']);
        const graphBoost = Math.min(0.12, rawArray(fact && fact.familyIds).length * 0.035 + rawArray(fact && fact.edgeIds).length * 0.02);
        return Math.max(0, Math.min(1, tokenScore(queryTokens, text) * 0.62 + normalizeConfidence(fact && fact.confidence, 0.62) * 0.22 + trustScore(fact, 0.62) + weightScore(fact) + freshnessScore(fact) + graphBoost + lifecyclePenalty(fact)));
    }
    function scoreFamily(family, queryTokens) {
        const text = itemText(family, ['title', 'name', 'summary', 'keywords', 'labels', 'memoryTone']);
        return Math.max(0, Math.min(1, tokenScore(queryTokens, text) * 0.58 + normalizeConfidence(family && family.confidence, 0.68) * 0.18 + trustScore(family, 0.66) + weightScore(family) + freshnessScore(family) + Math.min(0.16, rawArray(family && family.factIds).length * 0.018) + lifecyclePenalty(family)));
    }
    function scoreEdge(edge, queryTokens) {
        const text = itemText(edge, ['sourceLabel', 'targetLabel', 'relationLabel', 'relation', 'reason', 'keywords', 'labels']);
        return Math.max(0, Math.min(1, tokenScore(queryTokens, text) * 0.6 + normalizeConfidence(edge && edge.weight, 0.62) * 0.2 + trustScore(edge, 0.58) + freshnessScore(edge) + lifecyclePenalty(edge)));
    }
    function scoreEvent(event, queryTokens) {
        const text = itemText(event, ['title', 'summary', 'emotion', 'keywords', 'openThreads']);
        return Math.max(0, Math.min(1, tokenScore(queryTokens, text) * 0.62 + normalizeConfidence(event && event.importance, 0.56) * 0.16 + weightScore(event) + freshnessScore(event) + (rawArray(event && event.openThreads).length ? 0.08 : 0) + lifecyclePenalty(event)));
    }
    function scoreModel(model, queryTokens) {
        const text = itemText(model, ['type', 'title', 'summary', 'stableTraits', 'preferences', 'boundaries', 'relationshipNotes', 'projectDecisions', 'openQuestions', 'keywords', 'labels']);
        return Math.max(0, Math.min(1, tokenScore(queryTokens, text) * 0.54 + normalizeConfidence(model && model.confidence, 0.7) * 0.2 + trustScore(model, 0.7) + freshnessScore(model) + 0.14 + lifecyclePenalty(model)));
    }
    function rank(list, scorer, queryTokens, limit, floor) {
        return rawArray(list).map(item => Object.assign({ __score: scorer(item, queryTokens) }, item))
            .filter(item => item && item.status !== 'retired' && lifecyclePenalty(item) > -1 && item.__score >= (floor || 0.18))
            .sort((a, b) => b.__score - a.__score || String(b.trustUpdatedAt || b.updatedAt || b.createdAt || '').localeCompare(String(a.trustUpdatedAt || a.updatedAt || a.createdAt || '')))
            .slice(0, limit || 8);
    }
    function line(prefix, item, text, score) {
        return `${prefix} ${clampText(text, 190)}${score === undefined ? '' : `（匹配 ${Math.round(score * 100)}%）`}`;
    }
    function buildMemoryBlock(selected, options) {
        const lines = ['【Memory Brain 影子注入预览】', '说明：这是 v0.3.6 预览包，只用于对照，不会自动进入正式 prompt。'];
        if (selected.models.length) {
            lines.push('', '【长期模型】');
            selected.models.forEach(model => lines.push(line('-', model, `${model.title || model.type}：${model.summary || ''}`, model.__score)));
        }
        if (selected.families.length) {
            lines.push('', '【相关记忆家族】');
            selected.families.forEach(family => lines.push(line('-', family, `${family.title || family.name || '未命名家族'}：${family.summary || ''}`, family.__score)));
        }
        if (selected.facts.length) {
            lines.push('', '【命中事实】');
            selected.facts.forEach(fact => lines.push(line('-', fact, fact.content || fact.object || fact.id, fact.__score)));
        }
        if (selected.edges.length) {
            lines.push('', '【关系线索】');
            selected.edges.forEach(edge => lines.push(line('-', edge, `${edge.sourceLabel || edge.sourceId} → ${edge.relationLabel || edge.relation} → ${edge.targetLabel || edge.targetId}`, edge.__score)));
        }
        if (selected.events.length) {
            lines.push('', '【相关事件】');
            selected.events.forEach(event => lines.push(line('-', event, `${event.title || '事件'}：${event.summary || ''}`, event.__score)));
        }
        const maxChars = Number(options && options.maxBlockChars) || 3600;
        return clampText(lines.join('\n'), maxChars);
    }
    function toRefCards(list, type, labelField, textField) {
        return rawArray(list).map(item => ({
            id: item && item.id,
            type,
            title: clampText(item && (item[labelField] || item.title || item.name || item.type || item.relationLabel), 90),
            text: clampText(item && (item[textField] || item.summary || item.content || item.reason), 220),
            score: Math.round((Number(item && item.__score) || 0) * 100)
        }));
    }
    function buildDisabledInjectionPackage(query, snapshot, options) {
        const queryText = clampText(query, 1200);
        const queryTokens = tokenize(queryText);
        const memoryBlock = '【Memory Brain 影子注入预览已关闭】\n说明：v0.6.4 一键关闭只禁用 Memory Brain 影子候选；正式聊天仍由当前旧记忆 owner 注入，表格记忆在 memoryMode=table 时仍可总结。';
        return {
            layer: 'injection', kind: 'shadow-injection-preview', mode: 'shadow-disabled', status: 'disabled',
            query: { text: queryText, tokens: queryTokens.slice(0, 32) },
            selected: { modelIds: [], factIds: [], familyIds: [], edgeIds: [], eventIds: [] },
            selectedCards: { models: [], facts: [], families: [], edges: [], events: [] },
            memoryBlock,
            blockCharCount: memoryBlock.length,
            policy: { previewOnly: true, formalPromptInjection: false, shadowInjectionEnabled: false, singleOwnerRequiredBeforeCutover: true, retrievalStrategy: 'disabled-by-owner-recovery' },
            diagnostics: ['shadow_injection_disabled_by_owner_recovery', 'legacy_owner_still_handles_formal_prompt', 'table_memory_summary_preserved_when_memoryMode_table']
        };
    }
    function buildMemoryInjectionPackage(query, snapshot, options = {}) {
        const settings = snapshot && snapshot.settings || {};
        if (settings.shadowInjectionEnabled === false && !options.ignoreShadowOff) return buildDisabledInjectionPackage(query, snapshot, options);
        const queryText = clampText(query, 1200);
        const queryTokens = tokenize(queryText);
        const activeModels = rawArray(snapshot && snapshot.models).filter(model => model && model.status === 'active');
        const selected = {
            models: rank(activeModels, scoreModel, queryTokens, Number(options.maxModels) || 4, queryTokens.length ? 0.2 : 0),
            facts: rank(snapshot && snapshot.facts, scoreFact, queryTokens, Number(options.maxFacts) || 8, queryTokens.length ? 0.2 : 0.05),
            families: rank(snapshot && snapshot.families, scoreFamily, queryTokens, Number(options.maxFamilies) || 5, queryTokens.length ? 0.2 : 0.05),
            edges: rank(snapshot && snapshot.edges, scoreEdge, queryTokens, Number(options.maxEdges) || 10, queryTokens.length ? 0.22 : 0.14),
            events: rank(snapshot && snapshot.events, scoreEvent, queryTokens, Number(options.maxEvents) || 4, queryTokens.length ? 0.22 : 0.05)
        };
        const diagnostics = ['retrieval_strategy_v0_6_1_keywords_trust_weight_recentness'];
        if (!queryText) diagnostics.push('empty_query_used_recent_or_manual_preview');
        if (!selected.models.length) diagnostics.push('no_active_long_term_models_selected');
        if (!selected.facts.length) diagnostics.push('no_relevant_facts_selected');
        const memoryBlock = buildMemoryBlock(selected, options);
        return {
            layer: 'injection', kind: 'shadow-injection-preview', mode: 'shadow', status: 'active',
            query: { text: queryText, tokens: queryTokens.slice(0, 32) },
            selected: {
                modelIds: selected.models.map(item => item.id), factIds: selected.facts.map(item => item.id), familyIds: selected.families.map(item => item.id),
                edgeIds: selected.edges.map(item => item.id), eventIds: selected.events.map(item => item.id)
            },
            selectedCards: {
                models: toRefCards(selected.models, 'model', 'title', 'summary'), facts: toRefCards(selected.facts, 'fact', 'content', 'evidenceQuote'),
                families: toRefCards(selected.families, 'family', 'title', 'summary'), edges: toRefCards(selected.edges, 'edge', 'relationLabel', 'reason'),
                events: toRefCards(selected.events, 'event', 'title', 'summary')
            },
            memoryBlock,
            blockCharCount: memoryBlock.length,
            policy: { previewOnly: true, formalPromptInjection: false, singleOwnerRequiredBeforeCutover: true, retrievalStrategy: 'keywords+trust+weight+recentness+graph' },
            diagnostics
        };
    }
    function compactInjectionPreviewForList(preview) {
        const selected = preview && preview.selected || {};
        const cards = preview && preview.selectedCards || {};
        return {
            id: preview && preview.id,
            status: preview && preview.status || 'active',
            queryText: clampText(preview && preview.query && preview.query.text, 140),
            chatName: preview && preview.query && preview.query.chatName || '',
            memoryBlock: clampText(preview && preview.memoryBlock, 900),
            blockCharCount: Number(preview && preview.blockCharCount) || 0,
            modelCount: rawArray(selected.modelIds).length,
            factCount: rawArray(selected.factIds).length,
            familyCount: rawArray(selected.familyIds).length,
            edgeCount: rawArray(selected.edgeIds).length,
            eventCount: rawArray(selected.eventIds).length,
            models: rawArray(cards.models).slice(0, 4), facts: rawArray(cards.facts).slice(0, 6), families: rawArray(cards.families).slice(0, 5),
            edges: rawArray(cards.edges).slice(0, 5), events: rawArray(cards.events).slice(0, 4),
            legacyComparison: preview && preview.legacyComparison || null,
            diagnostics: rawArray(preview && preview.diagnostics).slice(0, 8),
            createdAt: preview && (preview.createdAt || preview.updatedAt) || ''
        };
    }

    core.memoryBrain.injectionSemantics = { tokenize, buildMemoryInjectionPackage, buildDisabledInjectionPackage, compactInjectionPreviewForList };
})(OwoApp);
