/*************************************************************
 * 瑞幸咖啡 · 广告配置接口拦截（v19）
 * v12 两件事：
 *   A. 首页弹窗：交给插件的 [Rewrite] 用 url reject 断掉连接（见插件文件），
 *      让 App 走 WebView 加载失败的错误分支，由 App 自己关闭容器
 *   B. （v13 已移除）下单弹窗不是 popwindow 驱动的，先不碰这个有会话风险的接口

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
    // 下单弹窗：preRecommender（19KB 商品推荐）——由下方带安全阀的逻辑单独处理
    // 开屏广告。129 号抓包：被伪造 3 次，全程 uid 稳定在 123，安全
    /^\/resource\/m\/sys\/app\/adposNew$/,

    // 视觉效果模块（首页弹窗素材）。129 号抓包：被伪造 14 次，全程 uid 稳定在 123，安全
    /^\/resource\/m\/sys\/visual\/effect\/modules$/,

    // ⚠ 以下三个「下单流程」接口在 v10 里被移除：
    //   129 号抓包中，它们在 250ms 内连续返回伪造响应后，
    //   cookie 的 uid 立刻从 123 清成 0 → 49，下一次冷启就是未登录状态。
    //   这就是掉登录的元凶，暂时不碰，下单弹窗先留着。
    // /^\/resource\/core\/v1\/order\/popwindow$/,
    // /^\/resource\/core\/v2\/product\/preRecommender$/,
    // /^\/resource\/core\/v3\/product\/recommenderAround$/,
  ];

  // ---------- 下单弹窗：preRecommender（带安全阀） ----------
  // 132 号抓包：下单页那一簇里只有 preRecommender 是 19KB 的推荐数据，
  // popwindow(1344) 已被证明拦了也没用。所以真正驱动下单弹窗的是它。
  // 安全阀：一旦检测到会话被清（123 → <100），自动永久停用本项拦截，避免反复掉线。
  var ORD_PATH = /^\/resource\/core\/v2\/product\/preRecommender$/;
  var ordOff = "0";
  try { ordOff = String($persistentStore.read("luckin_ord_off") || "0"); } catch (e) {}

  var url = ($request && $request.url) ? String($request.url) : "";
  var path = url.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
  var method = ($request && $request.method) ? $request.method : "?";

  var host = url.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();

  // 首页弹窗改由插件里的 [Rewrite] 处理：
  //   ^https://mkt.lkcoffee.com/webdialog url reject
  // 连接失败会让 App 走 WebView 的 didFail 回调，由 App 自己收掉容器，
  // 而不是像"空页面"那样等页面里的 JS 回调（永远等不到 → 蒙层）。

  var host = url.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();

  // ---------- 首页弹窗：回源 + 注入自动关闭 ----------
  // 背景：Loon 的 `url reject` 实际返回 404 响应（不是连接失败），WebView 认为"加载完成"，
  // 容器不会走 didFail 关闭 → 出现无关闭按钮的蒙层。
  // 方案：正常回源拿到真实页面（保证 SPA 能跑、握手能完成），再追加一段自动调用
  //      closeH5View 的脚本。关闭失败也无所谓——页面是真的，用户能正常点 ×。
  if (host === "mkt.lkcoffee.com" && path.indexOf("/webdialog") === 0) {
    // 我们自己发起的回源请求（带标记头），直接放行，避免递归
    var isEcho = false;
    try {
      var hh = ($request && $request.headers) ? $request.headers : {};
      for (var hk in hh) {
        if (Object.prototype.hasOwnProperty.call(hh, hk) && hk.toLowerCase() === "x-luckin-echo") { isEcho = true; break; }
      }
    } catch (e) {}
    if (isEcho) { $done({}); return; }

    var fallback = function () { $done({}); };   // 回源失败 → 正常放行（弹窗显示，但不会蒙层）

    try {
      $httpClient.get({ url: url, headers: { "X-Luckin-Echo": "1" } }, function (err, resp, body) {
        try {
          if (err || !body || resp.status !== 200) { console.log("[瑞幸] webdialog 回源失败，放行"); fallback(); return; }

          // 1) 头部注入隐藏样式：页面渲染前就看不见，消除"闪一下"
          // 2) 尾部注入关闭脚本：立刻开始调 closeH5View，每 80ms 重试，最多 15 秒
          var inject = "<script>(function(){" +
            "var n=0;function call(){" +
            "try{if(window.nativeSupportApp&&typeof window.nativeSupportApp.closeH5View==='function'){window.nativeSupportApp.closeH5View();}}catch(e){}" +
            "try{if(window.WebViewJavascriptBridge&&window.WebViewJavascriptBridge.callHandler){window.WebViewJavascriptBridge.callHandler('nativeSupportApp.closeH5View',{},function(){});}}catch(e){}" +
            "if(n++<190)setTimeout(call,80);}" +
            "call();})();<\/script>";

          var out = String(body);

          // 样式放在 <head> 之后，保证首帧就是不可见的
          var HIDE = "<style>html,body{opacity:0!important;visibility:hidden!important}</style>";
          var hi = out.search(/<head[^>]*>/i);
          if (hi >= 0) {
            var hend = out.indexOf(">", hi) + 1;
            out = out.slice(0, hend) + HIDE + out.slice(hend);
          } else {
            out = HIDE + out;
          }

          var idx = out.lastIndexOf("</body>");
          if (idx >= 0) out = out.slice(0, idx) + inject + out.slice(idx);
          else out = out + inject;

          console.log("[瑞幸] webdialog 已回源并注入自动关闭（" + out.length + " 字节）");
          $done({
            response: {
              status: 200,
              headers: { "Content-Type": "text/html; charset=utf-8" },
              body: out
            }
          });
        } catch (e2) { fallback(); }
      });
      return;
    } catch (e3) { /* 落到下面正常流程 */ }
  }

  var hit = false;
  for (var i = 0; i < INTERCEPT.length; i++) {
    if (INTERCEPT[i].test(path)) { hit = true; break; }
  }

  if (!hit && ORD_PATH.test(path)) {
    if (ordOff !== "1") { hit = true; }
    else { console.log("[瑞幸] " + path + " → 下单拦截已被安全阀停用，放行"); }
  }

  // 下单弹窗 order/popwindow 已撤掉：实测拦它并不能去掉下单弹窗，
  // 但它是 129 号抓包里会话被清的可疑接口之一，不值得为无效拦截承担风险。

  // ---------- 版本自证 ----------
  // 换过文件名后（luckin_v10.js），Loon 的脚本缓存不会再命中旧文件。
  // 首次请求时弹一次通知，你看到它就说明"内容"确实更新了，而不只是标题。
  try {
    var KEY_V = "luckin_ver_notified";
    var lastV = parseInt($persistentStore.read(KEY_V) || "0", 10) || 0;
    var nowV = Date.now();
    if (nowV - lastV > 600000) {
      $persistentStore.write(String(nowV), KEY_V);
      var ordState = "开启";
      try { if (String($persistentStore.read("luckin_ord_off") || "0") === "1") ordState = "已被安全阀停用"; } catch (e) {}
      console.log("[瑞幸] ===== v19 生效 | 下单拦截: " + ordState + " | 首页弹窗: 回源+注入关闭(首帧隐藏) =====");
      try { $notification.post("瑞幸去广告 v19", "下单拦截: " + ordState, "首页弹窗: 首帧隐藏 + 自动关闭"); } catch (e) {}
    }
  } catch (e) {}

  // ---------- 会话变化自检 ----------
  // HAR 实测：登录态体现在 cookie 的 uid 字段长度上
  //   len=123 → 已登录；len=49 / 0 → 未登录或会话被清
  // 长度变化时自动弹通知 + 记日志，并带上"变化前最后 4 个请求路径"
  try {
    var ck = "";
    var hs = ($request && $request.headers) ? $request.headers : {};
    for (var k in hs) {
      if (Object.prototype.hasOwnProperty.call(hs, k) && k.toLowerCase() === "cookie") { ck = String(hs[k]); break; }
    }
    var uidVal = "";
    var m = ck.match(/(?:^|;\s*)uid=([^;]*)/);
    if (m) uidVal = m[1];
    var uidLen = uidVal.length;

    var KEY_LEN = "luckin_uid_len";
    var KEY_REC = "luckin_recent";
    var prevLen = parseInt($persistentStore.read(KEY_LEN) || "-1", 10);
    var recent = [];
    try { recent = JSON.parse($persistentStore.read(KEY_REC) || "[]") || []; } catch (e) { recent = []; }
    if (!(recent instanceof Array)) recent = [];

    // 版本升级时重置安全阀（避免旧版本误触发的标记一直生效）
    try {
      if (String($persistentStore.read("luckin_ver") || "") !== "18") {
        $persistentStore.write("0", "luckin_ord_off");
        $persistentStore.write("18", "luckin_ver");
        console.log("[瑞幸] v18 首次运行：已重置下单拦截安全阀");
      }
    } catch (e) {}

    if (prevLen >= 0 && prevLen !== uidLen) {
      // 安全阀：只有「拦截之后 3 秒内」会话被清，才认定是拦截导致，避免把用户主动退出登录也当成异常
      if (prevLen >= 100 && uidLen < 100) {
        var lastHit = 0;
        try { lastHit = parseInt($persistentStore.read("luckin_last_hit_ts") || "0", 10) || 0; } catch (e) {}
        if (Date.now() - lastHit < 3000) {
          try { $persistentStore.write("1", "luckin_ord_off"); } catch (e) {}
          console.log("[瑞幸] ⚠ 拦截后 3 秒内会话被清，已停用 preRecommender(下单弹窗) 拦截");
        } else {
          console.log("[瑞幸] 会话变化（非拦截导致），安全阀不触发");
        }
      }
      // 重新登录 → 解除安全阀
      if (prevLen < 100 && uidLen >= 100) {
        try { $persistentStore.write("0", "luckin_ord_off"); } catch (e) {}
        console.log("[瑞幸] 已重新登录，安全阀已解除");
      }
      var tail = recent.slice(-4).join(" ← ");
      console.log("[瑞幸] ⚠ 会话变化 uid_len " + prevLen + " → " + uidLen + " | 变化前: " + tail);
      try {
        $notification.post("瑞幸会话变化", "uid " + prevLen + " → " + uidLen,
          tail ? ("前几个请求: " + tail).slice(0, 180) : path);
      } catch (e) {}
    }

    $persistentStore.write(String(uidLen), KEY_LEN);
    recent.push((hit ? "[拦]" : "") + path);
    while (recent.length > 6) recent.shift();
    $persistentStore.write(JSON.stringify(recent), KEY_REC);
  } catch (e) { /* 自检失败不影响拦截 */ }

  if (hit) {
    try { $persistentStore.write(String(Date.now()), "luckin_last_hit_ts"); } catch (e) {}
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
