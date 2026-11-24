# dsh-settings-resize

English | [中文](README.zh.md)

dsh-settings-resize is a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that makes the Settings dialog resizable. Drag the panel's right or bottom edge to set its width and height, use the two buttons in its header to reset or fill the window, and the size you pick is remembered on the next visit.

DSH opens Settings as a fixed 800 × 800 modal. On a wide monitor that leaves large empty margins, on a short window it can overflow, and there is no built-in setting to change either dimension. This plugin adds a drag grip to the panel's right and bottom edges, plus a reset and a fullscreen control next to the close button. The panel stays centered while it grows or shrinks.

## Install

1. Download or clone this repository.
2. In DSH, open **Plugins** and choose **Add plugin**, then select this folder (the one containing `package.json`).
3. Reload the page and open Settings. Two short indicator bars mark the drag grips on the right and bottom edges, and two icon buttons appear left of the close button.

The plugin is installed as a local bundle, so it follows the files in this folder. Removing the bundle restores the stock 800 × 800 dialog after a reload; no DSH installation file is patched.

## Use

| Gesture | Effect |
| --- | --- |
| Point at the panel's right or bottom edge | The indicator brightens and a tooltip names the action |
| Drag the right grip | Resize the width from 560 px up to the viewport width − 48 px |
| Drag the bottom grip | Resize the height from 420 px up to the viewport height − 48 px |
| Click the reset button | Return to the default 800 × 800 and clear the stored size |
| Click the fullscreen button | Fill the DSH window; click again to restore the previous size |
| Double-click a grip, or focus it and press Home | Reset both dimensions and clear the stored size |
| Focus a grip, press an arrow key | Change that dimension by 16 px (hold Shift for 64 px) |

While you drag or nudge with the keyboard, a badge shows the current size as `width × height px`. Each grip is a separator with an accessible label and live `aria-valuenow`, and the two buttons carry `aria-label` plus a hover tooltip, so the whole feature works without a mouse.

## Features

- Drag the right edge for width and the bottom edge for height; both edges move symmetrically because the panel stays centered.
- A reset button in the header returns to 800 × 800, and a fullscreen button fills the DSH window with one click.
- The chosen size persists in `localStorage` and survives closing Settings and reloading the page.
- Keyboard resize with arrows, Shift for larger steps, Home to reset, and tooltips on every control.
- A size badge while adjusting, with localized labels in English and Chinese.
- Active only at 768 px and wider, where DSH renders the centered desktop modal. DSH's full-viewport layout below that breakpoint is left alone.
- The grips and buttons are separate elements on `<body>`, positioned from the panel's bounding box, so the panel's padding, scrollbars and rounded corners are untouched.
- No patched DSH files: disabling the plugin leaves the shipped dialog unchanged.

## Configuration

There is no settings page. The plugin reads and writes two values:

- Storage keys: `dsh.settings-resize.width` and `dsh.settings-resize.height`
- Default size: 800 × 800 px
- Minimum size: 560 × 420 px
- Maximum size: viewport size − 48 px on each axis

Double-clicking a grip, pressing Home, or clicking the reset button removes the stored values and returns to 800 × 800. Fullscreen is not stored; closing Settings leaves the panel at the last dragged size.

## Compatibility

Built and tested against DSH 0.2.2-rc.5 on Windows. The package declares `engines.dsh` as `>=0.1.0-rc.8 <0.3.0-0`, the range shared by other published client plugins.

The plugin finds the dialog through its public `data-shortcut-modal="settings"` attribute. If a future DSH release removes or renames that attribute, the plugin finds no panel, stays inert, and the stock dialog is shown.

## How it works

- `index.js` — host half of the bundle; registers nothing at runtime.
- `client.js` — the feature: injects one `<style>` element that sets two CSS custom properties on the panel, appends two grips and a button cluster to `document.body`, positions them from the panel's bounding box, and handles pointer and keyboard input.
- `cordis.patch.yml` — the bundle patch that adds the plugin row.
- `locale/en.json`, `locale/zh.json` — plugin title, description and the labels for the grips and buttons.

The size is applied as `--dsh-settings-resize-width` and `--dsh-settings-resize-height` on `<html>`, scoped to viewports of 768 px and wider. Fullscreen is a separate attribute on `<html>`. A `MutationObserver` on `document.body` attaches the controls when the dialog opens and removes them when the dialog closes.

## Development

There is no build step: the package ships plain ES modules. To check a change, run `node --check client.js`, then reinstall or reload the bundle and open Settings.

The repository is a single directory; `files` in `package.json` lists everything a packaged release needs.

## Contributing

Bug reports and pull requests are welcome at <https://github.com/akizono/dsh-settings-resize/issues>. Please describe the DSH version and viewport size when reporting layout issues.

## License

MIT. See [LICENSE](LICENSE).
