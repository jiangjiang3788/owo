// --- Memory Brain graph semantics owner (v0.3.4) ---
// 只处理 facts / families → graph edge drafts 的纯语义；不访问 DOM、网络、运行时状态、features 或 platform。
(function registerMemoryBrainGraphSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    const RELATION_LABELS = Object.freeze({
        belongs_to_family: '属于记忆家族',
        about_person: '关于人物',
        about_entity: '关于对象',
        about_topic: '关联主题',
        about_purpose: '关联目的',
        about_emotion: '关联情绪',
        about_project: '关联项目',
        family_related: '相关家族',
        family_topic: '家族主题',
        family_emotion: '家族调性'
    });
    const PROJECT_HINTS = Object.freeze(['owo', '小手机', 'app', 'memory brain', '记忆脑', '长期记忆', '外置大脑']);
    const EMOTION_WORDS = Object.freeze(['期待', '认真', '温柔', '亲密', '担心', '不满', '边界', '压力', '开心', '难过', '承诺', '陪伴']);

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clampText(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }
    function asArray(value, max) {
        const list = Array.isArray(value) ? value : asText(value).split(/[，,、;；\n]+/);
        return unique(list.map(item => clampText(item, 80)).filter(Boolean), max || 18);
    }
    function unique(list, max) {
        const seen = new Set();
        return (Array.isArray(list) ? list : []).map(item => asText(item)).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, max || 100);
    }
    function hashText(text) {
        const raw = asText(text).toLowerCase();
        let hash = 2166136261;
        for (let index = 0; index < raw.length; index += 1) {
            hash ^= raw.charCodeAt(index);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return Math.abs(hash >>> 0).toString(36);
    }
    function nodeId(type, label) { return `${type}:${hashText(label)}`; }
    function normalizeNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }
    function clamp01(value) { return Math.max(0, Math.min(1, Math.round(normalizeNumber(value, 0) * 100) / 100)); }
    function factLabel(fact) { return clampText(fact && fact.content || fact && fact.id || '未命名事实', 44); }
    function familyLabel(family) { return clampText(family && (family.title || family.name) || family && family.id || '未命名家族', 44); }
    function factKeywords(fact) {
        return unique(asArray(fact && fact.keywords, 10).concat(asArray(fact && fact.labels, 8), [fact && fact.factType, fact && fact.object]), 16);
    }
    function familyKeywords(family) {
        return unique(asArray(family && family.keywords, 12).concat(asArray(family && family.labels, 10), [family && (family.title || family.name)]), 16);
    }
    function edgeKey(edge) { return [edge.relation, edge.sourceId, edge.targetId].join('::'); }
    function makeEdge(relation, source, target, payload) {
        const edge = Object.assign({
            draftKey: `${relation}:${source.id}:${target.id}`,
            relation,
            relationLabel: RELATION_LABELS[relation] || relation,
            sourceId: source.id,
            sourceType: source.type,
            sourceLabel: clampText(source.label, 80),
            targetId: target.id,
            targetType: target.type,
            targetLabel: clampText(target.label, 80),
            weight: 0.7,
            reason: '',
            evidenceFactIds: [],
            familyIds: [],
            keywords: [],
            labels: []
        }, payload || {});
        edge.weight = clamp01(edge.weight);
        edge.key = edgeKey(edge);
        edge.draftKey = edge.draftKey || edge.key;
        edge.keywords = asArray(edge.keywords, 12);
        edge.labels = asArray(edge.labels, 10);
        edge.evidenceFactIds = unique(edge.evidenceFactIds, 24);
        edge.familyIds = unique(edge.familyIds, 12);
        return edge;
    }
    function createFactNode(fact) { return { id: fact && fact.id || nodeId('fact', factLabel(fact)), type: 'fact', label: factLabel(fact) }; }
    function createFamilyNode(family) { return { id: family && family.id || nodeId('family', familyLabel(family)), type: 'family', label: familyLabel(family) }; }
    function makeNamedNode(type, label) { return { id: nodeId(type, label), type, label: clampText(label, 80) }; }
    function inferPurpose(fact) {
        const predicate = asText(fact && fact.predicate).toLowerCase();
        const type = asText(fact && fact.factType).toLowerCase();
        const text = `${predicate} ${type} ${asText(fact && fact.content)}`.toLowerCase();
        if (/avoid|反感|不喜欢|边界|拒绝|dislike/.test(text)) return '边界 / 避免';
        if (/want|prefers|希望|想要|需要|期待/.test(text)) return '期望 / 偏好';
        if (/build|开发|推进|项目|版本|实现/.test(text)) return '项目推进';
        if (/关系|陪伴|承诺|亲密|连续/.test(text)) return '关系连续性';
        return '';
    }
    function inferEmotion(fact) {
        const explicit = asText(fact && (fact.emotion || fact.memoryTone));
        if (explicit) return explicit;
        const polarity = asText(fact && fact.polarity).toLowerCase();
        if (polarity === 'negative') return '边界 / 不喜欢';
        if (polarity === 'positive') return '期待 / 喜欢';
        const text = `${asText(fact && fact.content)} ${asArray(fact && fact.labels).join(' ')} ${asArray(fact && fact.keywords).join(' ')}`;
        return EMOTION_WORDS.find(word => text.includes(word)) || '';
    }
    function inferProjectLabel(text) {
        const raw = asText(text).toLowerCase();
        if (raw.includes('owo') || raw.includes('小手机')) return 'OWO 小手机 App';
        if (raw.includes('memory brain') || raw.includes('记忆脑') || raw.includes('长期记忆') || raw.includes('外置大脑')) return 'Memory Brain 长期记忆脑';
        return '';
    }
    function addEdge(map, edge, options) {
        if (!edge || !edge.sourceId || !edge.targetId || edge.sourceId === edge.targetId) return;
        const key = edge.key || edgeKey(edge);
        if (!options.rebuild && options.existingKeys && options.existingKeys.has(key)) return;
        if (!map.has(key) || map.get(key).weight < edge.weight) map.set(key, edge);
    }
    function buildFactEdges(fact, familyMap, edgeMap, options) {
        const factNode = createFactNode(fact);
        const keywords = factKeywords(fact);
        asArray(fact && fact.familyIds, 8).forEach(familyId => {
            const family = familyMap.get(familyId);
            if (!family) return;
            addEdge(edgeMap, makeEdge('belongs_to_family', factNode, createFamilyNode(family), {
                weight: 0.86,
                reason: '事实已被记忆家族收纳，是 graph 的基础归属边。',
                evidenceFactIds: [fact.id], familyIds: [familyId], keywords
            }), options);
        });
        const subject = asText(fact && fact.subject);
        if (subject) addEdge(edgeMap, makeEdge('about_person', factNode, makeNamedNode('person', subject === 'user' ? '用户' : subject), { weight: 0.78, reason: '事实的 subject 指向这个人物/主体。', evidenceFactIds: [fact.id], keywords }), options);
        const objectText = clampText(fact && fact.object, 60);
        if (objectText) addEdge(edgeMap, makeEdge('about_entity', factNode, makeNamedNode('entity', objectText), { weight: 0.68, reason: '事实的 object 指向这个对象。', evidenceFactIds: [fact.id], keywords }), options);
        const purpose = inferPurpose(fact);
        if (purpose) addEdge(edgeMap, makeEdge('about_purpose', factNode, makeNamedNode('purpose', purpose), { weight: 0.72, reason: '从 predicate / factType / 内容推断出的长期目的。', evidenceFactIds: [fact.id], keywords }), options);
        const emotion = inferEmotion(fact);
        if (emotion) addEdge(edgeMap, makeEdge('about_emotion', factNode, makeNamedNode('emotion', emotion), { weight: 0.66, reason: '从 polarity、标签或内容中提取出的情绪调性。', evidenceFactIds: [fact.id], keywords }), options);
        const project = inferProjectLabel([fact && fact.content, fact && fact.object, keywords.join(' ')].join(' '));
        if (project) addEdge(edgeMap, makeEdge('about_project', factNode, makeNamedNode('project', project), { weight: 0.76, reason: '内容命中项目线索，建立项目脑前置边。', evidenceFactIds: [fact.id], keywords }), options);
        keywords.slice(0, 3).forEach(topic => addEdge(edgeMap, makeEdge('about_topic', factNode, makeNamedNode('topic', topic), { weight: 0.6, reason: '事实关键词/标签形成主题节点。', evidenceFactIds: [fact.id], keywords: [topic] }), options));
    }
    function overlap(left, right) {
        const a = new Set(asArray(left, 24).map(item => item.toLowerCase()));
        const b = new Set(asArray(right, 24).map(item => item.toLowerCase()));
        let hit = 0; a.forEach(item => { if (b.has(item)) hit += 1; });
        return hit;
    }
    function buildFamilyEdges(families, edgeMap, options) {
        families.forEach(family => {
            const familyNode = createFamilyNode(family);
            const keywords = familyKeywords(family);
            keywords.slice(0, 4).forEach(topic => addEdge(edgeMap, makeEdge('family_topic', familyNode, makeNamedNode('topic', topic), { weight: 0.62, reason: '家族关键词形成主题节点。', familyIds: [family.id], keywords: [topic] }), options));
            const tone = asText(family && family.memoryTone);
            if (tone) addEdge(edgeMap, makeEdge('family_emotion', familyNode, makeNamedNode('emotion', tone), { weight: 0.64, reason: '家族摘要或 AI 命名给出的记忆调性。', familyIds: [family.id], keywords }), options);
            const project = inferProjectLabel([family && family.title, family && family.summary, keywords.join(' ')].join(' '));
            if (project) addEdge(edgeMap, makeEdge('about_project', familyNode, makeNamedNode('project', project), { weight: 0.7, reason: '家族内容命中项目线索。', familyIds: [family.id], keywords }), options);
        });
        families.forEach((left, index) => {
            families.slice(index + 1).forEach(right => {
                const hit = overlap(familyKeywords(left), familyKeywords(right));
                if (hit < 2) return;
                addEdge(edgeMap, makeEdge('family_related', createFamilyNode(left), createFamilyNode(right), {
                    weight: clamp01(0.48 + hit * 0.12),
                    reason: `两个记忆家族共享 ${hit} 个关键词/标签，适合作为联想入口。`,
                    familyIds: [left.id, right.id], keywords: unique(familyKeywords(left).concat(familyKeywords(right)), 10)
                }), options);
            });
        });
    }
    function buildGraphEdges(facts, families, existingEdges, options = {}) {
        const activeFacts = (Array.isArray(facts) ? facts : []).filter(fact => fact && fact.status !== 'retired' && fact.content);
        const activeFamilies = (Array.isArray(families) ? families : []).filter(family => family && family.status !== 'retired');
        const existingKeys = new Set((Array.isArray(existingEdges) ? existingEdges : []).filter(edge => edge && edge.status !== 'retired').map(edge => edge.key || edgeKey(edge)));
        const familyMap = new Map(activeFamilies.map(family => [family.id, family]));
        const edgeMap = new Map();
        const context = Object.assign({}, options, { existingKeys });
        activeFacts.forEach(fact => buildFactEdges(fact, familyMap, edgeMap, context));
        buildFamilyEdges(activeFamilies, edgeMap, context);
        return Array.from(edgeMap.values()).sort((a, b) => b.weight - a.weight || a.relation.localeCompare(b.relation)).slice(0, Number(options.maxEdges) || 160);
    }
    function normalizeGraphEdgeDraft(raw) {
        const edge = raw && typeof raw === 'object' ? raw : {};
        return makeEdge(edge.relation || 'about_topic', {
            id: edge.sourceId || edge.source && edge.source.id,
            type: edge.sourceType || edge.source && edge.source.type || 'node',
            label: edge.sourceLabel || edge.source && edge.source.label || ''
        }, {
            id: edge.targetId || edge.target && edge.target.id,
            type: edge.targetType || edge.target && edge.target.type || 'node',
            label: edge.targetLabel || edge.target && edge.target.label || ''
        }, edge);
    }
    function compactGraphForList(edges, facts, families, options = {}) {
        const factMap = new Map((Array.isArray(facts) ? facts : []).map(fact => [fact.id, fact]));
        const familyMap = new Map((Array.isArray(families) ? families : []).map(family => [family.id, family]));
        const activeEdges = (Array.isArray(edges) ? edges : []).filter(edge => edge && edge.status !== 'retired');
        const relationCards = activeEdges.slice().sort((a, b) => b.weight - a.weight || String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))).slice(0, Number(options.edgeLimit) || 36).map(edge => ({
            id: edge.id,
            relation: edge.relation,
            relationLabel: edge.relationLabel || RELATION_LABELS[edge.relation] || edge.relation,
            sourceLabel: clampText(edge.sourceLabel, 52), sourceType: edge.sourceType,
            targetLabel: clampText(edge.targetLabel, 52), targetType: edge.targetType,
            weightText: Math.round(clamp01(edge.weight || 0.7) * 100) + '%',
            reason: clampText(edge.reason, 180),
            keywords: asArray(edge.keywords, 8),
            evidenceFacts: asArray(edge.evidenceFactIds, 5).map(id => factMap.get(id)).filter(Boolean).map(fact => clampText(fact.content, 110)),
            families: asArray(edge.familyIds, 5).map(id => familyMap.get(id)).filter(Boolean).map(family => familyLabel(family)),
            updatedAt: edge.updatedAt || edge.createdAt || ''
        }));
        const nodes = new Map();
        activeEdges.forEach(edge => {
            [[edge.sourceId, edge.sourceLabel, edge.sourceType], [edge.targetId, edge.targetLabel, edge.targetType]].forEach(([id, label, type]) => {
                if (!id) return;
                if (!nodes.has(id)) nodes.set(id, { id, label: clampText(label, 60), type, degree: 0, samples: [] });
                const node = nodes.get(id); node.degree += 1;
                node.samples = unique(node.samples.concat(edge.relationLabel || RELATION_LABELS[edge.relation] || edge.relation), 4);
            });
        });
        const nodeCards = Array.from(nodes.values()).sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label)).slice(0, Number(options.nodeLimit) || 18);
        return { relationCards, nodeCards, edgeCount: activeEdges.length, activeEdgeCount: activeEdges.length };
    }

    core.memoryBrain.graphSemantics = { RELATION_LABELS, buildGraphEdges, normalizeGraphEdgeDraft, compactGraphForList };
})(OwoApp);
