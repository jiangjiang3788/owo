// --- platform/storage/restoreTransaction.js ---
// v0.9.1 恢复事务 owner：在 Dexie 原子事务中替换数据，并在提交后验证；失败自动回滚。
(function registerRestoreTransaction(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.storage) {
        throw new Error('js/app/namespace.js 必须在 platform/storage/restoreTransaction.js 之前加载');
    }

    function getIntegrity() {
        const value = app.platform.storage.backupIntegrity;
        if (!value || typeof value.stableStringify !== 'function') {
            throw new Error('[restoreTransaction] backupIntegrity 尚未加载');
        }
        return value;
    }

    function getTables(database) {
        const tables = [
            ['characters', database.characters],
            ['groups', database.groups],
            ['worldBooks', database.worldBooks],
            ['myStickers', database.myStickers],
            ['globalSettings', database.globalSettings]
        ];
        if (database.archives) tables.push(['archives', database.archives]);
        return tables.filter(item => item[1]);
    }

    function getSettingKeys(state, context) {
        const configured = typeof context.getGlobalSettingKeys === 'function'
            ? context.getGlobalSettingKeys() : [];
        const keys = new Set([...(Array.isArray(configured) ? configured : []), 'worldBookCategoryOrder']);
        Object.keys(state || {}).forEach((key) => {
            if (!['characters', 'groups', 'worldBooks', 'myStickers', 'archives'].includes(key)) keys.add(key);
        });
        return Array.from(keys).filter(key => state[key] !== undefined);
    }

    function buildTablePayload(state, context) {
        const integrity = getIntegrity();
        return {
            characters: integrity.clone(state.characters || []),
            groups: integrity.clone(state.groups || []),
            worldBooks: integrity.clone(state.worldBooks || []),
            myStickers: integrity.clone(state.myStickers || []),
            archives: integrity.clone(state.archives || []),
            globalSettings: getSettingKeys(state, context).map(key => ({ key, value: integrity.clone(state[key]) }))
        };
    }

    async function runTransaction(database, tables, runner) {
        if (!database || typeof database.transaction !== 'function') {
            throw new Error('[restoreTransaction] Dexie transaction 不可用');
        }
        const args = ['rw'].concat(tables.map(item => item[1]), [runner]);
        return database.transaction.apply(database, args);
    }

    async function writePayload(database, payload) {
        const tables = getTables(database);
        await runTransaction(database, tables, async () => {
            for (const [name, table] of tables) {
                await table.clear();
                const values = payload[name] || [];
                if (values.length) await table.bulkPut(values);
            }
        });
    }

    async function readPayload(database) {
        const result = {};
        const tables = getTables(database);
        for (const [name, table] of tables) result[name] = await table.toArray();
        return result;
    }

    function normalizePayloadOrder(payload) {
        const output = {};
        Object.keys(payload || {}).sort().forEach((key) => {
            const values = Array.isArray(payload[key]) ? payload[key].slice() : [];
            const identityKey = key === 'globalSettings' ? 'key' : 'id';
            values.sort((a, b) => String(a && a[identityKey] || '').localeCompare(String(b && b[identityKey] || '')));
            output[key] = values;
        });
        return output;
    }

    async function payloadHash(payload) {
        const integrity = getIntegrity();
        const normalized = normalizePayloadOrder(payload);
        const hash = await integrity.hashText(integrity.stableStringify(normalized));
        return hash.checksum;
    }

    async function verifyPersistedPayload(database, expectedPayload) {
        const actualPayload = await readPayload(database);
        const [expectedChecksum, actualChecksum] = await Promise.all([
            payloadHash(expectedPayload), payloadHash(actualPayload)
        ]);
        return {
            ok: expectedChecksum === actualChecksum,
            expectedChecksum,
            actualChecksum,
            counts: Object.keys(actualPayload).reduce((acc, key) => {
                acc[key] = Array.isArray(actualPayload[key]) ? actualPayload[key].length : 0;
                return acc;
            }, {})
        };
    }

    function replaceRuntimeState(target, source) {
        const integrity = getIntegrity();
        Object.keys(target || {}).forEach(key => { delete target[key]; });
        Object.assign(target, integrity.clone(source || {}));
    }

    async function commitState(candidateState, context) {
        const integrity = getIntegrity();
        const database = context.getDexieDB();
        const runtimeDb = context.getDb();
        const snapshotState = integrity.clone(runtimeDb);
        const candidatePayload = buildTablePayload(candidateState, context);
        const snapshotPayload = buildTablePayload(snapshotState, context);
        const snapshotHash = await payloadHash(snapshotPayload);
        let committed = false;
        try {
            await writePayload(database, candidatePayload);
            committed = true;
            const verification = await verifyPersistedPayload(database, candidatePayload);
            if (!verification.ok) throw new Error('恢复提交后的持久化校验失败');
            replaceRuntimeState(runtimeDb, candidateState);
            return { success: true, verification, preImportSnapshotChecksum: snapshotHash };
        } catch (error) {
            if (committed) {
                try { await writePayload(database, snapshotPayload); }
                catch (rollbackError) { error.rollbackError = rollbackError; }
            }
            replaceRuntimeState(runtimeDb, snapshotState);
            throw error;
        }
    }

    app.platform.storage.restoreTransaction = {
        getTables,
        buildTablePayload,
        writePayload,
        readPayload,
        verifyPersistedPayload,
        normalizePayloadOrder,
        replaceRuntimeState,
        commitState
    };
})(window);
