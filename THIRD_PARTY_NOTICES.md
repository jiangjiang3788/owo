# Third-party notices

This package includes design influence from the `@clarashafiq/jiwen` project, especially its idea of representing companion state as continuous numeric axes with threshold/diff explanations.

OWO v0.7.5 and v0.7.6 did **not** vendor `jiwen.js`, `tone-grid.js`, `simulate.js`, or its prompt/tone runtime. Those historical versions contained an independently written shadow-only Memory Brain implementation influenced by the continuous-state idea.

OWO v0.8.13 retires and removes that Memory Brain runtime. This notice is retained for historical distribution continuity; no active Memory Brain code remains in the v0.8.13 package.

## @clarashafiq/jiwen

- Package name: `@clarashafiq/jiwen`
- Version observed in the provided source package: `0.4.0`
- License: MIT
- Copyright: Copyright (c) 2026 Clara Shafiq
- OWO usage: conceptual adaptation of continuous companion-state metrics; no active opening engine, tick drift runtime, or tone-grid prompt wiring is copied into OWO.

MIT License

Copyright (c) 2026 Clara Shafiq

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
