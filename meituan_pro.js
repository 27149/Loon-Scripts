/**
 * @name 美团外卖去广告 (Pro版)
 * @description 针对 GitHub 托管优化，带日志调试功能
 * @author Gemini
 */

const url = $request.url;
const method = $request.method;
let body = $response.body;

// 定义一个打印日志的函数，方便你在 Loon -> 日志 里查看
function log(msg) {
    console.log(`[美团净化] ${msg}`);
}

if (body) {
    try {
        let obj = JSON.parse(body);
        let modified = false;

        // 场景1: 针对 v1/splash 接口
        // 这里的特征通常是 data.ads 数组
        if (url.includes("splash") && obj.data) {
            log("命中 Splash 接口");
            if (obj.data.ads && obj.data.ads.length > 0) {
                obj.data.ads = []; // 清空广告数组
                modified = true;
                log("成功清理 ads 字段");
            }
            if (obj.data.splash && obj.data.splash.length > 0) {
                 obj.data.splash = [];
                 modified = true;
                 log("成功清理 splash 字段");
            }
        }

        // 场景2: 针对 loadInfo 接口 (这是美团外卖最阴险的地方，开屏和弹窗都在这)
        if (url.includes("loadInfo") && obj.data) {
            log("命中 loadInfo 接口");
            // 这是一个大杂烩接口，我们只摘除广告相关的 key
            const adKeys = ['adInfo', 'startup_ad', 'operation_ad', 'marketing_ad'];
            
            adKeys.forEach(key => {
                if (obj.data[key]) {
                    obj.data[key] = null; // 或者 {};
                    modified = true;
                    log(`已移除 ${key}`);
                }
            });
            
            // 强行把展示时间设为0
            if (obj.data.app_launch_splash) {
                obj.data.app_launch_splash = null;
                modified = true;
            }
        }

        if (modified) {
            $done({ body: JSON.stringify(obj) });
        } else {
            // 如果没改动，就原样返回，不浪费性能
            log("未发现已知广告字段，原样放行");
            $done({});
        }

    } catch (e) {
        log("脚本解析错误: " + e);
        $done({});
    }
} else {
    $done({});
}
