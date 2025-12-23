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
#### 集成ShardingSphere-JDBC优化小说内容存储
