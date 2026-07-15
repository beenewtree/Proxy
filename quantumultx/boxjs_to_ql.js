/**
 * BoxJS 全自动 Cookie 匹配并同步至青龙面板
 * * 原理：
 * 1. 读取 BoxJS 的全局存储对象 boxjs_user_cfg
 * 2. 自动筛选所有 Key 中包含 "cookie", "token", "session", "auth" 等关键字的数据
 * 3. 自动将 Key 转为大写（替换非法字符）作为青龙的环境变量名，Value 作为值，一键同步
 */

const QL_CONFIG = {
  host: 'http://192.168.2.1:5700', // 青龙面板地址，末尾不要加 /
  client_id: 'hA_7ROztf_bd',         // 青龙 Client ID
  client_secret: 'OW-BvxroMs1oftakH3r95JcX',     // 青龙 Client Secret
};

// 用于自动筛选的关键字（不区分大小写）
const FILTER_KEYWORDS = ['cookie', 'token', 'session', 'auth', 'sign', 'hd', 'token_sp'];

const $ = new Env("BoxJS全自动同步");

async function main() {
  $.log("1. 脚本启动，准备读取本地 Keys...");
  
  let allKeys = [];
  try {
    // 部分设备存储数据极多时此步可能较慢，加入 try-catch
    allKeys = $prefs.allKeys() || [];
    $.log(`2. 成功读取本地 Key 列表，共找到 ${allKeys.length} 个键值`);
  } catch (e) {
    $.log(`【错误】读取 $prefs.allKeys 失败: ${e.message || e}`);
    $.done();
    return;
  }

  if (allKeys.length === 0) {
    $.log("【警告】未在 QX 本地找到任何存储数据");
    $.done();
    return;
  }

  const uploadList = [];
  $.log("3. 开始筛选匹配 Cookie 关键字...");

  for (const key of allKeys) {
    const isTarget = FILTER_KEYWORDS.some(keyword => key.toLowerCase().includes(keyword));
    if (isTarget) {
      const value = $prefs.valueForKey(key);
      if (value && typeof value === 'string') {
        const qlName = key.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
        uploadList.push({
          name: qlName,
          value: value,
          remarks: `自动同步于 ${new Date().toLocaleDateString()}`
        });
      }
    }
  }

  $.log(`4. 筛选完成！共自动识别到 ${uploadList.length} 个符合条件的变量`);
  if (uploadList.length === 0) {
    $.log("【结束】未在本地找到任何匹配 cookie/token 关键字的数据。");
    $.done();
    return;
  }

  $.log("5. 准备请求青龙面板获取 Token...");
  try {
    // 带有 10 秒超时控制的 Token 获取
    const token = await Promise.race([
      getQLToken(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("连接青龙面板超时 (10s)，请检查 IP 端口是否能跨网通车。")), 10000))
    ]);

    if (!token) throw new Error("获取青龙 Token 失败，返回数据为空。");
    $.log("6. 成功获取青龙 Token，开始拉取青龙环境变量列表...");

    const currentEnvs = await getQLEnvs(token);
    $.log(`7. 成功获取青龙现有变量，共 ${currentEnvs.length} 个，开始比对并推送...`);

    let addCount = 0;
    let updateCount = 0;
    
    for (const item of uploadList) {
      const matched = currentEnvs.find(e => e.name === item.name);
      if (matched) {
        if (matched.value !== item.value) {
          const id = matched.id || matched._id;
          await updateQLEnv(token, id, item.name, item.value, item.remarks);
          $.log(`[更新成功] ${item.name}`);
          updateCount++;
        } else {
          // 值一样就不重复请求了，节省连接
          updateCount++;
        }
      } else {
        await createQLEnv(token, item.name, item.value, item.remarks);
        $.log(`[新增成功] ${item.name}`);
        addCount++;
      }
    }
    $.msg("BoxJS自动同步", "同步成功", `新增: ${addCount} 个，更新: ${updateCount} 个`);
  } catch (err) {
    $.log(`【发生严重错误】: ${err.message || err}`);
    $.msg("BoxJS自动同步", "同步发生错误", err.message || err);
  } finally {
    $.log("8. 脚本运行结束。");
    $.done();
  }
}

// ========== 带超时的青龙 API 封装 ==========
function getQLToken() {
  return new Promise((resolve, reject) => {
    const url = `${QL_CONFIG.host}/open/auth/token?client_id=${QL_CONFIG.client_id}&client_secret=${QL_CONFIG.client_secret}`;
    $task.fetch({ url, opts: { timeout: 8 } }).then(response => {
      try {
        const res = JSON.parse(response.body);
        resolve(res.code === 200 ? res.data.token : null);
      } catch (e) {
        reject(new Error("解析青龙 Token 返回 JSON 失败"));
      }
    }, err => reject(err));
  });
}

function getQLEnvs(token) {
  return new Promise((resolve, reject) => {
    const url = `${QL_CONFIG.host}/open/envs`;
    $task.fetch({
      url,
      headers: { "Authorization": `Bearer ${token}` },
      opts: { timeout: 8 }
    }).then(response => {
      try {
        const res = JSON.parse(response.body);
        resolve(res.code === 200 ? res.data : []);
      } catch (e) {
        reject(new Error("解析青龙环境变量返回 JSON 失败"));
      }
    }, err => reject(err));
  });
}

function createQLEnv(token, name, value, remarks) {
  return new Promise((resolve, reject) => {
    const url = `${QL_CONFIG.host}/open/envs`;
    $task.fetch({
      method: "POST",
      url,
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([{ name, value, remarks }]),
      opts: { timeout: 5 }
    }).then(response => {
      try {
        const res = JSON.parse(response.body);
        res.code === 200 ? resolve() : reject(res.message);
      } catch (e) {
        reject(new Error("创建变量返回解析失败"));
      }
    }, err => reject(err));
  });
}

function updateQLEnv(token, id, name, value, remarks) {
  return new Promise((resolve, reject) => {
    const url = `${QL_CONFIG.host}/open/envs`;
    const bodyData = { name, value, remarks };
    if (typeof id === 'number') bodyData.id = id; else bodyData._id = id;

    $task.fetch({
      method: "PUT",
      url,
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bodyData),
      opts: { timeout: 5 }
    }).then(response => {
      try {
        const res = JSON.parse(response.body);
        res.code === 200 ? resolve() : reject(res.message);
      } catch (e) {
        reject(new Error("更新变量返回解析失败"));
      }
    }, err => reject(err));
  });
}

function Env(name) {
  return {
    log: (msg) => console.log(`[${name}] ${msg}`),
    msg: (title, subtitle, body) => $notify(title, subtitle, body),
    done: () => $done({})
  }
}

main();