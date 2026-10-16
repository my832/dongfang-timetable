# 东方课表

浙江财经大学东方学院课程表 Android 应用，支持教务系统导入、课程提醒、桌面小组件、校园地图和教学作息表。

## 下载与安装

**当前版本：v1.0.7，最低支持 Android 8.0。**

- [下载安装包 APK](https://github.com/my832/dongfang-timetable/releases/download/v1.0.7/dongfang-timetable-1.0.7.apk)
- [查看 v1.0.7 发布说明与全部附件](https://github.com/my832/dongfang-timetable/releases/tag/v1.0.7)
- [下载源码包](https://github.com/my832/dongfang-timetable/releases/download/v1.0.7/dongfang-timetable-1.0.7-source.zip)
- [下载 SHA-256 校验文件](https://github.com/my832/dongfang-timetable/releases/download/v1.0.7/SHA256SUMS.txt)
- [历史版本](https://github.com/my832/dongfang-timetable/releases)

下载 APK 后在手机上打开安装。教务系统在线导入需连接校园网并关闭代理；日常查看课表在本地运行。

**签名说明：** v1.0.7 使用新的固定签名，可覆盖同一新签名的 v1.0.6。旧签名版本和临时签名预览版不能直接覆盖；重新安装前请先备份数据或保留课表导入文件。签名私钥与密码不随仓库或发布附件提供。

## v1.0.7 更新

- 日期栏、课程区域左右滑动均按一天切换，跨周自动跟随，保留周切换按钮。
- 点击课程查看日期、节次、时间、教室和教师；点击“正在上课”或“下一节”返回今天的课程。
- 时间表和校园地图等图片解码完成后再显示，使用固定不透明背景，减少打开时闪动。
- 导入课表、学期与作息、上课提醒、桌面小组件使用独立二级设置页，支持页面返回和系统返回。
- 昼夜切换、按钮和页面交互采用平滑过渡，减弱白天右上角按钮的突兀高光。
- 去除启动重复加载，缓存日期格式器与课程索引，按需生成设置字段。

完整说明见 [v1.0.7 更新记录](release/1.0.7.md)；历史改动见 [更新日志](docs/CHANGELOG.md)。

## 仓库结构

| 路径 | 内容 |
| --- | --- |
| `app/` | Android Java 外壳、WebView 页面、样式与应用资源 |
| `assets/` | 校园地图和教学作息表原始图片 |
| `docs/` | 使用说明、界面预览和更新日志 |
| `tests/` | 网页界面与触屏交互回归测试 |
| `release/` | 版本说明、历史 APK 和校验记录；正式下载请使用 Releases 附件 |
| `build.ps1` | Windows 本地构建脚本 |

## 本地构建

需要 JDK 17 或更高版本、Android SDK Platform 35 和 Build Tools 35。

```powershell
./build.ps1 -Sdk 'C:/Android/Sdk' -JavaHome 'C:/Program Files/Android/Android Studio/jbr'
```

首次构建会生成本地签名密钥并提示设置密码。如果需要覆盖更新已有的新签名版本，必须提供原先保存的固定密钥：

```powershell
./build.ps1 -Sdk 'C:/Android/Sdk' -JavaHome 'C:/Program Files/Android/Android Studio/jbr' -Keystore 'D:/Private/dongfang-release.p12'
```

请单独安全备份密钥和密码，不要提交到仓库。请勿将教务账号、密码或个人课表写入公开源码。

## 验证

界面回归测试需要 Node.js、Playwright 和 Chrome，在依赖可解析的环境下运行：

```text
node tests/ui-smoke.cjs
```

测试覆盖 5,000 条课程、触屏按天滑动与跨周、键盘、主题持久化、减少动态效果、延迟图片加载、课程详情、返回今天、二级设置页和返回操作。

v1.0.7 已通过 Android Java 编译、资源打包、DEX 生成、APK 签名及固定签名证书一致性检查。动画观感与启动耗时仍需手机实机验证。

## 使用说明与资源

- [使用说明](docs/使用说明.md)
- [校园地图](assets/campus-map.png)
- [教学作息时间表](assets/school-timetable.png)
- [许可证](LICENSE)
