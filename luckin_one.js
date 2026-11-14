/*************************************************************
 * 瑞幸咖啡 · 一体脚本（拦截 + 自检）
 *
 * 设计目的：把「去广告」和「探针」合并成一个脚本，避免两个插件争抢同一条请求。
 *
 * 行为：
 *   1) 任何发往 capi.lkcoffee.com 的请求，都写一行 Loon 日志（可用来确认 MITM 是否命中、
 *      App 到底在调哪些接口）
 *   2) 冷启一批请求里最多弹 6 条通知（每条带路径），避免刷屏
 *   3) 命中已知广告/弹窗接口时，返回「成功 + 空内容」的密文响应（即你原本能用的方案）
 *
 * 如果广告还在但通知里出现了新路径 → App 换了接口，按新路径补规则即可。
 * 如果连通知都收不到 → 请求没进 MITM，问题在证书/主机名/插件开关，不在脚本。
 *************************************************************/
(function () {
  var EMPTY = "-UBHkcAJ3OmMImYZUqpZFSq6F9XXNfjIELv4HZUdZRDaSi-pRBTbLeTL6IsJGh-oB_Rti0AhsF2j7SdHYvllbK2gLtxAEiipsx-uk-n4dBnZESZ7a6Nb0r9qTt0UeyBUdFj4LxqiaccdyK8PnN4FYb50_Lw47ZLrMTBaW_4DO5YDwVZ9p5fY_lQP6C90DSE2qgLl4DyZ7PgEHi08cS0yPI_ojG68kMA8LTqGO0wpVV4IAqVaxDjm4SZ4MUGqGz_MC1f_mHH1q8Num1bn0SamilxnA-5dBUI9F9ImNLQg9MhlGwk7g1BGwe395GIsNUWnm1w88FmEYJv-NeOksSAyWIULVm4504TvPsfrRp0ikJcehz8o9J9cEWTPU4tyAwvviF0GkP_irZ6Dc-eJrFVoensYiyt03QFg3b9Tchgxfzg=";

  // 已知的广告 / 弹窗接口
  var AD_PATHS = [
    /\/resource\/m\/sys\/app\/adposNew/i,
    /\/resource\/core\/v1\/order\/popwindow/i,
    /\/resource\/core\/v2\/product\/preRecommender/i
  ];

  var url = ($request && $request.url) ? String($request.url) : "";
  var path = url.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
  var method = ($request && $request.method) ? $request.method : "?";

  console.log("[瑞幸] " + method + " " + path);

  // ---- 通知（每批最多 6 条）----
  try {
    var now = Date.now();
    var lastTs = parseInt($persistentStore.read("luckin_last_ts") || "0", 10) || 0;
    var hits = parseInt($persistentStore.read("luckin_hits") || "0", 10) || 0;
    if (now - lastTs > 120000) hits = 0;
    hits += 1;
    $persistentStore.write(String(now), "luckin_last_ts");
    $persistentStore.write(String(hits), "luckin_hits");
    if (hits <= 6) {
      $notification.post("瑞幸命中", method + (hits === 1 ? " · 首个请求" : ""),
        path.length > 64 ? path.slice(0, 64) + "…" : path);
    }
  } catch (e) { /* 通知失败不影响主流程 */ }

  // ---- 命中广告接口 → 返回空响应 ----
  for (var i = 0; i < AD_PATHS.length; i++) {
    if (AD_PATHS[i].test(path)) {
      console.log("[瑞幸] 命中广告接口，返回空响应: " + path);
      $done({
        response: {
          status: 200,
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          body: EMPTY
        }
      });
      return;
    }
  }

  // ---- 其它 capi 请求：原样放行 ----
  $done({});
})();
