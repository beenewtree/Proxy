/*
 * ==========================================
 * Quantumult X Cookie → 青龙面板 同步脚本
 * ==========================================
 *
 * 只做两件事：
 * 1. 自定义要同步哪些 Cookie（白名单）
 * 2. 把选中的 Cookie 推送同步到青龙环境变量
 *    （青龙已存在则更新 PUT，不存在则创建 POST，没变化则跳过）
 *
 * Cookie 由你现有的抓取脚本（MaYIHEI 等）获取并存放在 QX $prefs
 * （BoxJS 底层也是 $prefs），本脚本只负责读取并推送给青龙，
 * 不做任何抓取。
 *
 * ── 配置方式（推荐）：BoxJS 面板 ─────────────────────
 * 白名单和青龙凭据都存在 BoxJS 里，改配置不用动脚本：
 *
 * 1. 打开 BoxJS 面板（Safari 访问 http://boxjs.com，或从 QX 的
 *    BoxJS 入口进入），添加应用时导入 boxjs.json 的 raw 链接，
 *    面板会自动生成两个表单：
 *
 *    ql_cfg       青龙配置（JSON）：
 *     {"url":"http://192.168.2.1:5700","client_id":"xxx","client_secret":"yyy"}
 *
 *    ql_sync_list 同步白名单（JSON 数组，一行一个 Cookie）：
 *     [{"key":"wps_cookie","env":"WPS_COOKIE","remarks":"WPS","enabled":true}]
 *
 *    enabled 设为 false 可临时停用某个，不用删。
 *
 * 2. 改完保存即可，下次任务运行自动生效。
 *
 * ── 配置方式（兜底）：脚本常量 ───────────────────────
 * 没有 BoxJS 配置时，使用下方 QL_URL / CLIENT_ID / CLIENT_SECRET
 * 和 SYNC 白名单。
 *
 * ── 运行方式 ─────────────────────────────────────────
 * QX [task_local] 添加定时任务：
 *   0 0,6,12,18 * * * https://raw.githubusercontent.com/你的用户名/你的仓库/main/qx_cookie_sync_ql.js, tag=同步Cookie到青龙, enabled=true
 * 或 event-interaction 手动触发（只同步某一个）：
 *   event-interaction https://raw.githubusercontent.com/你的用户名/你的仓库/main/qx_cookie_sync_ql.js?env=WPS_COOKIE, tag=同步WPS到青龙, enabled=true
 *
 * 注意：青龙地址建议在分流里加直连规则，避免被代理影响。
 *
 * ==========================================
 */


/* ========= 青龙配置（脚本常量，仅作兜底） ========= */

const QL_URL = "http://192.168.2.1:5700";

const CLIENT_ID = "你的青龙 client_id";

const CLIENT_SECRET = "你的青龙 client_secret";


/* ========= 全局配置 ========= */

const TIMEOUT = 15000;            // 请求青龙的超时时间（毫秒）

const NOTIFY = true;              // 同步完成且有变化/失败时是否弹通知


/* ========= BoxJS 配置 key（推荐用 BoxJS 面板管理） ========= */

const BOXJS_CFG_KEY = "ql_cfg";         // JSON：{"url":"...","client_id":"...","client_secret":"..."}

const BOXJS_LIST_KEY = "ql_sync_list";  // JSON 数组：[{"key":"...","env":"...","remarks":"...","enabled":true}]


/* ========= 同步白名单（脚本兜底，BoxJS 的 ql_sync_list 优先） =========
 *
 * 每个元素一个 Cookie，三个字段：
 *   key     : Cookie 在 QX $prefs 里的 key（怎么找见文件末尾说明）
 *   env     : 青龙环境变量名（推送到青龙后显示的名字，必须和青龙任务读取的一致）
 *   remarks : 备注，通知和青龙环境变量备注里会用到
 *
 * 用 BoxJS 面板配置时，这一项可以保持为空。
 * 示例（key 只是举例，请换成你抓取脚本实际使用的 key）：
 *
 *   { key: "wps_cookie", env: "WPS_COOKIE", remarks: "WPS" }
 *   { key: "qqmusic_cookie", env: "QQMUSIC_COOKIE", remarks: "QQ音乐" }
 */

const SYNC = [

];


/* ========= 运行时配置 ========= */

let qlUrl = QL_URL;
let clientId = CLIENT_ID;
let clientSecret = CLIENT_SECRET;


/* ==========================================
 * 读取配置：BoxJS 优先，脚本常量兜底
 * ========================================== */

function loadConfig() {
    let cfg = null;
    let cfgSrc = "脚本常量";
    let list = null;
    let listSrc = "脚本 SYNC";

    try {
        const raw = $prefs.valueForKey(BOXJS_CFG_KEY);
        if (raw && String(raw).trim()) {
            const j = JSON.parse(raw);
            if (j && (j.url || j.client_id || j.client_secret)) {
                cfg = j;
                cfgSrc = "BoxJS " + BOXJS_CFG_KEY;
            }
        }
    } catch (e) {
        console.log("BoxJS 配置 " + BOXJS_CFG_KEY + " 解析失败，使用脚本常量：" + (e.message || e));
    }

    try {
        const raw = $prefs.valueForKey(BOXJS_LIST_KEY);
        if (raw && String(raw).trim()) {
            const j = JSON.parse(raw);
            if (Array.isArray(j)) {
                list = j;
                listSrc = "BoxJS " + BOXJS_LIST_KEY;
            }
        }
    } catch (e) {
        console.log("BoxJS 配置 " + BOXJS_LIST_KEY + " 解析失败，使用脚本 SYNC：" + (e.message || e));
    }

    return {
        cfg: cfg,
        list: list || SYNC,
        cfgSrc: cfgSrc,
        listSrc: listSrc
    };
}


/* ==========================================
 * HTTP 请求
 * ========================================== */

function httpRequest(options) {
    return new Promise(function (resolve, reject) {
        $task.fetch(options).then(
            function (response) {
                resolve(response);
            },
            function (error) {
                reject(error);
            }
        );
    });
}


/* ==========================================
 * 获取青龙 Token
 * ========================================== */

async function getQingLongToken() {
    const url =
        qlUrl +
        "/open/auth/token" +
        "?client_id=" +
        encodeURIComponent(clientId) +
        "&client_secret=" +
        encodeURIComponent(clientSecret);

    const response = await httpRequest({
        url: url,
        method: "GET",
        timeout: TIMEOUT,
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response || !response.body) {
        throw new Error("青龙 Token 接口没有返回数据");
    }

    let result;
    try {
        result = JSON.parse(response.body);
    } catch (e) {
        throw new Error("青龙 Token 返回的数据不是 JSON");
    }

    if (result.code !== 200 || !result.data || !result.data.token) {
        throw new Error(
            "获取青龙 Token 失败：" +
            JSON.stringify(result)
        );
    }

    return result.data.token;
}


/* ==========================================
 * 获取青龙环境变量列表
 * ========================================== */

async function getQingLongEnvs(token) {
    const url = qlUrl + "/open/envs";

    const response = await httpRequest({
        url: url,
        method: "GET",
        timeout: TIMEOUT,
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        }
    });

    if (!response || !response.body) {
        throw new Error("查询青龙环境变量失败：没有返回数据");
    }

    let result;
    try {
        result = JSON.parse(response.body);
    } catch (e) {
        throw new Error("青龙环境变量返回的数据不是 JSON");
    }

    if (result.code !== 200) {
        throw new Error(
            "查询青龙环境变量失败：" +
            JSON.stringify(result)
        );
    }

    return result.data || [];
}


/* ==========================================
 * 更新青龙环境变量（PUT）
 * ========================================== */

async function updateQingLongEnv(token, envId, item) {
    const url = qlUrl + "/open/envs";

    const body = {
        id: envId,
        name: item.env,
        value: item.value,
        remarks: item.remarks + " Quantumult X 自动同步"
    };

    const response = await httpRequest({
        url: url,
        method: "PUT",
        timeout: TIMEOUT,
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response || !response.body) {
        throw new Error("更新青龙环境变量失败：没有返回数据");
    }

    let result;
    try {
        result = JSON.parse(response.body);
    } catch (e) {
        throw new Error("青龙更新接口返回的数据不是 JSON");
    }

    if (result.code !== 200) {
        throw new Error(
            "更新青龙环境变量失败：" +
            JSON.stringify(result)
        );
    }

    return result;
}


/* ==========================================
 * 创建青龙环境变量（POST）
 * ========================================== */

async function createQingLongEnv(token, item) {
    const url = qlUrl + "/open/envs";

    const body = [
        {
            name: item.env,
            value: item.value,
            remarks: item.remarks + " Quantumult X 自动同步"
        }
    ];

    const response = await httpRequest({
        url: url,
        method: "POST",
        timeout: TIMEOUT,
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response || !response.body) {
        throw new Error("创建青龙环境变量失败：没有返回数据");
    }

    let result;
    try {
        result = JSON.parse(response.body);
    } catch (e) {
        throw new Error("青龙创建接口返回的数据不是 JSON");
    }

    if (result.code !== 200) {
        throw new Error(
            "创建青龙环境变量失败：" +
            JSON.stringify(result)
        );
    }

    return result;
}


/* ==========================================
 * 隐藏 Cookie 中间部分（通知里避免完整泄露）
 * ========================================== */

function mask(value) {
    value = String(value || "");
    if (value.length <= 12) {
        return value.substring(0, 3) + "***";
    }
    return (
        value.substring(0, 6) +
        "***" +
        value.substring(value.length - 6)
    );
}


/* ==========================================
 * 从触发 URL 里取 ?env= 过滤参数（手动触发时用）
 * ========================================== */

function getFilterEnv() {
    const url = ($request && $request.url) || "";
    const m = String(url).match(/[?&]env=([^&]+)/i);
    return m ? decodeURIComponent(m[1]) : "";
}


/* ==========================================
 * 同步一个 Cookie 到青龙
 * ========================================== */

async function syncItem(token, envs, item) {
    const value = $prefs.valueForKey(item.key);

    if (!value) {
        console.log(item.remarks + "：$prefs 里没有 " + item.key + "，跳过");
        return { status: "empty" };
    }

    const lastSynced = $prefs.valueForKey("synced_" + item.key);
    if (lastSynced && lastSynced === value) {
        console.log(item.remarks + "：Cookie 没有变化，跳过");
        return { status: "skip" };
    }

    console.log(item.remarks + "：发现新 Cookie " + mask(value) + "，开始同步 " + item.env);

    const target = envs.find(function (e) {
        return e.name === item.env;
    });

    if (target) {
        await updateQingLongEnv(token, target.id, item);
    } else {
        await createQingLongEnv(token, item);
    }

    // 同步成功后才记录，失败下次还会重试
    $prefs.setValueForKey(value, "synced_" + item.key);

    console.log(item.remarks + "：青龙 " + item.env + " 同步成功");
    return { status: target ? "update" : "create" };
}


/* ==========================================
 * 主程序
 * ========================================== */

async function main() {
    const conf = loadConfig();

    if (conf.cfg) {
        qlUrl = conf.cfg.url || QL_URL;
        clientId = conf.cfg.client_id || CLIENT_ID;
        clientSecret = conf.cfg.client_secret || CLIENT_SECRET;
    }
    console.log("青龙配置来源：" + conf.cfgSrc + "，同步列表来源：" + conf.listSrc);

    const only = getFilterEnv();

    let disabled = 0;
    const enabledItems = conf.list.filter(function (item) {
        if (item.enabled === false) {
            disabled++;
            return false;
        }
        return true;
    });

    const items = only
        ? enabledItems.filter(function (item) {
              return item.env.toLowerCase() === only.toLowerCase();
          })
        : enabledItems;

    if (!items.length) {
        const msg = only
            ? "列表里没有配置环境变量 " + only
            : "同步白名单为空，请到 BoxJS 面板编辑 " + BOXJS_LIST_KEY + "（或在脚本 SYNC 里配置）";
        console.log(msg);
        if (NOTIFY) {
            $notify("Cookie 同步", "没有可同步的项目", msg);
        }
        $done({});
        return;
    }

    const token = await getQingLongToken();
    const envs = await getQingLongEnvs(token);

    const result = { create: 0, update: 0, skip: 0, fail: [] };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
            const r = await syncItem(token, envs, item);
            if (r.status === "create") {
                result.create++;
            } else if (r.status === "update") {
                result.update++;
            } else if (r.status === "skip") {
                result.skip++;
            }
        } catch (e) {
            result.fail.push(item.remarks + "：" + item.env + "（" + (e.message || e) + "）");
            console.log(item.remarks + " 同步失败：" + (e.message || e));
        }
    }

    const summary =
        "创建 " + result.create +
        " 个，更新 " + result.update +
        " 个，跳过 " + result.skip +
        " 个" +
        (disabled ? "，停用 " + disabled + " 个" : "") +
        (result.fail.length ? "，失败 " + result.fail.length + " 个" : "");

    console.log("同步完成：" + summary);

    if (NOTIFY && (result.create || result.update || result.fail.length)) {
        const body = summary +
            (result.fail.length ? "\n失败：" + result.fail.join("\n") : "");
        $notify("Cookie 同步", "同步完成", body);
    }

    $done({});
}


/* ==========================================
 * 执行
 * ========================================== */

main().catch(function (e) {
    const error = String(e.message || e);
    console.log("脚本异常：" + error);
    if (NOTIFY) {
        $notify("Cookie 同步", "脚本异常", error);
    }
    $done({});
});


/* ==========================================
 * 附：怎么找 Cookie 在 $prefs 里的 key
 * ==========================================
 *
 * 1. 打开抓取该 App 的 Quantumult X 脚本源码（例如 wps.cookie.js），
 *    搜索 getdata(" 或 valueForKey("，括号里的字符串就是 key
 * 2. 或者打开 BoxJS 面板，查看该 App 数据的「名称」，就是 key
 *    （BoxJS 底层同样存储在 QX $prefs，key 即名称）
 * 3. 把找到的 key 填到白名单的 key 字段（BoxJS 的 ql_sync_list 或脚本 SYNC）
 */
