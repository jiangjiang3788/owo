// --- Versioned output contract registry (v0.9.3 canonical owner) ---
// 只负责注册、解析和校验模型输出；不执行副作用。
(function registerOutputContracts(app) {
    app.core = app.core || {};
    app.core.output = app.core.output || {};

    const registry = new Map();

    function register(contract) {
        if (!contract || typeof contract !== 'object') throw new Error('output contract must be an object');
        const id = String(contract.id || '').trim();
        if (!id) throw new Error('output contract id is required');
        if (registry.has(id)) throw new Error(`duplicate output contract: ${id}`);
        if (typeof contract.parse !== 'function') throw new Error(`output contract ${id} requires parse()`);
        registry.set(id, Object.freeze({
            id,
            schemaVersion: Number(contract.schemaVersion || 1),
            parse: contract.parse,
            buildRepairPrompt: typeof contract.buildRepairPrompt === 'function' ? contract.buildRepairPrompt : null
        }));
        return registry.get(id);
    }

    function get(id) { return registry.get(String(id || '').trim()) || null; }
    function list() { return Array.from(registry.values()); }

    function parse(id, raw, context) {
        const contract = get(id);
        if (!contract) return { ok: false, contractId: id, errors: [`unknown output contract: ${id}`], raw };
        try {
            const value = contract.parse(raw, context || {});
            return { ok: true, contractId: contract.id, schemaVersion: contract.schemaVersion, value, errors: [], raw };
        } catch (error) {
            return { ok: false, contractId: contract.id, schemaVersion: contract.schemaVersion, value: null, errors: [error && error.message ? error.message : String(error)], raw };
        }
    }

    function buildRepairPrompt(id, raw, context) {
        const contract = get(id);
        if (!contract || !contract.buildRepairPrompt) return '';
        return contract.buildRepairPrompt(raw, context || {});
    }

    app.core.output.outputContracts = { register, get, list, parse, buildRepairPrompt };
})(OwoApp);
