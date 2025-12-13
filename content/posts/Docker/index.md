---
title: Docker
date: 2025-12-05T16:38:00+08:00
categories:
  - 相关工具
tags:
  - Docker
  - 部署
---
### 基础
示例：在Docker中使用Redis：
从应用市场下载Redis
```
docker pull redis
```
Clinet把该命令发送给Docker Daemon后，就会连接应用市场，下载Redis镜像到主机，通过镜像就可以启动应用。（找不到镜像的话是会自动下载）
```
docker run redis
```

通过镜像启动的应用称之为容器，可以启动多个容器
如果想要自己做一个镜像（可以理解为软件包）
```
docker build 软件名
```
把自己做的镜像发送到软件市场中
```
docker push 软件名
```
![](Pasted%20image%2020251205170655.png)
**理解容器**
传统部署：直接在操作系统上部署应用，这时候如果某个应用炸了（比如内存泄露，把空间炸完了），就会影响到别的应用，各个应用之间没有隔离开。
虚拟化部署：通过虚拟化技术开上几个虚拟机，每个应用部署在自己的虚拟机内部，要影响只会影响到同个虚拟机里面的应用。但是每个虚拟机都有自己完整的操作系统，每个虚拟机笨重，占用空间多，启动慢。
容器部署：安全容器的运行时环境，利用容器技术启动一个个应用，每个容器包含了这个应用运行所需的完整环境，容器之间互相隔离且比虚拟机轻量多了。 
![](Pasted%20image%2020251205172337.png)
跨平台：对方安装了容器运行时环境，容器就可以直接迁移过期
高密度：单个容器体积小
**安装docker（Linux虚拟机）**
安装依赖包
```
yum install -y yum-utils device-mapper-persistent-data lvm2
```
使用清华镜像repo
```
cat > /etc/yum.repos.d/docker-ce.repo << 'EOF'
[docker-ce-stable]
name=Docker CE Stable - TUNA Mirror
baseurl=https://mirrors.tuna.tsinghua.edu.cn/docker-ce/linux/centos/7/x86_64/stable
enabled=1
gpgcheck=0

[docker-ce-stable-source]
name=Docker CE Stable - TUNA Mirror Sources
baseurl=https://mirrors.tuna.tsinghua.edu.cn/docker-ce/linux/centos/7/source/stable
enabled=0
gpgcheck=0
EOF
```
docker-ce安装
```
yum install -y docker-ce
```
启动
```
#启动docker命令
systemctl start docker
#设置开机自启命令
systemctl enable docker
#查看docker版本命令
docker version
```
这个过程中都没有指定安装目录，是因为Docker CE是系统级软件，其中一些文件所在路径必须是固定的，否则服务无法运行，所以不能自己指定。
配置加速地址
```
sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json <<EOF
{
    "registry-mirrors": [
        "https://docker.m.ixdev.cn",
        "https://docker.1ms.run"
    ]
}
EOF

sudo systemctl daemon-reload

sudo systemctl restart docker
```
检查
```
docker info
```
应该可以看到所配置的镜像源
如果有问题就换一个镜像源，下面这个链接是b站某个up发布的解决拉取镜像超时的教程。
https://gitee.com/wanfeng789/docker-hub
### 命令
任务：启动一个nginx，并将它的首页改为自己的页面，发布出去，让所有人都能使用
步骤：下载镜像->启动容器->修改页面->保存镜像->分享社区
下载
```
#看有没有这个镜像
docker search nginx
#后面OFFICIAL有带OK的就是官方镜像，其他是第三方开发的
#下载
docker pull nginx #等价于docker pull nginx:latest  要指定版本的话要:版本号 
#检查
docker images
#删除
docker rmi nginx:版本号 or IMAGE ID
```
启动容器
```
docker run nginx
```
查看容器
```
docker ps #要查看停止的应用的话加个-a
```
![[2f9ac797-54e5-462e-8e66-7d94de45df09.png]]
STATUS是up就代表启动成功了在运行了，PORTS是它占用的端口。
CTRL + C可以停止应用，要想再次启动
```
docker start 容器ID or 名称 #ID可以只写几位，能和其他区分就行了
```
停止应用还可以
```
docker stop 容器ID or 名称
```
重启
```
  docker restart 容器ID or 名称
```
查看容器状态（CPU、内存、IO）
```
docker stats 容器ID or 名称
```
查看容器日志
```
docker logs 容器ID or 名称
```
删除容器
```
docker rm 容器ID or 名称
```
run命令细节
```
docker run -d --name nginx -p 80:80 nginx 
#-d后台启动 --name设置名称 -p 主机端口:容器端口 就是范围主机的这个端口可以访问这个应用
#主机端口不可以重复，容器端口可以重复
```
设置了端口映射就可以访问到这个应用了 URL:虚拟机IP:端口
修改容器
```
docker exec -it 容器ID or 名称 /bin/bash
# -it 以交互模式进入，用命令修改它   /bin/bash 使用控制台进行交互
```
然后其实当Linux一样用就好了
进入到首页所在位置（nginx官方文档告知的）
```
cd usr/share/nginx/html/
```
不过容器为了轻量级，其内部的Linux系统Vi命令都是没有的，用别的方式改

```
echo "<h1>Hello, Docker.</h1>" > index.html
cat index.html
```
这样的修改比较麻烦，不用记，后面可以把docker里面的一个文件夹映射到外面主机的一个文件夹，然后可以在外面修改
退出容器
```
exit 
```
提交镜像
```
docker commit [OPTIONS] CONTAINER [REPOSITORY[:TAG]]  
后面两个是要提交的容器名和你自己定的镜像名和版本
commit -m "update index.html" nginx mynginx:v1.0
下载的时候很多人都是没带版本号的，可以再推一个latest上去防止别人下载的时候报错
commit -m "update index.html" nginx mynginx:latest
options
-a "作者名称"
-c list
-m "镜像相关信息"
-p 在容器提交期间暂停Docker的运行
```
保存镜像成压缩文件
```
要了解一个命令的使用的时候可以在后面加 --help 查看使用文档
docker save [-o 文件名] IMAGE [IMAGE...]
docker save -o mynginx.zip mynginx:v1.0
```
加载镜像压缩文件
```
docker load [OPTIONS]
docker load -i mynginx.tar
Options:
-i 压缩包文件名
-q 
```
分享到社区
需要先注册一个docker hub账户，然后在命令行中登录 
```
docker login 之后会让你输入账户和密码

这里登录超时了，是网络的问题，待解决
```
镜像更名
```
docker tag 原镜像名 新镜像名
```
推送镜像
```
docker push 镜像名
```
### 映射
目前想要修改容器的内容十分复杂，并且修改之后如果把容器删了再用同个镜像开，容器修改的内容也会全部丢失，导致数据丢失问题。（容器启动是会有自己的空间、文件系统和进程，容器一销毁这些东西也没了）
解决方案就是容器挂载
```
docker run -d -p 80:80 -v 外部路径:内部路径 --name 指定一个容器名称 镜像名称
docker run -d -p 80:80 -v /app/nghtml:/usr/share/nginx/html --name app01 nginx
然后在挂载的这个目录下修改就可以生效了
cd /app/nghtml
echo 2222 > index.html
```
之后就算容器销毁了，你用这个外部文件夹去启动容器就还是有之前修改的内容了
在容器内部修改，外部也是看得到的
其实把外部目录映射到内部的文件夹上了，通过外部目录可以访问内部文件夹差不多是

不过挂载的这个外部目录默认是空的，这样如果内部文件夹有些文件是容器启动的必须文件的话就会出现问题（外部是空目录找不到这个文件）。那解决方案就是想要映射的时候把内部的文件也同步到外面，这个方法就是卷映射。这个卷也是不会被删除的，容器重建之后用这个卷挂载也是一样可以生效的。
```
-v 卷名:内部路径（下面放的就是nginx配置文件所在位置）
-v ngconf:/etc/nginx  
这个卷的位置
cd /var/lib/docker/volumes/卷名
进去就可以修改内容了
```
卷的相关操作
查看所有卷名
```
docker volume ls
 ```
创建卷
```
docker volume create 卷名
```
查看卷所在位置
```
docker volume inspect 卷名
```
### 网络
docker启动的应用都会默认加入一个docker 0网络环境 通过ip addr可以查看，这是各个应用的网关地址。通过下面的命令可以查看每个容器具体的信息，其中包括ip地址。
```
docker container inspect 容器名
```
 使用容器ip + 容器端口可以互相访问
```
 docker exec -it 容器名 bash
 curl http://容器IP:80
```
 不过ip是经常会变的比较麻烦，通过固定的域名访问是比较好的，docker中对应的就是自定义网络
 创建自定义网络
```
docker network create 自定义网络名
```
列出所有网络
```
docker network ls
```
让启动的容器加入自定义网络
```
docker run -d -p 80:80 --name 自己取的容器名 --network 自定义网络名 镜像名
```
有了自定义网络之后就可以通过容器名访问了（要在同个自定义网络里）
```
 docker exec -it 容器名 bash
 curl http://容器名:80
```
实战：构建Redis主从同步集群
![](Pasted%20image%2020251213140942.png)
（1）把主从机放在同个网络中
（2）把存放数据文件夹映射到外部文件夹 防止丢失
（3）设置复制模式/参数
这里用的不是官方的redis镜像，用的是bitnami出的
```
 docker run -d -p 6379:6379 \ # 一行太长就可以用\先回车一下后面继续输命令
 -v /app/rd1:/bitnami/redis/data \
 -e REDIS_REPLICATION_MODE = master \ # -e是用来设置环境变量的
 -e REDIS_PASSWORD = 123456 \
 -- network mynet --name redis 01 \
 bitnami/redis
 
 #这个过程中会遇到一个问题就是外部的/app/rd1只有root权限的用户才能修改
 #容器肯定是修改不了的，需要修改权限
 #先进入到app文件夹
 chmod -R 777 rd1 #777意思是所有人可读可写可执行
 #然后restart一下容器就行
 
 docker run -d -p 6380:6379 \
 -v /app/rd2:/bitnami/redis/date \
 -e REDIS_REPLICATION_MODE = slave \
 -e REDIS_MASTER_HOST = redis01 \
 -e REDIS_MASTER_PORT_NUMBER = 6379 \
 -e REDIS_MASTER_PASSWORD = 123456 \
 -e REDIS_PASSWORD = 123456 \
 -- network mynet --name redis 02 \
 bitnami/redis
```
![](Pasted%20image%2020251213142958.png)
启动一个容器需要关注：
（1）端口设置：机器对外暴露的端口，对应的容器内部端口
（2）配置文件：看镜像有没有什么配置文件是要挂到外面的好修改
（3）数据存储：看镜像有没有什么数据要持久化的，链接一个外部的文件夹
（4）环境变量：要设置的对应设置一下
（2）（3）（4）都应该参考docker hub上镜像的官方文档进行配置
### Docker Compose
它是Docker批量管理容器的工具
官网教程：https://docs.docker.com/reference/dockerfile/
![](Pasted%20image%2020251213144113.png)
实战：部署一个开源博客系统（需要一个mysql数据库）
![](Pasted%20image%2020251213144715.png)
没用Compose之前是需要通过上面的命令实现的（配置相关参数、安排在同一网络、设计开机自启动等）这样比较麻烦并且后续换了个机器还要敲一模一样的命令才行，通过compose写个yaml文件就行了，迁移的时候把这个yaml给别人就行。这个文件怎么写可以参考下面的网址 https://docs.docker.com/compose/compose-file/
![](Pasted%20image%2020251213145558.png)
compose.yaml
```
name: myblog
services:
	mysql:
		container_name: mysql #自己指定容器名称
		image: mysql:8.0 #要使用的镜像
		#端口设置 外部：内部
		ports:
			- "3306:3306"
		#环境变量
		environment:
			- MYSQL_ROOT_PASSWORD=123456
			- MYSQL_DATABASE=wordpress
		#挂载
		volumes:
			- mysql-data:/var/lib/mysql
			- /app/myconf:/etc/mysql/conf.d
		restart: always #启动设置
		#要加入的网络
		networks:
			- blog
			  
	wordpress:
		略
		#设置当前应用要依赖哪些应用，设置完会先启动它们。就是配置启动顺序
		depends_on:
			- mysql

vloumes:
	mysql-date: #卷映射的话这里要声明一下，然后这里还可以做一些卷的设置

networks:
	blog: 
```
使用yaml文件
```
docker compose -f compose.yaml up -d #以后台启动的方式启动配置好的应用
docker compose -f compose.yaml down #移除所有容器及网络（卷不会移除：保证数据安全）
#也可以加一些参数把卷也一起删了 --help自己探索一下就行
```
### Dockerfile
用来制作自己的镜像 
![](Pasted%20image%2020251213152626.png)
（1）上传jar包
（2）编写Dockerfile文件
```
vim Dockerfile
```
Dockerfile内容编写
![](Pasted%20image%2020251213153036.png)
```
FROM openjdk:17 #镜像运行所需环境可以带一下

LABEL author=flowers #随便写一些信息可以

COPY app.jar /app.jar #把当前目录下的这个jar包放到镜像的根目录下

EXPOSE 8080 #指定暴露的内部端口

ENTRYPOINT java -jar /app.jar # 定义启动命令 启动后就会执行这个命令 
# 通过这个命令就可以打开后面的那个文件
```
构建镜像
```
docker build -f Dockerfile -t 给要制作的镜像取个名 . 
#最后这个.代表./表示构建目录是当前目录 不然jar包都找不到 
```
镜像分层机制
不同镜像的依赖中有相同的内容和不同的内容，我们想让不同的部分独立，相同的部分共享，就可以通过镜像分层机制实现
![](Pasted%20image%2020251213154748.png)
我们通过某个镜像创建容器，容器中的文件其实分为两部分，一部分是镜像的文件（这些多个容器都可以共享的）这部分是只读的是多个容器共享的，另一部分是容器的读写层，容器如果要修改镜像文件是要在上面做的，这部分是每个容器独立的，销毁容器后就没了的，所以数据会丢了 。
下述命令是可以展现每个容器的大小
```
docker ps -s
```
size中的形式大概是1.09kB(virtual 188MB)这样的，前面的就是读写层（属于容器自己）的大小，后面的只读（属于镜像）那的