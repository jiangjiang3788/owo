// --- World book prompt context service (V26 canonical owner) ---
// 只负责把 world book 触发语义接入运行时快照，生成 before/middle/after prompt 片段。
(function registerWorldBookContextService(app) {
    app.features = app.features || {};
    app.features.worldBook = app.features.worldBook || {};

    const semantics = app.core.memory.worldBookSemantics;

    function getState(deps) {
        return deps && deps.state ? deps.state : {};
    }

    function getActiveWorldBooks(subject, deps, options) {
        return semantics.collectActiveWorldBooks(subject, getState(deps), options || {});
    }

    function getActiveWorldBooksContents(subject, deps, options) {
        const activeBooks = getActiveWorldBooks(subject, deps, options || {});
        return semantics.splitWorldBookContentsByPosition(activeBooks);
    }

    function getWorldBookContextReport(subject, deps, options) {
        const activeBooks = getActiveWorldBooks(subject, deps, options || {});
        const contents = semantics.splitWorldBookContentsByPosition(activeBooks);
        return {
            activeCount: activeBooks.length,
            activeIds: activeBooks.map(book => book.id).filter(Boolean),
            positions: contents
        };
    }

    app.features.worldBook.contextService = {
        getActiveWorldBooks,
        getActiveWorldBooksContents,
        getWorldBookContextReport
    };
})(OwoApp);
