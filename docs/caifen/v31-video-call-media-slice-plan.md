# V31：video call / audio / TTS media 垂直切片第一刀

## 目标

只抽出浏览器媒体基础能力和通话状态模型：

- `platform/browser/audioAdapter.js`
- `platform/browser/mediaAdapter.js`
- `features/videoCall/model.js`
- `features/videoCall/public.js`

## 不做

- 不改 `chat_ai.js`
- 不改 provider fetch
- 不改 stream / `processStream`
- 不改消息发送和保存路径
- 不改通话 AI 回复 / 通话总结请求
- 不改 TTS provider 合成请求

## ownership

| 文件 | 职责 |
|---|---|
| `platform/browser/audioAdapter.js` | Audio 元素创建、播放、停止、静音激活、循环铃声 |
| `platform/browser/mediaAdapter.js` | 摄像头流、video srcObject、canvas 帧捕获、震动 |
| `features/videoCall/model.js` | 通话初始状态、摄像头状态、时长格式化 |
| `features/videoCall/public.js` | public facade，只导出 routing report |
| `modules/video_call.js` | legacy DOM / 事件 / AI 编排 shell |
| `modules/tts_service.js` | legacy TTS provider / 队列 shell |

## 验收

```bash
node --check js/platform/browser/audioAdapter.js
node --check js/platform/browser/mediaAdapter.js
node --check js/features/videoCall/model.js
node --check js/features/videoCall/public.js
node --check js/modules/video_call.js
node --check js/modules/tts_service.js
node tools/arch-check.js
node tools/memory-regression-gate.js
node tools/netlify-build.js
```

浏览器 smoke：

1. 发起视频通话，摄像头授权、翻转、关闭正常。
2. 发起语音通话，页面流程正常。
3. 来电铃声可播放、接听/拒绝后停止。
4. 通话中 AI 自动 TTS 仍可排队播放。
5. 手动点击 TTS 播放、暂停、恢复、停止仍正常。
6. 通话挂断、历史记录、总结生成仍正常。
7. 私聊 / 群聊 AI 回复仍正常。
```
