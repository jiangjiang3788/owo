# OWO 项目文档

所有说明性文档统一放在 `docs/`。项目根目录只保留运行文件、构建配置和版本号。

## 当前结构

```text
docs/
├── architecture/
│   ├── architecture.md
│   ├── ownership/
│   └── decisions/
├── releases/
│   ├── roadmap.md
│   └── v0.x.x/
├── operations/
│   ├── versioning.md
│   ├── smoke-memory.md
│   ├── css-ownership.md
│   ├── gates/
│   └── testing/
├── history/
└── legal/
```

## 阅读顺序

1. `architecture/architecture.md`：当前架构和所有权原则；
2. `releases/roadmap.md`：当前实施顺序；
3. `architecture/decisions/`：不能随意推翻的关键决策；
4. `releases/v0.9.3/`：当前版本范围、验证和变更；
5. `operations/`：Gate、版本和手工冒烟说明；
6. `history/`：已退休设计的合并摘要。

当前产品版本：`v0.9.3`。
