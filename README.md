# Proxy 配置仓库

## VS Code 技能

本仓库内置了 Copilot 技能 `/loon-helper`，可快速添加 Loon 签到配置。

```
/loon-helper

[MITM]
hostname = api.example.com

[Script]
http-request ^https:\/\/api\.example\.com\/path tag=示例 Cookie, script-path=...
cron "0 8 * * *" script-path=..., tag=示例签到, ...
```

技能会自动将内容分发到对应文件并提交推送。

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