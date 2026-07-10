// --- platform/storage/backupIntegrity.js ---
// v0.9.1 备份完整性 owner：稳定序列化、checksum、结构校验与引用校验。
(function registerBackupIntegrity(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.storage) {
        throw new Error('js/app/namespace.js 必须在 platform/storage/backupIntegrity.js 之前加载');
    }

    const META_KEYS = Object.freeze([
        '_exportVersion', '_exportTimestamp', '_exportTables', '_integrity', '_schema'
    ]);
    const CORE_ARRAY_KEYS = Object.freeze([
        'characters', 'groups', 'worldBooks', 'myStickers', 'archives'
    ]);

    function clone(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    function normalizeForStableJson(value, seen) {
        if (value === null || typeof value !== 'object') {
            if (typeof value === 'number' && !Number.isFinite(value)) return null;
            return value;
        }
        const visited = seen || new Set();
        if (visited.has(value)) throw new Error('备份中存在循环引用，无法计算 checksum');
        visited.add(value);
        let output;
        if (Array.isArray(value)) {
            output = value.map(item => item === undefined ? null : normalizeForStableJson(item, visited));
        } else {
            output = {};
            Object.keys(value).sort().forEach((key) => {
                if (value[key] !== undefined) output[key] = normalizeForStableJson(value[key], visited);
            });
        }
        visited.delete(value);
        return output;
    }

    function stableStringify(value) {
        return JSON.stringify(normalizeForStableJson(value));
    }

    function bytesToHex(bytes) {
        return Array.from(bytes).map(value => value.toString(16).padStart(2, '0')).join('');
    }

    function fallbackHash(text) {
        // 非加密回退只用于旧浏览器的数据损坏检测；新浏览器默认使用 SHA-256。
        let h1 = 0x811c9dc5;
        let h2 = 0x9e3779b9;
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            h1 ^= code;
            h1 = Math.imul(h1, 0x01000193);
            h2 ^= code + i;
            h2 = Math.imul(h2, 0x85ebca6b);
        }
        return [h1, h2, h1 ^ h2, Math.imul(h1, h2)]
            .map(value => (value >>> 0).toString(16).padStart(8, '0')).join('');
    }

    async function hashText(text, preferredAlgorithm) {
        const requested = String(preferredAlgorithm || '');
        if (requested === 'OWO-FNV64x2') {
            return { algorithm: 'OWO-FNV64x2', checksum: fallbackHash(text) };
        }
        const cryptoApi = global.crypto && global.crypto.subtle;
        if (cryptoApi && typeof cryptoApi.digest === 'function' && typeof global.TextEncoder === 'function') {
            const digest = await cryptoApi.digest('SHA-256', new global.TextEncoder().encode(text));
            return { algorithm: 'SHA-256', checksum: bytesToHex(new Uint8Array(digest)) };
        }
        if (requested === 'SHA-256') throw new Error('当前环境不支持 SHA-256 checksum 校验');
        return { algorithm: 'OWO-FNV64x2', checksum: fallbackHash(text) };
    }

    function withoutIntegrity(data) {
        const copy = clone(data || {});
        delete copy._integrity;
        return copy;
    }

    async function computePackageIntegrity(data, preferredAlgorithm) {
        const payload = withoutIntegrity(data);
        const hashed = await hashText(stableStringify(payload), preferredAlgorithm);
        return Object.freeze({
            algorithm: hashed.algorithm,
            checksum: hashed.checksum,
            format: 'stable-json-v1'
        });
    }

    async function attachPackageIntegrity(data) {
        const copy = clone(data || {});
        copy._integrity = await computePackageIntegrity(copy);
        return copy;
    }

    async function verifyPackageIntegrity(data) {
        const expected = data && data._integrity;
        if (!expected || !expected.checksum) {
            return { ok: true, verified: false, legacy: true, warnings: ['旧备份没有 checksum，将只执行结构校验'] };
        }
        const actual = await computePackageIntegrity(data, expected.algorithm);
        const ok = String(expected.checksum) === actual.checksum
            && (!expected.algorithm || String(expected.algorithm) === actual.algorithm);
        return {
            ok,
            verified: true,
            legacy: false,
            expected: clone(expected),
            actual,
            errors: ok ? [] : ['备份 checksum 不匹配，文件可能损坏或被修改']
        };
    }

    function collectDuplicateIds(items, label) {
        const seen = new Set();
        const duplicates = [];
        (items || []).forEach((item, index) => {
            const id = item && item.id;
            if (id === undefined || id === null || id === '') return;
            const key = String(id);
            if (seen.has(key)) duplicates.push(`${label}[${index}].id=${key}`);
            seen.add(key);
        });
        return duplicates;
    }

    function validateBackupShape(data, options) {
        const opts = options || {};
        const errors = [];
        const warnings = [];
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return { ok: false, errors: ['备份根节点必须是对象'], warnings };
        }
        const version = String(data._exportVersion || 'legacy');
        const isPartial = version.includes('partial') || Array.isArray(data._exportTables);
        if (opts.mode === 'full' && isPartial) errors.push('分类备份不能通过完整恢复入口导入');
        if (opts.mode === 'partial' && !isPartial) errors.push('完整备份不能通过分类导入入口导入');
        if (isPartial && (!Array.isArray(data._exportTables) || data._exportTables.length === 0)) {
            errors.push('分类备份缺少 _exportTables');
        }
        CORE_ARRAY_KEYS.forEach((key) => {
            if (data[key] !== undefined && !Array.isArray(data[key])) errors.push(`${key} 必须是数组`);
        });
        if (data._schema && data._schema.id && data._schema.id !== 'owo-backup') {
            errors.push(`不支持的备份 schema：${data._schema.id}`);
        }
        if (!isPartial) {
            ['characters', 'groups', 'worldBooks'].forEach((key) => {
                if (!Array.isArray(data[key])) errors.push(`完整备份缺少核心表：${key}`);
            });
        }
        return { ok: errors.length === 0, errors, warnings, version, isPartial };
    }

    function validateRuntimeState(state) {
        const errors = [];
        const warnings = [];
        const source = state && typeof state === 'object' ? state : {};
        CORE_ARRAY_KEYS.forEach((key) => {
            if (!Array.isArray(source[key])) errors.push(`恢复候选缺少数组：${key}`);
        });
        ['characters', 'groups', 'worldBooks', 'myStickers', 'archives'].forEach((key) => {
            const duplicates = collectDuplicateIds(source[key], key);
            if (duplicates.length) errors.push(`存在重复 ID：${duplicates.slice(0, 10).join(', ')}`);
        });
        const characterIds = new Set((source.characters || []).map(item => String(item && item.id || '')).filter(Boolean));
        (source.archives || []).forEach((archive, index) => {
            if (archive && archive.characterId && !characterIds.has(String(archive.characterId))) {
                warnings.push(`archives[${index}] 引用了不存在的 characterId=${archive.characterId}`);
            }
        });
        return {
            ok: errors.length === 0,
            errors,
            warnings,
            counts: CORE_ARRAY_KEYS.reduce((acc, key) => {
                acc[key] = Array.isArray(source[key]) ? source[key].length : 0;
                return acc;
            }, {})
        };
    }

    function stripMetadata(data) {
        const output = {};
        Object.keys(data || {}).forEach((key) => {
            if (!META_KEYS.includes(key) && key !== '__chunks__' && data[key] !== undefined) {
                output[key] = clone(data[key]);
            }
        });
        return output;
    }

    app.platform.storage.backupIntegrity = {
        META_KEYS,
        CORE_ARRAY_KEYS,
        clone,
        stableStringify,
        hashText,
        computePackageIntegrity,
        attachPackageIntegrity,
        verifyPackageIntegrity,
        validateBackupShape,
        validateRuntimeState,
        stripMetadata
    };
})(window);
