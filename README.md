# Proxy 配置仓库

Loon / OpenClash / Quantumult X 代理配置及签到脚本管理。

## 可用技能

在 VS Code Copilot Chat 中输入以下斜杠命令快速添加配置：

| 命令 | 功能 |
|------|------|
| `/loon-helper` | 添加 Loon 的 [MITM]、[Script]、cron 配置并自动分发到对应文件 |

用法示例：
```
/loon-helper

[MITM]
hostname = your-domain.com

[Script]
http-request ^https:\/\/... tag=示例 Cookie, script-path=...
cron "0 8 * * *" script-path=..., tag=示例签到, ...
```