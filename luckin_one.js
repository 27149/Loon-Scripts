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

    if (prevLen >= 0 && prevLen !== uidLen) {
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
