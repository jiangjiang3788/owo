# v0.8.13 validation

Passed:

- JavaScript syntax check for every file under `js/` and `tools/`.
- All remaining `tools/*-gate.js`.
- `tools/arch-check.js`.
- `tools/netlify-build.js`.
- Local `index.html` `src` / `href` existence scan: 230 references, 0 missing.
- Loaded-data retirement test: old `memoryBrain` payload moves to `legacySnapshots.memoryBrain` and active root key is removed.

Existing non-blocking architecture warnings remain for legacy large files and one duplicated global assignment; they predate this release and are listed by `tools/arch-check.js`.
