// --- Memory Brain fact lifecycle semantics owner (v0.4.5) ---
// 纯计算：历史事实去重、冲突、过时标记建议；不写状态、不跑 AI、不渲染 UI。
(function registerFactLifecycleSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function text(value) { return String(value == null ? '' : value).trim(); }
    function normalizeContent(value) {
        return text(value).toLowerCase()
            .replace(/[\s\u3000]+/g, '')
            .replace(/[，,。.!！?？、;；:："“”'‘’（）()\[\]【】]/g, '');
    }
    function tokenize(value) {
        const raw = text(value).toLowerCase();
        const latin = raw.match(/[a-z0-9_\-]{2,}/g) || [];
        const cjk = raw.replace(/[\x00-\xff]/g, '').split('').filter(Boolean);
        const words = raw.split(/[\s，,。.!！?？、;；:："“”'‘’（）()\[\]【】]+/).filter(token => token.length >= 2);
        return Array.from(new Set(latin.concat(words, cjk)));
    }
    function jaccard(a, b) {
        const setA = new Set(a); const setB = new Set(b);
        if (!setA.size || !setB.size) return 0;
        let overlap = 0;
        setA.forEach(item => { if (setB.has(item)) overlap += 1; });
        return overlap / (setA.size + setB.size - overlap);
    }
    function confidence(fact) {
        const value = Number(fact && fact.confidence);
        return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
    }
    function timeValue(fact) {
        const source = fact && fact.source || {};
        const raw = source.endTimestamp || source.startTimestamp || fact.updatedAt || fact.createdAt || 0;
        const numeric = Number(raw);
        if (Number.isFinite(numeric) && numeric > 0) return numeric;
        const parsed = Date.parse(raw);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    function sourceCount(fact) {
        return asArray(fact && fact.evidence).length + (fact && fact.source && fact.source.messageCount ? 1 : 0);
    }
    function factScore(fact) {
        return confidence(fact) * 1000 + sourceCount(fact) * 20 + timeValue(fact) / 100000000000;
    }
    function sameSubjectPredicate(a, b) {
        const aSubject = text(a && a.subject || 'user').toLowerCase();
        const bSubject = text(b && b.subject || 'user').toLowerCase();
        const aPredicate = text(a && a.predicate || '').toLowerCase();
        const bPredicate = text(b && b.predicate || '').toLowerCase();
        return aSubject === bSubject && (!aPredicate || !bPredicate || aPredicate === bPredicate);
    }
    function isActiveFact(fact) {
        const status = text(fact && fact.status || 'active');
        return fact && status !== 'retired' && status !== 'duplicate' && status !== 'obsolete' && status !== 'merged';
    }
    function polarity(fact) { return text(fact && fact.polarity || 'neutral').toLowerCase(); }
    function hasNegation(value) { return /(不|没|無|无|avoid|reject|dislike|hate|not\s+)/i.test(text(value)); }
    function hasChangeSignal(value) { return /(现在|后来|以后|不再|已经不|改成|改为|转向|替换|而是|新方向|更新|修正|作废)/.test(text(value)); }
    function maybeConflict(a, b, similarity) {
        if (similarity < 0.42 && jaccard(tokenize(a && a.object), tokenize(b && b.object)) < 0.35) return false;
        const pa = polarity(a); const pb = polarity(b);
        if ((pa === 'positive' && pb === 'negative') || (pa === 'negative' && pb === 'positive')) return true;
        return hasNegation(a && a.content) !== hasNegation(b && b.content) && sameSubjectPredicate(a, b);
    }
    function buildFactLifecyclePlan(facts, options = {}) {
        const activeFacts = asArray(facts).filter(isActiveFact).map(fact => ({ fact, key: normalizeContent(fact.content), tokens: tokenize([fact.content, fact.subject, fact.predicate, fact.object, asArray(fact.keywords).join(' ')].join(' ')) }));
        const duplicateThreshold = Math.max(0.72, Math.min(0.99, Number(options.duplicateThreshold) || 0.9));
        const duplicateGroups = [];
        const conflictPairs = [];
        const obsoletePairs = [];
        const updateById = new Map();
        const grouped = new Set();

        for (let i = 0; i < activeFacts.length; i += 1) {
            if (grouped.has(activeFacts[i].fact.id)) continue;
            const group = [activeFacts[i]];
            for (let j = i + 1; j < activeFacts.length; j += 1) {
                if (grouped.has(activeFacts[j].fact.id)) continue;
                const exact = activeFacts[i].key && activeFacts[i].key === activeFacts[j].key;
                const similarity = exact ? 1 : jaccard(activeFacts[i].tokens, activeFacts[j].tokens);
                if (exact || similarity >= duplicateThreshold) group.push(activeFacts[j]);
            }
            if (group.length > 1) {
                group.sort((a, b) => factScore(b.fact) - factScore(a.fact));
                const primary = group[0].fact;
                const duplicates = group.slice(1).map(item => item.fact);
                grouped.add(primary.id);
                duplicates.forEach(fact => {
                    grouped.add(fact.id);
                    updateById.set(fact.id, {
                        id: fact.id,
                        status: 'duplicate',
                        lifecycleStatus: 'duplicate',
                        duplicateOfFactId: primary.id,
                        reviewStatus: 'auto-duplicate',
                        lifecycleReason: '与更高置信 / 更新证据的事实高度相似',
                        lifecycleConfidence: 0.86
                    });
                });
                duplicateGroups.push({ primaryFactId: primary.id, duplicateFactIds: duplicates.map(fact => fact.id), reason: '内容高度相似或完全重复' });
            }
        }

        for (let i = 0; i < activeFacts.length; i += 1) {
            for (let j = i + 1; j < activeFacts.length; j += 1) {
                const a = activeFacts[i]; const b = activeFacts[j];
                if (updateById.has(a.fact.id) || updateById.has(b.fact.id)) continue;
                const similarity = jaccard(a.tokens, b.tokens);
                if (!maybeConflict(a.fact, b.fact, similarity)) continue;
                const newer = timeValue(a.fact) >= timeValue(b.fact) ? a.fact : b.fact;
                const older = newer === a.fact ? b.fact : a.fact;
                if (hasChangeSignal(newer.content) && timeValue(newer) > timeValue(older)) {
                    updateById.set(older.id, {
                        id: older.id,
                        status: 'obsolete',
                        lifecycleStatus: 'obsolete',
                        supersededByFactId: newer.id,
                        reviewStatus: 'auto-obsolete',
                        lifecycleReason: '后续事实带有修正 / 更新信号，旧事实标记为过时',
                        lifecycleConfidence: 0.72
                    });
                    obsoletePairs.push({ obsoleteFactId: older.id, supersededByFactId: newer.id, reason: '较新的事实修正了旧事实' });
                } else {
                    const groupId = `dispute-${a.fact.id}-${b.fact.id}`;
                    [a.fact, b.fact].forEach(fact => {
                        if (!updateById.has(fact.id)) updateById.set(fact.id, {
                            id: fact.id,
                            status: 'disputed',
                            lifecycleStatus: 'disputed',
                            disputeGroupId: groupId,
                            reviewStatus: 'auto-disputed',
                            lifecycleReason: '和另一条事实可能存在正负 / 新旧表达冲突，需要后续确认',
                            lifecycleConfidence: 0.64
                        });
                    });
                    conflictPairs.push({ id: groupId, factIds: [a.fact.id, b.fact.id], reason: '同主体相关事实存在可能冲突' });
                }
            }
        }
        const updates = Array.from(updateById.values());
        return {
            kind: 'fact-lifecycle-plan',
            status: updates.length ? 'ready' : 'clean',
            inputCount: activeFacts.length,
            updateCount: updates.length,
            duplicateGroups,
            conflictPairs,
            obsoletePairs,
            updates,
            summary: {
                active: activeFacts.length - updates.length,
                duplicate: updates.filter(item => item.status === 'duplicate').length,
                obsolete: updates.filter(item => item.status === 'obsolete').length,
                disputed: updates.filter(item => item.status === 'disputed').length
            }
        };
    }
    function compactFactLifecycleRunForList(run) {
        return {
            id: run && run.id,
            status: run && run.status || 'unknown',
            createdAt: run && run.createdAt || '',
            factCount: run && run.factCount || 0,
            updateCount: run && run.updateCount || 0,
            duplicateCount: run && run.duplicateCount || 0,
            obsoleteCount: run && run.obsoleteCount || 0,
            disputedCount: run && run.disputedCount || 0
        };
    }
    function compactFactLifecycleIssueForList(issue, factsById) {
        const ids = issue && issue.factIds || [issue && issue.factId || issue && issue.obsoleteFactId || issue && issue.primaryFactId].filter(Boolean);
        const firstFact = factsById && ids.length ? factsById.get(ids[0]) : null;
        const secondFact = factsById && ids.length > 1 ? factsById.get(ids[1]) : null;
        return {
            id: issue && issue.id || ids[0] || '',
            type: issue && issue.type || 'lifecycle',
            reason: issue && issue.reason || '',
            factContent: [firstFact && firstFact.content, secondFact && secondFact.content].filter(Boolean).join(' ↔ '),
            factIds: ids
        };
    }

    core.memoryBrain.factLifecycleSemantics = {
        buildFactLifecyclePlan,
        compactFactLifecycleRunForList,
        compactFactLifecycleIssueForList,
        normalizeContent,
        tokenize,
        jaccard
    };
})(OwoApp);
