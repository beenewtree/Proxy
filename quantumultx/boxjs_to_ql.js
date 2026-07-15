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
  $.log("开始获取 BoxJS 备份数据...");
  
  // QX 存储 BoxJS 数据的默认键名
  const boxjsDataStr = $prefs.valueForKey('boxjs_user_cfg');
  if (!boxjsDataStr) {
    $.msg("BoxJS自动同步", "失败", "未在本地找到 BoxJS 的配置数据(boxjs_user_cfg)");
    $.done();
    return;
  }

  let boxjsData;
  try {
    boxjsData = JSON.parse(boxjsDataStr);
  } catch (e) {
    $.msg("BoxJS自动同步", "失败", "解析 BoxJS 数据 JSON 失败");
    $.done();
    return;
  }

  const uploadList = [];
  
  // 遍历 BoxJS 中所有的键值对
  for (const key in boxjsData) {
    const value = boxjsData[key];
    if (!value || typeof value !== 'string') continue;

    // 自动匹配包含关键字的 Key
    const isTarget = FILTER_KEYWORDS.some(keyword => key.toLowerCase().includes(keyword));
    
    if (isTarget) {
      // 【自动映射规则】将 key 转换为规范的青龙环境变量名（如: chavy_cookie_wyy -> CHAVY_COOKIE_WYY）
      const qlName = key.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
      
      uploadList.push({
        name: qlName,
        value: value,
        remarks: `自动同步于 ${new Date().toLocaleDateString()}`
      });
      $.log(`[自动识别] Key: ${key} -> 青龙变量: ${qlName}`);
    }
  }

  if (uploadList.length === 0) {
    $.log("未在 BoxJS 中匹配到任何带有 cookie/token 等特征的有效数据。");
    $.done();
    return;
  }

  $.log(`共自动识别到 ${uploadList.length} 个变量，开始推送到青龙...`);

  try {
    const token = await getQLToken();
    if (!token) throw new Error("获取青龙 Token 失败，请检查配置或网络。");

    // 获取青龙现有的所有环境变量
    const currentEnvs = await getQLEnvs(token);
    let addCount = 0;
    let updateCount = 0;
    
    for (const item of uploadList) {
      const matched = currentEnvs.find(e => e.name === item.name);
      if (matched) {
        // 如果值变了才更新，减少对青龙的无效网络请求
        if (matched.value !== item.value) {
          const id = matched.id || matched._id;
          await updateQLEnv(token, id, item.name, item.value, item.remarks);
          $.log(`[更新成功] ${item.name}`);
          updateCount++;
        } else {
          $.log(`[无需更新] ${item.name} 值未改变`);
        }
      } else {
        // 不存在则直接自动新增
        await createQLEnv(token, item.name, item.value, item.remarks);
        $.log(`[新增成功] ${item.name}`);
        addCount++;
      }
    }
    $.msg("BoxJS自动同步", "同步成功", `新增: ${addCount} 个，更新: ${updateCount} 个`);
  } catch (err) {
    $.msg("BoxJS自动同步", "同步发生错误", err.message || err);
  } finally {
    $.done();
  }
}

// ========== 青龙 API 封装 ==========
function getQLToken() {
  return new Promise((resolve) => {
    const url = `${QL_CONFIG.host}/open/auth/token?client_id=${QL_CONFIG.client_id}&client_secret=${QL_CONFIG.client_secret}`;
    $task.fetch({ url }).then(response => {
      const res = JSON.parse(response.body);
      resolve(res.code === 200 ? res.data.token : null);
    }, () => resolve(null));
  });
}

function getQLEnvs(token) {
  return new Promise((resolve) => {
    const url = `${QL_CONFIG.host}/open/envs`;
    $task.fetch({
      url,
      headers: { "Authorization": `Bearer ${token}` }
    }).then(response => {
      const res = JSON.parse(response.body);
      resolve(res.code === 200 ? res.data : []);
    }, () => resolve([]));
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
      body: JSON.stringify([{ name, value, remarks }])
    }).then(response => {
      const res = JSON.parse(response.body);
      res.code === 200 ? resolve() : reject(res.message);
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
      body: JSON.stringify(bodyData)
    }).then(response => {
      const res = JSON.parse(response.body);
      res.code === 200 ? resolve() : reject(res.message);
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