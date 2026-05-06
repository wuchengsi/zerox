# 编译环境搭建指南

本文档记录当前项目在新 Windows 机器上搭建 Android 编译环境的步骤。项目是 React Native 应用，仓库包含 Android 和 iOS 工程；在 Windows 上只能构建 Android，iOS 需要 macOS 和 Xcode。

## 项目要求

当前项目的关键版本来自仓库配置：

- Node.js：`>= 22.11.0`
- React Native：`0.84.1`
- Android Gradle Wrapper：`9.0.0`
- Android SDK Platform：`36`
- Android Build Tools：`36.0.0`
- Android NDK：`28.0.12916984`
- Kotlin：`2.0.21`

相关配置文件：

- `package.json`
- `android/build.gradle`
- `android/gradle/wrapper/gradle-wrapper.properties`

## 需要安装的软件

### 1. Node.js

安装 Node.js 22 或更高版本。当前机器如果已经有 Node.js 24，也可以直接使用。

验证：

```powershell
node --version
```

输出版本应为 `v22.11.0` 或更高。

### 2. JDK 17

推荐安装 Temurin OpenJDK 17：

```powershell
winget install EclipseAdoptium.Temurin.17.JDK
```

安装后重新打开 PowerShell，验证：

```powershell
java -version
```

### 3. Android Studio

安装 Android Studio，并通过 Android Studio 的 SDK Manager 安装以下组件：

- Android SDK Platform `36`
- Android SDK Build-Tools `36.0.0`
- Android SDK Platform-Tools
- Android SDK Command-line Tools
- NDK `28.0.12916984`
- CMake，安装 Android Studio 推荐版本即可

如果需要运行到模拟器，还需要安装：

- Android Emulator
- 一个 Android Virtual Device

### 4. Bun 或 npm

仓库包含 `bun.lock`，推荐使用 Bun 安装依赖：

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

重新打开 PowerShell 后验证：

```powershell
bun --version
```

如果不使用 Bun，也可以使用 npm：

```powershell
npm --version
```

## 配置环境变量

默认 Android SDK 路径通常是：

```text
C:\Users\<你的用户名>\AppData\Local\Android\Sdk
```

可以用下面命令设置 Android 环境变量：

```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx ANDROID_SDK_ROOT "$env:LOCALAPPDATA\Android\Sdk"
setx PATH "$env:PATH;$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin"
```

设置 `JAVA_HOME`。如果使用 Temurin JDK 17，路径通常类似：

```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17"
setx PATH "$env:PATH;C:\Program Files\Eclipse Adoptium\jdk-17\bin"
```

注意：`setx` 修改的是新终端的环境变量。执行后请关闭当前 PowerShell，再重新打开。

重新打开 PowerShell 后验证：

```powershell
java -version
adb version
node --version
```

## 安装项目依赖

进入项目根目录：

```powershell
cd D:\code\zerox
```

使用 Bun：

```powershell
bun install
```

如果使用 npm：

```powershell
npm install
```

## 编译 Android Debug 包

先编译 debug 包验证环境：

```powershell
cd D:\code\zerox\android
.\gradlew.bat assembleDebug
```

成功后 APK 通常位于：

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

## 运行到模拟器或真机

先启动 Android 模拟器，或连接已打开 USB 调试的 Android 手机。

检查设备：

```powershell
adb devices
```

运行项目：

```powershell
cd D:\code\zerox
bun run android
```

如果没有使用 Bun：

```powershell
npx react-native run-android
```

## 编译 Release 包

生成 release APK：

```powershell
cd D:\code\zerox\android
.\gradlew.bat assembleRelease
```

生成 release AAB：

```powershell
cd D:\code\zerox\android
.\gradlew.bat bundleRelease
```

Release 构建需要签名配置。当前 Android 工程会读取：

```text
android\keystore.properties
```

该文件不应提交到 Git。格式示例：

```properties
ZERO_UPLOAD_STORE_FILE=zero-upload-key.keystore
ZERO_UPLOAD_STORE_PASSWORD=your_store_password
ZERO_UPLOAD_KEY_ALIAS=your_key_alias
ZERO_UPLOAD_KEY_PASSWORD=your_key_password
```

如果只是验证编译环境，优先使用 `assembleDebug`。

## 常见问题

### 找不到 java

现象：

```text
java: The term 'java' is not recognized
```

处理：

- 确认已安装 JDK 17
- 确认 `JAVA_HOME` 指向 JDK 目录
- 确认 `%JAVA_HOME%\bin` 已加入 `PATH`
- 重新打开 PowerShell

### 找不到 adb

处理：

- 确认 Android Studio 已安装 Android SDK Platform-Tools
- 确认 `ANDROID_HOME` 指向 Android SDK 目录
- 确认 `%ANDROID_HOME%\platform-tools` 已加入 `PATH`
- 重新打开 PowerShell

### NDK 版本不匹配

当前项目要求：

```text
28.0.12916984
```

处理：

- 打开 Android Studio
- 进入 SDK Manager
- 打开 SDK Tools
- 勾选 Show Package Details
- 安装 NDK `28.0.12916984`

### compileSdk 或 buildTools 缺失

当前项目要求：

```text
compileSdkVersion = 36
buildToolsVersion = 36.0.0
```

处理：

- 打开 Android Studio 的 SDK Manager
- 安装 Android SDK Platform `36`
- 安装 Android SDK Build-Tools `36.0.0`

## 推荐验证顺序

完成安装后按下面顺序验证：

```powershell
java -version
adb version
node --version
cd D:\code\zerox
bun install
cd android
.\gradlew.bat assembleDebug
```

只要 `assembleDebug` 成功，说明本机 Android 编译环境已经基本可用。
