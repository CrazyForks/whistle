# pipe
> 该功能需要 whistle 2.4.3 及以上版本，更新whistle请求参见[帮助文档](../update.html)
> 建议使用最新版本 whistle，至少 `v2.4.3` 及以上版本，确保 pipe 功能更加合理完善

类似Node里面的 `stream.pipe` 方法，把 `http[s]`、`websocket`、`tunnel` 的请求或响应内容pipe到插件对应server，可以在插件动态修改请求响应内容，配置方式：
``` txt
pattern pipe://plugin-name

# 传值给插件，插件里面可以通过 req.originalReq.pipeValue 获取
pattern pipe://plugin-name(value)
```
其中，`plugin-name` 为对应插件名称，pattern参见[匹配方式](../pattern.html)，更多模式请参考[配置方式](../mode.html)。

具体应用及实现方式，参见[插件开发](../plugins.html)。

#### 过滤规则
需要确保whistle是最新版本：[更新whistle](../update.html)

如果要过滤指定请求或指定协议的规则匹配，可以用如下协议：

1. [ignore](./ignore.html)：忽略指定规则
2. [filter](./filter.html)：过滤指定pattern，支持根据请求方法、请求头、请求客户端IP过滤

例子：

```
# 下面表示匹配pattern的同时不能为post请求且请求头里面的cookie字段必须包含test(忽略大小写)、url里面必须包含 cgi-bin 的请求
# 即：过滤掉匹配filter里面的请求
pattern operator1 operator2 excludeFilter://m:post includeFilter://h:cookie=test includeFilter:///cgi-bin/i

# 下面表示匹配pattern1、pattern2的请求方法为post、或请求头里面的cookie字段不能包含类似 `uin=123123` 且url里面必须包含 cgi-bin 的请求
operator pattern1 pattern2 includeFilter://m:post excludeFilter://h:cookie=/uin=o\d+/i excludeFilter:///cgi-bin/i

# 下面表示匹配pattern的请求忽略除了host以外的所有规则
pattern ignore://*|!host

# 下面表示匹配pattern的请求忽略file和host协议的规则
pattern ignore://file|host
```
