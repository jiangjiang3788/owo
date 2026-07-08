// --- Memory Brain cutover comparison semantics owner (v0.4.8) ---
// 纯语义：旧正式注入块 vs Memory Brain shadow 注入包，对比召回覆盖、重复和接管风险。不访问 DOM / 存储 / 网络。
(function registerMemoryBrainCutoverComparisonSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clip(value, max) {
        const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return text.length > max ? text.slice(0, Math.max(0, max - 1)) + '…' : text;
    }
    function cjkBigrams(text) {
        const chunks = asText(text).match(/[\u3400-\u9fff]{2,}/g) || [];
        const grams = [];
        chunks.forEach(chunk => { for (let i = 0; i < chunk.length - 1; i += 1) grams.push(chunk.slice(i, i + 2)); });
        return grams;
    }
    function unique(list, max) {
        const seen = new Set();
        return asArray(list).map(asText).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, max || 1000);
    }
    function tokenize(value) {
        const text = asText(value).toLowerCase();
        return unique((text.match(/[a-z0-9_\-]{2,}/g) || []).concat(cjkBigrams(text)), 240);
    }
    function tokenSet(value) { return new Set(tokenize(value)); }
    function countOverlap(a, b) {
        const left = tokenSet(a);
        const right = tokenSet(b);
        if (!left.size || !right.size) return { common: [], overlapPercent: 0, missingFromBrain: [], onlyBrain: [] };
        const common = [];
        const missingFromBrain = [];
        left.forEach(token => { if (right.has(token)) common.push(token); else missingFromBrain.push(token); });
        const onlyBrain = [];
        right.forEach(token => { if (!left.has(token)) onlyBrain.push(token); });
        return { common: common.slice(0, 80), overlapPercent: Math.round((common.length / Math.max(1, left.size)) * 100), missingFromBrain: missingFromBrain.slice(0, 40), onlyBrain: onlyBrain.slice(0, 40) };
    }
    function selectedCount(preview) {
        const selected = preview && preview.selected || {};
        return asArray(selected.modelIds).length + asArray(selected.factIds).length + asArray(selected.familyIds).length + asArray(selected.edgeIds).length + asArray(selected.eventIds).length;
    }
    function legacyHitCount(legacyComparison, legacyBlock) {
        const totals = legacyComparison && legacyComparison.totals || {};
        const total = Number(totals.journals || 0) + Number(totals.vectorEntries || 0) + Number(totals.tableCells || 0);
        if (total) return total;
        return asText(legacyBlock) ? 1 : 0;
    }
    function makeIssue(kind, severity, title, detail) { return { kind, severity, title, detail: clip(detail, 260) }; }
    function buildLegacyMemoryBlock(input) {
        const legacyBlock = asText(input && input.legacyBlock);
        if (legacyBlock) return clip(legacyBlock, Number(input && input.maxLegacyBlockChars) || 5000);
        const comparison = input && input.legacyComparison || {};
        const snippets = asArray(comparison.snippets).slice(0, 10);
        const owner = input && input.ownerSnapshot || {};
        const lines = [
            '【旧正式记忆注入块只读对照】',
            `owner=${owner.formalOwnerLabel || owner.formalOwner || 'legacy'}`,
            comparison.note || '旧记忆只读对照，不写入、不迁移。'
        ];
        if (snippets.length) {
            lines.push('', '【旧记忆片段】');
            snippets.forEach((snippet, index) => lines.push(`${index + 1}. ${clip(snippet, 220)}`));
        }
        return clip(lines.join('\n'), Number(input && input.maxLegacyBlockChars) || 5000);
    }
    function buildCutoverComparisonReport(input = {}) {
        const preview = input.memoryBrainPreview || input.preview || {};
        const legacyComparison = input.legacyComparison || {};
        const ownerSnapshot = input.ownerSnapshot || {};
        const legacyBlock = buildLegacyMemoryBlock(input);
        const brainBlock = clip(preview.memoryBlock || '', Number(input.maxBrainBlockChars) || 5000);
        const overlap = countOverlap(legacyBlock, brainBlock);
        const brainHits = selectedCount(preview);
        const oldHits = legacyHitCount(legacyComparison, legacyBlock);
        const issues = [];
        if (!legacyBlock) issues.push(makeIssue('legacy-empty', 'warn', '旧记忆注入块为空', '当前旧 owner 没有可读取注入块，无法充分比较正式记忆效果。'));
        if (!brainBlock || brainHits === 0) issues.push(makeIssue('brain-empty', 'high', 'Memory Brain 未召回内容', '影子注入包为空或没有命中事件/事实/家族/graph/长期模型。'));
        if (oldHits > 0 && overlap.overlapPercent < 18) issues.push(makeIssue('possible-miss', 'high', '新脑和旧记忆重叠过低', `旧记忆有 ${oldHits} 个来源命中，但新脑与旧注入块 token 重叠约 ${overlap.overlapPercent}%。`));
        if (brainBlock.length > 3600) issues.push(makeIssue('brain-too-long', 'warn', '影子注入块偏长', `当前 Memory Brain 影子注入块 ${brainBlock.length} 字符，正式接管前需要限制预算。`));
        if (legacyBlock && brainBlock && brainBlock.includes(legacyBlock.slice(0, Math.min(180, legacyBlock.length)))) issues.push(makeIssue('duplicate-block', 'warn', '疑似重复注入', '新脑注入块中包含大段旧记忆文本，正式接管前需要避免双注入。'));
        if (ownerSnapshot.memoryBrainFormalInjection === false) issues.push(makeIssue('policy-blocked', 'info', '正式接管仍被策略禁止', '当前路线规定 v0.9 完成前 Memory Brain 只读 / 可整理 / 可预览，不正式接管 prompt。'));
        const score = Math.max(0, Math.min(100,
            34 + Math.min(26, brainHits * 3) + Math.min(22, overlap.overlapPercent) - issues.filter(item => item.severity === 'high').length * 16 - issues.filter(item => item.severity === 'warn').length * 6
        ));
        const report = {
            layer: 'cutover', kind: 'cutover-rehearsal-report', mode: 'shadow', status: 'active',
            query: { text: clip(input.query, 1200), chatId: input.chatId || '', chatType: input.chatType || '', chatName: input.chatName || '' },
            ownerSnapshot: Object.assign({ memoryBrainFormalInjection: false }, ownerSnapshot),
            metrics: {
                legacyCharCount: legacyBlock.length,
                memoryBrainCharCount: brainBlock.length,
                legacyHitCount: oldHits,
                memoryBrainHitCount: brainHits,
                overlapPercent: overlap.overlapPercent,
                commonTokenCount: overlap.common.length
            },
            selected: preview.selected || { modelIds: [], factIds: [], familyIds: [], edgeIds: [], eventIds: [] },
            legacyComparison,
            memoryBrainPreviewId: preview.id || '',
            memoryBrainBlockPreview: clip(brainBlock, 1400),
            legacyBlockPreview: clip(legacyBlock, 1400),
            possibleMissingTokens: overlap.missingFromBrain,
            memoryBrainOnlyTokens: overlap.onlyBrain,
            issues,
            readiness: {
                score,
                readyForFormalCutover: false,
                cutoverGate: 'blocked-until-v0.9',
                recommendation: score >= 70 && !issues.some(item => item.severity === 'high')
                    ? '影子召回表现可继续观察；仍按策略保持不接正式 prompt。'
                    : '继续历史整理、去重、纠错和注入策略调参；不要正式接管 prompt。'
            },
            policy: { previewOnly: true, formalPromptInjection: false, singleOwnerRequiredBeforeCutover: true, noDualInjection: true }
        };
        return report;
    }
    function compactCutoverReportForList(report) {
        const metrics = report && report.metrics || {};
        const readiness = report && report.readiness || {};
        return {
            id: report && report.id,
            status: report && report.status || 'active',
            createdAt: report && report.createdAt || '',
            queryText: clip(report && report.query && report.query.text, 160),
            chatName: report && report.query && report.query.chatName || '',
            ownerLabel: report && report.ownerSnapshot && (report.ownerSnapshot.formalOwnerLabel || report.ownerSnapshot.formalOwner) || 'legacy',
            score: Number(readiness.score) || 0,
            gate: readiness.cutoverGate || 'blocked-until-v0.9',
            readyForFormalCutover: false,
            metrics,
            issues: asArray(report && report.issues).slice(0, 6).map(issue => ({ kind: issue.kind, severity: issue.severity, title: issue.title, detail: clip(issue.detail, 160) })),
            memoryBrainBlockPreview: clip(report && report.memoryBrainBlockPreview, 420),
            legacyBlockPreview: clip(report && report.legacyBlockPreview, 420)
        };
    }
    core.memoryBrain.cutoverComparisonSemantics = { buildLegacyMemoryBlock, buildCutoverComparisonReport, compactCutoverReportForList };
})(OwoApp);
