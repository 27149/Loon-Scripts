/*************************************************************
 * 瑞幸探针（只读，不改任何请求）
 *
 * 作用：App 每访问一次 capi.lkcoffee.com，就在 Loon 日志里留一行，
 *      并对每个不同的路径 60 秒内最多弹一次通知。
 *
 * 判据：
 *   - 冷启 App 后能收到通知 → MITM + 脚本执行都正常
 *   - 收不到通知、日志也没有 → 请求没进 MITM（证书/主机名/插件没启用）
 *   - 通知里有某些 URL，但没有 adposNew → App 换接口了，广告不从这个口出
 *************************************************************/
(function () {
  var url = ($request && $request.url) ? String($request.url) : "";
  var host = url.replace(/^https?:\/\//, "").split("/")[0];
  var path = url.split("?")[0].replace(/^https?:\/\/[^/]+/, "");

  console.log("[瑞幸探针] " + ($request && $request.method ? $request.method : "?") +
    " " + host + path);

  // 每个路径 60 秒最多弹一次，避免刷屏
  var key = "luckin_probe_" + path.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  var last = 0;
  try {
    last = parseInt($persistentStore.read(key) || "0", 10) || 0;
  } catch (e) { last = 0; }

  var now = Date.now();
  if (now - last > 60000) {
    try { $persistentStore.write(String(now), key); } catch (e) {}
    try {
      $notification.post("瑞幸探针命中", $request.method + " " + host,
        path.length > 60 ? path.slice(0, 60) + "…" : path);
    } catch (e) {}
  }

  // 原样放行，绝不修改
  $done({});
})();
