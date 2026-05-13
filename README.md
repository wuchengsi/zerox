# Zerox

Zerox 是一个基于开源记账应用 Zero 改造的极简本地记账 App，面向 Android / iOS。它保留了 Zero 轻量、离线、本地优先的基础，同时加入了中文优先体验、AI 自然语言记账、支出二级分类、收入统计、语言切换和主题色配置。

本仓库是 `wuchengsi/zerox` 的开发工作区，不再使用 fork 前 README 中的 Zero 产品说明。

## 特色功能

- AI 快速记账：输入一句话或多行文本，自动解析为支出或收入并写入账本。
- 后台解析队列：AI 解析任务可在 App 重启后继续处理，失败任务可查看、重试。
- OpenAI-compatible 接口：用户自行配置 API Base URL、API Key、Model Name，目标兼容火山引擎 / Doubao 等兼容接口。
- 本地优先：账本、设置、AI Key 都保存在本机；默认不会上传完整账本历史。
- 支出二级分类：支出分类采用 `大类·小类`，统计页支持大类聚合和小类明细。
- 收入记录和统计：收入有独立分类、流水和统计；原债务功能保留在收入页内。
- 中英文切换：默认中文，可在引导页和设置中切换中文 / English。
- 主题色系统：深浅模式和主题色独立配置，保留极简视觉风格。
- 导入导出：支持 Zerox 数据导出和导入，便于换机迁移。

## AI 记账说明

Zerox 的 AI 功能只负责一件事：

```text
自然语言输入 -> LLM 解析 -> 本地校验和分类匹配 -> 自动创建账单
```

示例：

```text
昨天：
午饭 28
瑞幸 16
地铁 4

今天：
麦当劳 32
打车去机场 48
便利店 12.5
```

AI 解析规则：

- 支持单条和批量输入，用户不需要切换模式。
- 支持支出和收入识别。
- 分类候选来自用户当前账本中的分类，包含自定义分类。
- LLM 只返回分类名称或提示词，本地代码负责匹配真实分类 ID。
- 金额缺失、分类异常、格式异常的条目不会创建。
- 解析任务会进入队列；最近任务、失败原因和重试入口可在 AI 队列查看。
- 设置页提供撤销上次 AI 自动添加的入口。

隐私边界：

- 默认只发送当前输入文本、当前日期时间、当前可用分类名称给用户配置的 LLM 服务。
- 不发送完整账本历史。
- API Key 仅保存在本地 MMKV 中，不写入 Redux、数据库、导入导出文件或日志。
- MMKV 不是系统 Keychain / Keystore 级别的加密存储。

## 记账模型

### 支出

- 支出不再单独保留备注字段，标题就是账单说明。
- 支出分类为二级结构：大类和小类。
- 列表和选择器中使用 `大类·小类` 表示完整分类。
- 统计页默认按大类聚合，进入大类后查看小类占比和明细。

### 收入

- 收入使用独立数据表和独立分类。
- 收入分类为一级分类。
- 首页流水同时展示支出和收入，收入使用不同颜色区分。
- 底部“收入”页包含收入统计和债务功能两个分段。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| App 框架 | React Native |
| 数据库 | WatermelonDB + SQLite |
| 状态管理 | Redux Toolkit + Redux Persist |
| 本地存储 | MMKV |
| 导航 | React Navigation |
| 列表 | FlashList |
| 图标 | Lucide React Native |
| 类型 | TypeScript |

## 项目结构

```text
src/
├── components/        # 通用 UI 组件
├── constants/         # 默认分类、图标等常量
├── context/           # 语言、主题、Dialog 等上下文
├── hooks/             # 通用 hooks
├── navigation/        # 页面导航
├── redux/             # Redux slice 和 store
├── screens/           # 业务页面
├── services/          # AI 服务、任务队列等业务服务
├── sheets/            # Bottom sheet 组件
├── utils/             # 日期、金额、导航、缓存等工具
└── watermelondb/      # 数据库 schema、model、service
```

## 开发环境

要求：

- Node.js `>= 22.11.0`
- Android Studio 和 Android SDK 36
- JDK 17
- Android NDK `28.0.12916984`
- npm 或 Bun

安装依赖：

```powershell
cd D:\code\zerox
npm install
```

启动 Metro：

```powershell
npm start
```

Android Debug：

```powershell
cd android
.\gradlew.bat assembleDebug
```

Android Release APK：

```powershell
cd android
.\gradlew.bat assembleRelease
```

更完整的 Windows Android 环境说明见：

- [docs/build-environment.md](docs/build-environment.md)

## 开发流程约定

- 先读代码和文档，再改实现。
- UI 改动优先复用现有组件、样式、Bottom Sheet 和导航方式。
- 数据改动优先走现有 WatermelonDB service 和 Redux slice。
- 不把 API Key、导出数据、构建产物、日志、缓存文件提交到 Git。
- 大改动拆成可回退的小提交。
- 构建前先说明准备运行的命令；Android / iOS 构建只在明确需要时执行。

相关文档：

- [AI 快速记账需求与开发流程](docs/ai-quick-expense-requirements-and-workflow.md)
- [分类与收入基础改造需求和流程](docs/category-income-foundation-requirements-and-workflow.md)
- [性能优化原则](docs/performance-optimization-principles.md)
- [编译环境搭建指南](docs/build-environment.md)

## 许可证与来源

本项目基于开源项目 Zero 改造，继续遵循仓库中的 [BSD 2-Clause License](LICENSE)。
