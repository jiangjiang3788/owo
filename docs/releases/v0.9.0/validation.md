# v0.9.0 validation

## Passed

- JavaScript syntax check for every file under `js/` and `tools/`.
- All `tools/*-gate.js`, including the new AI Task Runtime routing and fallback test.
- `tools/arch-check.js`.
- `tools/netlify-build.js`.
- Local `index.html` `src` / `href` existence scan: 235 references, 0 missing.
- Canonical task alias test: legacy `memory-fact` maps to `memory.extract`.
- Route test: `journal.generate` selects `summaryApiSettings`.
- Fallback test: summary model HTTP failure falls back to the main model.
- Main chat request execution goes through `AI Task Runtime`.
- Legacy `fetchAiResponse()` goes through the Runtime compatibility bridge.
- Memory Brain retirement gates remain green.
- Journal / structured archive / vector legacy owner regression gates remain green.

## Scope intentionally unchanged

- Chat Prompt content and ordering.
- World Book trigger and injection behavior.
- Journal generation and journal storage behavior.
- Structured archive/table behavior.
- Vector memory content behavior.
- Legacy `journal / table / vector` owner selection.

## Existing non-blocking warnings

The architecture checker still reports historical large legacy files and the pre-existing duplicate assignment of `_searchScrollToMessageId`. These warnings predate v0.9.0 and are not caused by the AI Runtime migration.

## Next release boundary

v0.9.1 may introduce `ContextItem`, `ContextProvider`, `ContextPolicy`, `PromptSection`, and `Prompt Compiler`. It should not yet introduce the new growth-memory database in the same change set.
