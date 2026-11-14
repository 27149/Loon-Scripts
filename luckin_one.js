/*************************************************************
 * 瑞幸咖啡 · 只读观察脚本（v5）
 *
 * 从 HAR 得到的结论：
 *   1) capi 的响应体是**加密**的（base64，固定前缀 -UBHkcAJ3OmMImYZUqpZFSq6F9XXNfjIELv4HZUdZR）
 *   2) 我们之前把整个响应体换成一份「旧快照」，等于把那一刻的信封（含 loginState / uid）
 *      塞给了客户端 —— 这是掉登录最合理的解释
 *
 * 所以本版脚本**不再修改任何响应**，只做两件事：
 *   - 把 capi 的每次请求写进 Loon 日志（[瑞幸] 开头）
 *   - 新路径弹一次通知（去重，每批最多 6 条）
 *
 * 去广告改由 Rewrite 在「资源层」完成，不碰业务响应体。
 *************************************************************/
(function () {
  var url = ($request && $request.url) ? String($request.url) : "";
  var path = url.split("?")[0].replace(/^https?:\/\/[^/]+/, "");
  var host = url.replace(/^https?:\/\//, "").split("/")[0];
  var method = ($request && $request.method) ? $request.method : "?";

  console.log("[瑞幸] " + method + " " + host + path);

  try {
    var KEY = "luckin_seen_paths";
    var seen = [];
    try {
      var txt = $persistentStore.read(KEY);
      if (txt) seen = JSON.parse(txt) || [];
    } catch (e) { seen = []; }
    if (!(seen instanceof Array)) seen = [];

    if (seen.indexOf(host + path) === -1 && seen.length < 150) {
      seen.push(host + path);
      try { $persistentStore.write(JSON.stringify(seen), KEY); } catch (e) {}

      var lastTs = parseInt($persistentStore.read("luckin_last_ts") || "0", 10) || 0;
      var hits = parseInt($persistentStore.read("luckin_hits") || "0", 10) || 0;
      var now = Date.now();
      if (now - lastTs > 120000) hits = 0;
      hits += 1;
      $persistentStore.write(String(now), "luckin_last_ts");
      $persistentStore.write(String(hits), "luckin_hits");
      if (hits <= 6) {
        try { $notification.post("瑞幸新路径", method, (host + path).slice(0, 70)); } catch (e) {}
      }
    }
  } catch (e) { /* 记录失败不影响请求 */ }

  // 永远原样放行
  $done({});
})();
