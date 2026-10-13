# 东方课表

浙江财经大学东方学院课程表 Android 应用，支持教务系统导入、课程提醒、桌面小组件、校园地图和教学作息表。

## 下载

[下载 Android APK（v1.0.3）](release/dongfang-timetable-1.0.3.apk)

最低支持 Android 8.0。下载 APK 后在手机上打开安装。教务系统导入需连接校园网并关闭代理。

## 源码

- `app/`：Android Java 外壳、WebView 页面、样式和应用资源
- `assets/`：校园地图、教学作息表及界面预览
- `docs/`：界面预览和使用说明
- `build.ps1`：Windows 本地构建脚本
- `release/`：当前 APK

页面本地运行；教务系统导入时才访问学校网站。请勿将自己的教务账号密码写入源码或公开提交。

## 本地构建

需要 JDK 17、Android SDK Platform 35 和 Build Tools 35。提供本机 SDK、JDK 路径：

```powershell
./build.ps1 -Sdk 'C:/Android/Sdk' -JavaHome 'C:/Program Files/Android/Android Studio/jbr'
```

脚本会在本机生成 `local-signing.jks` 并提示设置签名密码，密钥文件已加入忽略规则。自行签名的 APK 可安装使用，但无法覆盖更新用另一把私钥签名的 APK；请保存好自己的密钥以便更新自行构建的版本。

## 附件

校园地图与教学作息表图片随源码提供，位于 `assets/`，应用内对应资源位于 `app/assets/`。
