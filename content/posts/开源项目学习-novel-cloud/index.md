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