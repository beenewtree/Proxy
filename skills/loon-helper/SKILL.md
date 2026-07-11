---
name: loon-helper
description: "Loon 配置维护助手 — 解析用户提供的 [MITM]、[Script]、cron 内容，按规则自动分发到 loon/ 目录下对应的文件中。Use when: 用户提供含 [MITM]、[Script] 或 cron 的 Loon 配置片段需要写入；用户说'把这个写进去'并提供 Loon 配置块。"
---

# Loon 配置助手

## 概述

将用户提供的 Loon 配置片段解析后，按内容类型自动写入对应文件，保持原有排版风格。

## 文件映射规则

| 内容类型 | 目标文件 | 写入方式 |
|---------|---------|---------|
| `http-request` / `http-response` 行 | `loon/plugin/cookies.plugin` | 插入到 `[MITM]` 段之前 |
| `hostname` 条目 | `loon/plugin/cookies.plugin` | 追加到 `[MITM]` 段已有 hostname 末尾 |
| `cron "..."` 任务行 | `loon/script/tasks.scripts` | 追加到文件末尾 |

## 排版规范

### 1. `cookies.plugin` — 新增 http-request / http-response

在已有最后一个脚本条目与 `[MITM]` 之间插入，格式：

```
#任务名cookie
http-request ^https:\/\/... tag=任务名 Cookie, script-path=..., requires-body=..., img-url=...
```

规则：
- 注释行：`#[tag中提取的名称]cookie`（如 tag=追觅 Cookie → `#追觅cookie`）
- 若 tag 以" Cookie"结尾，注释取 `Cookie` 前面的部分 + `cookie`（小写）；若不含，直接取 tag + `cookie`
- 与上一个条目之间空一行
- `http-request` 行保持原样

### 2. `cookies.plugin` — 更新 hostname

在 `[MITM]` 段的 `hostname = ` 行末尾追加新域名：

```
hostname = existing.domain1.com, existing.domain2.com, new.domain.com
```

规则：
- 从用户提供的 `hostname = xxx` 中提取域名
- 与已有 hostname 以 `, `（逗号+空格）拼接
- 检查是否已存在，避免重复

### 3. `tasks.scripts` — 新增 cron 任务

在文件末尾追加，格式：

```
#任务名签到
cron "..." script-path=..., tag=任务名, img-url=..., enable=true
```

规则：
- 注释行：`#[tag内容]`（如 tag=追觅签到 → `#追觅签到`）
- 与上一个条目之间空一行
- `cron` 行保持原样

## 操作步骤

1. **读取两个目标文件**：
   - `d:\github\Proxy\loon\plugin\cookies.plugin`
   - `d:\github\Proxy\loon\script\tasks.scripts`

2. **解析用户输入**，按内容类型分类：
   - `[MITM]` 段 → 提取 `hostname` 值
   - `[Script]` 段 → 提取 `http-request` / `http-response` 行
   - `cron "..."` → 提取 cron 任务行

3. **写入 `cookies.plugin`**：
   - http-request/http-response：用 `replace_string_in_file` 在最后一个脚本条目之后、`[MITM]` 之前插入
   - hostname：用 `replace_string_in_file` 更新 `hostname =` 行末尾

4. **写入 `tasks.scripts`**：
   - 用 `replace_string_in_file` 在文件末尾追加新的 cron 条目

5. **验证**：读取两个文件确认写入正确

6. **提交并推送代码**：
   - 运行 `cd d:\github\Proxy; git add -A` 暂存所有修改
   - 运行 `cd d:\github\Proxy; git diff --cached` 查看暂存内容，提取变更摘要
   - 根据修改内容生成规范的提交信息，格式为 `feat(模块名): 中文描述`，如：
     - `feat(miniso): 添加名创优品签到配置`
     - `fix(wps): 修复 WPS Cookie 脚本路径`
   - 在提交信息正文中用 `-` 列表逐项描述每个文件的变更内容
   - 运行 `cd d:\github\Proxy; git commit -m "<信息>"` 提交
   - 运行 `cd d:\github\Proxy; git push` 推送到远程仓库

## 注意事项

- 先读文件确认当前结构再编辑
- hostname 添加前检查是否已存在，避免重复
- 不要破坏文件中已有的注释结构和排版
- 所有工具操作使用 `replace_string_in_file`，提供足够的上下文以确保匹配唯一
