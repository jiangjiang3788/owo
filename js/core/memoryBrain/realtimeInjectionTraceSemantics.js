// --- Memory Brain realtime injection trace semantics (v0.6.2) ---
// 纯语义：解释注入候选为什么命中、为什么未命中、为什么被裁剪、为什么仍不能正式接管 prompt。
(function registerMemoryBrainRealtimeInjectionTraceSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clip(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }
    function idOf(item) { return asText(item && item.id); }
    function lower(value) { return asText(value).toLowerCase(); }
    function unique(list, max) {
        const seen = new Set();
        return asArray(list).map(asText).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, max || 100);
    }
    function tokenize(value) {
        const injection = core.memoryBrain.injectionSemantics;
        if (injection && typeof injection.tokenize === 'function') return injection.tokenize(value);
        return unique((lower(value).match(/[a-z0-9_\-]{2,}|[\u3400-\u9fff]{2}/g) || []), 120);
    }
    function active(item) { return item && item.status !== 'retired'; }
    function lifecycle(item) { return lower(item && (item.lifecycleStatus || item.status)); }
    function trustLabel(item) { return asText(item && (item.trustLevel || item.trustScore)); }
    function selectedSet(ids) { return new Set(asArray(ids).map(asText).filter(Boolean)); }
    function findById(list, id) { return asArray(list).find(item => idOf(item) === asText(id)) || null; }
    function wordsForItem(item, fields) {
        return fields.map(field => {
            const value = item && item[field];
            return Array.isArray(value) ? value.join(' ') : value;
        }).join(' ');
    }
    function itemTextByKind(kind, item) {
        if (kind === 'model') return wordsForItem(item, ['type', 'title', 'summary', 'stableTraits', 'preferences', 'boundaries', 'relationshipNotes', 'projectDecisions', 'openQuestions', 'keywords', 'labels']);
        if (kind === 'fact') return wordsForItem(item, ['content', 'subject', 'predicate', 'object', 'factType', 'keywords', 'labels', 'evidenceQuote']);
        if (kind === 'family') return wordsForItem(item, ['title', 'name', 'summary', 'keywords', 'labels', 'memoryTone']);
        if (kind === 'edge') return wordsForItem(item, ['sourceLabel', 'targetLabel', 'relationLabel', 'relation', 'reason', 'keywords', 'labels']);
        return wordsForItem(item, ['title', 'summary', 'emotion', 'keywords', 'openThreads']);
    }
    function tokenHits(queryTokens, text) {
        const value = lower(text);
        return queryTokens.filter(token => value.includes(lower(token))).slice(0, 8);
    }
    function lifecycleReason(item) {
        const status = lifecycle(item);
        if (/duplicate|obsolete|merged|retired/.test(status)) return `生命周期为 ${status}，被排除。`;
        if (/disputed|needs-edit|low-trust/.test(status)) return `生命周期为 ${status}，被降权。`;
        if (item && item.sourceStale) return '来源已经标记 sourceStale，被降权。';
        if (item && item.needsRebuildReason) return `需要重建：${clip(item.needsRebuildReason, 80)}。`;
        return '';
    }
    function reasonForSelected(kind, item, queryTokens) {
        const hits = tokenHits(queryTokens, itemTextByKind(kind, item));
        const reasons = [];
        if (hits.length) reasons.push(`命中关键词：${hits.join(' / ')}`);
        if (trustLabel(item)) reasons.push(`信任：${trustLabel(item)}`);
        if (item && item.weight != null) reasons.push(`权重：${item.weight}`);
        if (item && item.activation != null) reasons.push(`浮现：${item.activation}`);
        if (item && item.confidence != null) reasons.push(`置信度：${item.confidence}`);
        if (asArray(item && item.familyIds).length || asArray(item && item.edgeIds).length) reasons.push('有 family / graph 连接。');
        return reasons.length ? reasons : ['当前候选通过综合排序进入注入包。'];
    }
    function reasonForMiss(kind, item, queryTokens, selectedCount, limit) {
        const life = lifecycleReason(item);
        if (life && /被排除/.test(life)) return [life];
        const hits = tokenHits(queryTokens, itemTextByKind(kind, item));
        const reasons = [];
        if (!hits.length && queryTokens.length) reasons.push('没有明显关键词命中。');
        if (life) reasons.push(life);
        if (selectedCount >= limit) reasons.push(`同类候选已达到上限 ${limit}，被裁剪。`);
        if (!reasons.length) reasons.push('综合排序低于入选项，暂不注入。');
        return reasons;
    }
    function buildTraceItems(kind, list, selectedIds, queryTokens, limit, textField) {
        const set = selectedSet(selectedIds);
        const items = asArray(list).filter(active);
        const selected = items.filter(item => set.has(idOf(item))).slice(0, limit).map(item => ({
            id: idOf(item), kind, status: item.status || 'active', title: clip(item.title || item.name || item.content || item.type || item.relationLabel || item.id, 120),
            text: clip(item[textField] || item.summary || item.content || item.reason || '', 220),
            trust: trustLabel(item), lifecycleStatus: lifecycle(item) || 'active', selected: true,
            reasons: reasonForSelected(kind, item, queryTokens)
        }));
        const misses = items.filter(item => !set.has(idOf(item))).slice(0, Math.max(6, limit * 2)).map(item => ({
            id: idOf(item), kind, status: item.status || 'active', title: clip(item.title || item.name || item.content || item.type || item.relationLabel || item.id, 120),
            text: clip(item[textField] || item.summary || item.content || item.reason || '', 180),
            trust: trustLabel(item), lifecycleStatus: lifecycle(item) || 'active', selected: false,
            reasons: reasonForMiss(kind, item, queryTokens, selected.length, limit)
        })).slice(0, 8);
        return { selected, misses, total: items.length, selectedCount: selected.length, missCount: Math.max(0, items.length - selected.length) };
    }
    function overlap(a, b) {
        const left = new Set(tokenize(a));
        const right = new Set(tokenize(b));
        if (!left.size || !right.size) return { ratio: 0, shared: [] };
        const shared = Array.from(left).filter(token => right.has(token)).slice(0, 24);
        return { ratio: Math.round(shared.length / Math.max(1, Math.min(left.size, right.size)) * 100), shared };
    }
    function buildRealtimeInjectionTraceReport(input) {
        const options = input && typeof input === 'object' ? input : {};
        const snapshot = options.snapshot || {};
        const query = clip(options.query || options.userInput || '', 1200);
        const queryTokens = tokenize(query).slice(0, 64);
        const maxBlockChars = Number(options.maxBlockChars) || 3600;
        const injection = core.memoryBrain.injectionSemantics;
        const formal = core.memoryBrain.formalInjectionAdapterSemantics;
        const pkg = injection && typeof injection.buildMemoryInjectionPackage === 'function'
            ? injection.buildMemoryInjectionPackage(query, snapshot, { maxBlockChars })
            : { memoryBlock: '', selected: {}, diagnostics: ['missing_injection_semantics'] };
        const adapter = formal && typeof formal.buildFormalInjectionAdapterPackage === 'function'
            ? formal.buildFormalInjectionAdapterPackage({ query, snapshot, ownerState: options.ownerState || snapshot.ownerState, legacyBlock: options.legacyBlock || '', legacyOwner: options.legacyOwner || 'legacy', injectionOptions: { maxBlockChars } })
            : null;
        const selected = pkg.selected || {};
        const kinds = {
            models: buildTraceItems('model', asArray(snapshot.models).filter(item => item && item.status === 'active'), selected.modelIds, queryTokens, 4, 'summary'),
            facts: buildTraceItems('fact', snapshot.facts, selected.factIds, queryTokens, 8, 'content'),
            families: buildTraceItems('family', snapshot.families, selected.familyIds, queryTokens, 5, 'summary'),
            edges: buildTraceItems('edge', snapshot.edges, selected.edgeIds, queryTokens, 10, 'reason'),
            events: buildTraceItems('event', snapshot.events, selected.eventIds, queryTokens, 4, 'summary')
        };
        const legacyBlock = asText(options.legacyBlock || '');
        const brainBlock = asText(pkg.memoryBlock || '');
        const compare = overlap(legacyBlock, brainBlock);
        const blockers = [];
        if (adapter && adapter.owner && adapter.owner.cutoverGate !== 'open') blockers.push({ code: adapter.owner.cutoverGate || 'blocked-until-v0.9', title: '正式接管被总门禁阻止', detail: '到 v0.9 完成前，Memory Brain 只做可读、可整理、可预览、可演练，不进入正式 prompt。' });
        if (adapter && adapter.owner && adapter.owner.finalOwner === 'legacy') blockers.push({ code: 'final-owner-legacy', title: '最终正式 owner 仍是 legacy', detail: '当前正式聊天注入继续由旧档案 / 日记 / 向量 owner 执行，Memory Brain 只生成候选 trace。' });
        if (!brainBlock) blockers.push({ code: 'brain-block-empty', title: 'Memory Brain 候选块为空', detail: '没有足够的 facts / families / models / events 命中当前输入。' });
        const clipped = brainBlock.length >= maxBlockChars - 4;
        return {
            kind: 'realtime-injection-trace', release: 'v0.6.2', mode: 'shadow-trace', status: 'active',
            query: { text: query, tokens: queryTokens.slice(0, 40) },
            legacy: { owner: options.legacyOwner || 'legacy', blockCharCount: legacyBlock.length, blockPreview: clip(legacyBlock, 900) },
            memoryBrain: { blockCharCount: brainBlock.length, blockPreview: clip(brainBlock, 1200), selected: selected, diagnostics: asArray(pkg.diagnostics), retrievalStrategy: pkg.policy && pkg.policy.retrievalStrategy || 'keywords+trust+weight+recentness+graph' },
            trace: {
                kinds,
                whyHit: Object.keys(kinds).reduce((acc, key) => acc.concat(kinds[key].selected), []),
                whyMissed: Object.keys(kinds).reduce((acc, key) => acc.concat(kinds[key].misses), []).slice(0, 24),
                clipped: clipped ? [{ code: 'block-clipped', title: '候选记忆块被字符上限裁剪', detail: `候选块接近或达到 ${maxBlockChars} 字符上限。` }] : [],
                blockers,
                legacyBrainOverlap: compare
            },
            final: {
                owner: adapter && adapter.final && adapter.final.owner || 'legacy',
                formalPromptInjection: false,
                promptHooked: false,
                noDualInjection: true,
                blockedUntil: 'v0.9',
                reason: blockers.map(item => item.title).join('；') || '只生成实时 trace，不接正式 prompt。'
            },
            policy: { previewOnlyUntilV09: true, formalPromptInjection: false, noLegacyWrite: true, noDualInjection: true }
        };
    }
    function compactRealtimeInjectionTraceForList(report) {
        const item = report || {};
        const trace = item.trace || {};
        const kinds = trace.kinds || {};
        return {
            id: item.id,
            status: item.status || 'active',
            createdAt: item.createdAt || item.updatedAt || '',
            queryText: clip(item.query && item.query.text, 160),
            finalOwner: item.final && item.final.owner || 'legacy',
            brainChars: item.memoryBrain && item.memoryBrain.blockCharCount || 0,
            legacyChars: item.legacy && item.legacy.blockCharCount || 0,
            hitCount: asArray(trace.whyHit).length,
            missCount: asArray(trace.whyMissed).length,
            blockerCount: asArray(trace.blockers).length,
            overlapRatio: trace.legacyBrainOverlap && trace.legacyBrainOverlap.ratio || 0,
            selectedCounts: Object.keys(kinds).reduce((acc, key) => { acc[key] = kinds[key] && kinds[key].selectedCount || 0; return acc; }, {}),
            hits: asArray(trace.whyHit).slice(0, 8),
            misses: asArray(trace.whyMissed).slice(0, 8),
            blockers: asArray(trace.blockers).slice(0, 6),
            clipped: asArray(trace.clipped).slice(0, 3),
            policy: item.policy || {}
        };
    }

    core.memoryBrain.realtimeInjectionTraceSemantics = { buildRealtimeInjectionTraceReport, compactRealtimeInjectionTraceForList };
})(OwoApp);
