// ============ BoxJs 全量推送到青龙面板（修正版） ============
const qlUrl = 'http://192.168.2.1:5700';   // 👈 改成你的青龙地址
const clientId = 'hA_7ROztf_bd';              // 👈 改成你的
const clientSecret = 'OW-BvxroMs1oftakH3r95JcX';      // 👈 改成你的

// ============================================================

// 检查配置
if (!qlUrl || !clientId || !clientSecret) {
    console.log('❌ 配置不完整，请检查 qlUrl、clientId、clientSecret');
    $done();
    return;
}

// 检查 $persistentStore 是否可用
if (typeof $persistentStore === 'undefined') {
    console.log('❌ $persistentStore 不可用，请确保已开启“允许脚本访问持久化存储”');
    $done();
    return;
}

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
        throw new Error('获取 token 失败，返回：' + JSON.stringify(body));
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
        await getToken();

        const allData = $persistentStore.all();
        const entries = Object.entries(allData).filter(([k, v]) => k && v);

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