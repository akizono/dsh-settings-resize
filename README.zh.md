# dsh-settings-resize

[English](README.md) | 中文

dsh-settings-resize 是一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件，让设置对话框可以调整宽度。拖动面板右侧边缘即可改变宽度，下次打开会沿用上次的宽度。

DSH 的设置窗口是固定的 800 × 800 弹窗。在宽屏显示器上，它两侧会空出很大一片，而且没有内置设置可以修改。这个插件在面板右侧加了一个拖拽手柄；面板保持居中，向两侧同时伸缩。

## 安装

1. 下载或克隆本仓库。
2. 在 DSH 中打开 **插件（Plugins）**，选择 **添加插件（Add plugin）**，选中本目录（包含 `package.json` 的那一层）。
3. 刷新页面并打开设置。面板右侧会有一条竖向指示条，标出拖拽手柄的位置。

插件以本地 bundle 的形式安装，直接跟随本目录中的文件。移除该 bundle 并刷新后，就会恢复默认的 800 px 对话框；不会修改 DSH 安装目录里的任何文件。

## 使用

| 操作 | 效果 |
| --- | --- |
| 把鼠标移到面板右侧 | 指示条变亮，并弹出提示说明操作 |
| 拖动指示条 | 在 560 px 到「视口宽度 − 48 px」之间调整宽度 |
| 双击指示条，或聚焦后按 Home | 恢复 800 px，并清除已保存的宽度 |
| 聚焦指示条，按 ← / → | 每次调整 16 px（按住 Shift 为 64 px） |

拖动或用键盘调整时，手柄上会显示当前宽度的像素值。手柄带有 `separator` 角色、可访问名称和实时的 `aria-valuenow`，不用鼠标也能操作。

## 功能

- 拖动面板右侧边缘调整宽度；面板始终居中，所以两侧对称伸缩。
- 选定的宽度保存在 `localStorage`，关闭设置、刷新页面后仍然生效。
- 键盘调整：方向键微调，Shift 加速，Home 复位。
- 调整时显示宽度数值，手柄带提示文字。
- 只在视口宽度不小于 768 px 时启用，也就是 DSH 使用居中桌面弹窗的布局；低于该断点时 DSH 的整屏布局不受影响。
- 手柄是挂在 `<body>` 上的独立元素，不是面板的子元素，因此面板的内边距、滚动条和圆角都保持原样。
- 不修改 DSH 的任何文件：禁用插件后就是出厂设置窗口。

## 配置

没有设置页面，插件只读写一个值：

- 存储键：`dsh.settings-resize.width`
- 默认宽度：800 px
- 最小宽度：560 px
- 最大宽度：视口宽度 − 48 px

双击手柄或按 Home 会删除已保存的值，回到 800 px。

## 兼容性

在 Windows 上的 DSH 0.2.2-rc.5 中开发和测试。包的 `engines.dsh` 声明为 `>=0.1.0-rc.8 <0.3.0-0`，与其他已发布的前端插件一致。

插件通过对话框的公开属性 `data-shortcut-modal="settings"` 定位面板。如果未来的 DSH 版本删除或改名这个属性，插件就找不到面板，保持静默，显示原本的设置窗口。

## 实现说明

- `index.js` —— bundle 的宿主端；运行时不注册任何东西。
- `client.js` —— 全部功能：注入一个 `<style>` 把 CSS 自定义属性写到面板上，把拖拽手柄挂到 `document.body`，根据面板的包围盒定位，并处理指针与键盘输入。
- `cordis.patch.yml` —— 添加插件行的 bundle patch。
- `locale/en.json`、`locale/zh.json` —— 插件标题、描述和手柄的可访问名称。

宽度以 `--dsh-settings-resize-width` 写在 `<html>` 上，作用域为 768 px 及以上的视口。`document.body` 上的 `MutationObserver` 会在对话框打开时挂上手柄，关闭时移除。

## 开发

没有构建步骤：包内是普通的 ES 模块。修改后运行 `node --check client.js`，再重新安装或刷新 bundle，打开设置查看效果。

仓库就是一个目录；`package.json` 的 `files` 列出了打包发布所需的全部文件。

## 参与贡献

欢迎在 <https://github.com/akizono/dsh-settings-resize/issues> 提交问题或 PR。反馈布局问题时，请附上 DSH 版本和视口尺寸。

## 许可证

MIT，见 [LICENSE](LICENSE)。
