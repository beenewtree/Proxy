// ============ BoxJs 全量推送到青龙面板（局域网版） ============
// 用途：每30分钟读取一次 BoxJs 全部变量，自动同步到青龙环境变量
// 配置：修改下方 3 个参数即可

const qlUrl = 'http://192.168.2.1:5700';   // 👈 青龙面板地址
const clientId = 'hA_7ROztf_bd';              // 👈 替换
const clientSecret = 'OW-BvxroMs1oftakH3r95JcX';      // 👈 替换

// ============================================================

let token = '';

// 获取青龙 token
function getToken() {
    return new Promise((resolve, reject) => {
        $httpClient.get({
            url: `${qlUrl}/open/auth/token?client_id=${clientId}&client_secret=${clientSecret}`,
            timeout: 10
        }, (err, resp, data) => {
            if (err) reject(err);
            else {
                const tokenData = JSON.parse(data);
                if (tokenData.code === 200) {
                    token = tokenData.data.token;
                    resolve();
                } else {
                    reject('获取 token 失败：' + JSON.stringify(tokenData));
                }
            }
        });
    });
}

// 通用请求头
function getHeaders() {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// 查询环境变量，返回 id（存在）或 null（不存在）
function searchEnv(name) {
    return new Promise((resolve, reject) => {
        $httpClient.get({
            url: `${qlUrl}/open/envs?searchValue=${encodeURIComponent(name)}`,
            headers: getHeaders(),
            timeout: 10
        }, (err, resp, data) => {
            if (err) reject(err);
            else {
                const envList = JSON.parse(data).data;
                resolve(envList.length > 0 ? envList[0].id : null);
            }
        });
    });
}

// 更新环境变量
function updateEnv(id, name, value) {
    return new Promise((resolve, reject) => {
        $httpClient.put({
            url: `${qlUrl}/open/envs`,
            headers: getHeaders(),
            body: JSON.stringify({ id: id, name: name, value: value }),
            timeout: 10
        }, (err, resp, data) => {
            if (err) reject(err);
            else resolve(JSON.parse(data));
        });
    });
}

// 新建环境变量
function createEnv(name, value) {
    return new Promise((resolve, reject) => {
        $httpClient.post({
            url: `${qlUrl}/open/envs`,
            headers: getHeaders(),
            body: JSON.stringify([{ name: name, value: value, remarks: 'BoxJs同步' }]),
            timeout: 10
        }, (err, resp, data) => {
            if (err) reject(err);
            else resolve(JSON.parse(data));
        });
    });
}

// 主流程
(async () => {
    try {
        console.log('🔑 连接青龙面板...');
        await getToken();

        const allData = $persistentStore.all();
        const entries = Object.entries(allData).filter(([k, v]) => k && v);

        if (entries.length === 0) {
            console.log('⚠️  BoxJs 中没有数据，跳过同步');
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
                    console.log(`  ✅ 更新: ${key}`);
                } else {
                    await createEnv(key, value);
                    console.log(`  ✅ 新建: ${key}`);
                }
                success++;
            } catch (e) {
                console.log(`  ❌ 失败: ${key} → ${e}`);
                fail++;
            }
        }

        console.log(`🎉 同步完成！成功 ${success} 个，失败 ${fail} 个`);
    } catch (e) {
        console.log(`❌ 同步中断：${e}`);
    }

    $done();
})();