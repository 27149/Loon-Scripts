/*************************************************************
 * 瑞幸咖啡 · 登录态诊断（只读，不修改任何内容）
 *
 * 用途：挂在 capi.lkcoffee.com 的 response script 上，把每个响应的
 *      code / busiCode / status / loginState / uid / unit 打到 Loon 日志。
 *      掉登录的时候翻日志最后几十行，就能判断：
 *        - 服务端下发了 loginState:0 / NO_AUTH  → token 真的被服务端失效了
 *        - 一路 loginState:1，然后客户端自己清掉了 → 客户端侧被打断
 *        - unit 在 center-unit / north-unit 之间跳 → 出口节点不稳定
 *
 * 必须 requires_body=true（要读 body）。只记录 header 名称和 uid 前 6 位，
 * 不打印任何 token / cookie 明文。
 *************************************************************/
(function () {
  var url = ($request && $request.url) ? String($request.url).split("?")[0] : "";
  var body = ($response && $response.body) ? $response.body : "";
  if (typeof body !== "string") { body = body ? String(body) : ""; }

  var env = null;
  try { env = JSON.parse(body); } catch (e) { env = null; }

  // 大小写不敏感的 header 取值
  function hdr(obj, name) {
    if (!obj) return null;
    var lower = name.toLowerCase();
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && k.toLowerCase() === lower) return obj[k];
    }
    return null;
  }

  var reqH = ($request && $request.headers) ? $request.headers : {};
  var authMark = [];
  if (hdr(reqH, "authorization")) authMark.push("authorization");
  if (hdr(reqH, "cookie")) authMark.push("cookie");
  if (hdr(reqH, "x-lk-token") || hdr(reqH, "token") || hdr(reqH, "x-token")) authMark.push("token");

  var out = "[瑞幸诊断] " + url +
    " | " + ($request.method || "") +
    " | resp=" + (($response && $response.status) || "?") +
    " | unit=" + (hdr($response && $response.headers, "X-LK-UNIT-ORIGIN") || "-") +
    " | isErr=" + (hdr($response && $response.headers, "X-IS-ERROR") || "-") +
    " | auth=" + (authMark.length ? authMark.join("+") : "无") +
    " | json=" + (env ? "Y" : "N");

  if (env && typeof env === "object") {
    out += " | code=" + env.code +
      " busiCode=" + env.busiCode +
      " status=" + env.status +
      " loginState=" + env.loginState +
      " uid=" + (env.uid ? String(env.uid).slice(0, 6) + "…" : "空") +
      (env.msg ? " msg=" + env.msg : "");
  } else {
    out += " | len=" + body.length + " head=" + body.slice(0, 24).replace(/[^\x20-\x7e]/g, ".");
  }

  console.log(out);
  $done({});
})();
