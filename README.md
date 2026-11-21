# 水果大口吃 · Fruit Chomp!

[打开游戏](https://xinde.github.io/fruit-chomp/) · [下载电脑离线包](https://github.com/xinde/fruit-chomp/releases/latest/download/fruit-chomp-offline.zip)

一局 60 秒。先在舒服的坐姿下正对前置摄像头合嘴，游戏会记住头部的起始位置。头水平向左移，瞄准框就向左跟随；向右移则向右跟随。水果和炸弹会从远处依次飞来，最多 4 个同时在场。对准靠近的水果张嘴，合嘴后可以吃下一颗。

**饱腹值和大口吞**。普通咬中一个水果积一格，累积 5 格就会充满。此时双眼同时闭紧半秒，当前屏幕上的所有水果都会被吸入口中，炸弹继续飞行。吞下的水果计入分数、连击和结算数量。成功发动后饱腹值清零，需要重新用普通咬合蓄满。场上只有炸弹时会保留饱腹值。

每个水果基础分为 10 分，每连续命中 3 个，单个水果多得 5 分，加成最高为 25 分。每次掉落有 20% 的概率出现炸弹，普通咬合误吃扣 20 分并重置连击。放过炸弹保留连击，错过水果会重置连击。最高分保存在当前浏览器。

## 开始游戏

1. 在支持摄像头和 WebAssembly 的现代浏览器中打开游戏，点击「开始游戏」并允许使用摄像头。
2. 把脸放进左下角的预览，合嘴片刻开始。离开画面会暂停计时，回到镜头前合嘴即可继续。
3. 也可以选择「免摄像头试玩」，在水果靠近时点它所在的横向位置即可瞄准并尝试咬下。键盘可按住左右方向键移动，用空格键咬。饱腹值满后，点「大口吞」或按 F 键发动。暂停按钮和 Escape 键都可以暂停。

## 手机和 iPad

支持带前置摄像头的手机和平板。iPhone 和 iPad 推荐用 Safari，Android 推荐用 Chrome。手机、iPad 均可竖屏或横屏玩；进入游戏后画面会充满可用屏幕，避开刘海和主屏幕指示条。旋转屏幕会调整果园和触控区。切到其他应用会暂停并释放摄像头，返回点「继续游戏」重新定位面部，保留分数和时间。

iPhone 和 iPad 在 Safari 点「分享」→「添加到主屏幕」。如有「作为网页 App 打开」选项，将它开启。请从新图标启动一次，等这个窗口也显示「离线已就绪」，再断网。Android Chrome 可使用游戏内的「安装游戏」或浏览器菜单。同样可在安装后的窗口检查离线状态。

## 安装和离线运行

- **手机或电脑首次联网准备**。保持游戏页面打开，直到页脚显示「离线已就绪」。这表示游戏、面部模型和两种 WebAssembly 运行时均已缓存。通过「安装游戏」或浏览器的安装菜单添加应用。iPhone 和 iPad 可在 Safari 的分享菜单中选「添加到主屏幕」。之后断网也可以启动和使用摄像头。浏览器清除网站数据后需要重新准备。
- **给一台没有网络的电脑安装**。提前下载上方的 ZIP 文件，用 U 盘等方式复制到目标电脑并解压。电脑需已装 Python 3。进入解压后的文件夹，macOS / Linux 执行 `python3 start-offline.py`，Windows 执行 `py -3 start-offline.py`。脚本会在浏览器打开 `http://127.0.0.1:8018/`。保持终端开启，等待「离线已就绪」，再按浏览器提示安装。整个过程只访问本机。每次使用同一浏览器和地址可以保留纪录。
- 游戏需要浏览器提供安全上下文，以 HTTPS 或本机回环地址打开。双击 `index.html` 无法完成 PWA 安装。系统仍可要求授予本机摄像头权限。

## 实现

原生 JavaScript、Canvas 2D 和 Service Worker。Google MediaPipe Face Landmarker 的 `jawOpen` 表情系数与唇间距共同判断开合；上下阈值和闭嘴重置避免持续张嘴重复得分。瞄准读取两颊中点的横向位移，经镜像映射、居中校准和轻度平滑后跟随玩家。双眼闭合结合眼睑间距和眨眼系数判断，连续闭眼半秒才会发动大口吞。摄像头画面只在设备内存中处理，结束本局或返回首页即释放摄像头。运行时、音乐合成代码、字体、模型和像素图都随游戏分发。

- [动动乐园的姿态识别说明](https://dongdongpark.com/for/ai-pe)
- [Google MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [第三方资源、版本与授权](THIRD_PARTY.md)

## 本地开发和发布

运行 `python3 start-offline.py` 即可本地预览，无需 npm 安装或构建。像素图已提交，可用 Pillow 和 `python3 scripts/art.py` 重新生成。修改前端资源后运行 `python3 scripts/build-cache.py`，更新离线清单及其内容版本。GitHub Pages 从 `main` 分支的根目录发布。发布离线 ZIP 时运行 `python3 scripts/package-offline.py /path/to/fruit-chomp-offline.zip`。

项目原创代码和像素美术使用 [MIT 许可证](LICENSE)。
