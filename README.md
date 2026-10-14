# 东方课表

浙江财经大学东方学院课程表 Android 应用，支持教务系统导入、课程提醒、桌面小组件、校园地图和教学作息表。

## 下载

[下载 Android APK（v1.0.5）](release/dongfang-timetable-1.0.5.apk?raw=true)

最低支持 Android 8.0。下载 APK 后在手机上打开安装。教务系统导入需连接校园网并关闭代理。

## 源码

- `app/`：Android Java 外壳、WebView 页面、样式和应用资源
- `assets/`：校园地图、教学作息表及界面预览
- `docs/`：界面预览和使用说明
- `build.ps1`：Windows 本地构建脚本
- `release/`：当前 APK

页面本地运行；教务系统导入时才访问学校网站。请勿将自己的教务账号密码写入源码或公开提交。

## v1.0.4 更新

- 状态栏和页面共用连续背景，亮色、暗色和弹窗遮罩自然衔接。
- 小组件突出当前／下一课程、教室、节次与时间，支持实时倒计时。
- 大尺寸显示更多课程；今日无课时展示下次课程；支持系统暗色。
- 在课前、上下课和跨日时自动刷新，修复保存课表与组件刷新并发导致的锁等待。

按 [Android 官方系统栏适配指南](https://developer.android.com/develop/ui/views/layout/edge-to-edge) 处理透明系统栏、安全区域与图标对比度。小组件未授权准时提醒或设备休眠时，刷新可能受系统调度影响。

## v1.0.5 更新

- 自动合并同一天相邻的同一课程节次（间隔不超过 10 分钟），连续时间和节次合并显示。
- 合并后的课程只在首节开课前提醒一次，小组件同步显示完整节次与时间。
- 其他日期、不同教室或教师不一致的课程保持分开。

## 本地构建

需要 JDK 17、Android SDK Platform 35 和 Build Tools 35。提供本机 SDK、JDK 路径：

```powershell
./build.ps1 -Sdk 'C:/Android/Sdk' -JavaHome 'C:/Program Files/Android/Android Studio/jbr'
```

脚本会在本机生成 `local-signing.jks` 并提示设置签名密码，密钥文件已加入忽略规则。自行签名的 APK 可安装使用，但无法覆盖更新用另一把私钥签名的 APK；请保存好自己的密钥以便更新自行构建的版本。

## 附件

校园地图与教学作息表图片随源码提供，位于 `assets/`，应用内对应资源位于 `app/assets/`。
