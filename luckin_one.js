/*************************************************************
 * 瑞幸咖啡 · 广告配置接口拦截（v6）
 *
 * 从两次 HAR 得到的结论：
 *   - reject-200（0 字节）会让客户端解密失败 → 弹「网络不可用」
 *   - 拦 mkt CDN 会让弹窗 H5 启动失败 → 蒙层卡死
 *   - 正确做法：返回一份**客户端能解密**的「成功 + 空内容」响应
 *
 * 默认只处理开屏（adposNew）。首页弹窗（effect/modules）的开关在下面，
 * 打开它可以去掉首页弹窗，但有一定概率影响首页模块渲染，所以默认关闭。
 *
 * 其余接口一律原样放行，不修改任何内容。
 *************************************************************/
(function () {
  // 取自 /resource/m/sys/visual/effect/modules 的空响应（320 字节密文，客户端可正常解密）
  var EMPTY = "-UBHkcAJ3OmMImYZUqpZFSq6F9XXNfjIELv4HZUdZRDaSi-pRBTbLeTL6IsJGh-oB_Rti0AhsF2j7SdHYvllbK2gLtxAEiipsx-uk-n4dBnZESZ7a6Nb0r9qTt0UeyBUdFj4LxqiaccdyK8PnN4FYb50_Lw47ZLrMTBaW_4DO5YDwVZ9p5fY_lQP6C90DSE2qgLl4DyZ7PgEHi08cS0yPI_ojG68kMA8LTqGO0wpVV4IAqVaxDjm4SZ4MUGqGz_MC1f_mHH1q8Num1bn0SamilxnA-5dBUI9F9ImNLQg9MhlGwk7g1BGwe395GIsNUWnm1w88FmEYJv-NeOksSAyWIULVm4504TvPsfrRp0ikJcehz8o9J9cEWTPU4tyAwvviF0GkP_irZ6Dc-eJrFVoensYiyt03QFg3b9Tchgxfzg=";

  var INTERCEPT = [
    // 开屏广告：默认开启
    /^\/resource\/m\/sys\/app\/adposNew$/,

    // 首页弹窗：默认关闭。打开后可去首页弹窗，但可能影响首页模块渲染，先观察首页是否正常
    // /^\/resource\/m\/sys\/visual\/effect\/modules$/,
  ];

  var url = ($request && $request.url) ? String($request.url) : "";
  var path = url.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
  var method = ($request && $request.method) ? $request.method : "?";

  var hit = false;
  for (var i = 0; i < INTERCEPT.length; i++) {
    if (INTERCEPT[i].test(path)) { hit = true; break; }
  }

  console.log("[瑞幸] " + method + " " + path + (hit ? " → 返回空响应" : ""));

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
