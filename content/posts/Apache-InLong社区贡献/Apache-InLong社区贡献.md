---
title: Git相关命令学习
date: 2026-03-22T15:00:00+08:00
categories:
  - 开源社区贡献
tags:
  - Apache-InLong
---
## Docker部署
Docker相关的环境配置可以在Windows下载最新版的Docker Desktop，是可以符合要求的
其他不需要配置什么
https://inlong.apache.org/zh-CN/download/
在此页面中下载InLong Binary File -> \[BIN] 
然后需要在两处进行修改：
1.docker > docker-compose > docker-compose.yml
修改mysql配置中的本机端口3306->3307
因为本地安装了mysql了，把3306给占了，这里不改会冲突
2.conf > inlong.conf
如果进入页面后报http error，可以修改此处的local_ip为本机ip
本机ip查看方式
打开控制台 -> 输入命令ipconfig ->  查看无线局域网适配器WLAN下的IPv4地址
## 简单测试
修改完代码后编译当前文件（太多文件的话把这个模块整个打包吧）
在lib文件下找到对应的jar包，到里面去把对应的class文件替换了
再把docker里面的也给更新一下
```
docker cp "D:\apache-inlong-2.3.0\lib\manager-service-2.3.0.jar" manager:/opt/inlong-manager/lib/manager-service-2.3.0.jar
```
然后重启对应容器再打开就可以进行前后端联调测试了
## 提交PR
1.Fork
2.Git配置
```
// 将代码克隆到本地
git clone https://github.com/<your_github_name>/inlong.git

// 将apache/inlong添加为本地仓库的远程分支upstream
cd  inlong
git remote add upstream https://github.com/apache/inlong.git

// 检查远程仓库设置
git remote -v
origin    https://github.com/<your_github_name>/inlong.git (fetch)
origin    https://github.com/<your_github_name>/inlong.git(push)
upstream  https://github.com/apache/inlong.git (fetch)
upstream  https://github.com/apache/inlong.git (push)
```
3.提交代码
```
// 获取upstream仓库代码，并更新本地master分支代码为最新
git fetch upstream  
git pull upstream master

// 新建分支
git checkout -b INLONG-XYZ
// 如果处理的是自己新创的issue XYZ就填这个issue的编号就行 
// 其他就看看最新的编号是什么递增一下

// 修改完代码并格式化
mvn spotless:check
mvn spotless:apply

// 提交代码到远程分支
git commit -a -m "[INLONG-XYZ][Component] commit msg"
git push origin INLONG-XYZ
// Component使用InLong组件名称进行替换，比如Manager、Sort、DataProxy...
```
接着到自己fork的那个仓库，找到最新提交的分支，点击最右边的... -> new pull request
过程中的issue和pr的创建都按模版填对应的内容就好了