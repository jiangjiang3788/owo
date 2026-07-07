// --- Memory Brain model semantics owner (v0.3.5) ---
// 只处理“事件/事实/家族/graph → 长期模型”的纯语义：prompt、JSON 解析、字段归一化和卡片 compact。
(function registerMemoryBrainModelSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    const MODEL_TYPES = Object.freeze([
        Object.freeze({ id: 'user-profile', title: '用户画像', goal: '长期理解用户的偏好、边界、关系模式和需求。' }),
        Object.freeze({ id: 'ai-self', title: 'AI 自我', goal: '记录 AI 在这段关系中的稳定角色、表达方式和成长痕迹。' }),
        Object.freeze({ id: 'world-model', title: '世界观', goal: '沉淀双方共享的价值、关系观和判断框架。' }),
        Object.freeze({ id: 'project-brain', title: '项目脑', goal: '持续记住 OWO 项目的版本、架构决策、待办和边界。' })
    ]);
    const TYPE_ALIASES = Object.freeze({
        user: 'user-profile', user_profile: 'user-profile', profile: 'user-profile', 用户画像: 'user-profile', 人物画像: 'user-profile',
        ai: 'ai-self', ai_self: 'ai-self', self: 'ai-self', aiSelf: 'ai-self', AI自我: 'ai-self', 'AI 自我': 'ai-self',
        world: 'world-model', world_model: 'world-model', worldview: 'world-model', 世界观: 'world-model',
        project: 'project-brain', project_brain: 'project-brain', projectBrain: 'project-brain', 项目脑: 'project-brain'
    });
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clampText(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }
    function rawArray(value) { return Array.isArray(value) ? value : []; }
    function asArray(value, max) {
        const list = Array.isArray(value) ? value : asText(value).split(/[，,、;；\n]+/);
        const seen = new Set();
        return list.map(item => clampText(item, 140)).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, max || 20);
    }
    function normalizeConfidence(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return 0.72;
        return Math.max(0, Math.min(1, number > 1 ? number / 100 : number));
    }
    function normalizeModelType(value) {
        const raw = asText(value) || 'user-profile';
        return TYPE_ALIASES[raw] || TYPE_ALIASES[raw.replace(/[\s-]/g, '_')] || MODEL_TYPES.some(item => item.id === raw) && raw || 'user-profile';
    }
    function titleForType(type) {
        const found = MODEL_TYPES.find(item => item.id === type);
        return found ? found.title : '长期模型';
    }
    function compactEvidenceList(list, limit) {
        return asArray(list, limit || 18).map(value => String(value)).filter(Boolean);
    }
    function normalizeLongTermModelDraft(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const type = normalizeModelType(source.type || source.modelType || source.id || source.name);
        return {
            type,
            title: clampText(source.title || titleForType(type), 80),
            summary: clampText(source.summary || source.description || source.content, 1800),
            stableTraits: asArray(source.stableTraits || source.traits || source.patterns, 14),
            preferences: asArray(source.preferences || source.likes || source.userPreferences, 14),
            boundaries: asArray(source.boundaries || source.dislikes || source.doNotDo, 14),
            relationshipNotes: asArray(source.relationshipNotes || source.relationNotes || source.careInstructions, 14),
            projectDecisions: asArray(source.projectDecisions || source.decisions || source.versionNotes, 14),
            openQuestions: asArray(source.openQuestions || source.unknowns || source.todo, 12),
            keywords: asArray(source.keywords || source.tags, 18),
            labels: asArray(source.labels, 12),
            evidenceFactIds: compactEvidenceList(source.evidenceFactIds || source.factIds, 30),
            familyIds: compactEvidenceList(source.familyIds, 20),
            edgeIds: compactEvidenceList(source.edgeIds, 30),
            confidence: normalizeConfidence(source.confidence),
            sourceReason: clampText(source.sourceReason || source.reason || source.evidence, 700)
        };
    }
    function extractJsonText(text) {
        const raw = asText(text);
        const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fence) return fence[1].trim();
        const arrayStart = raw.indexOf('['), arrayEnd = raw.lastIndexOf(']');
        const objectStart = raw.indexOf('{'), objectEnd = raw.lastIndexOf('}');
        if (arrayStart >= 0 && (objectStart === -1 || arrayStart < objectStart) && arrayEnd > arrayStart) return raw.slice(arrayStart, arrayEnd + 1);
        if (objectStart >= 0 && objectEnd > objectStart) return raw.slice(objectStart, objectEnd + 1);
        return raw;
    }
    function parseLongTermModelResponse(text) {
        const jsonText = extractJsonText(text);
        if (!jsonText) return { ok: false, models: [], rawText: asText(text), diagnostics: ['empty_response'] };
        try {
            const parsed = JSON.parse(jsonText);
            const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.models) ? parsed.models : [parsed]);
            const diagnostics = [];
            const models = list.map(normalizeLongTermModelDraft).filter(model => {
                if (!model.summary) diagnostics.push('missing_summary: ' + model.type);
                return Boolean(model.summary);
            });
            const types = new Set(models.map(model => model.type));
            MODEL_TYPES.forEach(item => { if (!types.has(item.id)) diagnostics.push('missing_model_type: ' + item.id); });
            return { ok: models.length > 0, models, rawText: asText(text), diagnostics };
        } catch (error) {
            return { ok: false, models: [], rawText: asText(text), diagnostics: ['json_parse_failed: ' + error.message] };
        }
    }
    function buildEvidenceLines(snapshot, options = {}) {
        const facts = rawArray(snapshot && snapshot.facts).filter(fact => fact && fact.status !== 'retired').slice(0, Number(options.maxFacts) || 42);
        const families = rawArray(snapshot && snapshot.families).filter(family => family && family.status !== 'retired').slice(0, Number(options.maxFamilies) || 18);
        const edges = rawArray(snapshot && snapshot.edges).filter(edge => edge && edge.status !== 'retired').slice(0, Number(options.maxEdges) || 42);
        return {
            facts: facts.map(fact => `FACT ${fact.id}: ${clampText(fact.content, 160)}｜type=${asText(fact.factType)}｜labels=${asArray(fact.labels, 4).join('/')}`),
            families: families.map(family => `FAMILY ${family.id}: ${clampText(family.title, 80)}｜${clampText(family.summary, 180)}｜facts=${asArray(family.factIds, 8).join(',')}`),
            edges: edges.map(edge => `EDGE ${edge.id}: ${asText(edge.sourceLabel)} --${asText(edge.relationLabel || edge.relation)}--> ${asText(edge.targetLabel)}｜facts=${asArray(edge.evidenceFactIds, 5).join(',')}`)
        };
    }
    function buildLongTermModelPrompt(snapshot, options = {}) {
        const evidence = buildEvidenceLines(snapshot, options);
        return [
            '你是 OWO 小手机 App 的长期记忆脑模型整理器。',
            '任务：基于已整理的事件、原子事实、记忆家族和 graph 关系，生成 4 个长期模型版本。不要写 prompt 注入，不要改旧记忆系统。',
            '',
            '四个模型必须都有：user-profile、ai-self、world-model、project-brain。',
            '原则：忠于证据；不要把一次情绪永久化；推测要写进 sourceReason；每个结论尽量引用 evidenceFactIds / familyIds / edgeIds。',
            '',
            '只输出 JSON，不要 markdown。JSON schema：',
            '{ "models": [{ "type": "user-profile|ai-self|world-model|project-brain", "title": "标题", "summary": "长期理解摘要", "stableTraits": [], "preferences": [], "boundaries": [], "relationshipNotes": [], "projectDecisions": [], "openQuestions": [], "keywords": [], "labels": [], "evidenceFactIds": [], "familyIds": [], "edgeIds": [], "confidence": 0.8, "sourceReason": "证据和不确定性" }] }',
            '',
            'FACTS:', evidence.facts.join('\n') || '无',
            '', 'FAMILIES:', evidence.families.join('\n') || '无',
            '', 'GRAPH EDGES:', evidence.edges.join('\n') || '无'
        ].join('\n');
    }
    function topKeywords(facts, families) {
        const counts = new Map();
        rawArray(families).forEach(family => asArray(family && family.keywords, 8).concat([family && family.title]).forEach(word => { word = asText(word); if (word) counts.set(word, (counts.get(word) || 0) + 2); }));
        rawArray(facts).forEach(fact => asArray(fact && fact.keywords, 8).concat(asArray(fact && fact.labels, 6)).forEach(word => { word = asText(word); if (word) counts.set(word, (counts.get(word) || 0) + 1); }));
        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(item => item[0]).slice(0, 12);
    }
    function buildFallbackLongTermModels(snapshot) {
        const facts = rawArray(snapshot && snapshot.facts).filter(fact => fact && fact.status !== 'retired');
        const families = rawArray(snapshot && snapshot.families).filter(family => family && family.status !== 'retired');
        const edges = rawArray(snapshot && snapshot.edges).filter(edge => edge && edge.status !== 'retired');
        const keywords = topKeywords(facts, families);
        const factIds = facts.slice(0, 20).map(fact => fact.id), familyIds = families.slice(0, 10).map(family => family.id), edgeIds = edges.slice(0, 20).map(edge => edge.id);
        const familyLine = families.slice(0, 4).map(family => family.title || family.summary).filter(Boolean).join('、') || keywords.slice(0, 4).join('、') || '还在积累';
        const shared = { keywords, familyIds, edgeIds, confidence: facts.length >= 4 ? 0.68 : 0.52, sourceReason: '本地 fallback：根据已保存 facts / families / graph 粗略生成，建议后续用配置好的模型重建。' };
        return MODEL_TYPES.map(item => normalizeLongTermModelDraft(Object.assign({}, shared, { type: item.id, title: item.title, evidenceFactIds: factIds, summary: ({
            'user-profile': `用户长期关注的主题包括：${familyLine}。这些只是影子事实形成的初版画像。`,
            'ai-self': `AI 当前应把自己定位成长期陪伴和项目协作伙伴，优先保持连续、透明、可回滚。`,
            'world-model': `双方共享的世界观正在围绕长期陪伴、非企业化外置大脑、证据化记忆和用户可纠正展开。`,
            'project-brain': `OWO Memory Brain 已形成事件、事实、家族和 graph 链路，下一步是长期模型与注入预览。`
        })[item.id], stableTraits: keywords.slice(0, 5), preferences: keywords.slice(0, 6), boundaries: ['不要写死分类', '不要双系统写入', '不要提前正式注入'], projectDecisions: ['长期模型保持影子模式', '模型必须有版本历史和回滚'] })));
    }

    function compactModelForList(model) {
        return {
            id: model && model.id,
            type: model && model.type || 'user-profile',
            title: model && model.title || titleForType(model && model.type),
            summary: clampText(model && model.summary, 260),
            version: Number(model && model.version) || 1,
            status: model && model.status || 'active',
            confidence: Math.round(normalizeConfidence(model && model.confidence) * 100),
            keywords: asArray(model && model.keywords, 8),
            stableTraits: asArray(model && model.stableTraits, 5),
            preferences: asArray(model && model.preferences, 5),
            boundaries: asArray(model && model.boundaries, 5),
            openQuestions: asArray(model && model.openQuestions, 5),
            projectDecisions: asArray(model && model.projectDecisions, 5),
            evidenceCount: compactEvidenceList(model && model.evidenceFactIds).length + compactEvidenceList(model && model.familyIds).length + compactEvidenceList(model && model.edgeIds).length,
            updatedAt: model && (model.updatedAt || model.createdAt) || ''
        };
    }

    core.memoryBrain.modelSemantics = { MODEL_TYPES, normalizeModelType, normalizeLongTermModelDraft, parseLongTermModelResponse, buildLongTermModelPrompt, buildFallbackLongTermModels, compactModelForList };
})(OwoApp);
