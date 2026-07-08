// --- Memory Brain formal injection adapter semantics (v0.6.0) ---
// 纯语义：生成唯一正式记忆入口的适配结果；不访问 DOM、存储、fetch、features 或正式聊天管线。
(function registerMemoryBrainFormalInjectionAdapterSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clip(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }
    function normalizeOwnerState(ownerState) {
        const owner = core.memoryBrain.ownerSwitchSemantics;
        if (owner && typeof owner.normalizeOwnerState === 'function') return owner.normalizeOwnerState(ownerState || {});
        return { formalOwner: 'legacy', effectiveOwner: 'legacy', requestedOwner: 'legacy', cutoverGate: 'blocked-until-v0.9', memoryBrainCanInject: false, canApplyToPrompt: false, noDualInjection: true };
    }
    function buildIssue(code, severity, title, detail) { return { code, severity, title, detail }; }
    function buildBrainCandidate(query, snapshot, options) {
        const injection = core.memoryBrain.injectionSemantics;
        if (!injection || typeof injection.buildMemoryInjectionPackage !== 'function') {
            return { memoryBlock: '', blockCharCount: 0, selected: {}, diagnostics: ['memory_brain_injection_semantics_missing'] };
        }
        return injection.buildMemoryInjectionPackage(query, snapshot || {}, Object.assign({ maxBlockChars: 3600 }, options || {}));
    }
    function countSelected(selected) {
        const source = selected || {};
        return {
            models: asArray(source.modelIds).length,
            facts: asArray(source.factIds).length,
            families: asArray(source.familyIds).length,
            edges: asArray(source.edgeIds).length,
            events: asArray(source.eventIds).length
        };
    }
    function buildFormalInjectionAdapterPackage(input) {
        const options = input && typeof input === 'object' ? input : {};
        const snapshot = options.snapshot || {};
        const ownerState = normalizeOwnerState(options.ownerState || snapshot.ownerState || {});
        const query = clip(options.query || options.userInput || '', 1200);
        const legacyBlock = asText(options.legacyBlock || '');
        const legacyOwner = asText(options.legacyOwner || 'legacy');
        const candidate = buildBrainCandidate(query, snapshot, options.injectionOptions || {});
        const issues = [];
        const requestedOwner = ownerState.requestedOwner || 'legacy';
        const effectiveOwner = ownerState.effectiveOwner || 'legacy';
        const cutoverGate = ownerState.cutoverGate || 'blocked-until-v0.9';
        const gateOpen = cutoverGate === 'open' || cutoverGate === 'enabled';
        const memoryBrainAllowed = gateOpen && effectiveOwner === 'memoryBrain' && ownerState.memoryBrainCanInject === true && ownerState.canApplyToPrompt === true;
        const offAllowed = gateOpen && effectiveOwner === 'off' && ownerState.offCanApply === true && ownerState.canApplyToPrompt === true;
        if (!query) issues.push(buildIssue('empty-query', 'medium', '没有当前输入', 'adapter 仍可生成安全报告，但 Memory Brain 召回会偏弱。'));
        if (requestedOwner === 'memoryBrain' && !memoryBrainAllowed) issues.push(buildIssue('blocked-until-v0.9', 'high', 'Memory Brain 正式注入被总门禁阻止', '到 v0.9 完成前，Memory Brain 只能生成候选块和预览，不写入正式 prompt。'));
        if (requestedOwner === 'off' && !offAllowed) issues.push(buildIssue('off-not-applied', 'medium', '关闭正式注入未生效到聊天管线', 'v0.6.0 只建立唯一 adapter 和回退语义，不直接改 sendMessage / getAiReply。'));
        if (!legacyBlock && effectiveOwner === 'legacy') issues.push(buildIssue('legacy-block-empty', 'medium', '旧正式记忆块为空', '当前旧 owner 仍是正式来源，但本次没有读到可注入内容。'));
        const finalOwner = memoryBrainAllowed ? 'memoryBrain' : offAllowed ? 'off' : 'legacy';
        const finalBlock = finalOwner === 'memoryBrain' ? asText(candidate.memoryBlock) : finalOwner === 'off' ? '' : legacyBlock;
        return {
            kind: 'formal-injection-adapter',
            release: 'v0.6.0',
            mode: 'shadow-adapter',
            status: memoryBrainAllowed || offAllowed ? 'adapter-ready' : 'blocked-shadow-only',
            query: { text: query },
            owner: {
                requestedOwner,
                effectiveOwner,
                finalOwner,
                legacyOwner,
                cutoverGate,
                noDualInjection: true,
                canApplyToPrompt: !!(memoryBrainAllowed || offAllowed),
                memoryBrainCanInject: !!memoryBrainAllowed,
                formalPromptInjection: false,
                blockedUntil: ownerState.blockedUntil || 'v0.9'
            },
            legacy: {
                owner: legacyOwner,
                blockCharCount: legacyBlock.length,
                blockPreview: clip(legacyBlock, 900),
                willApplyIfAdapterWired: finalOwner === 'legacy'
            },
            memoryBrain: {
                candidateBlock: clip(candidate.memoryBlock, 2200),
                candidateBlockCharCount: Number(candidate.blockCharCount || (candidate.memoryBlock || '').length) || 0,
                selected: candidate.selected || {},
                selectedCounts: countSelected(candidate.selected),
                diagnostics: asArray(candidate.diagnostics).slice(0, 12),
                willApplyIfAdapterWired: finalOwner === 'memoryBrain'
            },
            final: {
                owner: finalOwner,
                memoryBlock: clip(finalBlock, 3600),
                blockCharCount: finalBlock.length,
                memoryBrainApplied: finalOwner === 'memoryBrain',
                legacyApplied: finalOwner === 'legacy',
                offApplied: finalOwner === 'off'
            },
            policy: {
                singleAdapterEntry: true,
                noDualInjection: true,
                noLegacyWrite: true,
                previewOnlyUntilV09: true,
                formalPromptInjection: false,
                promptHooked: false
            },
            issues
        };
    }
    function compactFormalInjectionAdapterForList(report) {
        const item = report || {};
        return {
            id: item.id,
            status: item.status || 'blocked-shadow-only',
            createdAt: item.createdAt || item.updatedAt || '',
            queryText: clip(item.query && item.query.text, 160),
            requestedOwner: item.owner && item.owner.requestedOwner || 'legacy',
            effectiveOwner: item.owner && item.owner.effectiveOwner || 'legacy',
            finalOwner: item.final && item.final.owner || 'legacy',
            cutoverGate: item.owner && item.owner.cutoverGate || 'blocked-until-v0.9',
            legacyChars: item.legacy && item.legacy.blockCharCount || 0,
            brainChars: item.memoryBrain && item.memoryBrain.candidateBlockCharCount || 0,
            finalChars: item.final && item.final.blockCharCount || 0,
            selectedCounts: item.memoryBrain && item.memoryBrain.selectedCounts || {},
            issueCount: asArray(item.issues).length,
            issues: asArray(item.issues).slice(0, 5),
            policy: item.policy || {}
        };
    }

    core.memoryBrain.formalInjectionAdapterSemantics = { buildFormalInjectionAdapterPackage, compactFormalInjectionAdapterForList };
})(OwoApp);
