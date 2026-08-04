---
title: 开源项目学习-novel-cloud
date: 2026-04-17T15:42:00+08:00
categories:
  - 开源项目学习
tags:
  - 开源项目
  - 微服务项目
---
### 跑通代码
fork https://github.com/201206030/novel-cloud 该仓库

clone该后端文件到本地 改名novel-cloud-backend

在后端文件夹下创建.env文件，把下面的内容复制进去
```
# MYSQL 配置
MYSQL_VERSION=8.0
MYSQL_ROOT_PASSWORD=test123456

# Redis 配置
REDIS_VERSION=7.0
REDIS_PASSWORD=test123456

# RabbitMQ 配置
RABBITMQ_VERSION=3-management
RABBITMQ_DEFAULT_USER=xxyopen
RABBITMQ_DEFAULT_PASS=test123456
RABBITMQ_DEFAULT_VHOST=novel

# Elasticsearch 配置
ELASTIC_VERSION=8.6.2
# 'elastic' 账户的密码 (至少 6 个字符)
ELASTIC_PASSWORD=Fy2JWjJ1hcO2mi1USFL1
# 'kibana_system' 账号的密码 (至少 6 个字符)
KIBANA_PASSWORD=5JbbVsW9TkYcJu9Y9

# Kibana 配置
KIBANA_VERSION=8.6.2

# XXL-JOB 配置
XXLJOB_VERSION=2.3.1
XXLJOB_ACCESSTOKEN=123

# Nacos 配置
NACOS_VERSION=v2.2.1

```

在后端文件夹创建docker-compose.yml文件，把下面的内容复制进去
```
version: '3.9'

services:
  novel-mysql:
    container_name: novel-mysql
    image: mysql:${MYSQL_VERSION}
    restart: always
    hostname: novel-mysql
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
    volumes:
      - "/data/docker/mysql/data:/var/lib/mysql"
      - "/data/docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql"
    command: mysqld --max_allowed_packet=100M
    ports:
      - "3306:3306"
    networks:
      - novelnet

  novel-redis:
    container_name: novel-redis
    image: redis:${REDIS_VERSION}
    restart: always
    hostname: novel-redis
    command: redis-server --save 60 1 --loglevel warning --requirepass "${REDIS_PASSWORD}"
    ports:
      - "6379:6379"
    networks:
      - novelnet

  novel-rabbitmq:
    container_name: novel-rabbitmq
    image: rabbitmq:${RABBITMQ_VERSION}
    restart: always
    hostname: novel-rabbitmq
    environment:
      - RABBITMQ_DEFAULT_USER=${RABBITMQ_DEFAULT_USER}
      - RABBITMQ_DEFAULT_PASS=${RABBITMQ_DEFAULT_PASS}
      - RABBITMQ_DEFAULT_VHOST=${RABBITMQ_DEFAULT_VHOST}
    ports:
      - "15672:15672"
      - "5672:5672"
    networks:
      - novelnet

  novel-elasticsearch-setup:
    container_name: novel-elasticsearch-setup
    image: elasticsearch:${ELASTIC_VERSION}
    hostname: novel-elasticsearch-setup
    user: "0"
    command: >
      bash -c '
        echo "Waiting for Elasticsearch availability";
        until curl -s http://novel-elasticsearch:9200 | grep -q "missing authentication credentials"; do sleep 30; done;
        echo "Setting kibana_system password";
        until curl -s -X POST -u "elastic:${ELASTIC_PASSWORD}" -H "Content-Type: application/json" http://novel-elasticsearch:9200/_security/user/kibana_system/_password -d "{\"password\":\"${KIBANA_PASSWORD}\"}" | grep -q "^{}"; do sleep 10; done;
        echo "All done!";
      '
    networks:
      - novelnet

  novel-elasticsearch:
    container_name: novel-elasticsearch
    image: elasticsearch:${ELASTIC_VERSION}
    restart: always
    hostname: novel-elasticsearch
    environment:
      - "ES_JAVA_OPTS=-Xms125m -Xmx512m"
      - discovery.type=single-node
      - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
      - KIBANA_PASSWORD=${KIBANA_PASSWORD}
      - xpack.security.http.ssl.enabled=false
    ports:
      - "9200:9200"
    depends_on:
      - novel-elasticsearch-setup
    networks:
      - novelnet

  novel-kibana:
    container_name: novel-kibana
    image: kibana:${KIBANA_VERSION}
    restart: always
    hostname: novel-kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://novel-elasticsearch:9200
      - ELASTICSEARCH_USERNAME=kibana_system
      - ELASTICSEARCH_PASSWORD=${KIBANA_PASSWORD}
    ports:
      - "5601:5601"
    depends_on:
      - novel-elasticsearch
    networks:
      - novelnet

  novel-xxl-job-admin:
    container_name: novel-xxl-job-admin
    image: xuxueli/xxl-job-admin:${XXLJOB_VERSION}
    restart: always
    hostname: novel-xxl-job-admin
    environment:
      - PARAMS=--spring.datasource.url=jdbc:mysql://novel-mysql:3306/xxl_job?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=Asia/Shanghai --spring.datasource.username=root --spring.datasource.password=${MYSQL_ROOT_PASSWORD} --xxl.job.accessToken=${XXLJOB_ACCESSTOKEN}
      - JAVA_OPTS=-Xmx512m
    volumes:
      - /data/docker/xxl-job-admin/data/applogs:/data/applogs
    ports:
      - "8080:8080"
    depends_on:
      - novel-mysql
    networks:
      - novelnet

  novel-nacos-server:
    container_name: novel-nacos-server
    image: nacos/nacos-server:${NACOS_VERSION}
    restart: always
    hostname: novel-nacos-server
    environment:
      - PREFER_HOST_MODE=hostname
      - MODE=standalone
      - SPRING_DATASOURCE_PLATFORM=mysql
      - MYSQL_SERVICE_HOST=novel-mysql
      - MYSQL_SERVICE_DB_NAME=nacos
      - MYSQL_SERVICE_PORT=3306
      - MYSQL_SERVICE_USER=root
      - MYSQL_SERVICE_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_SERVICE_DB_PARAM=characterEncoding=utf8&connectTimeout=1000&socketTimeout=3000&autoReconnect=true&useSSL=false&allowPublicKeyRetrieval=true
      - NACOS_AUTH_IDENTITY_KEY=xxyopen
      - NACOS_AUTH_IDENTITY_VALUE=xxyopen
      - NACOS_AUTH_TOKEN=SecretKey012345678901234567890123456789012345678901234567890123456789
      - JVM_XMS=125M
      - JVM_XMX=125M
      - JVM_XMN=50M
      - JVM_MS=50M
      - JVM_MMS=50M
    ports:
      - "8848:8848"
      - "9848:9848"
    depends_on:
      - novel-mysql
    networks:
      - novelnet

networks:
  novelnet:
    driver: bridge

```
其中的mysql部分需要修改，把端口，初始化sql存放的地方和数据存放的地方改一下
改成3308端口和后端文件夹下data文件夹里面
```
    volumes:

      - "./data/docker/mysql/data:/var/lib/mysql"

      - "./data/docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql"
        
     ports:

      - "3308:3306"
```

在后端文件夹下执行命令
```
sudo docker-compose up -d
```

https://gitee.com/novel_dev_team/novel/blob/master/doc/sql/novel.sql.zip  去这个网站下载一下这个压缩包，然后上navicat连一下数据库，去库里的novel-cloud先新建一个查询，执行
```sql
set names utf8mb4
```
然后在novel-cloud运行一下压缩包中的novel_data.sql，运行完可以看看book开头的几个有没有数据

然后登陆http://localhost:5601/，用下面的账户密码登录klibana控制台
```
elastic
Fy2JWjJ1hcO2mi1USFL1
```
在左侧导航栏 -> Management -> Dev Tools
执行下面命令
```
PUT /book
{
  "mappings" : {
    "properties" : {
      "id" : {
        "type" : "long"
      },
      "authorId" : {
        "type" : "long"
      },
      "authorName" : {
        "type" : "text",
        "analyzer": "standard"
      },
      "bookName" : {
        "type" : "text",
        "analyzer": "standard"
      },
      "bookDesc" : {
        "type" : "text",
        "analyzer": "standard"
      },
      "bookStatus" : {
        "type" : "short"
      },
      "categoryId" : {
        "type" : "integer"
      },
      "categoryName" : {
        "type" : "text",
        "analyzer": "standard"
      },
      "lastChapterId" : {
        "type" : "long"
      },
      "lastChapterName" : {
        "type" : "text",
        "analyzer": "standard"
      },
      "lastChapterUpdateTime" : {
        "type": "long"
      },
      "picUrl" : {
        "type" : "keyword",
        "index" : false,
        "doc_values" : false
      },
      "score" : {
        "type" : "integer"
      },
      "wordCount" : {
        "type" : "integer"
      },
      "workDirection" : {
        "type" : "short"
      },
      "visitCount" : {
        "type": "long"
      }
    }
  }
}
```
执行完状态码是200就ok

访问 http://localhost:8848/nacos 用用户名nacos 密码nacos 登录
然后右上角导入配置，直接把doc/nacos下的压缩包导入进去就好了
然后里面修改一下配置，mysql要端口为3308，数据库改为novel_cloud，其他的要把服务器地址改一下，改成本机，因为都是部署在本机的docker上的，后面如果用linux的docker改成linux上的就好。redis的密码要改一下然后取消注释。

修改 novel-cloud/novel-core/novel-config/src/main/resources/bootstrap-common.yml、novel-cloud/novel-gateway/src/main/resources/bootstrap.yml 中的 Nacos 配置中心地址和 novel-cloud/novel-core/novel-config/src/main/resources/application-common.yml、novel-cloud/novel-monitor/src/main/resources/application.yml、novel-cloud/novel-gateway/src/main/resources/application.yml 中的 Nacos 注册中心地址。

在主工程的pom中修改
```
<java.version>21</java.version>
```
添加
```
<lombok.version>1.18.30</lombok.version>
```

然后启动所有微服务
访问 http://localhost:8080/xxl-job-admin/toLogin
用户名 admin 密码 123456
点击任务管理菜单，执行同步小说数据到 Elasticsearch 的任务导入 MySQL 中的小说数据到 Elasticsearch。

启动微服务要先把容器都启动一下
```
docker-compose up -d
```


前端部分
下载源码
```
git clone https://gitee.com/novel_dev_team/novel-front-web.git
```
然后下一个node17，高了会不兼容

```
npm install -g yarn
yarn install
```
启动
```
yarn serve
```

