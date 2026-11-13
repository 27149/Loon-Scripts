// 瑞幸咖啡：开屏接口返回一条 app 能正常解密的“成功”响应，避免 404 触发网络不可用提示
const body = "-UBHkcAJ3OmMImYZUqpZFSq6F9XXNfjIELv4HZUdZRC_ca-mYnouiPHMUrbQaoJBW6BhohJ6aUXxvPODSifOXGh164E6ZhJVMhUsRZIpm93IR03h8Wy2GbhXPX6Vy9Oh8qRQBmiwMp1cJDi0BLGfAqlDZmnM-OLNJ4Gyy_6OWgxXpCFcMNQ36UnjxQW4F336_k4oT8Jzl0rzRELFNHUAXn5tBz2nI81R6dlKU08PQKcH7U7UDXIQOagoHLWpT1R1ALj3dItbLz1CNGXlmgL2pyCEPOsGmDnrV6Tr6MyGIQs-jZmDdnrdpsgnU1wLatxGYk7tCqB6T-Jfju8h4RVrSD-GeLJmhzf1KN6EnTx6_UCJAjM8opJDZTRnbRSfafA0f97RZ2UxcS1Wwc8LwfpRsunfa1z4INQRltTS9uromsc=";
$done({
  response: {
    status: 200,
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: body
  }
});
