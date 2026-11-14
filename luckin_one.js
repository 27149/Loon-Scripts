/*************************************************************
 * 瑞幸咖啡 · 一体脚本（拦截 + 自检）v2
 *
 * 根据实测反馈调整：App 已经不再调用 /resource/m/sys/app/adposNew，
 * 所以不再只认 3 个固定路径，改为：
 *   1) 记录每一个 capi 请求的真实路径（去重后存本地，新路径弹通知）
 *   2) 按关键词命中广告/弹窗类接口，直接返回「成功 + 空内容」密文
 *   3) 其余请求原样放行
 *
 * 日志格式： [瑞幸] 方法 路径 [→ 已拦截]
 * 如果一条 [瑞幸] 都没有 → 请求没进 MITM，问题不在脚本。
 *************************************************************/
(function () {
  var EMPTY = "-UBHkcAJ3OmMImYZUqpZFSq6F9XXNfjIELv4HZUdZRDaSi-pRBTbLeTL6IsJGh-oB_Rti0AhsF2j7SdHYvllbK2gLtxAEiipsx-uk-n4dBnZESZ7a6Nb0r9qTt0UeyBUdFj4LxqiaccdyK8PnN4FYb50_Lw47ZLrMTBaW_4DO5YDwVZ9p5fY_lQP6C90DSE2qgLl4DyZ7PgEHi08cS0yPI_ojG68kMA8LTqGO0wpVV4IAqVaxDjm4SZ4MUGqGz_MC1f_mHH1q8Num1bn0SamilxnA-5dBUI9F9ImNLQg9MhlGwk7g1BGwe395GIsNUWnm1w88FmEYJv-NeOksSAyWIULVm4504TvPsfrRp0ikJcehz8o9J9cEWTPU4tyAwvviF0GkP_irZ6Dc-eJrFVoensYiyt03QFg3b9Tchgxfzg=";

  // 关键词命中即视为广告/弹窗类接口
  var AD_PATTERNS = [
    /adpos/i, /\/ads?\//i, /adlist/i, /adbanner/i, /advert/i,
    /splash/i, /popwindow/i, /popup/i, /pop[\-_]?up/i,
    /banner/i, /recommend/i,
    /effect\/modules/i          // 视觉模块（首页弹窗素材的实际来源，很可能是新接口）
  ];

  var url = ($request && $request.url) ? String($request.url) : "";
  var path = url.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
  var method = ($request && $request.method) ? $request.method : "?";

  var hit = false;
  for (var i = 0; i < AD_PATTERNS.length; i++) {
    if (AD_PATTERNS[i].test(path)) { hit = true; break; }
  }

  console.log("[瑞幸] " + method + " " + path + (hit ? " → 已拦截" : ""));

  // ---- 新路径记录 + 通知（每批最多 8 条）----
  try {
    var KEY = "luckin_seen_paths";
    var seen = [];
    try {
      var txt = $persistentStore.read(KEY);
      if (txt) seen = JSON.parse(txt) || [];
    } catch (e) { seen = []; }
    if (!(seen instanceof Array)) seen = [];

    if (seen.indexOf(path) === -1 && seen.length < 120) {
      seen.push(path);
      try { $persistentStore.write(JSON.stringify(seen), KEY); } catch (e) {}

      var lastTs = parseInt($persistentStore.read("luckin_last_ts") || "0", 10) || 0;
      var hits = parseInt($persistentStore.read("luckin_hits") || "0", 10) || 0;
      var now = Date.now();
      if (now - lastTs > 120000) hits = 0;
      hits += 1;
      $persistentStore.write(String(now), "luckin_last_ts");
      $persistentStore.write(String(hits), "luckin_hits");
      if (hits <= 8) {
        $notification.post("瑞幸新路径", method + (hit ? " · 已拦截" : ""),
          path.length > 64 ? path.slice(0, 64) + "…" : path);
      }
    }
  } catch (e) { /* 记录失败不影响拦截 */ }

  // ---- 命中 → 返回空响应 ----
  if (hit) {
    $done({
      response: {
        status: 200,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: EMPTY
      }
    });
    return;
  }

  $done({});
})();
