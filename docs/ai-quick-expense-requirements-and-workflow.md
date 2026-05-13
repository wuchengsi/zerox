# Zerox AI 快速记账需求与开发流程

## 背景

Zerox 在 Zero 的本地记账基础上增加了 AI 自然语言记账。目标不是做聊天机器人或财务分析，而是把用户输入的一句话、多行文本或流水式文本转换为可创建的支出 / 收入记录。

当前实现已经从“解析后手动确认”调整为“进入队列、后台解析、合法条目自动添加”。用户可以在设置页撤销上次 AI 自动添加，也可以在 AI 队列查看最近任务、失败原因和重试入口。

## 功能范围

- 用户在设置中填写：
  - API Base URL
  - API Key
  - Model Name
- 兼容 OpenAI-style Chat Completions 接口。
- 目标兼容火山引擎 / Doubao 的 OpenAI 兼容接口。
- 支持支出和收入识别。
- 支持一句话、多行文本、带日期上下文的批量文本。
- 支持 App 重启后继续处理未完成队列。
- 支持失败任务查看、编辑后重试。
- 支持撤销上次 AI 自动添加的账单。

不做：

- 聊天机器人
- 预算建议
- 财务分析
- 自动报表
- 转账识别
- 完整账本历史上传

## 输入示例

```text
中午麦当劳 32 元，用支付宝
```

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

```text
早上咖啡18，中午饭32，晚上打车45
```

```text
工资到账 8000
报销 120
卖二手键盘 200
```

## 数据流

1. 用户在 AI 快速记账页输入文本。
2. App 检查 API Base URL、API Key、Model Name 是否完整。
3. App 生成队列任务，保存原始输入和任务创建时间。
4. App 构造 prompt，并把以下内容发送给 LLM：
   - 当前输入文本
   - 任务创建时的当前日期时间
   - 当前可用支出分类名称
   - 当前可用收入分类名称
5. LLM 返回 JSON 数组。
6. 本地代码解析 JSON，补齐默认日期和时间。
7. 本地代码按分类名称 / 提示词匹配真实分类 ID。
8. 本地代码校验金额、标题、类型、分类。
9. 合法条目自动创建到账本。
10. 非法条目跳过并写入队列结果。
11. App 展示成功数量、跳过数量和失败原因。

## 队列策略

- 队列任务保存在本地 MMKV。
- 任务包含 `referenceDateTime`，用于保证跨天重启后仍按用户提交时的日期解析。
- App 启动后会把中断的 `running` 任务重新放回 `queued`，然后继续处理。
- 最近完成 / 失败任务会保留在队列中供用户查看。
- 用户点进失败任务后会标记为已查看，外层不再持续显示“解析失败”提示。
- 重试失败任务时允许用户编辑原始输入。

## LLM 返回约束

LLM 只返回 JSON，不返回 Markdown 或解释。每条记录至少包含：

- `type`: `expense` 或 `income`
- `amount`: 数字，无法识别时为 `null`
- `title`: 标题
- `categoryName`: 分类名称
- `categoryHint`: 分类提示
- `datetime`: 日期时间

分类规则：

- LLM 不直接返回真实 `categoryId`。
- 支出分类应优先选择最细的小类，例如 `餐饮·午餐`。
- 收入分类只从当前收入分类中选择。
- 本地代码负责把 `categoryName` / `categoryHint` 匹配为真实分类 ID。
- 匹配失败时，支出使用 `其他·其他`，收入使用 `收入`；如果默认分类不存在，则该条标记为非法。

校验规则：

- 金额缺失不得创建。
- 标题缺失不得创建。
- 类型无法识别时默认按支出处理。
- 日期缺失时使用任务创建日期。
- 时间缺失时使用任务创建时间。

## 语言策略

- 中文界面使用中文系统提示词。
- English 界面使用英文系统提示词。
- 默认分类跟随新用户引导阶段选择的语言生成。
- 用户已有分类、账单标题、AI 输入内容不会因为切换语言而自动翻译。

## 隐私与安全

默认只发送：

- 当前输入文本
- 当前日期时间
- 当前可用分类名称

默认不发送：

- 完整账本历史
- 用户姓名和邮箱
- 历史消费流水
- API Key

API Key 保存策略：

- 使用 MMKV 本地保存。
- 不写入 Redux。
- 不写入数据库。
- 不进入导入 / 导出文件。
- 不出现在日志、错误提示、调试输出中。
- 不是系统 Keychain / Keystore 级别的加密存储。

## 主要模块

- `src/services/aiSettingsService.ts`
  - AI API 配置读写。
- `src/services/aiExpenseParser.ts`
  - prompt 构造、OpenAI-compatible 请求、JSON 解析、分类匹配、条目校验。
- `src/services/aiAutoExpenseTaskService.ts`
  - AI 队列、输入缓存、上次自动创建批次。
- `src/services/aiAutoExpenseRunner.ts`
  - 队列执行、自动创建支出 / 收入。
- `src/components/atoms/AiAutoExpenseRecovery.tsx`
  - App 启动后恢复未完成 AI 队列。
- `src/screens/AiSettingsScreen/index.tsx`
  - AI 配置和撤销上次 AI 自动添加。
- `src/screens/AiQuickExpenseScreen/index.tsx`
  - AI 输入入口。
- `src/screens/AiExpenseQueueScreen/index.tsx`
  - AI 队列列表。
- `src/screens/AiExpenseQueueDetailScreen/index.tsx`
  - 队列详情、失败查看、编辑重试。

## 验收标准

- 不配置 API 时，AI 入口提示先去设置。
- 配置 OpenAI-compatible API 后，可以解析自然语言。
- 输入 `中午麦当劳 32 元，用支付宝`，能创建金额 32、标题接近“麦当劳”、分类接近餐饮的支出。
- 输入多行文本时，能拆分为多条记录。
- 输入收入文本时，能创建收入记录。
- 金额缺失的条目不能创建。
- 分类匹配失败时使用默认分类或跳过。
- App 强制关闭后重启，未完成队列能继续处理。
- 跨天恢复队列时，未明确日期的记录仍按提交当天解析。
- API Key 不出现在日志、Redux、数据库、导入导出文件中。

## 开发流程

1. 优先修改纯函数和服务层。
2. 再修改队列和存储逻辑。
3. 再接 UI。
4. 再补语言文案。
5. 再做手动验证和 typecheck。
6. 只在明确需要时编译 Android / iOS。
