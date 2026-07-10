# 日记 Runtime 浏览器冒烟测试

## 模式切换

控制台：

```javascript
await OwoApp.features.journalRuntime.publicApi.setMode('legacy');
await OwoApp.features.journalRuntime.publicApi.setMode('shadow');
await OwoApp.features.journalRuntime.publicApi.setMode('unified');
OwoApp.features.journalRuntime.publicApi.getStatus();
```

## 必测场景

1. 私聊手动生成普通日记；
2. 私聊“摘要总结”风格；
3. 群聊生成客观摘要；
4. 选择两篇日记执行合并；
5. 自动日记达到阈值后生成；
6. 节点总结与重新总结；
7. 总结模型配置缺失时回退主模型；
8. 模型返回缺少 `<title>` 或 `<content>` 时，只修复一次；
9. 修复仍失败时不新增日记、不移动自动日记游标；
10. 刷新页面后 `journalRuntimeMode` 保持不变。

## 通过标准

- 每次成功操作只新增或更新一篇日记；
- Shadow 模式不会产生两篇相同日记；
- 失败时原有日记和游标不改变；
- Trace 中不出现 API Key、Authorization 或完整敏感 Prompt；
- legacy、shadow、unified 三种模式生成的数据结构一致。
