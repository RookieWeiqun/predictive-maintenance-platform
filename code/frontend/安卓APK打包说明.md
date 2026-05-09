# 安卓 APK 打包说明

## 1. 这套安卓 APK 用了什么技术

这不是一个“纯原生 Android Java 项目”，而是一套 **Web 前端 + Capacitor Android 壳** 的混合应用方案。

当前项目的主要技术组成如下：

- 前端界面：Vue 3
- 前端构建工具：Vite
- UI 组件：Siemens iX / `@siemens/ix-vue`
- 路由：Vue Router
- 图表：ECharts
- 本地离线数据库：`@capacitor-community/sqlite`
- Android 容器层：Capacitor
- Android 原生构建系统：Gradle
- Android 原生工程语言基础：Java / Kotlin 生态（当前工程主要由 Gradle + Android 插件驱动）

可以把它理解成：

1. 先把 Vue 页面打包成静态 Web 资源
2. 再把这些 Web 资源同步到 Android 工程里
3. 最后由 Android/Gradle 把整个 App 打成 APK

## 2. 项目中的关键入口

和安卓打包直接相关的关键文件：

- `package.json`
  - 定义了前端构建与 Capacitor 同步命令
- `capacitor.config.ts`
  - 定义 Android App 的 `appId`、`appName`、Web 输出目录 `dist`
- `android/app/build.gradle`
  - Android 应用模块配置，决定版本号、`debug/release` 构建类型等
- `android/build.gradle`
  - Android Gradle Plugin 配置
- `android/gradle/wrapper/gradle-wrapper.properties`
  - Gradle 版本配置

## 3. 当前 APK 的打包流程

### 3.1 前端打包

先把 Vue 前端打成适合 Android 使用的静态资源：

```powershell
Set-Location "d:\cwq\MyCode\PredictiveMaintenancePlatform\code\frontend"
npm run build:android
```

或者直接用项目里已经定义好的整合命令：

```powershell
npm run android:sync
```

`android:sync` 实际做的是：

```json
"android:sync": "npm run build:android && npx cap sync android"
```

也就是：

1. 执行 `vue-tsc && vite build --mode android`
2. 把生成的 `dist` 内容同步到 Android 工程

### 3.2 Capacitor 同步

Capacitor 会把前端构建结果同步进 Android 工程：

```powershell
npx cap sync android
```

同步后，Android 工程就拿到了最新的前端页面和资源。

### 3.3 Android 打包

进入 Android 工程目录，用 Gradle 生成 APK：

```powershell
Set-Location "d:\cwq\MyCode\PredictiveMaintenancePlatform\code\frontend\android"
.\gradlew assembleDebug
```

如果以后要出正式包，则是：

```powershell
.\gradlew assembleRelease
```

## 4. 打包产物在哪里

### Debug APK

常用测试包路径：

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

绝对路径通常是：

```text
d:\cwq\MyCode\PredictiveMaintenancePlatform\code\frontend\android\app\build\outputs\apk\debug\app-debug.apk
```

### Release APK

正式包通常会在：

```text
frontend/android/app/build/outputs/apk/release/app-release.apk
```

注意：正式包需要先配置签名，否则通常不能作为正式安装包交付。

## 5. Release 正式签名打包说明

当前项目的 [android/app/build.gradle](d:/cwq/MyCode/PredictiveMaintenancePlatform/code/frontend/android/app/build.gradle) 已经有 `release` 构建类型，但还没有配置正式签名，所以如果你要给客户长期使用，建议补上签名配置后再打 `release` 包。

### 5.1 为什么一定要正式签名

Android 的 `release` 包如果没有正式签名，会有几个实际问题：

- 无法作为规范的正式交付包长期维护
- 后续版本升级时，不能稳定覆盖安装
- 分发给客户后，包的可信度和可维护性都比较差

简单说：

- `debug`：适合测试
- `release + 正式签名`：适合交付

### 5.2 第一步：生成 keystore 证书

可以先在本机生成一个签名证书文件，例如 `pmplatform-release.jks`。

建议不要放在 Git 仓库里，放在单独的安全目录，比如：

```text
d:\android-keystore\pmplatform-release.jks
```

生成命令示例：

```powershell
keytool -genkeypair -v `
  -keystore "d:\android-keystore\pmplatform-release.jks" `
  -alias pmplatform `
  -keyalg RSA `
  -keysize 2048 `
  -validity 36500
```

执行后会让你输入：

- keystore 密码
- key 密码
- 证书持有者信息

这里的密码一定要保存好。以后你每次发新版正式包，都要用同一套证书，不然旧版本无法覆盖升级。

### 5.3 第二步：把签名参数放到本地配置里

不建议把密码直接写死进 Git 仓库。比较实用的做法是把参数放进本地的 [android/gradle.properties](d:/cwq/MyCode/PredictiveMaintenancePlatform/code/frontend/android/gradle.properties) 或者你自己维护的本地配置文件中。

例如可以在 [android/gradle.properties](d:/cwq/MyCode/PredictiveMaintenancePlatform/code/frontend/android/gradle.properties) 里追加：

```properties
RELEASE_STORE_FILE=d:/android-keystore/pmplatform-release.jks
RELEASE_STORE_PASSWORD=这里填你的keystore密码
RELEASE_KEY_ALIAS=pmplatform
RELEASE_KEY_PASSWORD=这里填你的key密码
```

如果你担心密码泄露，更稳妥的方式是：

- 只在本机保存这个文件
- 不把密码提交到仓库
- 团队内通过安全方式单独保管签名信息

### 5.4 第三步：修改 build.gradle 启用 signingConfig

当前 [android/app/build.gradle](d:/cwq/MyCode/PredictiveMaintenancePlatform/code/frontend/android/app/build.gradle) 里的 `release` 还没有挂签名配置。可以改成下面这种结构：

```gradle
apply plugin: 'com.android.application'

android {
  namespace = "com.predictivemaintenance.android"
  compileSdk = rootProject.ext.compileSdkVersion

  defaultConfig {
    applicationId "com.predictivemaintenance.android"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 1
    versionName "1.0"
    testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
  }

  signingConfigs {
    release {
      storeFile file(RELEASE_STORE_FILE)
      storePassword RELEASE_STORE_PASSWORD
      keyAlias RELEASE_KEY_ALIAS
      keyPassword RELEASE_KEY_PASSWORD
    }
  }

  buildTypes {
    release {
      minifyEnabled false
      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
      signingConfig signingConfigs.release
    }
  }
}
```

核心就是这两块：

- 新增 `signingConfigs.release`
- 在 `buildTypes.release` 里加 `signingConfig signingConfigs.release`

### 5.5 第四步：执行正式包打包

正式包打包前，仍然建议先同步前端资源：

```powershell
Set-Location "d:\cwq\MyCode\PredictiveMaintenancePlatform\code\frontend"
npm run android:sync
```

然后进入 Android 工程打正式包：

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Set-Location "d:\cwq\MyCode\PredictiveMaintenancePlatform\code\frontend\android"
.\gradlew assembleRelease
```

如果签名配置没问题，最终会生成：

```text
d:\cwq\MyCode\PredictiveMaintenancePlatform\code\frontend\android\app\build\outputs\apk\release\app-release.apk
```

### 5.6 第五步：建议校验一下 APK

打完正式包后，建议至少做两件事：

1. 安装到一台干净手机上测试
2. 确认旧版本是否能正常覆盖升级

如果你的 Android SDK 已配置完整，也可以额外做签名校验，例如：

```powershell
apksigner verify --verbose "d:\cwq\MyCode\PredictiveMaintenancePlatform\code\frontend\android\app\build\outputs\apk\release\app-release.apk"
```

### 5.7 正式签名的几个注意点

- keystore 文件一定要长期保存，丢了以后无法正常给旧包做升级
- 正式签名证书不要频繁更换
- `versionCode` 每发一个正式新版本，通常都要递增
- `versionName` 建议按业务版本维护，比如 `1.0.0`、`1.0.1`
- 签名密码不要直接发在群里或提交进仓库

## 6. Debug 和 Release 的区别

### Debug

特点：

- 适合开发和内部测试
- 默认使用调试签名
- 一般可以直接安装到测试手机上
- 更适合联调、验证功能

适用场景：

- 自己测试
- 发给同事试用
- 内测验证

### Release

特点：

- 用正式签名证书打包
- 适合长期交付和正式分发
- 后续升级覆盖安装更稳定
- 更适合发给客户或上架

适用场景：

- 发给外部用户长期安装
- 正式交付
- 应用市场上架

## 7. 这和 Java 到底是什么关系

这是最容易混淆的地方。

### 6.1 为什么前端项目还需要 Java

虽然你的业务页面是用 Vue 写的，但 **APK 不是 Vue 直接打出来的**。

最终 APK 是 Android 工程产物，而 Android 工程是通过：

- Gradle
- Android Gradle Plugin
- Android SDK
- JVM

这一套链路构建出来的。

这意味着：

- Vue 负责“页面和业务逻辑”
- Capacitor 负责“把网页装进 Android App 壳”
- Gradle 负责“真正生成 APK”
- Java/JDK 负责“运行 Gradle 和 Android 构建工具链”

所以这里 **Java 不是你主要写业务代码的语言**，但它是 Android 打包时必须依赖的运行环境。

### 6.2 为什么之前会报 Java 8 错误

因为你当前 Android 工程使用的是较新的构建链：

- Android Gradle Plugin：`8.13.0`
- Gradle：`8.14.3`

这套工具链要求至少 Java 11，实际更推荐 Java 17 或更高版本。

你之前机器默认跑的是 Java 8，所以 Gradle 直接报错：

- `Dependency requires at least JVM runtime version 11`

### 6.3 现在为什么能打包成功

因为已经切到了 Android Studio 自带的 JBR（本质上就是一套新的 JDK），版本足够新，可以满足 Android 构建要求。

你当前机器可用的 Java 路径是：

```text
C:\Program Files\Android\Android Studio\jbr
```

## 8. 推荐的打包命令

### 只做前端同步

```powershell
Set-Location "d:\cwq\MyCode\PredictiveMaintenancePlatform\code\frontend"
npm run android:sync
```

### 生成测试 APK

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Set-Location "d:\cwq\MyCode\PredictiveMaintenancePlatform\code\frontend\android"
.\gradlew assembleDebug
```

### 生成正式签名 APK

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Set-Location "d:\cwq\MyCode\PredictiveMaintenancePlatform\code\frontend"
npm run android:sync
Set-Location "d:\cwq\MyCode\PredictiveMaintenancePlatform\code\frontend\android"
.\gradlew assembleRelease
```

### 查看 Java 是否切对

```powershell
java -version
.\gradlew -version
```

## 9. 怎么把 APK 发给别人安装

如果是测试使用：

- 直接把 `app-debug.apk` 发给别人
- 常见方式：微信、QQ、钉钉、邮件、网盘、USB
- 对方手机安装时，需要允许“安装未知来源应用”

如果是正式交付：

- 建议使用 `release` 包
- 建议配置正式签名
- 建议维护 `versionCode` / `versionName`

## 10. 后续建议

如果后续要长期交付安卓安装包，建议补上这几件事：

1. 配置正式签名证书（keystore）
2. 在 `release` 构建中启用签名
3. 规范版本号：`versionCode`、`versionName`
4. 固定 Gradle 使用 Android Studio 的 JDK，避免再走到 Java 8
5. 视需要补充应用图标、应用名、启动页、权限说明

## 11. 一句话总结

这套 APK 的本质是：

- **Vue/Vite** 负责前端页面
- **Capacitor** 负责把前端装进 Android 应用
- **Gradle + Android SDK + Java(JDK)** 负责真正打出 APK

所以你主要写的是前端，但 APK 能不能成功生成，仍然依赖 Java 构建环境。
