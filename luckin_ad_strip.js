/*************************************************************
 * 瑞幸咖啡 · 响应侧去广告（v3）
 *
 * v2 失效复盘：v2 给三条规则都加了 `argument={debug}`（Boolean 对象参数），
 * 这个写法在旧版 Script 语法里最容易解析失败，一旦规则被判无效，三条规则会一起失效。
 * v3 不接收任何 $argument，也不依赖开关，最大化兼容。
 *
 * 两种响应形态都能处理：
 *   1) 明文 JSON 信封  → 只清空 content，code/loginState/uid/zeusId 原样保留（最优）
 *   2) 密文响应        → 回放已知可被 App 解密的「成功+空内容」密文，响应头/状态码保持真实
 *
 * 注意：任何改写都只换 body，不换 status / headers，
 *      所以 X-ZEUS-MSG-ID、X-LK-UNIT-ORIGIN、X-IS-ERROR 这些网关头不会丢。
 *************************************************************/
(function () {
  // 取自 /resource/m/sys/visual/effect/modules 的空响应（2026-11-13 抓包，320 字节密文）
  var EMPTY = "-UBHkcAJ3OmMImYZUqpZFSq6F9XXNfjIELv4HZUdZRDaSi-pRBTbLeTL6IsJGh-oB_Rti0AhsF2j7SdHYvllbK2gLtxAEiipsx-uk-n4dBnZESZ7a6Nb0r9qTt0UeyBUdFj4LxqiaccdyK8PnN4FYb50_Lw47ZLrMTBaW_4DO5YDwVZ9p5fY_lQP6C90DSE2qgLl4DyZ7PgEHi08cS0yPI_ojG68kMA8LTqGO0wpVV4IAqVaxDjm4SZ4MUGqGz_MC1f_mHH1q8Num1bn0SamilxnA-5dBUI9F9ImNLQg9MhlGwk7g1BGwe395GIsNUWnm1w88FmEYJv-NeOksSAyWIULVm4504TvPsfrRp0ikJcehz8o9J9cEWTPU4tyAwvviF0GkP_irZ6Dc-eJrFVoensYiyt03QFg3b9Tchgxfzg=";

  function hdr(obj, name) {
    if (!obj) return null;
    var lower = name.toLowerCase();
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && k.toLowerCase() === lower) return obj[k];
    }
    return null;
  }

  var url = ($request && $request.url) ? String($request.url) : "";
  var path = url.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
  var status = ($response && $response.status) || 0;
  var unit = hdr($response && $response.headers, "X-LK-UNIT-ORIGIN") || "-";
  var raw = ($response && $response.body) ? $response.body : "";
  if (typeof raw !== "string") { raw = raw ? String(raw) : ""; }

  // 非 200 一律放行，避免把错误页也替换成"成功"
  if (status !== 200) {
    console.log("[瑞幸去广告] " + path + " status=" + status + " → 放行");
    $done({});
    return;
  }

  var env = null;
  try { env = JSON.parse(raw); } catch (e) { env = null; }

  // 密文响应 → 回放空响应（保留真实 status 与 headers）
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    console.log("[瑞幸去广告] " + path + " json=N len=" + raw.length + " unit=" + unit + " → 密文兜底");
    $done({ body: EMPTY });
    return;
  }

  var codeOk = (env.code === 0 || env.code === "0");
  console.log("[瑞幸去广告] " + path + " json=Y code=" + env.code +
    " status=" + env.status + " loginState=" + env.loginState + " unit=" + unit +
    (codeOk ? " → 清空content" : " → 放行(非成功)"));

  if (!codeOk) { $done({}); return; }

  var c = env.content;
  if (c && typeof c === "object") {
    env.content = Array.isArray(c) ? [] : {};
  } else if (typeof c === "string" && c) {
    // content 是加密串，JSON 路径处理不了 → 退回密文兜底
    $done({ body: EMPTY });
    return;
  } else {
    $done({});
    return;
  }

  $done({ body: JSON.stringify(env) });
})();
