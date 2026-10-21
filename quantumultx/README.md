# Quantumult X Cookie → 青龙面板 同步

一个脚本，两个功能：

1. **自定义要同步哪些 Cookie**：白名单，一行 = 一个，没写的不同步
2. **同步推送到青龙**：自动创建 / 更新环境变量（青龙面板里直接可见），Cookie 没变化自动跳过

只做同步，**不做抓取**——Cookie 由你现有的 QX 抓取脚本（MaYIHEI 等）获取并存放在 `$prefs`（BoxJS 底层也是 `$prefs`），本脚本读取后推给青龙。

## 配置方式（推荐）：BoxJS 面板，不用改脚本

白名单和青龙凭据都存在 BoxJS 数据里，**增删要同步的 Cookie、改青龙地址都在 BoxJS 网页面板里完成，不用打开脚本**：

1. 打开 BoxJS 面板（Safari 访问 `http://boxjs.com`，或从 QX 的 BoxJS 入口进入）
2. 添加应用：导入 `boxjs.json` 的 raw 链接（托管脚本后得到，如 `https://raw.githubusercontent.com/你的用户名/你的仓库/main/boxjs.json`），面板自动生成两个表单
3. 填写两个数据：

   **`ql_cfg`（青龙配置）**
   ```json
   {"url":"http://192.168.2.1:5700","client_id":"xxx","client_secret":"yyy"}
   ```

   **`ql_sync_list`（同步白名单，数组里加一行 = 多同步一个 Cookie）**
   ```json
   [
     {"key":"wps_cookie","env":"WPS_COOKIE","remarks":"WPS","enabled":true},
     {"key":"qqmusic_cookie","env":"QQMUSIC_COOKIE","remarks":"QQ音乐","enabled":true}
   ]
   ```
   - `key`：Cookie 在 `$prefs` 里的名称（怎么找，见下一节）
   - `env`：青龙环境变量名，**必须和青龙任务读取的一致**
   - `remarks`：备注
   - `enabled` 设为 `false` 可临时停用，不用删

4. 保存后下次任务运行自动生效

> 不装 BoxJS 也能用：脚本顶部 `QL_URL / CLIENT_ID / CLIENT_SECRET` 和 `SYNC` 数组就是兜底配置（BoxJS 有配置时优先用 BoxJS）。

## 快速开始（青龙侧 + 运行）

1. **青龙建应用**：系统设置 → 应用设置 → 新建应用，权限勾选「环境变量」，得到 `client_id` / `client_secret`
2. **配置**：按上面方式填 BoxJS（或改脚本常量）
3. **托管脚本**：把 `qx_cookie_sync_ql.js`（和 `boxjs.json`）传到 GitHub / Gist，拿到 raw 链接
4. **加定时任务**（`[task_local]`）：

   ```
   0 0,6,12,18 * * * https://raw.githubusercontent.com/你的用户名/你的仓库/main/qx_cookie_sync_ql.js, tag=同步Cookie到青龙, enabled=true
   ```

   > cron 表达式不要用 `0 */6 * * *` 这种步进写法（`*` 和 `/` 相邻会提前截断脚本注释导致报错），用 `0 0,6,12,18 * * *` 这种写法。建议同步任务排在青龙签到任务之前。

5. **验证**：手动跑一次任务（QX 里点任务右侧运行按钮），通知显示「创建 X 个，更新 X 个」，青龙面板 → 环境变量里能看到对应变量

## 怎么找 Cookie 在 $prefs 里的 key

1. 打开抓取该 App 的 QX 脚本源码（比如 `wps.cookie.js`），搜索 `getdata("` 或 `valueForKey("`，括号里的字符串就是 key
2. 或者打开 **BoxJS 面板**，查看该 App 数据的「名称」，就是 key（BoxJS 底层同样存在 `$prefs`，key 即名称）
3. 把 key 填到白名单的 `key` 字段

## 手动触发（只同步某一个）

```
event-interaction https://raw.githubusercontent.com/你的用户名/你的仓库/main/qx_cookie_sync_ql.js?env=WPS_COOKIE, tag=同步WPS到青龙, enabled=true
```

不加 `?env=` 就是全量同步。

## 文件

| 文件 | 作用 |
| --- | --- |
| `qx_cookie_sync_ql.js` | 同步脚本（BoxJS 配置优先，脚本常量兜底） |
| `boxjs.json` | BoxJS 面板的应用定义，导入后生成配置表单 |
| `huazhu_qinglong.js` | 参考示例（华住：抓取+同步一体，青龙接口调用一致） |

## 常见问题

- **`获取青龙 Token 失败 / code 401`**：`client_id`、`client_secret` 不对，或应用权限没勾「环境变量」。
- **`$prefs 里没有 xxx，跳过`**：该 Cookie 还没被抓到，先打开对应 App 触发一次请求，让抓取脚本存好 Cookie 再同步。
- **日志提示「BoxJS 配置解析失败」**：BoxJS 里填的不是合法 JSON，打开面板检查 `ql_cfg` / `ql_sync_list` 格式。
- **青龙在局域网连不上**：在 `[filter_local]` 加直连规则，避免流量走代理：

  ```
  ip-cidr, 192.168.2.1/32, direct
  ```

- **同步的值不是纯 Cookie**：个别脚本在 `$prefs` 里存的是 JSON 对象（如 `{"cookie":"..."}`），这种需要自行处理，或把 `key` 指到它存 Cookie 字段的那个 key。
- **青龙版本差异**：本脚本基于青龙 2.10+ OpenAPI；老版本接口不通时在青龙「应用设置」确认 OpenAPI 版本。
- **通知太频繁**：把脚本里 `NOTIFY` 改成 `false` 只写日志。

## 相关链接

- 青龙 OpenAPI 环境变量操作说明：<https://www.hibbba.com/16234.html>
- Quantumult X 重写规则文档：<https://qx.atlucky.me/shi-yong-fang-fa/pei-zhi-wen-jian-xiang-jie/zhong-xie-rewrite>
