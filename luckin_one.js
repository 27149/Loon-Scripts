/*************************************************************
 * 瑞幸咖啡 · 广告配置接口拦截（v7）
 *
 * 已验证的前提（2026-11-14）：
 *   - 返回可解密的「成功+空内容」密文，不会让客户端解密失败（不会弹「网络不可用」）
 *   - 不拦 HTTPDNS、不拦 CDN，就不会掉登录、不会出现卡死的蒙层
 *   - 这套机制下登录态稳定，所以可以扩大拦截范围
 *
 * 每个接口都可以单独开关：注释掉对应那行即可回退。
 *************************************************************/
(function () {
  // 取自 /resource/m/sys/visual/effect/modules 的空响应（320 字节密文，客户端可正常解密）
  var EMPTY = "-UBHkcAJ3OmMImYZUqpZFSq6F9XXNfjIELv4HZUdZRDaSi-pRBTbLeTL6IsJGh-oB_Rti0AhsF2j7SdHYvllbK2gLtxAEiipsx-uk-n4dBnZESZ7a6Nb0r9qTt0UeyBUdFj4LxqiaccdyK8PnN4FYb50_Lw47ZLrMTBaW_4DO5YDwVZ9p5fY_lQP6C90DSE2qgLl4DyZ7PgEHi08cS0yPI_ojG68kMA8LTqGO0wpVV4IAqVaxDjm4SZ4MUGqGz_MC1f_mHH1q8Num1bn0SamilxnA-5dBUI9F9ImNLQg9MhlGwk7g1BGwe395GIsNUWnm1w88FmEYJv-NeOksSAyWIULVm4504TvPsfrRp0ikJcehz8o9J9cEWTPU4tyAwvviF0GkP_irZ6Dc-eJrFVoensYiyt03QFg3b9Tchgxfzg=";

  var INTERCEPT = [
    // 开屏素材（原 adposNew 通道）
    /^\/resource\/m\/sys\/app\/adposNew$/,

    // 视觉效果模块：v7 里开着，但 v7.1 后出现掉登录，它是每次启动都调 3 次的接口，
    // 最可能承载会话引导数据，v8 先摘掉（首页弹窗可能会回来，用于确认它是不是元凶）
    // /^\/resource\/m\/sys\/visual\/effect\/modules$/,

    // 下单确认页弹窗
    /^\/resource\/core\/v1\/order\/popwindow$/,

    // 下单页商品推荐（弹窗的候选数据来源）
    /^\/resource\/core\/v2\/product\/preRecommender$/,
    /^\/resource\/core\/v3\/product\/recommenderAround$/,
  ];

  var url = ($request && $request.url) ? String($request.url) : "";
  var path = url.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
  var method = ($request && $request.method) ? $request.method : "?";

  var hit = false;
  for (var i = 0; i < INTERCEPT.length; i++) {
    if (INTERCEPT[i].test(path)) { hit = true; break; }
  }

  if (hit) {
    console.log("[瑞幸] " + method + " " + path + " → 空响应");
    $done({
      response: {
        status: 200,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: EMPTY
      }
    });
    return;
  }

  // 非目标接口：只记录，不改动
  console.log("[瑞幸] " + method + " " + path);
  $done({});
})();
