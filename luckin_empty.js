// 瑞幸咖啡：返回一个已加密的「成功 + 空内容」响应，替代广告/弹窗接口的真实响应。
// 瑞幸接口响应是 AES-ECB 固定密钥加密，App 能正常解密这段数据，所以不会弹「网络不可用」。
// 数据取自 /resource/m/sys/visual/effect/modules 的空响应（2026-11-13 抓包）。
const EMPTY =
  "-UBHkcAJ3OmMImYZUqpZFSq6F9XXNfjIELv4HZUdZRDaSi-pRBTbLeTL6IsJGh-oB_Rti0AhsF2j7SdHYvllbK2gLtxAEiipsx-uk-n4dBnZESZ7a6Nb0r9qTt0UeyBUdFj4LxqiaccdyK8PnN4FYb50_Lw47ZLrMTBaW_4DO5YDwVZ9p5fY_lQP6C90DSE2qgLl4DyZ7PgEHi08cS0yPI_ojG68kMA8LTqGO0wpVV4IAqVaxDjm4SZ4MUGqGz_MC1f_mHH1q8Num1bn0SamilxnA-5dBUI9F9ImNLQg9MhlGwk7g1BGwe395GIsNUWnm1w88FmEYJv-NeOksSAyWIULVm4504TvPsfrRp0ikJcehz8o9J9cEWTPU4tyAwvviF0GkP_irZ6Dc-eJrFVoensYiyt03QFg3b9Tchgxfzg=";

$done({
  response: {
    status: 200,
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: EMPTY,
  },
});
