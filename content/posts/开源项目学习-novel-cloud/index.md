---
title: 开源项目学习-novel-cloud
date: 2025-12-13T20:44:00+08:00
categories:
  - 开源项目学习
tags:
  - 开源项目
  - 微服务项目
---
### 跑通代码
开发环境
![](Pasted%20image%2020251213204654.png)这里最基本的mysql和redis有了
下载后端源码
```
git clone https://gitee.com/novel_dev_team/novel.git
```
数据库文件导入
![](Pasted%20image%2020251213204813.png)
右键数据库->SQL Scripts->run scripts 依次选择解压好的两个sql文件
去配置文件中修改mysql和redis的配置
mysql这改改密码和数据库名就行了
```
spring:
    datasource:
        url: jdbc:mysql://localhost:3306/novel?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai
        username: root
        password: 123456
```
redis这里直接用docker部署一个吧，除了IP（设置为虚拟机的地址）其他不用改，装redis镜像的设置成一致就好了
```
spring:
    data:
        # Redis 配置
        redis:
        host: 127.0.0.1
        port: 6379
        password: 123456
```
redis安装（in docker）
```
docker pull redis:7.0
```
运行redis
```
docker run -d \
  --name redis-7.0-for-novel \
  -p 6379:6379 \
  redis:7.0 \
  redis-server --requirepass "123456" --appendonly yes
```
过程中还遇到了一些问题
启动类里面有一些标红报错的可以先解决一下，然后运行会出现下面这个错误
![](Pasted%20image%2020251213212753.png)
说启动类里面代码写太长了，通过下面的方式可解决 
![](Pasted%20image%2020251213212902.png)
然后在mysql的url配置的最后加一个参数，公钥验证啥的，也是报了错的
```
&allowPublicKeyRetrieval=true
```
改完之后可以访问接口文档测试一下
```
http://server:port/swagger-ui/index.html
#把里面的server换成服务器地址，端口是yaml中设置的服务端口
http://localhost:8888/swagger-ui/index.html
```
前端部分安装
```
git clone https://gitee.com/novel_dev_team/novel-front-web.git
```
先安装一下node js
```
winget search Node.js
```
找到node 16版本对应的版本号记一下，然后执行下述安装命令（在前端文件夹下）
```
winget install OpenJS.Nodejs.16 --version 16.20.2
#OpenJS.Nodejs.16是查出来的ID   16.20.2是后面对应的版本
#验证
node --version
```
在前端文件夹的命令行中执行下述命令
```
#安装yarn
npm install -g yarn
#安装项目依赖
yarn install
#启动项目
yarn serve
```
然后后端程序启动一下访问下述地址就可以了
http://localhost:1024
### 重点功能研究
#### 使用策略模式重构多系统环境下的用户认证授权
策略模式
一个类的行为/算法可以**在运行时更改**（这种类型的设计模式属于行为型模式）。
就是在类中定义一个策略对象（在创建这个类的对象的时候传入），具体的方法是调用这个策略对象的方法来进行的。那么通过改进传入的策略对象，就可以改变这个类的行为了。
这个模式主要用在解决在多种相似算法存在时，使用条件语句（如if...else）导致复杂性和难以维护的问题。
比如支付方式的选择
```
if(Method == 支付宝){
	支付宝支付相关逻辑...
}else if(Method == 微信){
	微信支付相关逻辑...
}else if(Method == 银行卡){
	银行卡支付相关逻辑...
}else{
	其他...
}
```
使用建议：
当系统重有多种算法或行为，且它们之间可以相互替换时，使用策略模式。
当系统需要动态选择算法时，策略模式是一个合适的选择。
EXAMPLE
```
//创建一个接口
public interface Strategy {
   public int doOperation(int num1, int num2);
}

//创建实现接口的实体类
//OperationAdd.java
public class OperationAdd implements Strategy{
   @Override
   public int doOperation(int num1, int num2) {
      return num1 + num2;
   }
}
//OperationSubtract.java
public class OperationSubtract implements Strategy{
   @Override
   public int doOperation(int num1, int num2) {
      return num1 - num2;
   }
}
//OperationMultiply.java
public class OperationMultiply implements Strategy{
   @Override
   public int doOperation(int num1, int num2) {
      return num1 * num2;
   }
}

//创建Context类
public class Context {
   private Strategy strategy;
 
   public Context(Strategy strategy){
      this.strategy = strategy;
   }
 
   public int executeStrategy(int num1, int num2){
      return strategy.doOperation(num1, num2);
   }
}

//改变策略，查看结果
public class StrategyPatternDemo {
   public static void main(String[] args) {
      Context context = new Context(new OperationAdd());    
      System.out.println("10 + 5 = " + context.executeStrategy(10, 5));
 
      context = new Context(new OperationSubtract());      
      System.out.println("10 - 5 = " + context.executeStrategy(10, 5));
 
      context = new Context(new OperationMultiply());    
      System.out.println("10 * 5 = " + context.executeStrategy(10, 5));
   }
}

//程序输出结果
10 + 5 = 15
10 - 5 = 5
10 * 5 = 50
```
优点：
1.算法切换自由：可以在**运行时**根据需要切换算法
2.避免多重条件判断：消除了复杂的条件语句
3.扩展性好：新增算法只需新增一个策略类，无需修改现有代码
缺点：
1.策略类数量增多：每增加一个算法，就需要增加一个策略类
2.所有策略类都需要暴露：策略类需要对外公开，以便可以被选择和使用

改进前：
根据请求的URI识别出相应系统类型，并进行相应的权限校验
```
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtUtils jwtUtils;

    private final ObjectMapper objectMapper;

    @SuppressWarnings("NullableProblems")
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 校验登录 token
        String token = request.getHeader(SystemConfigConsts.HTTP_AUTH_HEADER_NAME);
        if (!Objects.isNull(token)) {
            String requestUri = request.getRequestURI();
            if (requestUri.contains(ApiRouterConsts.API_FRONT_URL_PREFIX)) {
                // 校验门户系统用户权限
                Long userId = jwtUtils.parseToken(token, SystemConfigConsts.NOVEL_FRONT_KEY);
                if (!Objects.isNull(userId)) {
                    // TODO 查询用户信息并校验账号状态是否正常
                    // TODO 其它权限校验
                    // 认证成功
                    return HandlerInterceptor.super.preHandle(request, response, handler);
                }
            }else if (requestUri.contains(ApiRouterConsts.API_AUTHOR_URL_PREFIX)){
                // TODO 校验作家后台管理系统用户权限

            }else if (requestUri.contains(ApiRouterConsts.API_ADMIN_URL_PREFIX)){
                // TODO 校验平台后台管理系统用户权限
            }
            //。。。更多系统权限校验
            // 完整实现可能至少几百行的代码

        }
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(RestResp.fail(ErrorCodeEnum.USER_LOGIN_EXPIRED)));
        return false;
    }
}

```
改进：
1.定义用户认证授权功能的接口，这里面包含一个各个子系统都需要的统一账户认证逻辑和一个待实现的各个子系统独特的认证逻辑（例如，作家管理系统还需要验证作家账号是否存在和作家状态是否正常）。
```
/**  
 * 策略模式实现用户认证授权功能  
 *  
 * @author xiongxiaoyang  
 * @date 2022/5/18  
 */public interface AuthStrategy {  
  
    /**  
     * 用户认证授权  
     *  
     * @param token      登录 token  
     * @param requestUri 请求的 URI  
     * @throws BusinessException 认证失败则抛出业务异常  
     */  
    void auth(String token, String requestUri) throws BusinessException;  
  
    /**  
     * 前台多系统单点登录统一账号认证授权（门户系统、作家系统以及后面会扩展的漫画系统和视频系统等）  
     *  
     * @param jwtUtils             jwt 工具  
     * @param userInfoCacheManager 用户缓存管理对象  
     * @param token                token 登录 token  
     * @return 用户ID  
     */    default Long authSSO(JwtUtils jwtUtils, UserInfoCacheManager userInfoCacheManager,  
        String token) {  
        if (!StringUtils.hasText(token)) {  
            // token 为空  
            throw new BusinessException(ErrorCodeEnum.USER_LOGIN_EXPIRED);  
        }  
        Long userId = jwtUtils.parseToken(token, SystemConfigConsts.NOVEL_FRONT_KEY);  
        if (Objects.isNull(userId)) {  
            // token 解析失败  
            throw new BusinessException(ErrorCodeEnum.USER_LOGIN_EXPIRED);  
        }  
        UserInfoDto userInfo = userInfoCacheManager.getUser(userId);  
        if (Objects.isNull(userInfo)) {  
            // 用户不存在  
            throw new BusinessException(ErrorCodeEnum.USER_ACCOUNT_NOT_EXIST);  
        }  
        // 设置 userId 到当前线程  
        UserHolder.setUserId(userId);  
        // 返回 userId        return userId;  
    }  
  
}
```
2.接着在该包下创建各个系统的认证授权策略类，实现上述的AuthStrategy接口：
```
/**
 * 前台门户系统 认证授权策略
 *
 * @author xiongxiaoyang
 * @date 2022/5/18
 */
@Component
@RequiredArgsConstructor
public class FrontAuthStrategy implements AuthStrategy {

    private final JwtUtils jwtUtils;

    private final UserInfoCacheManager userInfoCacheManager;

    @Override
    public void auth(String token, String requestUri) throws BusinessException {
        // 统一账号认证
        authSSO(jwtUtils, userInfoCacheManager, token);
    }

}

```

```
/**  
 * 作家后台管理系统 认证授权策略  
 *  
 * @author xiongxiaoyang  
 * @date 2022/5/18  
 */@Component  
@RequiredArgsConstructor  
public class AuthorAuthStrategy implements AuthStrategy {  
  
    private final JwtUtils jwtUtils;  
  
    private final UserInfoCacheManager userInfoCacheManager;  
  
    private final AuthorInfoCacheManager authorInfoCacheManager;  
  
    /**  
     * 不需要进行作家权限认证的 URI  
     */    private static final List<String> EXCLUDE_URI = List.of(  
        ApiRouterConsts.API_AUTHOR_URL_PREFIX + "/register",  
        ApiRouterConsts.API_AUTHOR_URL_PREFIX + "/status"  
    );  
  
    @Override  
    public void auth(String token, String requestUri) throws BusinessException {  
        // 统一账号认证  
        Long userId = authSSO(jwtUtils, userInfoCacheManager, token);  
        if (EXCLUDE_URI.contains(requestUri)) {  
            // 该请求不需要进行作家权限认证  
            return;  
        }  
        // 作家权限认证  
        AuthorInfoDto authorInfo = authorInfoCacheManager.getAuthor(userId);  
        if (Objects.isNull(authorInfo)) {  
            // 作家账号不存在，无权访问作家专区  
            throw new BusinessException(ErrorCodeEnum.USER_UN_AUTH);  
        }  
  
        // 设置作家ID到当前线程  
        UserHolder.setAuthorId(authorInfo.getId());  
    }  
      
}
```

```
/**  
 * 平台后台管理系统 认证授权策略  
 *  
 * @author xiongxiaoyang  
 * @date 2022/5/18  
 */@Component  
@RequiredArgsConstructor  
public class AdminAuthStrategy implements AuthStrategy {  
  
    @Override  
    public void auth(String token, String requestUri) throws BusinessException {  
        // TODO 平台后台 token 校验  
    }  
      
}
```
3.最后在拦截器中根据请求URI动态调用相应策略
```
/**  
 * 认证授权 拦截器：为了注入其它的 Spring beans，需要通过 @Component 注解将该拦截器注册到 Spring 上下文  
 *  
 * @author xiongxiaoyang  
 * @date 2022/5/18  
 */@Component  
@RequiredArgsConstructor  
public class AuthInterceptor implements HandlerInterceptor {  
  
    private final Map<String, AuthStrategy> authStrategy;  
  
    private final ObjectMapper objectMapper;  
  
    /**  
     * handle 执行前调用  
     */  
    @SuppressWarnings("NullableProblems")  
    @Override  
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,  
        Object handler) throws Exception {  
        // 获取登录 JWT        String token = request.getHeader(SystemConfigConsts.HTTP_AUTH_HEADER_NAME);  
  
        // 获取请求的 URI        String requestUri = request.getRequestURI();  
  
        // 根据请求的 URI 得到认证策略  
        String subUri = requestUri.substring(ApiRouterConsts.API_URL_PREFIX.length() + 1);  
        String systemName = subUri.substring(0, subUri.indexOf("/"));  
        String authStrategyName = String.format("%sAuthStrategy", systemName);  
  
        // 开始认证  
        try {  
            authStrategy.get(authStrategyName).auth(token, requestUri);  
            return HandlerInterceptor.super.preHandle(request, response, handler);  
        } catch (BusinessException exception) {  
            // 认证失败  
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());  
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);  
            response.getWriter().write(  
                objectMapper.writeValueAsString(RestResp.fail(exception.getErrorCodeEnum())));  
            return false;  
        }  
    }  
  
    /**  
     * handler 执行后调用，出现异常不调用  
     */  
    @SuppressWarnings("NullableProblems")  
    @Override  
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler,  
        ModelAndView modelAndView) throws Exception {  
        HandlerInterceptor.super.postHandle(request, response, handler, modelAndView);  
    }  
  
    /**  
     * DispatcherServlet 完全处理完请求后调用，出现异常照常调用  
     */  
    @SuppressWarnings("NullableProblems")  
    @Override  
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex)  
        throws Exception {  
        // 清理当前线程保存的用户数据  
        UserHolder.clear();  
        HandlerInterceptor.super.afterCompletion(request, response, handler, ex);  
    }  
  
}
```
上面的实现代码和介绍原理时给的EXAMPLE有个不同，就是没有Context类了，这里是把权限认证的实现类都装到一个Map里面。
```
private final Map<String, AuthStrategy> authStrategy;  
```
然后用这个map的方法获取具体的实现类然后执行对应的权限验证
```
authStrategy.get(authStrategyName).auth(token, requestUri);
```
这个Map里面的东西是自动注入的，就是通过下面这个注解实现的
```
@RequiredArgsConstructor  
```
它是Lombok库提供的一个注解，可以自动为类中所有带有final修饰符的字段生成一个构造函数。作用如下：
当你写下这段代码：
```
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {
    private final Map<String, AuthStrategy> authStrategy;
    private final ObjectMapper objectMapper;
}
```
Lombok在编译时会自动为你生成如下代码：
```
@Component
public class AuthInterceptor implements HandlerInterceptor {
    private final Map<String, AuthStrategy> authStrategy;
    private final ObjectMapper objectMapper;

    // 这是 @RequiredArgsConstructor 帮你写的
    public AuthInterceptor(Map<String, AuthStrategy> authStrategy, ObjectMapper objectMapper) {
        this.authStrategy = authStrategy;
        this.objectMapper = objectMapper;
    }
}
```
然后Spring会自动调用这个构造函数来注入依赖，不需要再写@Autowired
注入这个Map的时候，Spring会把AuthStrategy的所有实现类找出来装里面，并且用其名字作为Key
#### 集成Elasticsearch 8，实现搜索引擎动态切换
#### 使用RabbitMQ刷新 ES/Redis/Caffeine等小说副本数据
#### 使用XXL-JOB优化Elasticsearch数据同步任务
#### 使用Sentinel实现接口防刷和限流
##### 问题
novel作为一个小说网站，可能会遇到非法爬虫（例如盗版小说网站）来爬取我们的小说。防刷的目的是为了限制这些爬虫请求我们接口的频率，这种爬虫行为有时会高达每秒几百甚至上千次的访问，如果我们不做接口防刷限制的话，我们的系统很容易就会被爬虫干倒。
限流的目的是在流量高峰期间，根据我们系统的承受能力，限制同时请求的数量，保证多余请求会阻塞一段时间再处理，不简单粗暴的直接返回错误信息让客户端重试，同时又能起到流量削峰的作用。
##### 限流的其他实现方案
##### Sentinel介绍
是阿里巴巴开源的、面向云原生微服务的高可用流控防护组件，以流量为切入点，从流量控制、熔断降级、系统负载保护等多个维度保护服务的稳定性。
Sentinel有两个重要的概念：
资源：它可以是java应用程序中的任何内容，例如，由应用程序提供的服务，或由应用程序调用其它应用提供的服务，甚至可以是一段代码。只要是通过Sentinel API定义的代码，就是资源，就能被Sentinel保护起来。大部分情况下，可以使用方法签名，URL，甚至服务名称作为资源名来标示资源。
规则：是围绕资源的实时状态设定的规则，可以包括流量控制规则、熔断降级规则以及系统保护规则。所有规则可以动态实时调整。
![](Pasted%20image%2020251223213941.png)
##### 使用
1.引入相关依赖
```
<dependency>
    <groupId>com.alibaba.csp</groupId>
    <artifactId>sentinel-core</artifactId>
    <version>${sentinel.version}</version>
</dependency>
<dependency>
    <groupId>com.alibaba.csp</groupId>
    <artifactId>sentinel-parameter-flow-control</artifactId>
    <version>${sentinel.version}</version>
</dependency>
```
2.注册一个全局的拦截器拦截所有请求
```
// 流量限制拦截器
registry.addInterceptor(flowLimitInterceptor)
        .addPathPatterns("/**")
        .order(0);
```
补充拦截器链代码
```
/**  
 * Spring Web Mvc 相关配置不要加 @EnableWebMvc 注解，否则会导致 jackson 的全局配置失效。因为 @EnableWebMvc 注解会导致  
 * WebMvcAutoConfiguration 自动配置失效  
 *  
 * @author xiongxiaoyang  
 * @date 2022/5/18  
 */@Configuration  
@RequiredArgsConstructor  
public class WebConfig implements WebMvcConfigurer {  
  
    private final FlowLimitInterceptor flowLimitInterceptor;  
  
    private final AuthInterceptor authInterceptor;  
  
    private final FileInterceptor fileInterceptor;  
  
    private final TokenParseInterceptor tokenParseInterceptor;  
  
    @Override  
    public void addInterceptors(InterceptorRegistry registry) {  
  
        // 流量限制拦截器  
        registry.addInterceptor(flowLimitInterceptor)  
            .addPathPatterns("/**")  
            .order(0);  
  
        // 文件访问拦截  
        registry.addInterceptor(fileInterceptor)  
            .addPathPatterns(SystemConfigConsts.IMAGE_UPLOAD_DIRECTORY + "**")  
            .order(1);  
  
        // 权限认证拦截  
        registry.addInterceptor(authInterceptor)  
            // 拦截会员中心相关请求接口  
            .addPathPatterns(ApiRouterConsts.API_FRONT_USER_URL_PREFIX + "/**",  
                // 拦截作家后台相关请求接口  
                ApiRouterConsts.API_AUTHOR_URL_PREFIX + "/**",  
                // 拦截平台后台相关请求接口  
                ApiRouterConsts.API_ADMIN_URL_PREFIX + "/**")  
            // 放行登录注册相关请求接口  
            .excludePathPatterns(ApiRouterConsts.API_FRONT_USER_URL_PREFIX + "/register",  
                ApiRouterConsts.API_FRONT_USER_URL_PREFIX + "/login",  
                ApiRouterConsts.API_ADMIN_URL_PREFIX + "/login")  
            .order(2);  
  
        // Token 解析拦截器  
        registry.addInterceptor(tokenParseInterceptor)  
            // 拦截小说内容查询接口，需要解析 token 以判断该用户是否有权阅读该章节（付费章节是否已购买）  
            .addPathPatterns(ApiRouterConsts.API_FRONT_BOOK_URL_PREFIX + "/content/*")  
            .order(3);  
  
    }  
}
```
3.拦截器中定义资源和规则，资源在preHandle方法中定义，为所有请求的入口，接口限流规则和接口防刷规则通过static代码块在类加载时初始化：
![](Pasted%20image%2020251223220740.png)
```
/**  
 * 流量限制 拦截器：实现接口防刷和限流  
 *  
 * @author xiongxiaoyang  
 * @date 2022/6/1  
 */@Component  
@RequiredArgsConstructor  
@Slf4j  
public class FlowLimitInterceptor implements HandlerInterceptor {  
  
    private final ObjectMapper objectMapper;  
  
    /**  
     * novel 项目所有的资源  
     */ 
    private static final String NOVEL_RESOURCE = "novelResource";  
  
    static {  
        // 接口限流规则：所有的请求，限制每秒最多只能通过 2000 个，超出限制匀速排队  
        List<FlowRule> rules = new ArrayList<>();  
        FlowRule rule1 = new FlowRule();  
        rule1.setResource(NOVEL_RESOURCE);  
        rule1.setGrade(RuleConstant.FLOW_GRADE_QPS);  
        // Set limit QPS to 2000.  
        rule1.setCount(2000);  
        rule1.setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_RATE_LIMITER);  
        rules.add(rule1);  
        FlowRuleManager.loadRules(rules);  
  
        // 接口防刷规则 1：所有的请求，限制每个 IP 每秒最多只能通过 50 个，超出限制直接拒绝  
        ParamFlowRule rule2 = new ParamFlowRule(NOVEL_RESOURCE)  
            .setParamIdx(0)  
            .setCount(50);  
        // 接口防刷规则 2：所有的请求，限制每个 IP 每分钟最多只能通过 1000 个，超出限制直接拒绝  
        ParamFlowRule rule3 = new ParamFlowRule(NOVEL_RESOURCE)  
            .setParamIdx(0)  
            .setCount(1000)  
            .setDurationInSec(60);  
        ParamFlowRuleManager.loadRules(Arrays.asList(rule2, rule3));  
    }  
  
    @Override  
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,  
        Object handler) throws Exception {  
        String ip = IpUtils.getRealIp(request);  
        Entry entry = null;  
        try {  
            // 若需要配置例外项，则传入的参数只支持基本类型。  
            // EntryType 代表流量类型，其中系统规则只对 IN 类型的埋点生效  
            // count 大多数情况都填 1，代表统计为一次调用。  
            entry = SphU.entry(NOVEL_RESOURCE, EntryType.IN, 1, ip);  
            // Your logic here.  
            return HandlerInterceptor.super.preHandle(request, response, handler);  
        } catch (BlockException ex) {  
            // Handle request rejection.  
            log.info("IP:{}被限流了！", ip);  
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());  
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);  
            response.getWriter()  
                .write(objectMapper.writeValueAsString(RestResp.fail(ErrorCodeEnum.USER_REQ_MANY)));  
        } finally {  
            // 注意：exit 的时候也一定要带上对应的参数，否则可能会有统计错误。  
            if (entry != null) {  
                entry.exit(1, ip);  
            }  
        }  
        return false;  
    }  
  
}
```
返回值的解释
```
return HandlerInterceptor.super.preHandle(request, response, handler);
```
这行代码其实是调用HandlerInterceptor的preHandle方法，也就是
```
return true
```
为什么要加一个super呢，因为你的实现类中重写了HandlerInterceptor的preHandle，你想调用其原始的方法的时候，就得加个super，是一个规定的语法。
![](Pasted%20image%2020251223215822.png)
```
private static final String NOVEL_RESOURCE = "novelResource";  
```
这个就是资源名，限制哪些资源或者说这个资源名指代哪些资源跟这个变量没关系的，和前面拦截器设定的拦截范围有关 。

基础流量控制
```
FlowRule rule1 = new FlowRule();  
rule1.setResource(NOVEL_RESOURCE);  
rule1.setGrade(RuleConstant.FLOW_GRADE_QPS);  
// Set limit QPS to 2000.  
rule1.setCount(2000);  
rule1.setControlBehavior(RuleConstant.CONTROL_BEHAVIOR_RATE_LIMITER);
```
阈值：2000QPS
流控效果：匀速排队->如果瞬间来了 2100 个请求，多出的 100 个会排队等待，直到超时。

接口防刷规则 1：所有的请求，限制每个 IP 每秒最多只能通过 50 个，超出限制直接拒绝
```
ParamFlowRule rule2 = new ParamFlowRule(NOVEL_RESOURCE)  
    .setParamIdx(0)  
    .setCount(50);
```
.setParamIdx(0)针对entry中传入的第一个可变参数进行限流，这里是IP，还可以设置为设备device，前面三个是固定参数。
前两个窗口都是用的默认时长：1s

接口防刷规则 2：所有的请求，限制每个 IP 每分钟最多只能通过 1000 个，超出限制直接拒绝
```
ParamFlowRule rule3 = new ParamFlowRule(NOVEL_RESOURCE)  
    .setParamIdx(0)  
    .setCount(1000)  
    .setDurationInSec(60);
```
我们还可以通过Sentinel提供的注解支持模块来定义我们的资源，如下所示，helloWord方法就成了我们的一个资源：
```
@SentinelResource("HelloWorld")
public void helloWorld() {
    // 资源中的逻辑
    System.out.println("hello world");
}
```
注：注解支持模块需要配合Spring AOP或者AspectJ一起使用
这个注解是用来“精准打击”某个特定的Service方法、数据库查询或者第三方调用进行精细化流量控制。
它的规则可以写在（专门的）配置类里
```
@PostConstruct // 确保在 Spring Bean 初始化时加载规则
public void initFlowRules() {
    List<FlowRule> rules = new ArrayList<>();
    FlowRule rule = new FlowRule();
    
    // 这里的名字必须和注解里的 "HelloWorld" 完全一致
    rule.setResource("HelloWorld"); 
    
    // 设置限流阈值类型为 QPS
    rule.setGrade(RuleConstant.FLOW_GRADE_QPS);
    // 设置每秒最多通过 10 个请求
    rule.setCount(10);
    
    rules.add(rule);
    // 加载规则到内存中
    FlowRuleManager.loadRules(rules);
}
```
需要注意的是使用这个注解时，它默认不会处理限流后的报错，如果你每秒请求100次，而限流设为10，那么剩下的 90 次请求会直接抛出BlockException，导致程序报错，通常需要配合blockHandler使用：
```
@SentinelResource(value = "HelloWorld", blockHandler = "handleException")
public void helloWorld() {
    System.out.println("hello world");
}

// 注意：方法参数必须包含 BlockException，且返回类型要一致
public void handleException(BlockException ex) {
    System.out.println("系统繁忙，请稍后再试！");
}
```
![](Pasted%20image%2020251223221948.png)
结
#### 集成ShardingSphere-JDBC优化小说内容存储
##### 背景
传统的将数据集中存储至单一节点的解决方案，在性能、可用性和运维成本这三方面已经难于满足海量数据的场景。

从性能方面来说，由于关系型数据库大多采用 B+ 树类型的索引，在数据量超过阈值的情况下，索引深度的增加也将使得磁盘访问的 IO 次数增加，进而导致查询性能的下降； 同时，高并发访问请求也使得集中式数据库成为系统的最大瓶颈。

从可用性的方面来讲，服务化的无状态性，能够达到较小成本的随意扩容，这必然导致系统的最终压力都落在数据库之上。 而单一的数据节点，或者简单的主从架构，已经越来越难以承担。数据库的可用性，已成为整个系统的关键。

从运维成本方面考虑，当一个数据库实例中的数据达到阈值以上，对于 DBA 的运维压力就会增大。 数据备份和恢复的时间成本都将随着数据量的大小而愈发不可控。一般来讲，单一数据库实例的数据的阈值在 1TB 之内，是比较合理的范围。

数据分片指按照某个维度将存放在单一数据库中的数据分散地存放至多个数据库或表中以达到提升性能瓶颈以及可用性的效果。通过分库和分表进行数据的拆分来使得各个表的数据量保持在阈值以下，以及对流量进行疏导应对高访问量，是应对高并发和海量数据系统的有效手段。分库和分表均可以有效的避免由数据量超过可承受阈值而产生的查询瓶颈。

小说数据有着内容多、增长速度快的特点，一本主流的完结小说一般所需存储空间大概在 5MB 以上。一个主流的小说网站在发展中后期，数据量是远远超过单一数据库实例的阈值的，所以我们对小说内容进行分库分表存储是非常有必要的。在发展初期，我们的数据量还不是很大，可以先将小说内容分表存储以减轻数据库单表压力以及为后期的数据库分库做准备。等数据量即将超过阈值时，再迁移到不同的数据库实例上。

注：数据分片分为按照业务将表进行归类，分布到不同的数据库中的垂直分片和通过某个字段（或某几个字段）按照某种规则将数据分散至多个库或表中的水平分片。
垂直分片：把表的一些列（字段）分离出去
水平分片：把表的一些数据行分离出去
这里拆用的是水平分片，因为对于小说系统来说，最头疼的不是字段多，而是数据行数多和所需存储体积大（一本小说就可能有很多章节，每章内容又是几千字的文本），单表很快就会突破几百GB甚至TB级别。
##### Apache ShardingSphere介绍
Apache ShardingSphere 产品定位为 Database Plus，它关注如何充分合理地利用数据库的计算和存储能力，而并非实现一个全新的数据库。ShardingSphere 站在数据库的上层视角，关注他们之间的协作多于数据库自身，由 JDBC、Proxy 和 Sidecar（规划中）这 3 款既能够独立部署，又支持混合部署配合使用的产品组成。 它们均提供标准化的基于数据库作为存储节点的增量功能，可适用于如 Java 同构、异构语言、云原生等各种多样化的应用场景。

ShardingSphere-JDBC 定位为轻量级 Java 框架，在 Java 的 JDBC 层提供额外服务。 它使用客户端直连数据库，以 jar 包形式提供服务，无需额外部署和依赖，可理解为增强版的 JDBC 驱动，完全兼容 JDBC 和各种 ORM 框架。

连接、增量 和 可插拔 是 Apache ShardingSphere 的核心概念：
- 连接：通过对数据库协议、SQL 方言以及数据库存储的灵活适配，快速的连接应用与多模式的异构数据库；
- 增量：获取数据库的访问流量，并提供流量重定向（数据分片、读写分离、影子库）、流量变形（数据加密、数据脱敏）、流量鉴权（安全、审计、权限）、流量治理（熔断、限流）以及流量分析（服务质量分析、可观察性）等透明化增量功能；
- 可插拔：项目采用微内核 + 三层可插拔模型，使内核、功能组件以及生态对接完全能够灵活的方式进行插拔式扩展，开发者能够像使用积木一样定制属于自己的独特系统。
Apache ShardingSphere 的数据分片模块透明化了分库分表所带来的影响，让使用方尽量像使用一个数据库一样使用水平分片之后的数据库集群。
##### 集成步骤
1.MySQL执行以下数据迁移脚本
脚本主要是把原来大表的数据拆分到10个小表中（分表），分为两个步骤：
	1.建表：建立book_chapter1 -  book_chapter10;book_content1 - book_content10
	2.迁移：章节表按book_id % 10分片、内容表按chapter_id % 10分片（路由算法），然后使用游标遍历原大表，逐条计算路由（根据特定的规则，决定一条数据该去往哪个目的地）并插入到对应的小表中。
主要涉及到的两张表结构
章节表
![](Pasted%20image%2020251225100147.png)
内容表
![](Pasted%20image%2020251225100206.png)
```
DROP PROCEDURE
IF
	EXISTS createBookChapterTable;
-- 创建小说章节表的存储过程
CREATE PROCEDURE createBookChapterTable ( ) BEGIN
	-- 定义变量
	DECLARE
		i INT DEFAULT 0;
	DECLARE
		tableName CHAR ( 13 ) DEFAULT NULL;
	WHILE
			i < 10 DO
			
			SET tableName = concat( 'book_chapter', i );
		
			SET @stmt = concat( 'create table ', tableName, '(
				`id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				`book_id` bigint(20) unsigned NOT NULL COMMENT \'小说ID\',
				`chapter_num` smallint(5) unsigned NOT NULL COMMENT \'章节号\',
				`chapter_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT \'章节名\',
				`word_count` int(10) unsigned NOT NULL COMMENT \'章节字数\',
				`is_vip` tinyint(3) unsigned NOT NULL DEFAULT \'0\' COMMENT \'是否收费;1-收费 0-免费\',
				`create_time` datetime DEFAULT NULL,
				`update_time` datetime DEFAULT NULL,
				PRIMARY KEY (`id`) USING BTREE,
				UNIQUE KEY `uk_bookId_chapterNum` (`book_id`,`chapter_num`) USING BTREE,
				UNIQUE KEY `pk_id` (`id`) USING BTREE,
				KEY `idx_bookId` (`book_id`) USING BTREE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT=\'小说章节\'' );
			PREPARE stmt 
			FROM
				@stmt;
			EXECUTE stmt;
			DEALLOCATE PREPARE stmt;
			
			SET i = i + 1;
		
	END WHILE;
END;
CALL createBookChapterTable ( );

DROP PROCEDURE
IF
	EXISTS createBookContentTable;
-- 创建小说内容表的存储过程
CREATE PROCEDURE createBookContentTable ( ) BEGIN
	-- 定义变量
	DECLARE
		i INT DEFAULT 0;
	DECLARE
		tableName CHAR ( 13 ) DEFAULT NULL;
	WHILE
			i < 10 DO
			
			SET tableName = concat( 'book_content', i );
		
			SET @stmt = concat( 'create table ', tableName, '(
				`id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT \'主键\',
				`chapter_id` bigint(20) unsigned NOT NULL COMMENT \'章节ID\',
				`content` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT \'小说章节内容\',
				`create_time` datetime DEFAULT NULL,
				`update_time` datetime DEFAULT NULL,
				PRIMARY KEY (`id`) USING BTREE,
				UNIQUE KEY `uk_chapterId` (`chapter_id`) USING BTREE,
				UNIQUE KEY `pk_id` (`id`) USING BTREE
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT=\'小说内容\'' );
			PREPARE stmt 
			FROM
				@stmt;
			EXECUTE stmt;
			DEALLOCATE PREPARE stmt;
			
			SET i = i + 1;
		
	END WHILE;
END;
CALL createBookContentTable ( );

DROP PROCEDURE
IF
	EXISTS copyBookChapterData;
-- 迁移小说章节数据的存储过程
CREATE PROCEDURE copyBookChapterData ( ) BEGIN
	-- 定义变量
	DECLARE
		s INT DEFAULT 0;
	DECLARE
		chapterId BIGINT;
	DECLARE
		bookId BIGINT;
	DECLARE
		chapterNum SMALLINT;
	DECLARE
		chapterName VARCHAR ( 100 );
	DECLARE
		wordCount INT DEFAULT 0;
	DECLARE
		isVip TINYINT ( 64 ) DEFAULT 0;
	DECLARE
		createTime datetime DEFAULT NULL;
	DECLARE
		updateTime datetime DEFAULT NULL;
	DECLARE
		tableNumber INT DEFAULT 0;
	DECLARE
		tableName CHAR ( 13 ) DEFAULT NULL;
	-- 定义游标
	DECLARE
		report CURSOR FOR SELECT
		id,
		book_id,
		chapter_num,
		chapter_name,
		word_count,
		is_vip,
		create_time,
		update_time 
	FROM
		book_chapter;
	-- 声明当游标遍历完后将标志变量置成某个值
	DECLARE
		CONTINUE HANDLER FOR NOT FOUND 
		SET s = 1;
	-- 打开游标
	OPEN report;
	-- 将游标中的值赋值给变量，注意：变量名不要和返回的列名同名，变量顺序要和sql结果列的顺序一致
	FETCH report INTO chapterId,
	bookId,
	chapterNum,
	chapterName,
	wordCount,
	isVip,
	createTime,
	updateTime;
	-- 循环遍历
	WHILE
			s <> 1 DO
			-- 执行业务逻辑
			
			SET tableNumber = bookId % 10;
		
			SET tableName = concat( 'book_chapter', tableNumber );
			
			SET @stmt = concat(
				'insert into ',
				tableName,
				'(`id`, `book_id`, `chapter_num`, `chapter_name`, `word_count`, `is_vip`, `create_time`, `update_time`) VALUES (',
				chapterId,
				', ',
				bookId,
				', ',
				chapterNum,
				', \'',
				chapterName,
				'\', ',
				wordCount,
				', ',
				isVip,
				', \'',
				createTime,
				'\', \'',
				updateTime,
				'\')' 
			);
			PREPARE stmt 
			FROM
				@stmt;
			EXECUTE stmt;
			DEALLOCATE PREPARE stmt;
			FETCH report INTO chapterId,
			bookId,
			chapterNum,
			chapterName,
			wordCount,
			isVip,
			createTime,
			updateTime;
		
	END WHILE;
	-- 关闭游标
	CLOSE report;
END;
CALL copyBookChapterData ( );

DROP PROCEDURE
IF
	EXISTS copyBookContentData;
-- 迁移小说内容数据的存储过程
CREATE PROCEDURE copyBookContentData ( ) BEGIN
	-- 定义变量
	DECLARE
		s INT DEFAULT 0;
	DECLARE
		contentId BIGINT;
	DECLARE
		chapterId BIGINT;
	DECLARE
		bookContent MEDIUMTEXT;
	DECLARE
		createTime datetime DEFAULT NULL;
	DECLARE
		updateTime datetime DEFAULT NULL;
	DECLARE
		tableNumber INT DEFAULT 0;
	DECLARE
		tableName CHAR ( 13 ) DEFAULT NULL;
	-- 定义游标
	DECLARE
		report CURSOR FOR SELECT
		id,
		chapter_id,
		content,
		create_time,
		update_time 
	FROM
		book_content;
	-- 声明当游标遍历完后将标志变量置成某个值
	DECLARE
		CONTINUE HANDLER FOR NOT FOUND 
		SET s = 1;
	-- 打开游标
	OPEN report;
	-- 将游标中的值赋值给变量，注意：变量名不要和返回的列名同名，变量顺序要和sql结果列的顺序一致
	FETCH report INTO contentId,
	chapterId,
	bookContent,
	createTime,
	updateTime;
	-- 循环遍历
	WHILE
			s <> 1 DO
			-- 执行业务逻辑
			
			SET tableNumber = chapterId % 10;
		
			SET tableName = concat( 'book_content', tableNumber );
			
			SET bookContent = REPLACE ( bookContent, '\'', "\\'" );
			
			SET @stmt = concat(
				'insert into ',
				tableName,
				'(`id`, `chapter_id`, `content`) VALUES (',
				contentId,
				', ',
				chapterId,
				',\'',
				bookContent,
				'\')' 
			);
			PREPARE stmt 
			FROM
				@stmt;
			EXECUTE stmt;
			DEALLOCATE PREPARE stmt;
			FETCH report INTO contentId,
			chapterId,
			bookContent,
			createTime,
			updateTime;
		
	END WHILE;
	-- 关闭游标
	CLOSE report;
END;
CALL copyBookContentData ( );
```
2.引入ShardingSphere-JDBC官方提供的Spring Boot Starter 依赖
```
<dependency>
    <groupId>org.apache.shardingsphere</groupId>
    <artifactId>shardingsphere-jdbc-core-spring-boot-starter</artifactId>
    <version>5.1.1</version>
</dependency>
```
3.application.yml中添加ShardingSphere-JDBC的配置
```
spring:
  shardingsphere:
    # 是否开启 shardingsphere
    enabled: false
    props:
      # 是否在日志中打印 SQL
      sql-show: true
    # 模式配置
    mode:
      # 单机模式
      type: Standalone
      repository:
        # 文件持久化
        type: File
        props:
          # 元数据存储路径
          path: .shardingsphere
      # 使用本地配置覆盖持久化配置
      overwrite: true
    # 数据源配置
    datasource:
      names: ds_0
      ds_0:
        type: com.zaxxer.hikari.HikariDataSource
        driverClassName: com.mysql.cj.jdbc.Driver
        jdbcUrl: jdbc:mysql://localhost:3306/novel_test?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai
        username: root
        password: test123456
    # 规则配置
    rules:
      # 数据分片
      sharding:
        tables:
          # book_content 表
          book_content:
            # 数据节点
            actual-data-nodes: ds_$->{0}.book_content$->{0..9}
            # 分表策略
            table-strategy:
              standard:
                # 分片列名称
                sharding-column: chapter_id
                # 分片算法名称
                sharding-algorithm-name: bookContentSharding
        sharding-algorithms:
          bookContentSharding:
            # 行表达式分片算法，使用 Groovy 的表达式，提供对 SQL 语句中的 = 和 IN 的分片操作支持
            type: INLINE
            props:
              # 分片算法的行表达式
              algorithm-expression: book_content$->{chapter_id % 10}

```
配置说明
```
# 标准分片表配置
spring.shardingsphere.rules.sharding.tables.<table-name>.actual-data-nodes= # 由数据源名 + 表名组成，以小数点分隔。多个表以逗号分隔，支持 inline 表达式。缺省表示使用已知数据源与逻辑表名称生成数据节点，用于广播表（即每个库中都需要一个同样的表用于关联查询，多为字典表）或只分库不分表且所有库的表结构完全一致的情况

# 分库策略，缺省表示使用默认分库策略，以下的分片策略只能选其一

# 用于单分片键的标准分片场景
spring.shardingsphere.rules.sharding.tables.<table-name>.database-strategy.standard.sharding-column= # 分片列名称
spring.shardingsphere.rules.sharding.tables.<table-name>.database-strategy.standard.sharding-algorithm-name= # 分片算法名称

# 用于多分片键的复合分片场景
spring.shardingsphere.rules.sharding.tables.<table-name>.database-strategy.complex.sharding-columns= # 分片列名称，多个列以逗号分隔
spring.shardingsphere.rules.sharding.tables.<table-name>.database-strategy.complex.sharding-algorithm-name= # 分片算法名称

# 用于 Hint 的分片策略
spring.shardingsphere.rules.sharding.tables.<table-name>.database-strategy.hint.sharding-algorithm-name= # 分片算法名称

# 分表策略，同分库策略
spring.shardingsphere.rules.sharding.tables.<table-name>.table-strategy.xxx= # 省略

# 自动分片表配置
spring.shardingsphere.rules.sharding.auto-tables.<auto-table-name>.actual-data-sources= # 数据源名

spring.shardingsphere.rules.sharding.auto-tables.<auto-table-name>.sharding-strategy.standard.sharding-column= # 分片列名称
spring.shardingsphere.rules.sharding.auto-tables.<auto-table-name>.sharding-strategy.standard.sharding-algorithm-name= # 自动分片算法名称

# 分布式序列策略配置
spring.shardingsphere.rules.sharding.tables.<table-name>.key-generate-strategy.column= # 分布式序列列名称
spring.shardingsphere.rules.sharding.tables.<table-name>.key-generate-strategy.key-generator-name= # 分布式序列算法名称

spring.shardingsphere.rules.sharding.binding-tables[0]= # 绑定表规则列表
spring.shardingsphere.rules.sharding.binding-tables[1]= # 绑定表规则列表
spring.shardingsphere.rules.sharding.binding-tables[x]= # 绑定表规则列表

spring.shardingsphere.rules.sharding.broadcast-tables[0]= # 广播表规则列表
spring.shardingsphere.rules.sharding.broadcast-tables[1]= # 广播表规则列表
spring.shardingsphere.rules.sharding.broadcast-tables[x]= # 广播表规则列表

spring.shardingsphere.sharding.default-database-strategy.xxx= # 默认数据库分片策略
spring.shardingsphere.sharding.default-table-strategy.xxx= # 默认表分片策略
spring.shardingsphere.sharding.default-key-generate-strategy.xxx= # 默认分布式序列策略
spring.shardingsphere.sharding.default-sharding-column= # 默认分片列名称

# 分片算法配置
spring.shardingsphere.rules.sharding.sharding-algorithms.<sharding-algorithm-name>.type= # 分片算法类型
spring.shardingsphere.rules.sharding.sharding-algorithms.<sharding-algorithm-name>.props.xxx= # 分片算法属性配置

# 分布式序列算法配置
spring.shardingsphere.rules.sharding.key-generators.<key-generate-algorithm-name>.type= # 分布式序列算法类型
spring.shardingsphere.rules.sharding.key-generators.<key-generate-algorithm-name>.props.xxx= # 分布式序列算法属性配置
```
注解版配置
```
spring:
  shardingsphere:
    # [开关] 是否启用 ShardingSphere。集成测试时必须设为 true，否则 SQL 不会被拦截处理
    enabled: true 
    
    props:
      # [日志] 是否在控制台打印最终执行的真实 SQL。开发环境下强烈建议开启，方便观察路由是否正确
      sql-show: true
    
    # [模式配置] 定义元数据的管理方式
    mode:
      # Standalone: 单机模式，元数据（表结构等）存储在本地；若是生产集群通常使用 Cluster(Zookeeper/Etcd)
      type: Standalone
      repository:
        # File: 将元数据持久化到本地文件系统
        type: File
        props:
          # 元数据存储的具体路径，项目启动后会自动生成该文件夹
          path: .shardingsphere
      # 当本地配置文件发生修改时，是否覆盖持久化仓库中的配置
      overwrite: true

    # [数据源配置] 定义真实的物理数据库连接
    datasource:
      # 数据源名称列表，如果有多个库（分库），则以逗号分隔，如 ds_0, ds_1
      names: ds_0
      ds_0:
        # 使用 HikariCP 连接池（Spring Boot 默认推荐）
        type: com.zaxxer.hikari.HikariDataSource
        driverClassName: com.mysql.cj.jdbc.Driver
        jdbcUrl: jdbc:mysql://localhost:3306/novel_test?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai
        username: root
        password: test123456

    # [分片规则配置] 核心路由逻辑定义
    rules:
      sharding:
        # 针对具体逻辑表的规则配置
        tables:
          # book_content 是你在代码里操作的“逻辑表名”
          book_content:
            # [数据节点] 定义逻辑表对应的真实物理存储位置
            # ds_0: 上面定义的数据源别名
            # book_content$->{0..9}: 展开为物理表 book_content0 到 book_content9
            actual-data-nodes: ds_0.book_content$->{0..9}
            
            # [分表策略] 决定数据如何分布在 10 张物理表中
            table-strategy:
              # standard: 标准分片策略，适用于单分片键（如 chapter_id）
              standard:
                # 触发分片的列名，SQL 的 WHERE 条件中必须包含此列才能触发精准路由
                sharding-column: chapter_id
                # 关联下方 sharding-algorithms 块中定义的算法名称
                sharding-algorithm-name: bookContentSharding

        # [分片算法具体实现]
        sharding-algorithms:
          # 算法标识，需与上面的 sharding-algorithm-name 对应
          bookContentSharding:
            # INLINE: 行表达式分片算法。基于 Groovy 表达式，配置简单，性能极高
            type: INLINE
            props:
              # [核心路由逻辑] 
              # chapter_id % 10 计算出 0-9 的余数
              # 最终拼接成真实的物理表名，如 book_content3
              algorithm-expression: book_content$->{chapter_id % 10}
```
目前的配置中只有分表的内容，后面如果一个服务器扛不住了就开始分库。下面是分库的步骤（Gemini生成的）
1.创建新数据库ds_1
让ds_0存储表0、2、4、6、8;让ds_1存储表1、3、5、7、9
在ds_1上创建表1、3、5、7、9，然后把ds_0中的对应内容复制过来就行，复制完了之后ds_0中的奇数表就可以删了。
2.修改ShardingSphere配置文件
```
spring:
  shardingsphere:
    datasource:
      # 1. 声明两个数据源名称
      names: ds_0, ds_1
      ds_0:
        # 原有的 novel_test 库配置...
        jdbcUrl: jdbc:mysql://localhost:3306/novel_test_0?...
      ds_1:
        # 新增的 novel_test_1 库配置...
        jdbcUrl: jdbc:mysql://localhost:3306/novel_test_1?...

    rules:
      sharding:
        tables:
          book_content:
            # 2. 修改数据节点：ds_$->{0..1} 代表数据分布在两个库中
            actual-data-nodes: ds_$->{0..1}.book_content$->{0..9}
            
            # 3. 【新增】分库策略：决定数据去 ds_0 还是 ds_1
            database-strategy:
              standard:
                sharding-column: chapter_id
                sharding-algorithm-name: dbShardingAlgorithm
            
            # 4. 保留原有的分表策略
            table-strategy:
              standard:
                sharding-column: chapter_id
                sharding-algorithm-name: tableShardingAlgorithm

        sharding-algorithms:
          # 分库算法：chapter_id % 2
          dbShardingAlgorithm:
            type: INLINE
            props:
              algorithm-expression: ds_$->{chapter_id % 2}
          # 分表算法：chapter_id % 10 (保持不变)
          tableShardingAlgorithm:
            type: INLINE
            props:
              algorithm-expression: book_content$->{chapter_id % 10}
```
之后的计算路由过程，以chapter_id = 13为例
执行
```
SELECT * FROM book_content WHERE chapter_id = 13
```
第一步：13 % 2 = 1    路由到ds_1
第二步：13 % 10 = 3  路由到book_content3
最终执行：ShardingSphere会在物理连接ds_1上执行这个SELECT语句
#### 接口开发
##### 首页小说推荐查询接口开发
首页是小说门户的入口，承载着系统很大一部分流量，并且内容不需要实时更新。所以首页相关内容的查询最好都做缓存处理。
下面是这个接口的主要代码，主要干了这些事。
1.去home_book表中查询数据，这个表中存储了要推荐的书的ID和其类型（要显示在哪个模块）
![](Pasted%20image%2020251225203915.png)2.把其中的book_id信息提取一下，封装成一个数组
3.根据id数组去表book_info批量的查一下对应的小说详情
4.然后封装一下数据返回
```
/**  
 * 首页推荐小说 缓存管理类  
 *  
 * @author xiongxiaoyang  
 * @date 2022/5/12  
 */@Component  
@RequiredArgsConstructor  
public class HomeBookCacheManager {  
  
    private final HomeBookMapper homeBookMapper;  
  
    private final BookInfoMapper bookInfoMapper;  
  
    /**  
     * 查询首页小说推荐，并放入缓存中  
     */  
    @Cacheable(cacheManager = CacheConsts.CAFFEINE_CACHE_MANAGER,  
        value = CacheConsts.HOME_BOOK_CACHE_NAME)  
    public List<HomeBookRespDto> listHomeBooks() {  
        // 从首页小说推荐表中查询出需要推荐的小说  
        QueryWrapper<HomeBook> queryWrapper = new QueryWrapper<>();  
        queryWrapper.orderByAsc(DatabaseConsts.CommonColumnEnum.SORT.getName());  
        List<HomeBook> homeBooks = homeBookMapper.selectList(queryWrapper);  
  
        // 获取推荐小说ID列表  
        if (!CollectionUtils.isEmpty(homeBooks)) {  
            List<Long> bookIds = homeBooks.stream()  
                .map(HomeBook::getBookId)  
                .toList();  
  
            // 根据小说ID列表查询相关的小说信息列表  
            QueryWrapper<BookInfo> bookInfoQueryWrapper = new QueryWrapper<>();  
            bookInfoQueryWrapper.in(DatabaseConsts.CommonColumnEnum.ID.getName(), bookIds);  
            List<BookInfo> bookInfos = bookInfoMapper.selectList(bookInfoQueryWrapper);  
  
            // 组装 HomeBookRespDto 列表数据并返回  
            if (!CollectionUtils.isEmpty(bookInfos)) {  
                Map<Long, BookInfo> bookInfoMap = bookInfos.stream()  
                    .collect(Collectors.toMap(BookInfo::getId, Function.identity()));  
                return homeBooks.stream().map(v -> {  
                    BookInfo bookInfo = bookInfoMap.get(v.getBookId());  
                    HomeBookRespDto bookRespDto = new HomeBookRespDto();  
                    bookRespDto.setType(v.getType());  
                    bookRespDto.setBookId(v.getBookId());  
                    bookRespDto.setBookName(bookInfo.getBookName());  
                    bookRespDto.setPicUrl(bookInfo.getPicUrl());  
                    bookRespDto.setAuthorName(bookInfo.getAuthorName());  
                    bookRespDto.setBookDesc(bookInfo.getBookDesc());  
                    return bookRespDto;  
                }).toList();  
  
            }  
  
        }  
  
        return Collections.emptyList();  
    }  
  
}
```
部分代码解释
```
@Cacheable(cacheManager = CacheConsts.CAFFEINE_CACHE_MANAGER,  
    value = CacheConsts.HOME_BOOK_CACHE_NAME)
```
加了这个注解后，当调用这个方法时，Spring会先去对应缓存中查找，如果缓存命中了，直接返回缓存数据，方法体内的代码不再执行；如果缓存没有，则执行方法体，并将结果存入缓存。
CacheManager配置
```
/**  
 * Caffeine 缓存管理器  
 */  
@Bean  
@Primary  
public CacheManager caffeineCacheManager() {  
    SimpleCacheManager cacheManager = new SimpleCacheManager();  
  
    List<CaffeineCache> caches = new ArrayList<>(CacheConsts.CacheEnum.values().length);  
    // 类型推断 var 非常适合 for 循环，JDK 10 引入，JDK 11 改进  
    for (var c : CacheConsts.CacheEnum.values()) {  
        if (c.isLocal()) {  
            Caffeine<Object, Object> caffeine = Caffeine.newBuilder().recordStats()  
                .maximumSize(c.getMaxSize());  
            if (c.getTtl() > 0) {  
                caffeine.expireAfterWrite(Duration.ofSeconds(c.getTtl()));  
            }  
            caches.add(new CaffeineCache(c.getName(), caffeine.build()));  
        }  
    }  
  
    cacheManager.setCaches(caches);  
    return cacheManager;  
}
```
部分代码解释
```
@Primary 
```
如果系统中有多个缓存管理器（Redis、Caffeine），优先使用这个。
CacheEnum是一个枚举类，内容如下。枚举类中的每个类别就像一个对象，有自己的属性和方法。
```
public enum CacheEnum {  
  
    HOME_BOOK_CACHE(0, HOME_BOOK_CACHE_NAME, 60 * 60 * 24, 1),  
  
    LATEST_NEWS_CACHE(0, LATEST_NEWS_CACHE_NAME, 60 * 10, 1),  
  
    BOOK_VISIT_RANK_CACHE(2, BOOK_VISIT_RANK_CACHE_NAME, 60 * 60 * 6, 1),  
  
    BOOK_NEWEST_RANK_CACHE(0, BOOK_NEWEST_RANK_CACHE_NAME, 60 * 30, 1),  
  
    BOOK_UPDATE_RANK_CACHE(0, BOOK_UPDATE_RANK_CACHE_NAME, 60, 1),  
  
    HOME_FRIEND_LINK_CACHE(2, HOME_FRIEND_LINK_CACHE_NAME, 0, 1),  
  
    BOOK_CATEGORY_LIST_CACHE(0, BOOK_CATEGORY_LIST_CACHE_NAME, 0, 2),  
  
    BOOK_INFO_CACHE(0, BOOK_INFO_CACHE_NAME, 60 * 60 * 18, 500),  
  
    BOOK_CHAPTER_CACHE(0, BOOK_CHAPTER_CACHE_NAME, 60 * 60 * 6, 5000),  
  
    BOOK_CONTENT_CACHE(2, BOOK_CONTENT_CACHE_NAME, 60 * 60 * 12, 3000),  
  
    LAST_UPDATE_BOOK_ID_LIST_CACHE(0, LAST_UPDATE_BOOK_ID_LIST_CACHE_NAME, 60 * 60, 10),  
  
    USER_INFO_CACHE(2, USER_INFO_CACHE_NAME, 60 * 60 * 24, 10000),  
  
    AUTHOR_INFO_CACHE(2, AUTHOR_INFO_CACHE_NAME, 60 * 60 * 48, 1000);  
  
    /**  
     * 缓存类型 0-本地 1-本地和远程 2-远程  
     */  
    private int type;  
    /**  
     * 缓存的名字  
     */  
    private String name;  
    /**  
     * 失效时间（秒） 0-永不失效  
     */  
    private int ttl;  
    /**  
     * 最大容量  
     */  
    private int maxSize;  
  
    CacheEnum(int type, String name, int ttl, int maxSize) {  
        this.type = type;  
        this.name = name;  
        this.ttl = ttl;  
        this.maxSize = maxSize;  
    }  
  
    public boolean isLocal() {  
        return type <= 1;  
    }  
  
    public boolean isRemote() {  
        return type >= 1;  
    }  
  
    public String getName() {  
        return name;  
    }  
  
    public int getTtl() {  
        return ttl;  
    }  
  
    public int getMaxSize() {  
        return maxSize;  
    }  
  
}
```
这个枚举类实际上是一份本地/远程缓存的中央配置表，放了各个缓存的一些设置（类型、命名、缓存过期时间、容量上限）。这时候我们再来看下面这段代码就会清晰一些。
```
for (var c : CacheConsts.CacheEnum.values()) {  
    if (c.isLocal()) {  
        Caffeine<Object, Object> caffeine = Caffeine.newBuilder().recordStats()  
            .maximumSize(c.getMaxSize());  
        if (c.getTtl() > 0) {  
            caffeine.expireAfterWrite(Duration.ofSeconds(c.getTtl()));  
        }  
        caches.add(new CaffeineCache(c.getName(), caffeine.build()));  
    }  
}
```
if条件语句筛选出了本地缓存，然后开启监控统计，并根据枚举类中的值设置名称、容量上限和过期时间。
```
QueryWrapper<HomeBook> queryWrapper = new QueryWrapper<>();  
queryWrapper.orderByAsc(DatabaseConsts.CommonColumnEnum.SORT.getName());
List<HomeBook> homeBooks = homeBookMapper.selectList(queryWrapper);
```
QueryWrapper是MyBatis-Plus中的一个“查询包装器”对象，是用来生成SQL查询语句的
```
DatabaseConsts.CommonColumnEnum.SORT.getName()
```
这个就是"sort"字符
所以这段大概可以理解为
1.创建一个查询语句 
2.设置了查询语句中的升序排序，按sort字段 
3.执行查询语句
生成的SQL如下
```
SELECT * FROM home_book ORDER BY sort ASC
```
##### 登录注册相关接口开发
###### 获取图片验证码接口开发
注册的时候需要用户输入图形验证码来防止用户利用机器人自动注册。该图形验证码由服务端生成，当用户申请注册时必须带上验证码，由服务端来校验验证码的有效性，只有验证码匹配才能允许用户注册。
1.图形验证码属于一种图片资源，所以我们首先需要在 controller、service、service.impl 包下创建资源（Resource，处理图片/视频/文档等）模块的 API 控制器 Controller、业务服务类 Service 以及服务实现类 ServiceImpl。
2.接着我们需要创建图形验证码工具类来生成随机校验码和对应的 Base64 编码后的图片（Base64编码后的字符串前端可以直接用过\<img>标签展示图片，而不需要额外的图片资源路径）
```
/**  
 * 图片验证码工具类  
 *  
 * @author xiongxiaoyang  
 * @date 2022/5/17  
 */@UtilityClass  
public class ImgVerifyCodeUtils {  
  
    /**  
     * 随机产生只有数字的字符串  
     */  
    private final String randNumber = "0123456789";  
  
    /**  
     * 图片宽  
     */  
    private final int width = 100;  
  
    /**  
     * 图片高  
     */  
    private final int height = 38;  
  
    private final Random random = new Random();  
  
    /**  
     * 获得字体  
     */  
    private Font getFont() {  
        return new Font("Fixed", Font.PLAIN, 23);  
    }  
  
  
    /**  
     * 生成校验码图片  
     */  
    public String genVerifyCodeImg(String verifyCode) throws IOException {  
        // BufferedImage类是具有缓冲区的Image类,Image类是用于描述图像信息的类  
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_BGR);  
        // 产生Image对象的Graphics对象,改对象可以在图像上进行各种绘制操作  
        Graphics g = image.getGraphics();  
        //图片大小  
        g.fillRect(0, 0, width, height);  
        //字体大小  
        //字体颜色  
        g.setColor(new Color(204, 204, 204));  
        // 绘制干扰线  
        // 干扰线数量  
        int lineSize = 40;  
        for (int i = 0; i <= lineSize; i++) {  
            drawLine(g);  
        }  
        // 绘制随机字符  
        drawString(g, verifyCode);  
        g.dispose();  
        //将图片转换成Base64字符串  
        ByteArrayOutputStream stream = new ByteArrayOutputStream();  
        ImageIO.write(image, "JPEG", stream);  
        return Base64.getEncoder().encodeToString(stream.toByteArray());  
    }  
  
    /**  
     * 绘制字符串  
     */  
    private void drawString(Graphics g, String verifyCode) {  
        for (int i = 1; i <= verifyCode.length(); i++) {  
            g.setFont(getFont());  
            g.setColor(new Color(random.nextInt(101), random.nextInt(111), random  
                .nextInt(121)));  
            g.translate(random.nextInt(3), random.nextInt(3));  
            g.drawString(String.valueOf(verifyCode.charAt(i - 1)), 13 * i, 23);  
        }  
    }  
  
    /**  
     * 绘制干扰线  
     */  
    private void drawLine(Graphics g) {  
        int x = random.nextInt(width);  
        int y = random.nextInt(height);  
        int xl = random.nextInt(13);  
        int yl = random.nextInt(15);  
        g.drawLine(x, y, x + xl, y + yl);  
    }  
  
    /**  
     * 获取随机的校验码  
     */  
    public String getRandomVerifyCode(int num) {  
        int randNumberSize = randNumber.length();  
        StringBuilder verifyCode = new StringBuilder();  
        for (int i = 0; i < num; i++) {  
            String rand = String.valueOf(randNumber.charAt(random.nextInt(randNumberSize)));  
            verifyCode.append(rand);  
        }  
        return verifyCode.toString();  
    }  
  
}
```
3.然后，我们创建验证码管理类，用于生成、校验和删除验证码（不限于图形验证码）：
生成验证码：生成4位随机数->生成对应图片->Base64编码后返回给前端，把生成的验证码存入Redis中（以session id来标识），后面用来验证
```
/**  
 * 验证码 管理类  
 *  
 * @author xiongxiaoyang  
 * @date 2022/5/12  
 */@Component  
@RequiredArgsConstructor  
@Slf4j  
public class VerifyCodeManager {  
  
    private final StringRedisTemplate stringRedisTemplate;  
  
    /**  
     * 生成图形验证码，并放入 Redis 中  
     */  
    public String genImgVerifyCode(String sessionId) throws IOException {  
        String verifyCode = ImgVerifyCodeUtils.getRandomVerifyCode(4);  
        String img = ImgVerifyCodeUtils.genVerifyCodeImg(verifyCode);  
        stringRedisTemplate.opsForValue().set(CacheConsts.IMG_VERIFY_CODE_CACHE_KEY + sessionId,  
            verifyCode, Duration.ofMinutes(5));  
        return img;  
    }  
  
    /**  
     * 校验图形验证码  
     */  
    public boolean imgVerifyCodeOk(String sessionId, String verifyCode) {  
        return Objects.equals(stringRedisTemplate.opsForValue()  
            .get(CacheConsts.IMG_VERIFY_CODE_CACHE_KEY + sessionId), verifyCode);  
    }  
  
    /**  
     * 从 Redis 中删除验证码  
     */  
    public void removeImgVerifyCode(String sessionId) {  
        stringRedisTemplate.delete(CacheConsts.IMG_VERIFY_CODE_CACHE_KEY + sessionId);  
    }  
  
}
```
注：我们在保存验证码的时候需要一个全局唯一的 sessionId 字符串用于标识该验证码属于哪个浏览器会话，该sessionId会在验证码返回给前端的时候一并返回，在用户提交注册的时候，该 sessionId会和验证码一起提交用于校验。
4.接着，我们在资源模块业务类ResourceService中定义获取图片验证码的业务方法如下
```
/**
 * 获取图片验证码
 *
 * @throws IOException 验证码图片生成失败
 * @return Base64编码的图片
 */
RestResp<ImgVerifyCodeRespDto> getImgVerifyCode() throws IOException;
```
5.接着，我们在资源模块业务实现类ResourceServiceImpl中实现ResourceService中定义的抽象方法，调用VerifyCodeManager中获取图形验证码方法并返回结果
```
@Override
public RestResp<ImgVerifyCodeRespDto> getImgVerifyCode() throws IOException {
    String sessionId = IdWorker.get32UUID();
    return RestResp.ok(ImgVerifyCodeRespDto.builder()
            .sessionId(sessionId)
            .img(verifyCodeManager.genImgVerifyCode(sessionId))
            .build());
}
```
6.最后，我们在资源模块的 API 控制器ResourceController中定义 GET 类型的查询接口，调用 service 中的相应业务方法获得图形验证码数据并返回给前端
```
/**
 * 获取图片验证码接口
 */
@GetMapping("img_verify_code")
public RestResp<ImgVerifyCodeRespDto> getImgVerifyCode() throws IOException {
    return resourceService.getImgVerifyCode();
}
```
###### 注册接口开发
1.首先我们在配置文件中定义JWT相关配置：
```
# 项目配置
novel:
	# JWT 密钥  
	jwt:  
	  secret: E66559580A1ADF48CDD928516062F12E
```
2.创建JWT工具类，用于JWT的生成和解析：
```
/**  
 * JWT 工具类  
 *  
 * @author xiongxiaoyang  
 * @date 2022/5/17  
 */@ConditionalOnProperty("novel.jwt.secret")  
@Component  
@Slf4j  
public class JwtUtils {  
  
    /**  
     * 注入JWT加密密钥  
     */  
    @Value("${novel.jwt.secret}")  
    private String secret;  
  
    /**  
     * 定义系统标识头常量  
     */  
    private static final String HEADER_SYSTEM_KEY = "systemKeyHeader";  
  
    /**  
     * 根据用户ID生成JWT  
     *     * @param uid       用户ID  
     * @param systemKey 系统标识  
     * @return JWT  
     */    
    public String generateToken(Long uid, String systemKey) {  
        return Jwts.builder()  
            .setHeaderParam(HEADER_SYSTEM_KEY, systemKey)  
            .setSubject(uid.toString())  
            .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))  
            .compact();  
    }  
  
    /**  
     * 解析JWT返回用户ID  
     *     * @param token     JWT  
     * @param systemKey 系统标识  
     * @return 用户ID  
     */    
    public Long parseToken(String token, String systemKey) {  
        Jws<Claims> claimsJws;  
        try {  
            claimsJws = Jwts.parserBuilder()  
                .setSigningKey(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))  
                .build()  
                .parseClaimsJws(token);  
            // OK, we can trust this JWT  
            // 判断该 JWT 是否属于指定系统  
            if (Objects.equals(claimsJws.getHeader().get(HEADER_SYSTEM_KEY), systemKey)) {  
                return Long.parseLong(claimsJws.getBody().getSubject());  
            }  
        } catch (JwtException e) {  
            log.warn("JWT解析失败:{}", token);  
            // don't trust the JWT!  
        }  
        return null;  
    }  
  
}
```
部分代码解释
```
.setHeaderParam(HEADER_SYSTEM_KEY, systemKey)  
```
这块是在自定义头部信息，除了签名算法和令牌类型（这两个没加会附上默认值的），还允许开发者添加自定义字段。执行上述代码后头部应该是这样的。
```
{
  "alg": "HS256",
  "typ": "JWT",
  "systemKey": "systemKeyHeader" 
}
```
为什么不放在Payload里？要配合后面的解析JWT函数来看
```
.signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
```
将原始的secret封装成HMAC密钥->对应算法HS256。若是RAS私钥，则会把算法设为RS256。
3.接着我们需要在用户模块业务类UserService中定义注册的业务方法如下
```
/**
 * 用户注册
 *
 * @param dto 注册参数
 * @return JWT
 */
RestResp<UserRegisterRespDto> register(UserRegisterReqDto dto);
```
4.接着我们在用户模块业务实现类UserServiceImpl中实现UserService中定义的抽象方法，对验证码、手机号进行校验。校验成功，则保存用户信息到数据库，并删除验证码和使用 JWT 工具类生成 JWT 字符串返回；校验失败，则返回相应的错误码给前端，具体代码如下
```
@Override  
public RestResp<UserRegisterRespDto> register(UserRegisterReqDto dto) {  
    // 校验图形验证码是否正确  
    if (!verifyCodeManager.imgVerifyCodeOk(dto.getSessionId(), dto.getVelCode())) {  
        // 图形验证码校验失败  
        throw new BusinessException(ErrorCodeEnum.USER_VERIFY_CODE_ERROR);  
    }  
  
    // 校验手机号是否已注册  
    QueryWrapper<UserInfo> queryWrapper = new QueryWrapper<>();  
    queryWrapper.eq(DatabaseConsts.UserInfoTable.COLUMN_USERNAME, dto.getUsername())  
        .last(DatabaseConsts.SqlEnum.LIMIT_1.getSql());  
    if (userInfoMapper.selectCount(queryWrapper) > 0) {  
        // 手机号已注册  
        throw new BusinessException(ErrorCodeEnum.USER_NAME_EXIST);  
    }  
  
    // 注册成功，保存用户信息  
    UserInfo userInfo = new UserInfo();  
    userInfo.setPassword(  
        DigestUtils.md5DigestAsHex(dto.getPassword().getBytes(StandardCharsets.UTF_8)));  
    userInfo.setUsername(dto.getUsername());  
    userInfo.setNickName(dto.getUsername());  
    userInfo.setCreateTime(LocalDateTime.now());  
    userInfo.setUpdateTime(LocalDateTime.now());  
    userInfo.setSalt("0");  
    userInfoMapper.insert(userInfo);  
  
    // 删除验证码  
    verifyCodeManager.removeImgVerifyCode(dto.getSessionId());  
  
    // 生成JWT 并返回  
    return RestResp.ok(  
        UserRegisterRespDto.builder()  
            .token(jwtUtils.generateToken(userInfo.getId(), SystemConfigConsts.NOVEL_FRONT_KEY))  
            .uid(userInfo.getId())  
            .build()  
    );  
  
}
```
5.最后，我们在用户模块 API 控制器UserController中定义 POST 类型的注册接口，调用用户模块 service 中的相应业务方法注册用户
```
/**
    * 用户注册接口
    */
@PostMapping("register")
public RestResp<UserRegisterRespDto> register(@Valid @RequestBody UserRegisterReqDto dto) {
    return userService.register(dto);
}
```
###### 登录接口开发
用户登录是一个特殊接口，不是单独请求一个资源，而是对于用户信息验证，创建一个JWT，而且登录提交的数据中还包含敏感数据（密码）。URL 带的参数必须无敏感信息或符合安全要求，所以我们需要定义 POST 类型的接口来处理登录请求。
为什么用POST？
![](Pasted%20image%2020251225222123.png)
具体实现步骤如下：
1.首先我们需要在用户模块业务类UserService中定义登录的业务方法如下
```
/**
 * 用户登录
 *
 * @param dto 登录参数
 * @return JWT + 昵称
*/
RestResp<UserLoginRespDto> login(UserLoginReqDto dto);
```
2.接着我们在用户模块业务实现类UserServiceImpl中实现UserService中定义的抽象方法，对登录用户名密码进行校验。校验通过，则生成 JWT 字符串返回；校验失败，则返回对应的错误码
```
@Override  
public RestResp<UserLoginRespDto> login(UserLoginReqDto dto) {  
    // 查询用户信息  
    QueryWrapper<UserInfo> queryWrapper = new QueryWrapper<>();  
    queryWrapper.eq(DatabaseConsts.UserInfoTable.COLUMN_USERNAME, dto.getUsername())  
        .last(DatabaseConsts.SqlEnum.LIMIT_1.getSql());  
    UserInfo userInfo = userInfoMapper.selectOne(queryWrapper);  
    if (Objects.isNull(userInfo)) {  
        // 用户不存在  
        throw new BusinessException(ErrorCodeEnum.USER_ACCOUNT_NOT_EXIST);  
    }  
  
    // 判断密码是否正确  
    if (!Objects.equals(userInfo.getPassword()  
        , DigestUtils.md5DigestAsHex(dto.getPassword().getBytes(StandardCharsets.UTF_8)))) {  
        // 密码错误  
        throw new BusinessException(ErrorCodeEnum.USER_PASSWORD_ERROR);  
    }  
  
    // 登录成功，生成JWT并返回  
    return RestResp.ok(UserLoginRespDto.builder()  
        .token(jwtUtils.generateToken(userInfo.getId(), SystemConfigConsts.NOVEL_FRONT_KEY))  
        .uid(userInfo.getId())  
        .nickName(userInfo.getNickName()).build());  
}
```
部分代码解释
```
.last(DatabaseConsts.SqlEnum.LIMIT_1.getSql());
```
首先后面的常量是"limit 1"
.last()就是在自动生成的SQL语句的最后，原封不动地拼接一段自定义的SQL语句，所以这里就是最后面加个limit 1
有什么意义？
![](Pasted%20image%2020251225222643.png)
3.最后，我们在用户模块 API 控制器UserController中定义 POST 类型的登录接口，调用用户模块 service 中的相应业务方法
```
/**
 * 用户登录接口
 */
@PostMapping("login")
public RestResp<UserLoginRespDto> login(@Valid @RequestBody UserLoginReqDto dto) {
    return userService.login(dto);
}
```
##### 小说详情页相关接口开发
###### 相关数据库设计
![](Pasted%20image%2020251226112646.png)
###### 小说评论发表接口开发
1.首先我们需要在小说模块业务类BookService中定义发表评论的业务方法如下
```
/**  
 * 发表评论  
 *  
 * @param dto 评论相关 DTO  
 * @return void  
 */RestResp<Void> saveComment(UserCommentReqDto dto);
```
2.接着我们在小说模块业务实现类BookServiceImpl中实现BookService中定义的抽象方法，将用户对小说的评论数据保存到数据库中
```
@Lock(prefix = "userComment")  
@Override  
public RestResp<Void> saveComment(  
    @Key(expr = "#{userId + '::' + bookId}") UserCommentReqDto dto) {  
    // 校验书籍是否存在  
    BookInfo bookInfo = bookInfoMapper.selectById(dto.getBookId());  
    if (bookInfo == null) {  
        return RestResp.fail(ErrorCodeEnum.BOOK_NOT_FOUND);  
    }  
    // 校验用户是否已发表评论  
    QueryWrapper<BookComment> queryWrapper = new QueryWrapper<>();  
    queryWrapper.eq(DatabaseConsts.BookCommentTable.COLUMN_USER_ID, dto.getUserId())  
        .eq(DatabaseConsts.BookCommentTable.COLUMN_BOOK_ID, dto.getBookId());  
    if (bookCommentMapper.selectCount(queryWrapper) > 0) {  
        // 用户已发表评论  
        return RestResp.fail(ErrorCodeEnum.USER_COMMENTED);  
    }  
    BookComment bookComment = new BookComment();  
    bookComment.setBookId(dto.getBookId());  
    bookComment.setUserId(dto.getUserId());  
    bookComment.setCommentContent(dto.getCommentContent());  
    bookComment.setCreateTime(LocalDateTime.now());  
    bookComment.setUpdateTime(LocalDateTime.now());  
    bookCommentMapper.insert(bookComment);  
    return RestResp.ok();  
}
```
注：保存评论之前我们需要对用户是否已发表评论进行校验，每个用户只能对同一本书发表一条评论。
这个方法是加了分布式锁的，来避免用户插入重复评论
部分代码解释
Lock是自定义注解
```
/**  
 * 分布式锁 注解  
 *  
 * @author xiongxiaoyang  
 * @date 2022/6/20  
 */
@Documented // 该注解将被包含在Javadoc中
@Retention(RUNTIME)  //注解在运行时仍然有效，这样AOP切面类在运行时才能读到它进行后续操作
@Target(METHOD)  //注解是加在方法上的
public @interface Lock {  
  
    String prefix(); //锁的前缀，会被拼到锁的Key中 
  
    boolean isWait() default false; //锁被占用时直接报错或者是等待一段时间 
  
    long waitTime() default 3L;  //等等锁的最大时长
  
    ErrorCodeEnum failCode() default ErrorCodeEnum.OK;  //抢锁失败后返回的错误码
  
}
```
Key也是自定义注解
```
/**  
 * 分布式锁-Key 注解  
 *  
 * @author xiongxiaoyang  
 * @date 2022/6/20  
 */@Documented  
@Retention(RUNTIME)  
@Target({ElementType.METHOD, ElementType.FIELD, ElementType.PARAMETER})  
//此注解可以标记在方法、类的属性和方法的参数上
public @interface Key {  
  
    String expr() default ""; //这个参数也是拼接到锁的Key上的
    //不过还通过切面类设计了一下从DTO里面自动读取对应参数，构造字符串注入expr
  
}
```
切面类
```
/**  
 * 分布式锁 切面  
 *  
 * @author xiongxiaoyang  
 * @date 2022/6/20  
 */@Aspect  
@Component  
@RequiredArgsConstructor  
public class LockAspect {  
      
    private final RedissonClient redissonClient;  
  
    private static final String KEY_PREFIX = "Lock";  
  
    private static final String KEY_SEPARATOR = "::";  
  
    @Around(value = "@annotation(io.github.xxyopen.novel.core.annotation.Lock)")  
    @SneakyThrows  
    public Object doAround(ProceedingJoinPoint joinPoint) {
	    //获取方法的注解  
        MethodSignature methodSignature = (MethodSignature) joinPoint.getSignature();  
        Method targetMethod = methodSignature.getMethod();  
        Lock lock = targetMethod.getAnnotation(Lock.class);  
        String lockKey = KEY_PREFIX + buildLockKey(lock.prefix(), targetMethod,  
            joinPoint.getArgs());  
        RLock rLock = redissonClient.getLock(lockKey);  
        if (lock.isWait() ? rLock.tryLock(lock.waitTime(), TimeUnit.SECONDS) : rLock.tryLock()) {
	        //抢到锁就执行原方法并且最后释放锁
            try {  
                return joinPoint.proceed();  
            } finally {  
                rLock.unlock();  
            }  
        }  
        throw new BusinessException(lock.failCode());  
    }  
  
    private String buildLockKey(String prefix, Method method, Object[] args) {  
        StringBuilder builder = new StringBuilder();
	    //前缀有东西就把它拼到key里  
        if (StringUtils.hasText(prefix)) {  
            builder.append(KEY_SEPARATOR).append(prefix);  
        }
        //遍历方法的每一个参数，看参数前面是否加了@Key注解
        //有加的话就用parseKeyExpr方法从中解析出要的数据，拼成字符串加到key中
        Parameter[] parameters = method.getParameters();  
        for (int i = 0; i < parameters.length; i++) {  
            builder.append(KEY_SEPARATOR);  
            if (parameters[i].isAnnotationPresent(Key.class)) {  
                Key key = parameters[i].getAnnotation(Key.class);  
                builder.append(parseKeyExpr(key.expr(), args[i]));  
            }  
        }  
        return builder.toString();  
    }  
  
    private String parseKeyExpr(String expr, Object arg) {  
        if (!StringUtils.hasText(expr)) {  
            return arg.toString();  
        }  
        ExpressionParser parser = new SpelExpressionParser();  
        Expression expression = parser.parseExpression(expr, new TemplateParserContext());  
        return expression.getValue(arg, String.class);  
    }  
  
}
```
切面类的部分代码解释
```
@SneakyThrows
```
Lombok提供的一个非常实用的注解，可以让你在不显式写try-catch或throws关键字的情况下，抛出受检异常/编译时异常
```
使用前
public Object doAround(ProceedingJoinPoint joinPoint) throws Throwable {
    // ...
}
使用后
@SneakyThrows
public Object doAround(ProceedingJoinPoint joinPoint) {
    // 这里可以直接调用抛出受检异常的方法，不需要写 throws 或 try-catch
    return joinPoint.proceed(); 
}
```
hasText方法，就是判断字符串有没有东西
```
public static boolean hasText(@Nullable String str) {  
    return str != null && !str.isBlank();  
}
```
区别
```
没抢到的话在设定的时间内利用订阅/发布机制盯着这把锁，等待时间抢到就返回true，没有就false
rLock.tryLock(lock.waitTime(), TimeUnit.SECONDS) 
抢一次，抢到返回true，没抢到返回false
rLock.tryLock()
```
3.UserController增加这个接口
```
/**
 * 发表评论接口
 */
@PostMapping("comment")
public RestResp<Void> comment(@Valid @RequestBody UserCommentReqDto dto) {
    dto.setUserId(UserHolder.getUserId());
    return bookService.saveComment(dto);
}
```
###### 小说评论修改接口开发
1.首先我们需要在小说模块业务类BookService中定义修改评论的业务方法如下
```
/**  
 * 修改评论  
 *  
 * @param userId  用户ID  
 * @param id      评论ID  
 * @param content 修改后的评论内容  
 * @return void  
 */RestResp<Void> updateComment(Long userId, Long id, String content);
```
2.接着我们在小说模块业务实现类BookServiceImpl中实现BookService中定义的抽象方法，更新数据表中的评论数据
```
@Override  
public RestResp<Void> updateComment(Long userId, Long id, String content) {  
    QueryWrapper<BookComment> queryWrapper = new QueryWrapper<>();  
    queryWrapper.eq(DatabaseConsts.CommonColumnEnum.ID.getName(), id)  
        .eq(DatabaseConsts.BookCommentTable.COLUMN_USER_ID, userId);  
    BookComment bookComment = new BookComment();  
    bookComment.setCommentContent(content);  
    bookCommentMapper.update(bookComment, queryWrapper);  
    return RestResp.ok();  
}
```
3.UserController中定义一下接口
```
/**
 * 修改评论接口
 */
@PutMapping("comment/{id}")
public RestResp<Void> updateComment(@PathVariable Long id, String content) {
    return bookService.updateComment(UserHolder.getUserId(), id, content);
}
```
###### 小说评论删除接口开发
1.首先我们需要在小说模块业务类BookService中定义删除评论的业务方法
```
/**  
 * 删除评论  
 *  
 * @param userId    评论用户ID  
 * @param commentId 评论ID  
 * @return void  
 */RestResp<Void> deleteComment(Long userId, Long commentId);
```
2.接着我们在小说模块业务实现类BookServiceImpl中实现BookService中定义的抽象方法，删除数据表中的评论数据
```
@Override  
public RestResp<Void> deleteComment(Long userId, Long commentId) {  
    QueryWrapper<BookComment> queryWrapper = new QueryWrapper<>();  
    queryWrapper.eq(DatabaseConsts.CommonColumnEnum.ID.getName(), commentId)  
        .eq(DatabaseConsts.BookCommentTable.COLUMN_USER_ID, userId);  
    bookCommentMapper.delete(queryWrapper);  
    return RestResp.ok();  
}
```
3.UserController中定义接口
```
/**
 * 删除评论接口
 */
@DeleteMapping("comment/{id}")
public RestResp<Void> deleteComment(@PathVariable Long id) {
    return bookService.deleteComment(UserHolder.getUserId(), id);
}
```
###### 小说最新评论列表查询接口开发
1.首先我们需要在小说模块业务类BookService中定义查询最新评论列表的业务方法
```
/**  
 * 小说最新评论查询  
 *  
 * @param bookId 小说ID  
 * @return 小说最新评论数据  
 */  
RestResp<BookCommentRespDto> listNewestComments(Long bookId);
```
2.接着我们在小说模块业务实现类BookServiceImpl中实现BookService中定义的抽象方法，查询数据表中的最新评论列表数据
```
@Override  
public RestResp<BookCommentRespDto> listNewestComments(Long bookId) {  
    // 查询评论总数  
    QueryWrapper<BookComment> commentCountQueryWrapper = new QueryWrapper<>();  
    commentCountQueryWrapper.eq(DatabaseConsts.BookCommentTable.COLUMN_BOOK_ID, bookId);  
    Long commentTotal = bookCommentMapper.selectCount(commentCountQueryWrapper);  
    BookCommentRespDto bookCommentRespDto = BookComme
     ntRespDto.builder()  
        .commentTotal(commentTotal).build();  
    if (commentTotal > 0) {  
  
        // 查询最新的评论列表  
        QueryWrapper<BookComment> commentQueryWrapper = new QueryWrapper<>();  
        commentQueryWrapper.eq(DatabaseConsts.BookCommentTable.COLUMN_BOOK_ID, bookId)  
            .orderByDesc(DatabaseConsts.CommonColumnEnum.CREATE_TIME.getName())  
            .last(DatabaseConsts.SqlEnum.LIMIT_5.getSql());  
        List<BookComment> bookComments = bookCommentMapper.selectList(commentQueryWrapper);  
  
        // 查询评论用户信息，并设置需要返回的评论用户名  
        List<Long> userIds = bookComments.stream().map(BookComment::getUserId).toList();  
        List<UserInfo> userInfos = userDaoManager.listUsers(userIds);  
        Map<Long, UserInfo> userInfoMap = userInfos.stream()  
            .collect(Collectors.toMap(UserInfo::getId, Function.identity()));  
        List<BookCommentRespDto.CommentInfo> commentInfos = bookComments.stream()  
            .map(v -> BookCommentRespDto.CommentInfo.builder()  
                .id(v.getId())  
                .commentUserId(v.getUserId())  
                .commentUser(userInfoMap.get(v.getUserId()).getUsername())  
                .commentUserPhoto(userInfoMap.get(v.getUserId()).getUserPhoto())  
                .commentContent(v.getCommentContent())  
                .commentTime(v.getCreateTime()).build()).toList();  
        bookCommentRespDto.setComments(commentInfos);  
    } else {  
        bookCommentRespDto.setComments(Collections.emptyList());  
    }  
    return RestResp.ok(bookCommentRespDto);  
}
```
3.BookController中定义接口
```
/**
 * 小说最新评论查询接口
 */
@GetMapping("comment/newest_list")
public RestResp<BookCommentRespDto> listNewestComments(Long bookId) {
    return bookService.listNewestComments(bookId);
}
```
4.因为小说评论的用户名（手机号）属于敏感数据，我们不应该直接返回给前端。所以我们还需要定义一个 JSON 序列化器在 Spring MVC 序列化我们返回的 Java 对象为 JSON 字符串时格式化一下用户名，隐藏中间的 4 位数字为 \*\*\*\*。代码如下
序列化器
```
/**
 * 用户名序列化器（敏感信息，不应该在页面上完全显示）
 *
 * @author xiongxiaoyang
 * @date 2022/5/20
 */
public class UsernameSerializer extends JsonSerializer<String> {

    @Override
    public void serialize(String s, JsonGenerator jsonGenerator, SerializerProvider serializerProvider) throws IOException {
        jsonGenerator.writeString(s.substring(0,4) + "****" + s.substring(8));
    }

}
```
DTO
```
/**
 * 小说评论 响应DTO
 * @author xiongxiaoyang
 * @date 2022/5/17
 */
@Data
@Builder
public class BookCommentRespDto {

    private Long commentTotal;

    private List<CommentInfo> comments;

    @Data
    @Builder
    public static class CommentInfo {

        private Long id;

        private String commentContent;

        @JsonSerialize(using = UsernameSerializer.class)
        private String commentUser;

        private Long commentUserId;

        @JsonFormat(pattrn = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime commentTime;

    }

}
```














