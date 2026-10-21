/*
 * ==========================================
 * 华住会 sId → Quantumult X → 青龙
 * ==========================================
 *
 * 功能：
 * 1. 抓取华住请求头中的 sId
 * 2. 保存到 QX $prefs
 * 3. 自动同步到青龙环境变量 huazhu
 * 4. sId 没变化时不重复同步
 * 5. huazhu 存在则更新，不存在则创建
 *
 * 使用前只需要修改下面三个参数：
 *
 * QL_URL
 * CLIENT_ID
 * CLIENT_SECRET
 *
 * ==========================================
 */


/* ========= 青龙配置 ========= */

const QL_URL = "http://192.168.2.1:5700";

const CLIENT_ID = "hA_7ROztf_bd";

const CLIENT_SECRET = "OW-BvxroMs1oftakH3r95JcX";



/* ========= 环境变量名称 ========= */

const ENV_NAME = "huazhu";


/* ========= QX 本地保存名称 ========= */

const PREFS_KEY = "huazhu";


/* ==========================================
 * 获取请求头
 * ========================================== */

function getHeader(headers, name) {

    if (!headers) {
        return "";
    }

    if (headers[name]) {
        return headers[name];
    }

    const key = Object.keys(headers).find(function (k) {
        return k.toLowerCase() === name.toLowerCase();
    });

    if (key) {
        return headers[key];
    }

    return "";
}


/* ==========================================
 * 隐藏 sId 中间部分
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
 * 获取华住 sId
 * ========================================== */

function getHuazhuSid() {

    const headers = $request.headers || {};

    let sid = getHeader(headers, "sId");

    if (!sid) {
        sid = getHeader(headers, "sid");
    }

    if (!sid) {
        sid = getHeader(headers, "crossAuth");
    }

    return String(sid || "").trim();
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
        QL_URL +
        "/open/auth/token" +
        "?client_id=" +
        encodeURIComponent(CLIENT_ID) +
        "&client_secret=" +
        encodeURIComponent(CLIENT_SECRET);


    const response = await httpRequest({

        url: url,

        method: "GET",

        headers: {
            "Content-Type": "application/json"
        }

    });


    if (!response || !response.body) {

        throw new Error(
            "青龙 Token 接口没有返回数据"
        );

    }


    let result;

    try {

        result = JSON.parse(response.body);

    } catch (e) {

        throw new Error(
            "青龙 Token 返回的数据不是 JSON"
        );

    }


    if (
        result.code !== 200 ||
        !result.data ||
        !result.data.token
    ) {

        throw new Error(
            "获取青龙 Token 失败：" +
            JSON.stringify(result)
        );

    }


    return result.data.token;
}


/* ==========================================
 * 获取青龙环境变量
 * ========================================== */

async function getQingLongEnvs(token) {

    const url =
        QL_URL +
        "/open/envs";


    const response = await httpRequest({

        url: url,

        method: "GET",

        headers: {

            "Authorization":
                "Bearer " + token,

            "Content-Type":
                "application/json"

        }

    });


    if (!response || !response.body) {

        throw new Error(
            "查询青龙环境变量失败：没有返回数据"
        );

    }


    let result;

    try {

        result = JSON.parse(response.body);

    } catch (e) {

        throw new Error(
            "青龙环境变量返回的数据不是 JSON"
        );

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
 * 更新青龙环境变量
 * ========================================== */

async function updateQingLongEnv(
    token,
    envId,
    sid
) {

    const url =
        QL_URL +
        "/open/envs";


    const body = {

        id: envId,

        name: ENV_NAME,

        value: sid,

        remarks:
            "华住会 Quantumult X 自动同步"

    };


    const response = await httpRequest({

        url: url,

        method: "PUT",

        headers: {

            "Authorization":
                "Bearer " + token,

            "Content-Type":
                "application/json"

        },

        body:
            JSON.stringify(body)

    });


    if (!response || !response.body) {

        throw new Error(
            "更新青龙环境变量失败：没有返回数据"
        );

    }


    let result;

    try {

        result = JSON.parse(response.body);

    } catch (e) {

        throw new Error(
            "青龙更新接口返回的数据不是 JSON"
        );

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
 * 创建青龙环境变量
 * ========================================== */

async function createQingLongEnv(
    token,
    sid
) {

    const url =
        QL_URL +
        "/open/envs";


    const body = [

        {

            name: ENV_NAME,

            value: sid,

            remarks:
                "华住会 Quantumult X 自动同步"

        }

    ];


    const response = await httpRequest({

        url: url,

        method: "POST",

        headers: {

            "Authorization":
                "Bearer " + token,

            "Content-Type":
                "application/json"

        },

        body:
            JSON.stringify(body)

    });


    if (!response || !response.body) {

        throw new Error(
            "创建青龙环境变量失败：没有返回数据"
        );

    }


    let result;

    try {

        result = JSON.parse(response.body);

    } catch (e) {

        throw new Error(
            "青龙创建接口返回的数据不是 JSON"
        );

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
 * 同步到青龙
 * ========================================== */

async function syncToQingLong(sid) {

    /*
     * 先检查 QX 中之前保存的 sId
     */

    const oldSid =
        $prefs.valueForKey(PREFS_KEY);


    /*
     * 如果完全一样：
     * 不再请求青龙
     */

    if (oldSid && oldSid === sid) {

        console.log(
            "华住 sId 没有变化，不同步青龙"
        );

        return;

    }


    console.log(
        "发现新的华住 sId：" +
        mask(sid)
    );


    /*
     * 获取青龙 Token
     */

    const token =
        await getQingLongToken();


    /*
     * 查询环境变量
     */

    const envs =
        await getQingLongEnvs(token);


    /*
     * 查找 huazhu
     */

    const target =
        envs.find(function (item) {

            return item.name === ENV_NAME;

        });


    /*
     * 已经存在
     */

    if (target) {

        console.log(
            "发现青龙环境变量 huazhu，开始更新"
        );


        await updateQingLongEnv(
            token,
            target.id,
            sid
        );


        /*
         * 青龙更新成功后
         * 才保存到 QX
         */

        $prefs.setValueForKey(
            sid,
            PREFS_KEY
        );


        $notify(

            "华住会",

            "Cookie 同步成功",

            "青龙 huazhu 已更新\n" +
            "sId：" +
            mask(sid)

        );


        console.log(
            "青龙 huazhu 更新成功"
        );


        return;

    }


    /*
     * 不存在 → 创建
     */

    console.log(
        "青龙不存在 huazhu，开始创建"
    );


    await createQingLongEnv(
        token,
        sid
    );


    /*
     * 创建成功后保存
     */

    $prefs.setValueForKey(
        sid,
        PREFS_KEY
    );


    $notify(

        "华住会",

        "Cookie 同步成功",

        "青龙 huazhu 已创建\n" +
        "sId：" +
        mask(sid)

    );


    console.log(
        "青龙 huazhu 创建成功"
    );

}


/* ==========================================
 * 主程序
 * ========================================== */

async function main() {

    /*
     * 获取华住 sId
     */

    const sid =
        getHuazhuSid();


    /*
     * 当前请求没有 sId
     */

    if (!sid) {

        console.log(
            "当前请求没有发现 sId"
        );

        $done({});

        return;

    }


    console.log(
        "抓到华住 sId：" +
        mask(sid)
    );


    /*
     * 同步青龙
     */

    try {

        await syncToQingLong(sid);

    } catch (e) {

        const error =
            String(
                e.message || e
            );


        console.log(
            "同步青龙失败：" +
            error
        );


        $notify(

            "华住会",

            "抓取到了 Cookie",

            "但同步青龙失败：\n" +
            error

        );

    }


    $done({});

}


/* ==========================================
 * 执行
 * ========================================== */

main().catch(function (e) {

    const error =
        String(
            e.message || e
        );


    console.log(
        "脚本异常：" +
        error
    );


    $notify(

        "华住会",

        "脚本异常",

        error

    );


    $done({});

});