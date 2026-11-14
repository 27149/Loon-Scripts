// 瑞幸咖啡：请求阶段返回已知可被 App 解密的「成功 + 空内容」响应。
// 这是你原本能用的机制（http-request），区别只在于：
//   1) 托管地址换成 jsDelivr（原来的 raw URL 已 404）
//   2) 拦截时打一行日志，用来确认 MITM 是否真的命中了这个请求
const EMPTY =
  "-UBHkcAJ3OmMImYZUqpZFSq6F9XXNfjIELv4HZUdZRDaSi-pRBTbLeTL6IsJGh-oB_Rti0AhsF2j7SdHYvllbK2gLtxAEiipsx-uk-n4dBnZESZ7a6Nb0r9qTt0UeyBUdFj4LxqiaccdyK8PnN4FYb50_Lw47ZLrMTBaW_4DO5YDwVZ9p5fY_lQP6C90DSE2qgLl4DyZ7PgEHi08cS0yPI_ojG68kMA8LTqGO0wpVV4IAqVaxDjm4SZ4MUGqGz_MC1f_mHH1q8Num1bn0SamilxnA-5dBUI9F9ImNLQg9MhlGwk7g1BGwe395GIsNUWnm1w88FmEYJv-NeOksSAyWIULVm4504TvPsfrRp0ikJcehz8o9J9cEWTPU4tyAwvviF0GkP_irZ6Dc-eJrFVoensYiyt03QFg3b9Tchgxfzg=";

const p = $request.url.split("?")[0];
console.log("[瑞幸去广告] 请求阶段拦截 " + p + " (" + $request.method + ")");

$done({
  response: {
    status: 200,
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: EMPTY,
  },
});
