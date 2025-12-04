##### 杂谈
作用：
备份、代码还原、协同开发、追溯问题代码的编写人和编写时间

写命令的时候别习惯性在符号和单词中间空格
在git中左键选中，就可以直接右键粘贴这个内容了
##### 指令
###### 配置用户信息
刚下载完设置用户信息，打开Git Bash，输入下述指令
```
git config --global user.name "flowers"
git config --global user.email "2465604425@qq.com"
```
查看配置的用户信息
```
git config --global user.name 
git config --global user.email 
```
###### 创建本地仓库
进入对应的文件夹
在这个目录下右键打开Git bash窗口
执行命令
```
git init
```
创建成功后可在文件夹下看到隐藏的.git目录
###### 基础操作指令
分为三个区域：工作区（本地文件夹）、暂存区（提交到仓库前的缓存区）、仓库
工作区->暂存区
把所有文件都添加到暂存区
```
git add .
```
把其中某个文件添加到暂存区
```
git add 文件名
```

暂存区->本地仓库（会提交暂存区中的所有内容）
```
git commit -m "该版本的相关注释"
```

查看操作过的文件状态
```
git status
```
工作区->untracked(新建未add)/unstaged(修改未add)
暂存区->changes to be commited(未commit)

查看提交记录(提交人、时间、注释)
```
git log [option]
```
option包括
```
--all 显示所有分支 

--pretty=oneline 将提交信息显示为一行

--abbrev-commit 使得输出的commited更简短

--graph 以图的形式显示
```
可以同时用上多个选项
```
git log [option1] [option2]

git log --all --abbrev-commit --pretty=oneline --graph
```

版本切换
```
git reset --hard commitID
```
commitID可以通过git log指令查看（字母+数字组合的那个就是）
然后clear完可能提交记录就没了，只有一些记录了
那些版本并没有丢，可以通过

```
git reflog
```
命令查看，它会把之前你做的操作给记录下来，其中就包括了原始版本号和最终版本号（如果有更改的话）

对一些文件不进行git管理
先创建.gitignore文件
```
touch .gitignore
```
然后编辑这个文件，放入相应内容即可，具体的编辑规则
```
/test.txt 忽略根目录下的text.txt文件

/test/test.txt 忽略根目录下的test目录下的test.txt文件

text.txt 忽略全部的test.txt文件

test/ 忽略test目录及其所有内容

test 忽略任何名字带有test的文件和目录

img* 忽略所有以img开头的文件和目录

*.md 忽略所有以.md为扩展名的文件

!README.md 不想忽略这个文件（如果忽略了它整个目录这样也没用了）
```
忽略之前已经提交过的文件（假设不小心提交了一个存储环境变量的.env文件）
```
echo ".env" >> .gitignore  1.给ignore文件里面加上它
git rm --cached .env  2.把它从索引中删除（如果本地也想删可不加--cached）
git add .gitignore  3.提交一下ignore
git commit -m "update ignored files"
```
###### 分支
协同开发中每个人开发一部分->分配一个分支，最后合并代码
查看分支
```
git branch
```
创建新分支
```
git branch 分支名
```
切换分支
```
git checkout 分支名
git checkout -b 分支名 创建一个新分支并且切换到该分支
```
合并分支
一般把其他分支合并到Master上，切换到Master分支后执行下述命令
合并完是不用add+commit的，直接弄到仓库去了

```
git merge 其他分支名
```
删除分支（不能删除当前分支）
```
git branch -d 分支名 删除分支时，需要做各种检查
git branch -D 分支名 不做任何检查，强制删除
```
 在某个分支上有修改但没merge的话就不能直接删除，确认无误可以用-D删了
解决冲突（两个分支做了一样的事情，修改了同个文件的同一行代码这样的，这样再合并就会出问题，不懂用谁的文件/修改）
这时候需要解决冲突的地方（打开冲突的文件就可以看到），大概是下面这样

```
<<<<<<<<<<<<HEAD
count=1
============
count=2
>>>>>>>>>>>>Dev
```
解决的话你把它的提示符删了然后改成正确的结果
```
count=3
```
之后add+commit就行了

分支使用规范
--master/release xx 生产分支
线上分支，主分支，中小规模项目作为线上运行的应用对应的分支
--develop 开发分支
是从master创建的分支，一般作为开发部门的主要开发分支，如果没有其他并行开发不同期上线要求，都可以在此版本进行开发，阶段开发完成后，需要合并到master分支，准备上线
--feature/xxx分支
从develop创建的分支，一般是同期并行开发，但不同期上线时创建的分支，分支上的研发任务完成后合并到develop分支
同期并行开发不同期上线---就是有些活动代码先提前写好？
对应某个新功能，开发完就可以删了
--hotfix/xxx分支
从master派生的分支，一般作为线上bug修复使用，修复完成后需要合并到master、test、develop分支。
--其他分支   test->代码测试   pre->预上线

快进模式
没太听懂，大概就是分支1比master多add了一个file，然后你想要合并分支1到master的话不是按合并进行的，是直接给master也add这个file来达到一样的效果。

###### 配合远程仓库使用
上面的内容是听的黑马的课程，下面是让GPT教的
添加远程仓库
```
git remote add origin <远程仓库URL>
```
点进仓库首页那时候的地址就是对应的URL了

查看远程仓库地址
```
git remote -v
```
返回结果
```
origin  https://github.com/flowers-59f/test (fetch) 
origin  https://github.com/flowers-59f/test (push)  
因为git是支持从A仓库拉然后推到B仓库的（团队协作时比较多用？）  
```
fetch 拉取远程仓库的数据
push 推送本地提交的到远程
修改远程仓库地址
```
git remote set-url origin <新URL>
```

从GitHub拉取代码
拉取远程全部内容（不自动合并）这个指令默认是拉取所有分支的，如果只想拉取其中一个分支，在后面要带上分支名
```
git fetch origin
```
拉取并合并到当前分支
```
git pull origin 远程分支名
等价于
git fetch origin 远程分支名
git merge origin/远程分支名
```
合并的话是和当前分支合并。
然后merge的时候因为我本地文件夹和远程仓库是分别创建的，报了一个提示，大概就是说他们不同源吧。
```
fatal: refusing to merge unrelated histories
```
还是想合并的话用下面这个指令
```
git merge origin/远程分支名 --allow-unrelated-histories
```
强制使本地与远程一致(会覆盖本地)
```
git fetch --all
git reset -- hard origin/main
```
**推送到Github**
第一次推送本地main分支并设置跟踪远程
```
git push -u origin 本地分支名:远程仓库分支名
git push -u origin 本地分支名
```
没设置这个远程仓库分支名的话会默认推送到同名的分支，如果远程仓库没有这个分支的话，会默认创建一个这个名字的分支出来。
普通推送
```
git push
```
如果第一次直接用git push的话会提示错误，让你指定一个分支，因为它不懂这个本地分支要提交到哪去，可以通过下面的代码指定。用上面那个第一次推送的也行，两个是一样的。
```
git push --set-upstream origin 本地分支名:远程仓库分支名
```
强制推送
```
git push -f orgin main
```
**分支操作**
推送一个新分支哦到Github
```
git push -u origin 本地分支名
```
拉取一个远程分支
```
git checkout -b 本地分支名 origin/远程分支名
```
这个命令会在本地创建出一个分支，然后并拉取远程分支内容作为其起始内容
删除远程分支（直接把远程仓库的分支删了）
```
git push origin --delete 分支名
```
**解决冲突&多人协作常用命令**
查看本地分支与远程是否分叉
1.工作区是否有修改
2.暂存区是否有内容等待commit
3.当前分支与远程分支是否同步（本地仓库commit的有没有push）
```
git status
```
拉取远程最新变更并 rebase
```
git pull --rebase origin 远程分支名
等价于
git fetch origin
git rebase origin/main
```
rebase就是把远程分支的一些没有的commit拉下来到当前本地分支，并把本地的commit排前面。就是本地有commit C->D。远程有commit A->B。拉下来之后就是 A->B->C'->D'。
C'、D'的意思是会把A、B的改动先拉取下来然后应用到你原本的C、D上变成C'、D'。
**Github Clone相关**
克隆远程仓库到本地=下载代码 + 初始化git + 绑定远程仓库
到一个想代码的目录下，打开Git Bash然后用这个命令就行了
会自动帮你创建文件夹然后把东西放进去
```
git clone <URL>
```
克隆但不自动checkout到工作区（少用）
```
git clone -n <URL>
```
**远程tag操作**
tag就是给一个commit起名字，以后可以快速找到它
推送tag
```
git push origin <tag>
```
推送所有tag
```
git push origin --tags
```
删除远程tag
```
git push origin :refs/tags/<tag>
```
使用实例
```
git commit -m "完成登录功能"
git tag v1.0
git push origin v1.0
```