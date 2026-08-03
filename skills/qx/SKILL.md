---
name: qx
description: "Quantumult X 配置维护助手 — 解析用户提供的 hostname、rewrite_local、task_local 内容，自动写入 quantumultx/cookies.snippet 和 quantumultx/task.json。Use when: 用户提供含 [MITM]、[rewrite_local] 或 [task_local] 的 Quantumult X 配置片段需要写入；用户说‘把这个写进去’并提供 Quantumult X 配置块。"
---
# Quantumult X 配置助手

## 概述

将用户提供的 Quantumult X 配置片段解析后，按内容类型自动写入 `quantumultx/` 目录下的目标文件。

## 文件映射规则

| 内容类型 | 目标文件 | 写入方式 |
| --- | --- | --- |
| `hostname =` 条目 | `quantumultx/cookies.snippet` | 追加到已有 `hostname =` 行末尾 |
| `rewrite_local` / `http-request` / `http-response` 行 | `quantumultx/cookies.snippet` | 追加到文件末尾 |
| `task_local` / cron 任务行 | `quantumultx/task.json` | 追加到 `task` 数组末尾 |

## 排版规范

### 1. `cookies.snippet` — 更新 hostname

在已有 `hostname = ` 行末尾追加新域名；此处不需要额外添加注释：

```
hostname = existing.domain1.com, existing.domain2.com, new.domain.com
```

规则：

- 从用户提供的 `hostname = ...` 中提取域名
- 与已有 `hostname` 以 `, `（逗号+空格）拼接
- 检查是否已存在，避免重复

### 2. `cookies.snippet` — 新增 rewrite_local

在文件末尾追加 `rewrite_local` 同类配置行，保持原样，并在其前添加对应的注释说明，例如：

```
# 示例名称 Cookie
^https:\/\/example\.com\/path url script-request-header https://example.com/script.js
```

示例：

```
^https:\/\/xunting\.vbegin\.com\.cn\/sns\/app url script-request-header https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js
```

规则：

- 保持原始行格式
- 与上一个条目之间空一行
- 需要在规则前补充对应注释，例如 `# 示例名称 Cookie`
- 行保持 `url script-request-header` / `url script-response-body` 等格式

### 3. `task.json` — 新增 task_local

在 `task` 数组末尾追加新任务行：

```
"20 9 * * * https://raw.githubusercontent.com/MaYIHEI/paperclip/refs/heads/main/app/tingtingfm/tingtingfm.js, tag=听听FM签到, img-url=https://raw.githubusercontent.com/MaYIHEI/pin/refs/heads/main/app/tingtingfm.png, enabled=true"
```

规则：

- 保持 JSON 数组格式
- 追加到 `task` 数组末尾，前一项后保留逗号
- 验证 JSON 有效性

## 操作步骤

1. 读取目标文件：
   - `d:\github\Proxy\quantumultx\cookies.snippet`
   - `d:\github\Proxy\quantumultx\task.json`
2. 解析用户输入：
   - `[MITM]` 段 → 提取 `hostname` 值
   - `[rewrite_local]` 段 → 提取 `rewrite_local` 行
   - `[task_local]` 段 → 提取任务行
3. 写入 `cookies.snippet`：
   - `hostname`：在已有 `hostname =` 行末追加域名
   - `rewrite_local`：追加到文件末尾，与最后一个条目之间保留空行
4. 写入 `task.json`：
   - 在数组末尾追加新任务行，保持 JSON 语法有效
5. 验证：
   - 读取文件确认写入是否正确
6. 提交并推送代码：
   - 先检查当前改动：`cd d:\github\Proxy; git status --short`
   - 仅提交相关文件：`cd d:\github\Proxy; git add quantumultx/cookies.snippet quantumultx/task.json`
   - 查看暂存内容：`cd d:\github\Proxy; git diff --cached`
   - 根据修改内容生成规范的提交信息，格式为 `feat(模块名): 中文描述`，如：
     - `feat(lhtj): 添加龙湖天街签到配置`
     - `feat(qx): 添加海底捞签到配置`
     - `fix(cookies): 修复 Cookie 脚本路径`
   - 执行提交：`cd d:\github\Proxy; git commit -m "<信息>"`
   - 推送到远程：`cd d:\github\Proxy; git push`
   - 若需要，可在提交后再执行 `cd d:\github\Proxy; git log -1 --oneline` 查看最新提交
7. 当用户明确要求“提交并推送”时：
   - 若用户在写入配置后直接说“提交并推送”或“提交推送”，则按以下默认流程执行：
   - 先确认当前仓库状态：`cd d:\github\Proxy; git status --short`
   - 仅提交与本次 Quantumult X 配置相关的文件：
     - `cd d:\github\Proxy; git add quantumultx/cookies.snippet quantumultx/task.json`
   - 检查暂存内容是否符合预期：`cd d:\github\Proxy; git diff --cached`
   - 生成提交信息，优先使用 `feat(qx): ...` 或 `fix(qx): ...` 的格式，例如：
     - `feat(qx): 添加海底捞签到配置`
     - `feat(qx): 添加林里签到兑换配置`
   - 执行提交与推送：
     - `cd d:\github\Proxy; git commit -m "<信息>"`
     - `cd d:\github\Proxy; git push`
   - 如果存在其他无关改动，默认不纳入本次提交，除非用户明确要求一起提交。

## 使用方法

直接调用：

```
/qx
```

然后将包含 `hostname`、`rewrite_local`、`task_local` 的 Quantumult X 配置片段提供给助手。
