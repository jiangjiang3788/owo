// --- Memory Brain owner switch semantics (v0.4.9) ---
// 纯语义：只计算单一记忆 owner 安全门，不访问 DOM、运行时状态、fetch 或平台存储。
(function registerMemoryBrainOwnerSwitchSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    const OWNER_MODES = Object.freeze(['legacy', 'memoryBrain', 'off']);
    const OWNER_LABELS = Object.freeze({
        legacy: '旧档案记忆 owner',
        memoryBrain: 'Memory Brain',
        off: '关闭正式记忆注入'
    });
    const BLOCKED_UNTIL = 'v0.9';

    function normalizeOwner(value) {
        const owner = String(value || '').trim();
        if (owner === 'memoryBrain' || owner === 'brain' || owner === 'memory-brain') return 'memoryBrain';
        if (owner === 'off' || owner === 'none' || owner === 'disabled') return 'off';
        return 'legacy';
    }

    function getOwnerLabel(owner) {
        return OWNER_LABELS[normalizeOwner(owner)] || OWNER_LABELS.legacy;
    }

    function normalizeOwnerState(value) {
        const source = value && typeof value === 'object' ? value : {};
        const requestedOwner = normalizeOwner(source.requestedOwner || source.formalOwner || 'legacy');
        return {
            formalOwner: 'legacy',
            effectiveOwner: 'legacy',
            requestedOwner,
            requestedOwnerLabel: getOwnerLabel(requestedOwner),
            formalOwnerLabel: getOwnerLabel('legacy'),
            mode: 'shadow-gate',
            cutoverGate: 'blocked-until-v0.9',
            memoryBrainCanInject: false,
            offCanApply: false,
            legacyCanInject: true,
            noDualInjection: true,
            canApplyToPrompt: false,
            blockedUntil: BLOCKED_UNTIL,
            reason: source.reason || '到 v0.9 完成前，Memory Brain 只读 / 可整理 / 可预览；正式 prompt 仍由当前旧记忆 owner 执行。',
            updatedAt: source.updatedAt || null,
            updatedBy: source.updatedBy || 'memory-brain-owner-gate'
        };
    }

    function buildOwnerSwitchIssue(code, severity, title, detail) {
        return { code, severity, title, detail };
    }

    function evaluateOwnerSwitch(state, requestedOwner, options) {
        const normalizedState = normalizeOwnerState(state);
        const request = normalizeOwner(requestedOwner || normalizedState.requestedOwner);
        const issues = [];
        if (request === 'memoryBrain') {
            issues.push(buildOwnerSwitchIssue('blocked-until-v0.9', 'high', 'Memory Brain 正式接管被策略阻止', '当前路线要求 v0.9 完成前 Memory Brain 不进入正式 prompt。'));
        }
        if (request === 'off') {
            issues.push(buildOwnerSwitchIssue('off-not-wired', 'medium', '关闭正式记忆注入仍未接入聊天管线', '本版只建立切换门和回退语义，不修改 chat_ai / promptSemantics 正式入口。'));
        }
        if (request === 'legacy') {
            issues.push(buildOwnerSwitchIssue('legacy-active', 'info', '继续使用旧正式记忆 owner', '旧档案 / 日记 / 向量三选一守门继续负责正式 prompt 记忆注入。'));
        }
        return Object.assign({}, normalizedState, {
            requestedOwner: request,
            requestedOwnerLabel: getOwnerLabel(request),
            effectiveOwner: 'legacy',
            formalOwner: 'legacy',
            formalOwnerLabel: getOwnerLabel('legacy'),
            readyForFormalCutover: false,
            canApplyToPrompt: false,
            cutoverGate: 'blocked-until-v0.9',
            noDualInjection: true,
            memoryBrainFormalInjection: false,
            issues,
            summary: request === 'legacy'
                ? '当前保持 legacy 正式 owner，Memory Brain 继续只读 / 影子预览。'
                : `${getOwnerLabel(request)} 请求已记录，但正式生效被阻止；实际 prompt owner 仍是旧记忆 owner。`,
            requestedAt: options && options.now || null
        });
    }

    function compactOwnerGateForList(ownerState, runs) {
        const normalized = normalizeOwnerState(ownerState);
        return {
            ownerState: normalized,
            modes: OWNER_MODES.map(id => ({ id, label: getOwnerLabel(id), active: normalized.requestedOwner === id, effective: normalized.effectiveOwner === id })),
            runs: Array.isArray(runs) ? runs.slice(0, 8).map(run => ({ id: run.id, requestedOwner: run.requestedOwner, effectiveOwner: run.effectiveOwner, status: run.status, createdAt: run.createdAt, issueCount: Array.isArray(run.issues) ? run.issues.length : 0 })) : [],
            safety: {
                readyForFormalCutover: false,
                cutoverGate: 'blocked-until-v0.9',
                noDualInjection: true,
                formalPromptInjection: false
            }
        };
    }

    core.memoryBrain.ownerSwitchSemantics = { OWNER_MODES, OWNER_LABELS, BLOCKED_UNTIL, normalizeOwner, getOwnerLabel, normalizeOwnerState, evaluateOwnerSwitch, compactOwnerGateForList };
})(OwoApp);
