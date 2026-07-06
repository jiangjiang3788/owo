# Memory Regression Smoke Gate

This checklist is the V27 acceptance gate for the memory domain after the V23-V26 ownership slices. It is intentionally manual-first: the project still runs as a script-loaded static app, so the safest regression gate is a fixed browser smoke matrix plus the static `tools/memory-regression-gate.js` and `tools/arch-check.js` gates.

## Scope

Covered domains:

- Memory Table: `core/memory/tableSemantics.js` and `features/memoryTable/*`
- Vector Memory: `platform/ai/embeddingAdapter.js` and `features/vectorMemory/*`
- Journal: `core/memory/journalSemantics.js` and `features/journal/*`
- WorldBook context: `core/memory/worldBookSemantics.js` and `features/worldBook/*`

Frozen in V27:

- Do not modify `js/modules/chat_ai.js` prompt main orchestration.
- Do not modify provider fetch / stream / `processStream`.
- Do not modify vector memory UI DOM behavior beyond existing V24 wrappers.
- Do not change Netlify direct-publish configuration.

## Static gate

Run:

```bash
node tools/arch-check.js
node tools/memory-regression-gate.js
node tools/netlify-build.js
```

Expected:

```text
✅ 架构检查通过
✅ Memory regression gate passed
✅ Optional Netlify dist build complete
```

Legacy large-file warnings are allowed in V27. New errors in memory owners are not allowed.

## Browser console probes

After opening the app, run:

```js
window.OwoApp.core.memory.tableSemantics
window.OwoApp.features.memoryTable.publicApi
window.OwoApp.platform.ai.embeddingAdapter
window.OwoApp.features.vectorMemory.publicApi
window.OwoApp.core.memory.journalSemantics
window.OwoApp.features.journal.publicApi
window.OwoApp.core.memory.worldBookSemantics
window.OwoApp.features.worldBook.publicApi
```

All must exist.

Then run:

```js
typeof window.OwoApp.core.memory.tableSemantics.normalizeTemplate
typeof window.OwoApp.features.memoryTable.model.ensureMemoryTableState
typeof window.OwoApp.platform.ai.embeddingAdapter.fetchEmbeddings
typeof window.OwoApp.features.vectorMemory.contextService.prepareVectorMemoryContext
typeof window.OwoApp.core.memory.journalSemantics.normalizeJournal
typeof window.OwoApp.features.journal.service.getAutoJournalCursorInfo
typeof window.OwoApp.core.memory.worldBookSemantics.collectActiveWorldBooks
typeof window.OwoApp.features.worldBook.contextService.getActiveWorldBooksContents
```

Each result should be `"function"`.

## Memory Table smoke

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| MEM-TABLE-01 | Open structured memory | Open a private chat, then open the structured memory screen. | Screen opens with no console error. Existing templates and bound templates are visible. |
| MEM-TABLE-02 | Template CRUD | Create a template, add fields of at least text, number, boolean and date types, then save. | Template persists after closing and reopening the screen. |
| MEM-TABLE-03 | Bind template | Bind the new template to the current chat. | Current chat shows the bound template; no duplicate template data is created. |
| MEM-TABLE-04 | Field value update | Edit several field values and lock one field. | Values and lock state are retained after refresh. |
| MEM-TABLE-05 | Row table mode | Add, edit, move and delete rows in table mode. | Row order and values match the final UI state after refresh. |
| MEM-TABLE-06 | History | Open value history after editing fields. | History entries are shown and do not break field display. |
| MEM-TABLE-07 | Import / export | Export a template package and import it back. | Imported template is normalized once and does not create malformed fields. |
| MEM-TABLE-08 | Auto update controls | Toggle auto update and use “update to latest”. | Cursor information updates without changing chat prompt behavior. |

## Vector Memory smoke

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| MEM-VECTOR-01 | Open vector memory | Open the vector memory screen. | Screen opens with no console error. |
| MEM-VECTOR-02 | Manual entry | Add a manual vector memory entry. | Entry appears in the list and remains after refresh. |
| MEM-VECTOR-03 | Embedding request | Trigger embedding generation for an entry using the configured embedding provider. | Embedding is filled by `platform/ai/embeddingAdapter`; no chat stream code is invoked. |
| MEM-VECTOR-04 | Context retrieval | Use a chat with vector memory enabled and send a normal message. | AI reply works; vector context can be prepared without changing `chat_ai` prompt main orchestration. |
| MEM-VECTOR-05 | Fallback retrieval | Temporarily use entries without embeddings and trigger context retrieval. | Lexical fallback returns relevant entries or safely returns empty context. |
| MEM-VECTOR-06 | Auto summary cursor | Toggle auto summary and reset cursor to latest. | Cursor state updates and persists. |
| MEM-VECTOR-07 | Import / export template | Export and import a vector template. | Template is normalized and remains usable. |
| MEM-VECTOR-08 | Import / export package | Export and import vector memory entries. | Entries are normalized and no duplicate broken entries appear. |
| MEM-VECTOR-09 | Conversion entry points | Open journal/table to vector and vector to journal/table flows. | Entry points still open; no prompt/fetch behavior changes. |

## Journal smoke

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| MEM-JOURNAL-01 | Open journal | Open the memory journal screen. | Screen opens with no console error. |
| MEM-JOURNAL-02 | Manual journal | Create a manual journal entry. | Entry is normalized and remains after refresh. |
| MEM-JOURNAL-03 | Search / sort | Search for a keyword and sort/filter if supported. | Displayed entries match the filter without mutating source data. |
| MEM-JOURNAL-04 | Favorite toggle | Favorite and unfavorite a journal entry. | Favorite state persists and prompt pieces can be built from favorited entries. |
| MEM-JOURNAL-05 | Delete | Delete a single entry and then refresh. | Entry remains deleted; no unrelated entries are removed. |
| MEM-JOURNAL-06 | Batch export/import | Export selected journals and import the JSON back. | Imported journals are normalized and sorted correctly. |
| MEM-JOURNAL-07 | Merge journals | Merge multiple journals through the existing legacy UI flow. | Merge prompt still forms correctly; AI flow remains in legacy orchestration. |
| MEM-JOURNAL-08 | Auto journal cursor | Toggle auto journal and reset/sync cursor to latest. | Cursor helper functions return stable ranges and persist state. |

## WorldBook smoke

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| MEM-WORLDBOOK-01 | Associated worldbook | Bind a worldbook to a character and chat with that character. | Worldbook content is injected as before. |
| MEM-WORLDBOOK-02 | Global worldbook | Enable a global worldbook. | Global worldbook participates in context generation. |
| MEM-WORLDBOOK-03 | Keyword trigger | Use an entry with `alwaysOn === false` and keywords. | It injects only when recent chat text contains a keyword. |
| MEM-WORLDBOOK-04 | Always-on entry | Use an always-on worldbook entry. | It injects even without keyword match. |
| MEM-WORLDBOOK-05 | Position groups | Use entries with before, middle and after positions. | `before / middle / after` outputs match the old insertion order. |
| MEM-WORLDBOOK-06 | Weight ordering | Use multiple triggered entries with different weights. | Higher-priority ordering remains stable. |
| MEM-WORLDBOOK-07 | Offline node | Test a character or node with offline worldbook IDs. | Offline-specific IDs are respected. |
| MEM-WORLDBOOK-08 | Management UI | Open worldbook management, import, classify, drag and save. | Management UI still works because V26 did not migrate DOM persistence. |

## Cross-domain regression

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| MEM-CROSS-01 | Normal private chat | Send a normal private chat message. | AI reply works with no prompt or stream regression. |
| MEM-CROSS-02 | Group chat | Send a group chat message. | Group reply path still works. |
| MEM-CROSS-03 | Memory table + vector | Enable both structured memory and vector memory. | Both context sources can be prepared without duplicate save/write paths. |
| MEM-CROSS-04 | Journal + worldbook | Use favorited journals and triggered worldbook entries. | Both prompt pieces are available without changing the main prompt order. |
| MEM-CROSS-05 | Refresh persistence | Make one change in each memory domain and refresh. | All changes persist through the storage repository writer path. |
| MEM-CROSS-06 | Backup after memory edits | Export a backup after editing memory table, vector memory, journal and worldbook. | Backup completes and can be imported by the existing backup adapter. |
| MEM-CROSS-07 | No direct legacy writes in new owners | Run static gate after memory edits. | `tools/memory-regression-gate.js` passes. |

## Release acceptance

V27 can be considered accepted when:

1. `node tools/arch-check.js` passes.
2. `node tools/memory-regression-gate.js` passes.
3. The browser console probes pass.
4. At least one smoke item from each memory domain passes manually.
5. `MEM-CROSS-01`, `MEM-CROSS-03`, `MEM-CROSS-05` and `MEM-CROSS-07` pass.

