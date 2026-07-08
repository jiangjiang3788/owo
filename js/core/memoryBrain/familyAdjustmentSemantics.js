// --- Memory Brain family adjustment semantics owner (v0.5.3) ---
// 纯计算：为记忆家族生成合并 / 拆分 / 改名计划；不访问 DOM、网络、运行时状态、features 或 platform。
(function registerMemoryBrainFamilyAdjustmentSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    const STOPWORDS = Object.freeze(['user', 'assistant', 'project', 'other', 'active', 'family', 'memory', 'the', 'and']);

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function asArray(value) {
        if (Array.isArray(value)) return value;
        return asText(value).split(/[，,、;；\n]+/).map(asText).filter(Boolean);
    }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function clampText(value, max) { const text = asText(value); return text.length > max ? text.slice(0, max - 1) + '…' : text; }
    function unique(list, max) {
        const seen = new Set();
        return asArray(list).map(asText).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key) || STOPWORDS.includes(key)) return false;
            seen.add(key); return true;
        }).slice(0, max || 120);
    }
    function isActive(item) { return item && asText(item.status || 'active') !== 'retired'; }
    function textTokens(text) {
        const raw = asText(text).toLowerCase();
        const latin = raw.match(/[a-z0-9][a-z0-9_-]{1,}/g) || [];
        const cjk = raw.replace(/[\x00-\x7F]/g, ' ').split(/[\s，,。.!！?？、;；:：()（）【】\[\]《》"'“”‘’]+/)
            .map(item => item.trim()).filter(item => item.length >= 2 && item.length <= 18);
        const grams = [];
        cjk.forEach(item => {
            if (item.length <= 8) grams.push(item);
            for (let index = 0; index < item.length - 1 && index < 24; index += 2) grams.push(item.slice(index, index + 2));
        });
        return unique(latin.concat(cjk, grams), 64);
    }
    function familyTokens(family) {
        return unique(asArray(family && family.keywords).concat(asArray(family && family.labels), textTokens(family && family.title), textTokens(family && family.summary)), 80);
    }
    function overlap(left, right) {
        const l = unique(left); const r = unique(right);
        if (!l.length || !r.length) return 0;
        const rset = new Set(r.map(item => item.toLowerCase()));
        const hit = l.filter(item => rset.has(item.toLowerCase())).length;
        const coverage = hit / Math.min(l.length, r.length);
        const jaccard = hit / Math.max(1, l.length + r.length - hit);
        return Math.max(0, Math.min(1, Math.round((coverage * 0.65 + jaccard * 0.35) * 100) / 100));
    }
    function memberOverlap(left, right) {
        const l = unique(left && left.factIds); const r = unique(right && right.factIds);
        if (!l.length || !r.length) return 0;
        const rset = new Set(r);
        const hit = l.filter(id => rset.has(id)).length;
        return Math.max(0, Math.min(1, Math.round((hit / Math.min(l.length, r.length)) * 100) / 100));
    }
    function mergeTextList() { return unique(Array.prototype.concat.apply([], Array.from(arguments)), 48); }
    function familyById(snapshot) { return new Map(asArray(snapshot && snapshot.families).filter(isActive).map(family => [family.id, family])); }
    function factById(snapshot) { return new Map(asArray(snapshot && snapshot.facts).filter(isActive).map(fact => [fact.id, fact])); }
    function normalizeAction(value) {
        const action = asText(value).toLowerCase();
        if (['merge', 'merge-families', 'combine'].includes(action)) return 'merge';
        if (['split', 'split-family'].includes(action)) return 'split';
        if (['rename', 'rename-family', 'edit-family'].includes(action)) return 'rename';
        return 'merge';
    }
    function collectFamilyAdjustmentCandidates(snapshot, options = {}) {
        const threshold = Math.max(0.1, Math.min(0.95, Number(options.threshold) || 0.38));
        const families = asArray(snapshot && snapshot.families).filter(isActive);
        const candidates = [];
        for (let i = 0; i < families.length; i += 1) {
            for (let j = i + 1; j < families.length; j += 1) {
                const left = families[i]; const right = families[j];
                const lexicalScore = overlap(familyTokens(left), familyTokens(right));
                const memberScore = memberOverlap(left, right);
                const score = Math.max(lexicalScore, memberScore * 0.85 + lexicalScore * 0.15);
                if (score < threshold) continue;
                const primary = asArray(left.factIds).length >= asArray(right.factIds).length ? left : right;
                const secondary = primary === left ? right : left;
                candidates.push({
                    id: `merge:${primary.id}:${secondary.id}`,
                    action: 'merge',
                    score: Math.round(score * 100) / 100,
                    lexicalScore,
                    memberScore,
                    primaryFamilyId: primary.id,
                    secondaryFamilyIds: [secondary.id],
                    title: primary.title || secondary.title || '未命名家族',
                    familyTitles: [primary.title || primary.id, secondary.title || secondary.id],
                    reason: memberScore > 0 ? '两个家族共享成员事实或成员集合高度重叠，建议检查是否应合并。' : '两个家族标题、关键词或摘要相似，建议检查是否应合并。'
                });
            }
        }
        return candidates.sort((a, b) => b.score - a.score).slice(0, Number(options.limit) || 12);
    }
    function parseIds(value) { return unique(asArray(value).concat(asText(value).split(/[，,、;；\n]+/)), 80); }
    function pickMergeFamilies(snapshot, input = {}) {
        const map = familyById(snapshot);
        const ids = parseIds(input.familyIds || input.mergeFamilyIds);
        const primaryId = asText(input.primaryFamilyId) || ids[0] || '';
        const secondaryIds = parseIds(input.secondaryFamilyIds || ids.filter(id => id !== primaryId));
        if (primaryId && secondaryIds.length && map.has(primaryId)) return [map.get(primaryId)].concat(secondaryIds.map(id => map.get(id)).filter(Boolean));
        const candidate = collectFamilyAdjustmentCandidates(snapshot, { threshold: input.threshold || 0.38 })[0];
        if (!candidate) return [];
        return [map.get(candidate.primaryFamilyId)].concat(candidate.secondaryFamilyIds.map(id => map.get(id)).filter(Boolean)).filter(Boolean);
    }
    function buildMergePlan(snapshot, input = {}) {
        const families = pickMergeFamilies(snapshot, input).filter(Boolean);
        if (families.length < 2) return { ok: false, status: 'missing-families', errorMessage: '合并至少需要 2 个有效家族', plan: null };
        const primary = families[0];
        const secondary = families.slice(1);
        const factIds = unique(families.flatMap(family => asArray(family.factIds)), 5000);
        const newTitle = clampText(input.title || input.newTitle || primary.title || '合并后的记忆家族', 80);
        const summaryParts = families.map(family => family.summary).filter(Boolean).slice(0, 4);
        const newSummary = clampText(input.summary || summaryParts.join(' / ') || `由 ${families.length} 个相近家族合并而来。`, 800);
        const afterFamilies = [Object.assign({}, clone(primary), {
            title: newTitle,
            summary: newSummary,
            labels: mergeTextList.apply(null, families.map(family => family.labels)),
            keywords: mergeTextList.apply(null, families.map(family => family.keywords)),
            factIds,
            status: 'active',
            familyAdjustmentStatus: 'merge-primary',
            mergedFromFamilyIds: unique(asArray(primary.mergedFromFamilyIds).concat(secondary.map(family => family.id)), 80),
            adjustmentReason: clampText(input.reason || '人工合并相近记忆家族', 420)
        })].concat(secondary.map(family => Object.assign({}, clone(family), {
            status: 'retired',
            familyAdjustmentStatus: 'merge-secondary',
            mergedIntoFamilyId: primary.id,
            adjustmentReason: clampText(input.reason || '人工合并相近记忆家族', 420)
        })));
        const beforeFamilies = families.map(clone);
        const factUpdates = factIds.map(factId => ({ factId, replaceFamilyIds: secondary.map(family => family.id), addFamilyId: primary.id }));
        return { ok: true, status: 'ready', action: 'merge', familyIds: families.map(family => family.id), primaryFamilyId: primary.id, secondaryFamilyIds: secondary.map(family => family.id), factIds, beforeFamilies, afterFamilies, factUpdates, reason: clampText(input.reason || '人工合并相近记忆家族', 420), formalPromptInjection: false, writesLegacyMemory: false };
    }
    function buildSplitPlan(snapshot, input = {}) {
        const map = familyById(snapshot);
        const sourceId = asText(input.familyId || input.sourceFamilyId);
        const family = sourceId ? map.get(sourceId) : null;
        if (!family) return { ok: false, status: 'missing-family', errorMessage: '拆分需要一个有效 familyId', plan: null };
        const splitFactIds = parseIds(input.splitFactIds || input.factIds).filter(id => asArray(family.factIds).includes(id));
        if (!splitFactIds.length) return { ok: false, status: 'missing-facts', errorMessage: '拆分需要填写属于该家族的 splitFactIds', plan: null };
        const remainingFactIds = asArray(family.factIds).filter(id => !splitFactIds.includes(id));
        const newFamilyDraft = {
            id: asText(input.newFamilyId),
            title: clampText(input.title || input.newTitle || `${family.title || '记忆家族'} · 分支`, 80),
            summary: clampText(input.summary || `从「${family.title || family.id}」拆出的新记忆家族。`, 800),
            labels: mergeTextList(input.labels, family.labels),
            keywords: mergeTextList(input.keywords, family.keywords),
            factIds: splitFactIds,
            sourceFamilyId: family.id,
            confidence: Number(input.confidence) || Number(family.confidence) || 0.7
        };
        const sourceAfter = Object.assign({}, clone(family), { factIds: remainingFactIds, familyAdjustmentStatus: 'split-source', adjustmentReason: clampText(input.reason || '人工拆分误聚家族', 420) });
        return { ok: true, status: 'ready', action: 'split', familyIds: [family.id], sourceFamilyId: family.id, splitFactIds, remainingFactIds, beforeFamilies: [clone(family)], sourceAfter, newFamilyDraft, factUpdates: splitFactIds.map(factId => ({ factId, replaceFamilyIds: [family.id], addFamilyId: newFamilyDraft.id || '__NEW_FAMILY_ID__' })), reason: clampText(input.reason || '人工拆分误聚家族', 420), formalPromptInjection: false, writesLegacyMemory: false };
    }
    function buildRenamePlan(snapshot, input = {}) {
        const map = familyById(snapshot);
        const familyId = asText(input.familyId || input.primaryFamilyId);
        const family = familyId ? map.get(familyId) : null;
        if (!family) return { ok: false, status: 'missing-family', errorMessage: '改名需要一个有效 familyId', plan: null };
        const after = Object.assign({}, clone(family), {
            title: clampText(input.title || input.newTitle || family.title || '未命名家族', 80),
            summary: clampText(input.summary || family.summary || '', 800),
            labels: input.labels ? mergeTextList(input.labels) : asArray(family.labels),
            keywords: input.keywords ? mergeTextList(input.keywords) : asArray(family.keywords),
            familyAdjustmentStatus: 'renamed',
            adjustmentReason: clampText(input.reason || '人工修改家族名称或摘要', 420)
        });
        return { ok: true, status: 'ready', action: 'rename', familyIds: [family.id], beforeFamilies: [clone(family)], afterFamilies: [after], reason: after.adjustmentReason, formalPromptInjection: false, writesLegacyMemory: false };
    }
    function buildFamilyAdjustmentPlan(snapshot, input = {}) {
        const action = normalizeAction(input.action);
        if (action === 'split') return buildSplitPlan(snapshot, input);
        if (action === 'rename') return buildRenamePlan(snapshot, input);
        return buildMergePlan(snapshot, input);
    }
    function compactFamilyAdjustmentCandidateForList(candidate) {
        return { id: candidate && candidate.id || '', action: candidate && candidate.action || 'merge', score: candidate && candidate.score || 0, primaryFamilyId: candidate && candidate.primaryFamilyId || '', secondaryFamilyIds: asArray(candidate && candidate.secondaryFamilyIds), title: candidate && candidate.title || '', familyTitles: asArray(candidate && candidate.familyTitles), reason: clampText(candidate && candidate.reason || '', 180) };
    }
    function compactFamilyAdjustmentForList(item) {
        return { id: item && item.id || '', action: item && item.action || '', status: item && item.status || '', familyIds: asArray(item && item.familyIds), createdAt: item && item.createdAt || '', reason: clampText(item && item.reason || '', 180), newFamilyId: item && item.newFamilyId || '', primaryFamilyId: item && item.primaryFamilyId || '' };
    }
    function compactFamilyAdjustmentRunForList(run) {
        return { id: run && run.id || '', action: run && run.action || '', status: run && run.status || '', familyCount: asArray(run && run.familyIds).length, factCount: asArray(run && run.factIds).length, createdAt: run && run.createdAt || '', batchId: run && run.batchId || '' };
    }

    core.memoryBrain.familyAdjustmentSemantics = { collectFamilyAdjustmentCandidates, buildFamilyAdjustmentPlan, compactFamilyAdjustmentCandidateForList, compactFamilyAdjustmentForList, compactFamilyAdjustmentRunForList };
})(OwoApp);
