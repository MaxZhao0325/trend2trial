# CLAUDE.md — Trend-to-Trial 项目指引

## 项目目标

**Trend-to-Trial**（趋势雷达 + 试验场）：自动追踪 AI Infra 领域的技术趋势，生成可复现的实验方案（recipe），并在本地运行验证。

## MVP 范围

聚焦 **AI Infra**（Serving / RAG / LLMOps）三个子方向：

- **网页**：纯静态浏览，展示趋势摘要与 recipe 列表，不含后端逻辑。
- **CLI**：核心交互入口，负责生成 recipe、运行实验、输出报告。
- 不做用户系统、不做数据库、不做付费功能。

## 技术栈约束

| 约束 | 说明 |
|------|------|
| 语言 | TypeScript 优先，Shell 脚本仅用于胶水层 |
| 包管理 | pnpm |
| 依赖原则 | 尽量少依赖；引入新包前必须说明理由 |
| 运行环境 | macOS / Linux；所有脚本必须跨平台可用 |
| Node 版本 | >= 20 |

## 代码质量

- **Lint / Format**：使用 ESLint + Prettier，提交前必须通过。
- **单元测试**：`packages/core` 模块必须有测试覆盖；使用 vitest。
- **PR 要求**：每个 PR 必须可复现——包含清晰的复现步骤或自动化脚本。
- **类型安全**：开启 `strict` 模式，禁止 `any`（除非有注释说明原因）。

## 输出规范

- 任何新增功能都必须附带对应 README 段落更新。
- 每个 recipe 运行后必须生成 `REPORT.md` 作为验收产物，内容至少包含：
  - 实验目的
  - 运行环境与参数
  - 结果摘要
  - 可复现命令

## 目录结构

```
trend2trial/
├── packages/
│   ├── core/          # 核心逻辑：趋势抓取、recipe 生成、报告输出
│   └── cli/           # CLI 入口
├── apps/
│   └── web/           # 静态站点（纯 HTML，构建时生成）
├── data/
│   └── trends/        # 趋势数据 JSON 文件
├── recipes/           # recipe 模板与产出
├── docs/              # PRD、MVP、架构、路线图
├── scripts/           # 辅助脚本
├── CLAUDE.md          # 本文件
└── package.json
```

## 分发模型（计划中）

当前用户需要 clone 仓库运行 recipe。计划改为：

- **CLI 发布到 npm**：用户通过 `npx trend2trial` 直接使用，无需 clone。
- **Recipe 远程拉取**：CLI 运行时从 GitHub 下载 recipe，本地缓存到 `~/.trend2trial/cache/`。
- **registry.json**：仓库维护 recipe 注册表，CLI 据此发现和下载 recipe。

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm lint             # 检查代码风格
pnpm test             # 运行测试
pnpm build            # 构建所有包
```
