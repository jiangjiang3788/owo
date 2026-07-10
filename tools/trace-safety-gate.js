#!/usr/bin/env node
/* v0.9.1 request trace redaction gate. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.cwd();
let failed = false;
function fail(message) { failed = true; console.error('❌ ' + message); }
function pass(message) { console.log('✅ ' + message); }
const app = { platform: { ai: {} } };
const responsePayload = { choices: [{ message: { content: 'ok', reasoning: 'private chain data' } }] };
const context = vm.createContext({
  console,
  window: null,
  OwoApp: app,
  Date, Math, JSON, String, Number, Boolean, Object, Array, Set, Error,
  Headers,
  fetch: async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    clone() { return this; },
    async text() { return JSON.stringify(responsePayload); }
  })
});
context.window = context;
context.window.OwoApp = app;
vm.runInContext(fs.readFileSync(path.join(root, 'js/platform/ai/requestTraceStore.js'), 'utf8'), context, { filename: 'requestTraceStore.js' });

(async () => {
  const store = app.platform.ai.requestTraceStore;
  const longPrompt = 'x'.repeat(5000);
  await store.trackedFetch({
    endpoint: 'https://example.test/v1?api_key=super-secret',
    fetchOptions: {
      method: 'POST',
      headers: { Authorization: 'Bearer secret-token', 'x-api-key': 'another-secret' },
      body: JSON.stringify({
        model: 'demo',
        apiKey: 'body-secret',
        prompt: longPrompt,
        image: 'data:image/png;base64,' + 'a'.repeat(2000)
      })
    }
  }, { source: 'trace-test', taskType: 'system.generic' });
  await new Promise(resolve => setTimeout(resolve, 0));
  const trace = store.getRecentTraces()[0];
  if (!trace.endpoint.includes('***redacted***') || trace.endpoint.includes('super-secret')) fail('URL query secret 未脱敏');
  else pass('URL query secret 已脱敏');
  const headers = trace.fetchOptions && trace.fetchOptions.headers || {};
  if (JSON.stringify(headers).includes('secret-token') || JSON.stringify(headers).includes('another-secret')) fail('请求头 secret 未脱敏');
  else pass('请求头 secret 已脱敏');
  if (trace.requestBody.apiKey !== '***redacted***') fail('请求体 secret 字段未脱敏');
  else pass('请求体 secret 字段已脱敏');
  if (!String(trace.requestBody.image).startsWith('[binary omitted:')) fail('Base64 图片数据未移除');
  else pass('Base64 图片数据不会写入 Trace');
  if (String(trace.requestBody.prompt).length >= longPrompt.length) fail('长 Prompt 未截断');
  else pass('Trace 只保留 Prompt 预览');
  const serialized = JSON.stringify(trace);
  if (serialized.includes('private chain data')) fail('Provider private reasoning 未脱敏');
  else pass('Provider private reasoning 已脱敏');
  if (failed) process.exit(1);
  console.log('\nTrace safety gate passed.');
})().catch(error => { console.error(error); process.exit(1); });
