# 水果大口吃 · Fruit Chomp!

[打开游戏](https://xinde.github.io/fruit-chomp/) · [下载电脑离线包](https://github.com/xinde/fruit-chomp/releases/latest/download/fruit-chomp-offline.zip)

一个用前置摄像头玩的 60 秒像素街机小游戏。水果会从果园远处飞向光圈。等水果靠近时张嘴，咬中后合嘴，再准备下一口。每个水果基础分为 10 分，每连续命中 3 个，单个水果多得 5 分，加成最高为 25 分。错过水果会重置连击。成绩只保存在当前浏览器。

## 开始游戏

1. 在支持摄像头和 WebAssembly 的现代浏览器中打开游戏，点击「开始游戏」并允许使用摄像头。
2. 把脸放进左下角的预览，合嘴片刻开始。离开画面会暂停计时，回到镜头前合嘴即可继续。
3. 也可以选择「免摄像头试玩」，在水果进圈时点画面或按空格键。暂停按钮和 Escape 键都可以暂停。

## 安装和离线运行

- **手机或电脑首次联网准备**。保持游戏页面打开，直到页脚显示「离线已就绪」。这表示游戏、面部模型和两种 WebAssembly 运行时均已缓存。通过「安装游戏」或浏览器的安装菜单添加应用。iPhone 和 iPad 可在 Safari 的分享菜单中选「添加到主屏幕」。之后断网也可以启动和使用摄像头。浏览器清除网站数据后需要重新准备。
- **给一台没有网络的电脑安装**。提前下载上方的 ZIP 文件，用 U 盘等方式复制到目标电脑并解压。电脑需已装 Python 3。进入解压后的文件夹，macOS / Linux 执行 `python3 start-offline.py`，Windows 执行 `py -3 start-offline.py`。脚本会在浏览器打开 `http://127.0.0.1:8018/`。保持终端开启，等待「离线已就绪」，再按浏览器提示安装。整个过程只访问本机。每次使用同一浏览器和地址可以保留纪录。
- 游戏需要浏览器提供安全上下文，以 HTTPS 或本机回环地址打开。双击 `index.html` 无法完成 PWA 安装。系统仍可要求授予本机摄像头权限。

## 实现

原生 JavaScript、Canvas 2D 和 Service Worker。Google MediaPipe Face Landmarker 的 `jawOpen` 表情系数与唇间距共同判断开合；上下阈值和闭嘴重置避免持续张嘴重复得分。摄像头画面只在设备内存中处理，结束本局或返回首页即释放摄像头。运行时、音乐合成代码、字体、模型和像素图都随游戏分发。

- [动动乐园的姿态识别说明](https://dongdongpark.com/for/ai-pe)
- [Google MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [第三方资源、版本与授权](THIRD_PARTY.md)

## 本地开发和发布

运行 `python3 start-offline.py` 即可本地预览，无需 npm 安装或构建。像素图已提交，可用 Pillow 和 `python3 scripts/art.py` 重新生成。修改前端资源后运行 `python3 scripts/build-cache.py`，更新离线清单及其内容版本。GitHub Pages 从 `main` 分支的根目录发布。发布离线 ZIP 时运行 `python3 scripts/package-offline.py /path/to/fruit-chomp-offline.zip`。

项目原创代码和像素美术使用 [MIT 许可证](LICENSE)。
