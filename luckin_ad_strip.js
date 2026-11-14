/*************************************************************
 * 瑞幸咖啡 · 响应侧去广告（v2）
 *
 * 与旧方案的区别：
 *   旧方案 = 在「请求」阶段直接伪造响应（丢掉真实信封、丢掉所有网关响应头）
 *   新方案 = 让请求正常到达服务器，在「响应」阶段只清空业务内容，
 *            完整保留 code / busiCode / status / loginState / uid / msg / zeusId
 *            以及原响应头（X-IS-Error / X-LK-UNIT-* / X-ZEUS-MSG-ID 等）
 *
 * 适用于 Loon 的 response script（http-response），必须 requires_body=true。
 *
 * $argument:
 *   { debug: true }        打印原始信封摘要
 *   { debug: true, mode: "scrub" }
 *        clear（默认）：把 content 整体清成 {} 或 []
 *        scrub       ：只删除 content 里形似广告/推荐/弹窗的字段
 *
 * 安全兜底：如果响应体不是明文 JSON 信封（例如接口返回的是密文），
 * 本脚本原样放行、不做任何改写 —— 宁可这一次广告没去掉，也不返回无法解析的内容。
 *************************************************************/
(function () {
  var url = ($request && $request.url) ? String($request.url).split("?")[0] : "";
  var body = ($response && $response.body) ? $response.body : "";
  if (typeof body !== "string") { body = body ? String(body) : ""; }

  var arg = (typeof $argument === "undefined") ? null : $argument;
  var dbg = false;
  var mode = "clear";
  if (arg && typeof arg === "object") {
    dbg = arg.debug === true;
    if (arg.mode === "scrub") mode = "scrub";
  } else if (typeof arg === "string") {
    dbg = /(^|[&?,\s])debug=true/.test(arg);
    if (/mode=scrub/.test(arg)) mode = "scrub";
  }

  var env = null;
  try { env = JSON.parse(body); } catch (e) { env = null; }

  // 不是明文 JSON 信封 → 放行，绝不塞入密文/快照
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    console.log("[瑞幸去广告] 放行(非JSON信封) " + url + " len=" + body.length);
    $done({});
    return;
  }

  var codeOk = (env.code === 0 || env.code === "0");
  if (dbg || !codeOk) {
    console.log("[瑞幸去广告] 原始 " + url +
      " code=" + env.code +
      " busiCode=" + env.busiCode +
      " status=" + env.status +
      " loginState=" + env.loginState +
      " uid=" + (env.uid ? String(env.uid).slice(0, 6) + "…" : "空") +
      " contentKeys=" + (env.content && typeof env.content === "object"
        ? Object.keys(env.content).slice(0, 12).join("|") : typeof env.content));
  }

  // 只处理成功响应；错误/未登录响应保持原样
  if (!codeOk) { $done({}); return; }

  var c = env.content;
  if (c === null || c === undefined) {
    if (dbg) console.log("[瑞幸去广告] content 本来就是空，无需改写");
    $done({});
    return;
  }

  if (typeof c === "object") {
    if (Array.isArray(c)) {
      env.content = [];
    } else if (mode === "scrub") {
      var AD = /(^|[^a-z])(ad|ads|adlist|adinfo|adpos|adnew|splash|splashad|banner|banners|popup|popwindow|recommend|recommendlist|promo|promotion)([^a-z]|$)/i;
      var keys = Object.keys(c);
      for (var i = 0; i < keys.length; i++) {
        if (AD.test(keys[i])) { delete c[keys[i]]; }
      }
      if (Object.keys(c).length === 0) env.content = {};
    } else {
      env.content = {};
    }
  } else if (typeof c === "string") {
    // content 是字符串（可能是加密串或 JSON 串），保守处理：不改
    if (dbg) console.log("[瑞幸去广告] content 为字符串，保守放行");
    $done({});
    return;
  } else {
    env.content = mode === "scrub" ? env.content : {};
  }

  if (dbg) {
    console.log("[瑞幸去广告] 已改写 " + url +
      " → content=" + JSON.stringify(env.content) +
      " loginState=" + env.loginState +
      " (信封字段保持不变)");
  }

  // 只替换 body，status 和全部响应头沿用真实响应
  $done({ body: JSON.stringify(env) });
})();
