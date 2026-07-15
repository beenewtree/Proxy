// ============ BoxJs → 青龙 推送脚本（HTTP 后端版） ============
// 通过 QX HTTP 后端获取数据，无需 $persistentStore 权限

const qlUrl = 'http://192.168.2.1:5700';   // 青龙地址
const clientId = 'hA_7ROztf_bd';
const clientSecret = 'OW-BvxroMs1oftakH3r95JcX';

// QX HTTP 后端端口（默认 9999，如果改过请修改）
const boxJsPort = 9999;
const boxJsUrl = `http://127.0.0.1:${boxJsPort}/boxdata`;

// ============================================================

let token = '';

function getHeaders() {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

async function getToken() {
    const resp = await $task.fetch({
        url: `${qlUrl}/open/auth/token?client_id=${clientId}&client_secret=${clientSecret}`,
        method: 'GET',
        timeout: 10
    });
    const body = JSON.parse(resp.body);
    if (body.code === 200) {
        token = body.data.token;
        console.log('✅ 青龙 Token 获取成功');
    } else {
        throw new Error('获取 token 失败：' + JSON.stringify(body));
    }
}

async function searchEnv(name) {
    const resp = await $task.fetch({
        url: `${qlUrl}/open/envs?searchValue=${encodeURIComponent(name)}`,
        method: 'GET',
        headers: getHeaders(),
        timeout: 10
    });
    const body = JSON.parse(resp.body);
    const envs = body.data || [];
    return envs.length > 0 ? envs[0].id : null;
}

async function updateEnv(id, name, value) {
    await $task.fetch({
        url: `${qlUrl}/open/envs`,
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ id: id, name: name, value: value }),
        timeout: 10
    });
    console.log(`  ✅ 更新: ${name}`);
}

async function createEnv(name, value) {
    await $task.fetch({
        url: `${qlUrl}/open/envs`,
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify([{ name: name, value: value, remarks: 'BoxJs同步' }]),
        timeout: 10
    });
    console.log(`  ✅ 新建: ${name}`);
}

(async () => {
    try {
        // 1. 获取青龙 token
        await getToken();

        // 2. 通过 HTTP 后端获取 BoxJs 全部数据
        console.log('📡 从 QX HTTP 后端读取 BoxJs 数据...');
        const boxResp = await $task.fetch({
            url: boxJsUrl,
            method: 'GET',
            timeout: 10
        });
        const allData = JSON.parse(boxResp.body);
        
        // 数据可能是对象 {key:value,...} 或数组 [{key,val},...]
        let entries = [];
        if (Array.isArray(allData)) {
            entries = allData.filter(item => item.key && item.val).map(item => [item.key, item.val]);
        } else if (typeof allData === 'object') {
            entries = Object.entries(allData).filter(([k, v]) => k && v);
        }
        
        if (entries.length === 0) {
            console.log('⚠️ BoxJs 中没有数据，跳过同步');
            $done();
            return;
        }

        console.log(`📦 读取到 ${entries.length} 个变量，开始同步...`);

        let success = 0, fail = 0;
        for (const [key, value] of entries) {
            try {
                const envId = await searchEnv(key);
                if (envId) {
                    await updateEnv(envId, key, value);
                } else {
                    await createEnv(key, value);
                }
                success++;
            } catch (e) {
                console.log(`  ❌ 失败: ${key} → ${e.message || e}`);
                fail++;
            }
        }

        console.log(`🎉 同步完成！成功 ${success} 个，失败 ${fail} 个`);
    } catch (e) {
        console.log(`❌ 同步中断：${e.message || JSON.stringify(e)}`);
    }
    $done();
})();