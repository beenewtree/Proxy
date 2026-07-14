/**
 * Loon Cookie 同步到青龙面板
 *
 * 作为 cron 任务运行，从 Loon 持久化存储读取各脚本已保存的 Cookie，
 * 通过青龙 OpenAPI 写入环境变量。
 *
 * 使用前需在 Loon 持久化存储中设置：
 *   ql_url         → 青龙面板地址，如 http://192.168.1.100:5700
 *   ql_client_id   → 青龙应用 client_id
 *   ql_client_secret → 青龙应用 client_secret
 */

const QL_URL = $persistentStore.read("ql_url") || "http://your-qinglong:5700";
const QL_CLIENT_ID = $persistentStore.read("ql_client_id");
const QL_CLIENT_SECRET = $persistentStore.read("ql_client_secret");

// ─── Cookie 提取映射 ─────────────────────────────────────────
// key:   Loon 持久化存储的 key（即各脚本的 CK_KEY）
// value: 青龙环境变量名
//
// extract(data): 从存储的原始数据中提取出要推送到青龙的 value
//                原始数据可能是纯字符串或 JSON，依具体脚本而定
const COOKIE_SOURCES = [
  {
    name: "小米商城",
    ckKey: "mishop_data",
    envName: "MISHOP_DATA",
    extract: (raw) => raw, // 整个 JSON 字符串
  },
  {
    name: "小米抽奖",
    ckKey: "milottery_data",
    envName: "MILOTTERY_DATA",
    extract: (raw) => raw,
  },
  {
    name: "WPS",
    ckKey: "wps_sid",
    envName: "WPS_SID",
    extract: (raw) => raw, // 纯字符串
  },
  {
    name: "QQ音乐",
    ckKey: "qqmusic_data",
    envName: "QQMUSIC_DATA",
    extract: (raw) => raw,
  },
  {
    name: "追觅",
    ckKey: "dreame_data",
    envName: "DREAME_DATA",
    extract: (raw) => raw,
  },
  {
    name: "万达电影",
    ckKey: "wanda_data",
    envName: "WANDA_DATA",
    extract: (raw) => raw,
  },
  {
    name: "一点万象",
    ckKey: "newmixc_data",
    envName: "NEWMIXC_DATA",
    extract: (raw) => raw,
  },
  {
    name: "龙湖天街",
    ckKey: "lhtj_headers",
    envName: "LHTJ_HEADERS",
    extract: (raw) => raw,
  },
  {
    name: "名创优品",
    ckKey: "miniso_data",
    envName: "MINISO_DATA",
    extract: (raw) => raw,
  },
  {
    name: "有品",
    ckKey: "youpin_data",
    envName: "YOUPIN_DATA",
    extract: (raw) => raw,
  },
];

// 获取青龙 Token
async function getToken() {
  const url = `${QL_URL}/api/login`;
  const body = JSON.stringify({
    client_id: QL_CLIENT_ID,
    client_secret: QL_CLIENT_SECRET,
  });
  const resp = await $httpClient.post({ url, body });
  const data = JSON.parse(resp.body);
  return data.data?.token;
}

// 将单个环境变量推送到青龙
async function syncEnv(token, envName, value) {
  const searchUrl = `${QL_URL}/api/envs?searchValue=${envName}`;
  const searchResp = await $httpClient.get({
    url: searchUrl,
    headers: { Authorization: `Bearer ${token}` },
  });
  const searchData = JSON.parse(searchResp.body);
  const existing = searchData.data?.find((e) => e.name === envName);

  if (existing) {
    const updateUrl = `${QL_URL}/api/envs`;
    await $httpClient.put({
      url: updateUrl,
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: envName, value, _id: existing._id }),
    });
    console.log(`✅ 更新 ${envName} 成功`);
  } else {
    const createUrl = `${QL_URL}/api/envs`;
    await $httpClient.post({
      url: createUrl,
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify([{ name: envName, value }]),
    });
    console.log(`✅ 创建 ${envName} 成功`);
  }
}

// 遍历所有 Cookie 源，逐个同步
async function syncAll() {
  console.log(`🔄 开始同步 Cookie 到青龙 (${QL_URL})`);

  const token = await getToken();
  if (!token) {
    console.log(`❌ 获取青龙 Token 失败，请检查 ql_client_id / ql_client_secret`);
    $done({});
    return;
  }

  let success = 0;
  let failed = 0;

  for (const source of COOKIE_SOURCES) {
    const raw = $persistentStore.read(source.ckKey);
    if (!raw) {
      console.log(`⏭️  ${source.name} (${source.ckKey}) — 无数据，跳过`);
      continue;
    }
    try {
      const value = source.extract(raw);
      await syncEnv(token, source.envName, value);
      success++;
    } catch (e) {
      console.log(`❌ ${source.name} 同步失败: ${e.message}`);
      failed++;
    }
  }

  console.log(`🏁 同步完成: ${success} 成功, ${failed} 失败`);
  $done({});
}

syncAll();
