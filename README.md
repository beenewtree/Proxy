# Proxy 配置仓库

多平台代理配置文件及自动签到脚本管理仓库。

## 目录结构

```
Proxy/
├── loon/                          # Loon (iOS) 配置
│   ├── loon.conf                  #   主配置文件
│   ├── plugin/
│   │   └── cookies.plugin         #   Cookie 获取脚本集合
│   ├── script/
│   │   └── tasks.scripts          #   定时签到任务集合
│   └── readme.md                  #   Loon 说明
├── openclash/
│   └── diy.yaml                   #   OpenClash Mixin 覆写配置
├── quantumultx/                   #   Quantumult X (预留)
├── skills/
│   └── loon-helper/
│       └── SKILL.md               #   VS Code Copilot 技能
└── README.md                      #   本文件
```

---

## 支持平台

### Loon（iOS）

适用于 iPhone / iPad 的代理客户端，配置文件位于 `loon/` 目录。

| 文件 | 说明 |
|------|------|
| `loon.conf` | 主配置文件，含 General、Proxy Group、Rule、Remote Rule |
| `plugin/cookies.plugin` | 各 App 的 Cookie 获取脚本，通过 http-request/http-response 捕获 |
| `script/tasks.scripts` | 各 App 的定时签到 cron 任务 |

**已接入 App：**

| App | Cookie 获取 | 签到任务 | 执行时间 |
|-----|------------|---------|---------|
| WPS | ✅ | ✅ | 每天 10:00 |
| QQ音乐 | ✅ | ✅ | 每天 09:20 |
| 高德打车 | ✅ | ✅ (enable=false) | 每天 00:01 |
| 小米商城 | ✅ | ✅ | 每天 08:15 |
| 万达电影 | ✅ | ✅ | 每天 09:20 |
| 追觅 | ✅ | ✅ | 每天 08:33 |
| 一点万象 | ✅ | ✅ | 每天 08:37 |
| 龙湖天街 | ✅ | ✅ | 每天 09:00 |
| 名创优品 | ✅ | ✅ | 每天 07:37 |

> **使用前须知：** 需在 Loon 中开启对应域名的 MITM 解密开关，并在 Dashboard → Script 中启用相关脚本。

### OpenClash（OpenWrt）

适用于 OpenWrt 路由器的代理客户端，Mixin 配置位于 `openclash/diy.yaml`。

- **策略组结构：** 顶级入口 → 故障转移 / 自动选择 → 地区节点（🇭🇰 🇯🇵 🇺🇸 🇸🇬 🇹🇼 🇰🇷 🇦🇺）
- **分流规则：** 广告拦截 → Apple 直连 → AI 服务 → 流媒体 → Telegram → 港台服务 → 国内直连 → GEOIP CN → 兜底
- **特色策略组：** 📺 流媒体、🤖 AI 服务、✈️ Telegram、🍎 Apple

### Quantumult X（iOS）

目录已预留，暂无配置。

---

## VS Code 技能

本仓库内置了 Copilot 技能，可快速添加新的 Loon 签到配置。

### 触发方式

在 VS Code Copilot Chat 中输入：

```
/loon-helper
```

然后粘贴 Loon 配置片段，技能会自动解析并将内容分发到对应文件。

### 示例

```
/loon-helper

[MITM]
hostname = api.example.com

[Script]
http-request ^https:\/\/api\.example\.com\/path tag=示例 Cookie, script-path=https://...
cron "0 8 * * *" script-path=https://..., tag=示例签到, ...
```

技能会自动：
1. 将 `http-request` 写入 `plugin/cookies.plugin`
2. 将域名追加到 `[MITM] hostname`
3. 将 `cron` 写入 `script/tasks.scripts`
4. 提交并推送代码到仓库

---

## 快速开始

### Loon 新手

1. 将 `loon.conf` 导入 Loon（推荐使用配置订阅或手动导入）
2. 在 `[Remote Proxy]` 填入你的机场订阅链接
3. 在 Loon Dashboard 中开启 **MITM** 并安装证书
4. 在 **Script** 页面启用 `cookies.plugin` 和 `tasks.scripts`
5. 打开对应 App 触发 Cookie 获取，之后签到任务会自动运行

### OpenClash 新手

1. 在 OpenClash 管理面板 → 配置文件 → Mixin 设置 中上传 `diy.yaml`
2. 确保已在 OpenClash 中添加了节点订阅
3. Mixin 会自动覆写策略组和规则，无需额外操作

---

## 维护指南

### 添加新的签到 App

手动方式：
1. **Cookie 获取：** 在 `plugin/cookies.plugin` 的 `[Script]` 段新增 `http-request` 或 `http-response` 规则
2. **MITM 域名：** 在 `[MITM]` 段的 `hostname` 末尾追加新域名
3. **定时任务：** 在 `script/tasks.scripts` 末尾追加 `cron` 行
4. 提交并推送代码

自动方式：使用 `/loon-helper` 技能，一次性粘贴配置即可。

### 提交规范

```
feat(模块): 添加功能描述
fix(模块): 修复问题描述
refactor(模块): 重构描述
chore(模块): 杂项描述
```

---

## 免责声明

1. **仅供学习交流** — 本仓库所有配置文件和脚本仅用于个人学习和研究，严禁用于商业用途或非法活动。
2. **脚本来源** — 本仓库引用的签到脚本均来自开源社区，版权归原作者所有。使用者需自行承担使用风险。
3. **无保证** — 本仓库内容按"现状"提供，不提供任何明示或暗示的保证，包括但不限于适销性、特定用途适用性等。
4. **合规使用** — 请确保使用方式符合相关平台的服务条款。因使用本仓库内容产生的任何纠纷、损失，仓库作者不承担任何责任。
5. **删除义务** — 如相关权利方认为本仓库内容侵犯了您的权益，请联系移除。

## 脚本来源

本仓库使用的签到脚本来自以下开源项目，感谢各位作者的贡献：

- [MaYIHEI/paperclip](https://github.com/MaYIHEI/paperclip) — 主要脚本源
- [MaYIHEI/pin](https://github.com/MaYIHEI/pin) — 图标资源
- [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) — Loon 远程规则
- [wf021325/qx](https://github.com/wf021325/qx) — 高德打车脚本