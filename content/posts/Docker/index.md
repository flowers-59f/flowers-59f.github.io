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
![[Pasted image 20251205170655.png]]
**理解容器**
传统部署：直接在操作系统上部署应用，这时候如果某个应用炸了（比如内存泄露，把空间炸完了），就会影响到别的应用，各个应用之间没有隔离开。
虚拟化部署：通过虚拟化技术开上几个虚拟机，每个应用部署在自己的虚拟机内部，要影响只会影响到同个虚拟机里面的应用。但是每个虚拟机都有自己完整的操作系统，每个虚拟机笨重，占用空间多，启动慢。
容器部署：安全容器的运行时环境，利用容器技术启动一个个应用，每个容器包含了这个应用运行所需的完整环境，容器之间互相隔离且比虚拟机轻量多了。 
![[Pasted image 20251205172337.png]]
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