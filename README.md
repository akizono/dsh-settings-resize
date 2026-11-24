# dsh-settings-resize

English | [中文](README.zh.md)

dsh-settings-resize is a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that makes the Settings dialog resizable. Drag the panel's right edge and the width you pick is remembered on the next visit.

DSH opens Settings as a fixed 800 × 800 modal. On a wide monitor that leaves large empty margins, and there is no built-in setting to change it. This plugin adds a drag grip to the panel's right edge; the panel stays centered while it grows or shrinks.

## Install

1. Download or clone this repository.
2. In DSH, open **Plugins** and choose **Add plugin**, then select this folder (the one containing `package.json`).
3. Reload the page and open Settings. A short vertical indicator on the panel's right edge marks the grip.

The plugin is installed as a local bundle, so it follows the files in this folder. Removing the bundle restores the stock 800 px dialog after a reload; no DSH installation file is patched.

## Use

| Gesture | Effect |
| --- | --- |
| Point at the panel's right edge | The indicator brightens and a tooltip names the action |
| Drag the grip | Resize from 560 px up to the viewport width − 48 px |
| Double-click the grip, or focus it and press Home | Reset to 800 px and clear the stored width |
| Focus the grip, press ArrowLeft / ArrowRight | Change width by 16 px (hold Shift for 64 px) |

While you drag or nudge with the keyboard, a badge shows the current width in pixels. The grip is a separator with an accessible label and live `aria-valuenow`, so it can be operated without a mouse.

## Features

- Drag the panel's right edge; both edges move symmetrically because the panel stays centered.
- The chosen width persists in `localStorage` and survives closing Settings and reloading the page.
- Keyboard resize with arrows, Shift for larger steps, Home to reset.
- Width badge while adjusting, and a tooltip on the grip.
- Active only at 768 px and wider, where DSH renders the centered desktop modal. DSH's full-viewport layout below that breakpoint is left alone.
- The grip is a separate element on `<body>`, not a child of the panel, so the panel's padding, scrollbars and rounded corners are untouched.
- No patched DSH files: disabling the plugin leaves the shipped dialog unchanged.

## Configuration

There is no settings page. The plugin reads and writes one value:

- Storage key: `dsh.settings-resize.width`
- Default width: 800 px
- Minimum width: 560 px
- Maximum width: viewport width − 48 px

Double-clicking the grip or pressing Home removes the stored value and returns to 800 px.

## Compatibility

Built and tested against DSH 0.2.2-rc.5 on Windows. The package declares `engines.dsh` as `>=0.1.0-rc.8 <0.3.0-0`, the range shared by other published client plugins.

The plugin finds the dialog through its public `data-shortcut-modal="settings"` attribute. If a future DSH release removes or renames that attribute, the plugin finds no panel, stays inert, and the stock dialog is shown.

## How it works

- `index.js` — host half of the bundle; registers nothing at runtime.
- `client.js` — the feature: injects one `<style>` element that sets a CSS custom property on the panel, appends the grip to `document.body`, positions it from the panel's bounding box, and handles pointer and keyboard input.
- `cordis.patch.yml` — the bundle patch that adds the plugin row.
- `locale/en.json`, `locale/zh.json` — plugin title, description and the grip's accessible label.

The width is applied as `--dsh-settings-resize-width` on `<html>`, scoped to viewports of 768 px and wider. A `MutationObserver` on `document.body` attaches the grip when the dialog opens and removes it when the dialog closes.

## Development

There is no build step: the package ships plain ES modules. To check a change, run `node --check client.js`, then reinstall or reload the bundle and open Settings.

The repository is a single directory; `files` in `package.json` lists everything a packaged release needs.

## Contributing

Bug reports and pull requests are welcome at <https://github.com/akizono/dsh-settings-resize/issues>. Please describe the DSH version and viewport size when reporting layout issues.

## License

MIT. See [LICENSE](LICENSE).
