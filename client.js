/**
 * Client half of dsh-settings-resize.
 *
 * The settings dialog is a fixed 800×800 modal in
 * `dsh-client-ui-settings-general` (`SettingsRoot.module.css`: `.panel {
 * width: 800px; height: min(800px, ...) }`). This module makes its size
 * user-adjustable without touching any installed file:
 *
 * - a right, a bottom and four corner grips are mounted on `<body>`, just
 *   outside the panel's edges, and positioned from the panel's own bounding
 *   box (no layout of the panel is mutated, so the stock dialog looks and
 *   scrolls as before); the grips paint nothing, only the cursor changes;
 * - dragging an edge or corner changes the size, keeping the panel centered,
 *   between 560×420 and the window minus 48px;
 * - two buttons join the dialog's header row, left of the close button and
 *   after the dialog's own actions: one restores the shipped 800×800, one
 *   fills the part of the window the mask covers (below the caption row);
 * - the chosen width and height are stored in `localStorage` and restored on
 *   the next open;
 * - double-click or Home on an edge resets both dimensions;
 * - ArrowLeft/ArrowRight resize the width and ArrowUp/ArrowDown the height
 *   (Shift for a bigger step) from the focused edge grip.
 *
 * The DOM contract is the panel's `data-shortcut-modal="settings"` attribute,
 * so a future DSH build that renames it simply falls back to the stock panel.
 */
window.__ModuleLoader__.load({
  id: 'dsh-settings-resize',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;

    const NS = 'settings-resize';
    const WIDTH_KEY = 'dsh.settings-resize.width';
    const HEIGHT_KEY = 'dsh.settings-resize.height';
    const WIDTH_VAR = '--dsh-settings-resize-width';
    const HEIGHT_VAR = '--dsh-settings-resize-height';
    const STATE_ATTR = 'data-dsh-settings-resize';
    const DRAG_ATTR = 'data-dsh-settings-resize-drag';
    const FULLSCREEN_ATTR = 'data-dsh-settings-resize-fullscreen';
    const DEFAULT_WIDTH = 800;
    const DEFAULT_HEIGHT = 800;
    const MIN_WIDTH = 560;
    const MIN_HEIGHT = 420;
    const VIEWPORT_GUTTER = 48;
    const DESKTOP_MIN_WIDTH = 768;
    const GRIP_SIZE = 12;
    const GRIP_CLASS = 'dsh-settings-resize-grip';
    const BADGE_CLASS = 'dsh-settings-resize-badge';
    const CONTROLS_CLASS = 'dsh-settings-resize-controls';
    const BUTTON_CLASS = 'dsh-settings-resize-button';
    const PANEL_SELECTOR = 'div[data-shortcut-modal="settings"]';

    const EN = {
      resizeWidth: 'Resize settings panel',
      resizeHeight: 'Resize settings panel height',
      resizeCorner: 'Resize settings panel',
      hintWidth: 'Drag to resize, double-click to reset',
      hintHeight: 'Drag to resize, double-click to reset',
      reset: 'Reset to default size',
      fullscreen: 'Fill the window',
      exitFullscreen: 'Restore previous size',
    };
    const ZH = {
      resizeWidth: '调整设置面板宽度',
      resizeHeight: '调整设置面板高度',
      resizeCorner: '调整设置面板宽高',
      hintWidth: '拖动调整宽度，双击恢复默认',
      hintHeight: '拖动调整高度，双击恢复默认',
      reset: '还原窗口默认宽高',
      fullscreen: '全屏显示设置窗口',
      exitFullscreen: '还原窗口大小',
    };

    const ICON_RESET = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
    const ICON_FULLSCREEN = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';

    const CSS = `
@media (min-width: ${DESKTOP_MIN_WIDTH}px) {
  div[data-shortcut-modal="settings"] {
    width: var(${WIDTH_VAR}, ${DEFAULT_WIDTH}px) !important;
    height: var(${HEIGHT_VAR}, ${DEFAULT_HEIGHT}px) !important;
    max-height: calc(100vh - ${VIEWPORT_GUTTER}px) !important;
  }

  /* The mask starts below the caption row, so the panel does too: filling the
     window must not cover the title bar's minimise/maximise/close controls. */
  html[${FULLSCREEN_ATTR}] div[data-shortcut-modal="settings"] {
    position: fixed !important;
    inset: var(--dsh-frame-chrome-top, 0px) 0 0 0 !important;
    width: auto !important;
    height: auto !important;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }

  html[${FULLSCREEN_ATTR}] .${GRIP_CLASS} {
    display: none;
  }

  .${GRIP_CLASS} {
    position: fixed;
    z-index: 1001;
    box-sizing: border-box;
    touch-action: none;
    user-select: none;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .${GRIP_CLASS}[data-axis='x'] {
    width: ${GRIP_SIZE}px;
    cursor: col-resize;
  }

  .${GRIP_CLASS}[data-axis='y'] {
    height: ${GRIP_SIZE}px;
    cursor: row-resize;
  }

  .${GRIP_CLASS}[data-corner] {
    width: ${GRIP_SIZE}px;
    height: ${GRIP_SIZE}px;
    z-index: 1002;
  }

  .${GRIP_CLASS}[data-corner='tl'],
  .${GRIP_CLASS}[data-corner='br'] {
    cursor: nwse-resize;
  }

  .${GRIP_CLASS}[data-corner='tr'],
  .${GRIP_CLASS}[data-corner='bl'] {
    cursor: nesw-resize;
  }

  .${GRIP_CLASS}:focus-visible {
    outline: 2px solid var(--dsw-alias-label-secondary);
    outline-offset: -2px;
  }

  .${CONTROLS_CLASS} {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
    align-self: flex-start;
  }

  .${BUTTON_CLASS} {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: var(--dsw-radius-sm);
    background: transparent;
    color: var(--dsw-alias-label-primary);
    cursor: pointer;
  }

  .${BUTTON_CLASS}:hover {
    background-color: var(--dsw-alias-interactive-bg-hover);
  }

  .${BUTTON_CLASS}:focus-visible {
    outline: 2px solid var(--dsw-alias-label-secondary);
    outline-offset: -2px;
  }

  .${BUTTON_CLASS}::after {
    content: attr(data-tooltip);
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 1;
    padding: 4px 8px;
    border: 1px solid var(--dsw-alias-border-l2);
    border-radius: var(--dsw-radius-sm, 6px);
    background: var(--dsw-alias-bg-layer-2);
    box-shadow: var(--dsw-elevation-prominent);
    color: var(--dsw-alias-label-primary);
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 100ms ease;
  }

  .${BUTTON_CLASS}:hover::after,
  .${BUTTON_CLASS}:focus-visible::after {
    opacity: 1;
  }

  .${BADGE_CLASS} {
    position: fixed;
    z-index: 1002;
    padding: 3px 8px;
    border: 1px solid var(--dsw-alias-border-l2);
    border-radius: var(--dsw-radius-sm, 6px);
    background: var(--dsw-alias-bg-layer-2);
    color: var(--dsw-alias-label-secondary);
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease;
  }

  html[${STATE_ATTR}] .${BADGE_CLASS} {
    opacity: 1;
  }

  html[${DRAG_ATTR}='x'] * {
    cursor: col-resize !important;
    user-select: none !important;
  }

  html[${DRAG_ATTR}='y'] * {
    cursor: row-resize !important;
    user-select: none !important;
  }

  html[${DRAG_ATTR}='nwse'] * {
    cursor: nwse-resize !important;
    user-select: none !important;
  }

  html[${DRAG_ATTR}='nesw'] * {
    cursor: nesw-resize !important;
    user-select: none !important;
  }
}
`;

    function readStored(key) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return undefined;
        const value = Number.parseFloat(raw);
        return Number.isFinite(value) ? value : undefined;
      } catch {
        return undefined;
      }
    }

    function storeSize(key, value) {
      try {
        window.localStorage.setItem(key, String(Math.round(value)));
      } catch {
        /* Storage can be unavailable; the panel still resizes for this open. */
      }
    }

    function clearStored(key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* Same as storeSize: nothing to clean up when storage is blocked. */
      }
    }

    /**
     * @param {import('@deepseek-ai/cordis').Context} ctx Client context.
     */
    function apply(ctx) {
      const t = ctx.locale.bind(NS);

      ctx.effect(() => ctx.locale.register(NS, { en: EN, zh: ZH }), 'settings-resize: dictionaries');

      ctx.effect(() => {
        const root = document.documentElement;
        const style = document.createElement('style');
        style.setAttribute('data-dsh-settings-resize-style', '');
        style.textContent = CSS;
        document.head.appendChild(style);

        let panel = null;
        let grips = [];
        let controls = null;
        let resetButton = null;
        let fullscreenButton = null;
        let badge = null;
        let resizeObserver = null;
        let flashTimer = 0;
        let stopDrags = [];

        const maxWidth = () => Math.max(MIN_WIDTH, window.innerWidth - VIEWPORT_GUTTER);
        const maxHeight = () => Math.max(MIN_HEIGHT, window.innerHeight - VIEWPORT_GUTTER);
        const clampWidth = (width) => Math.min(Math.max(Math.round(width), MIN_WIDTH), maxWidth());
        const clampHeight = (height) => Math.min(Math.max(Math.round(height), MIN_HEIGHT), maxHeight());
        const actualSize = () => {
          if (!panel) return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
          const rect = panel.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        };
        const isFullscreen = () => root.hasAttribute(FULLSCREEN_ATTR);

        /**
         * Aligns the body-level grips with the panel box. The edge grips leave
         * the corner squares to the corner grips so their cursors never fight.
         */
        const place = () => {
          if (!panel) return;
          const rect = panel.getBoundingClientRect();
          if (rect.width < 1 || rect.height < 1) return;

          for (const grip of grips) {
            const node = grip.node;
            const kind = grip.kind;
            if (kind === 'x') {
              node.style.top = Math.round(rect.top) + GRIP_SIZE + 'px';
              node.style.left = Math.round(rect.right) + 'px';
              node.style.height = Math.max(1, Math.round(rect.height) - GRIP_SIZE * 2) + 'px';
            } else if (kind === 'y') {
              node.style.left = Math.round(rect.left) + GRIP_SIZE + 'px';
              node.style.top = Math.round(rect.bottom) + 'px';
              node.style.width = Math.max(1, Math.round(rect.width) - GRIP_SIZE * 2) + 'px';
            } else {
              const left = kind === 'tl' || kind === 'bl' ? rect.left - GRIP_SIZE : rect.right;
              const top = kind === 'tl' || kind === 'tr' ? rect.top - GRIP_SIZE : rect.bottom;
              node.style.left = Math.round(left) + 'px';
              node.style.top = Math.round(top) + 'px';
            }
          }

          if (badge) {
            badge.style.right = Math.round(window.innerWidth - rect.right + 18) + 'px';
            badge.style.top = Math.round(rect.bottom - 44) + 'px';
          }
        };

        const updateMetrics = () => {
          if (!panel) return;
          const { width, height } = actualSize();
          const w = Math.round(width);
          const h = Math.round(height);
          const gripX = grips.find((grip) => grip.kind === 'x');
          const gripY = grips.find((grip) => grip.kind === 'y');
          if (gripX) {
            gripX.node.setAttribute('aria-valuemax', String(Math.round(maxWidth())));
            gripX.node.setAttribute('aria-valuenow', String(w));
            gripX.node.setAttribute('aria-valuetext', w + ' px');
          }
          if (gripY) {
            gripY.node.setAttribute('aria-valuemax', String(Math.round(maxHeight())));
            gripY.node.setAttribute('aria-valuenow', String(h));
            gripY.node.setAttribute('aria-valuetext', h + ' px');
          }
          if (badge) badge.textContent = w + ' × ' + h + ' px';
        };

        const setWidth = (width) => {
          root.style.setProperty(WIDTH_VAR, clampWidth(width) + 'px');
          place();
          updateMetrics();
        };

        const setHeight = (height) => {
          root.style.setProperty(HEIGHT_VAR, clampHeight(height) + 'px');
          place();
          updateMetrics();
        };

        const flash = () => {
          if (!panel) return;
          root.setAttribute(STATE_ATTR, 'adjusting');
          window.clearTimeout(flashTimer);
          flashTimer = window.setTimeout(() => {
            if (root.getAttribute(STATE_ATTR) === 'adjusting') root.removeAttribute(STATE_ATTR);
          }, 900);
        };

        const syncFullscreenButton = () => {
          if (!fullscreenButton) return;
          const active = isFullscreen();
          fullscreenButton.setAttribute('aria-pressed', active ? 'true' : 'false');
          fullscreenButton.setAttribute('aria-label', t(active ? 'exitFullscreen' : 'fullscreen'));
          fullscreenButton.dataset.tooltip = t(active ? 'exitFullscreen' : 'fullscreen');
        };

        const exitFullscreen = () => {
          root.removeAttribute(FULLSCREEN_ATTR);
          syncFullscreenButton();
          place();
          updateMetrics();
        };

        const resetSize = () => {
          clearStored(WIDTH_KEY);
          clearStored(HEIGHT_KEY);
          exitFullscreen();
          setWidth(DEFAULT_WIDTH);
          setHeight(DEFAULT_HEIGHT);
          flash();
        };

        const toggleFullscreen = () => {
          if (isFullscreen()) {
            exitFullscreen();
          } else {
            root.setAttribute(FULLSCREEN_ATTR, '');
            place();
            updateMetrics();
            syncFullscreenButton();
          }
          flash();
        };

        const onWindowResize = () => {
          place();
          updateMetrics();
        };

        const makeButton = (label, tooltip, icon, onClick) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = BUTTON_CLASS;
          button.setAttribute('aria-label', label);
          button.dataset.tooltip = tooltip;
          button.innerHTML = icon;
          button.addEventListener('click', onClick);
          return button;
        };

        /**
         * @param {'x' | 'y' | 'tl' | 'tr' | 'bl' | 'br'} kind
         * @returns {{ sx: number, sy: number }}
         */
        const signsFor = (kind) => {
          if (kind === 'x') return { sx: 1, sy: 0 };
          if (kind === 'y') return { sx: 0, sy: 1 };
          const sx = kind === 'tl' || kind === 'bl' ? -1 : 1;
          const sy = kind === 'tl' || kind === 'tr' ? -1 : 1;
          return { sx, sy };
        };

        const bindGrip = (grip, kind) => {
          const { sx, sy } = signsFor(kind);
          const isEdge = kind === 'x' || kind === 'y';
          let pointerId = null;
          let startX = 0;
          let startY = 0;
          let startWidth = 0;
          let startHeight = 0;

          const onPointerMove = (event) => {
            if (pointerId === null || event.pointerId !== pointerId) return;
            // The panel stays centered on both axes, so an edge travels half
            // of the size change: size = start + 2 * delta makes the dragged
            // edge (or corner) follow the pointer exactly.
            if (sx !== 0) setWidth(startWidth + sx * 2 * (event.clientX - startX));
            if (sy !== 0) setHeight(startHeight + sy * 2 * (event.clientY - startY));
          };

          const removeDragListeners = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', finishDrag);
            window.removeEventListener('pointercancel', finishDrag);
            window.removeEventListener('blur', onBlur);
            grip.node.removeEventListener('lostpointercapture', finishDrag);
          };

          const finishDrag = (event) => {
            if (pointerId === null) return;
            if (event && typeof event.pointerId === 'number' && event.pointerId !== pointerId) return;
            pointerId = null;
            removeDragListeners();
            root.removeAttribute(STATE_ATTR);
            root.removeAttribute(DRAG_ATTR);
            const { width, height } = actualSize();
            if (sx !== 0 && Math.round(width) !== Math.round(startWidth)) storeSize(WIDTH_KEY, width);
            if (sy !== 0 && Math.round(height) !== Math.round(startHeight)) storeSize(HEIGHT_KEY, height);
          };

          const onBlur = () => finishDrag();

          grip.node.addEventListener('pointerdown', (event) => {
            if (event.button !== 0 || pointerId !== null) return;
            // Focus explicitly (instead of relying on the implicit pointer
            // focus) so the arrow keys keep working right after a drag.
            if (isEdge && typeof grip.node.focus === 'function') grip.node.focus({ preventScroll: true });
            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            const rect = panel.getBoundingClientRect();
            startWidth = rect.width;
            startHeight = rect.height;
            root.setAttribute(STATE_ATTR, 'dragging');
            root.setAttribute(DRAG_ATTR, kind === 'x' ? 'x' : kind === 'y' ? 'y' : isNwse(kind) ? 'nwse' : 'nesw');
            try {
              grip.node.setPointerCapture(pointerId);
            } catch {
              /* Enhancement only: window-level listeners still track the drag. */
            }
            // Window-level listeners keep tracking even when the pointer leaves
            // the 12px grip or the browser drops the capture.
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', finishDrag);
            window.addEventListener('pointercancel', finishDrag);
            window.addEventListener('blur', onBlur);
            grip.node.addEventListener('lostpointercapture', finishDrag);
          });

          if (isEdge) {
            grip.node.addEventListener('keydown', (event) => {
              const step = event.shiftKey ? 64 : 16;
              const forward = kind === 'x' ? 'ArrowRight' : 'ArrowDown';
              const backward = kind === 'x' ? 'ArrowLeft' : 'ArrowUp';
              if (event.key === backward || event.key === forward) {
                event.preventDefault();
                const rect = panel.getBoundingClientRect();
                const current = kind === 'x' ? rect.width : rect.height;
                const next = current + (event.key === forward ? step : -step);
                if (kind === 'x') {
                  setWidth(next);
                  storeSize(WIDTH_KEY, actualSize().width);
                } else {
                  setHeight(next);
                  storeSize(HEIGHT_KEY, actualSize().height);
                }
                flash();
              } else if (event.key === 'Home') {
                event.preventDefault();
                resetSize();
              }
            });

            grip.node.addEventListener('dblclick', (event) => {
              event.preventDefault();
              resetSize();
            });
          }

          stopDrags.push(() => finishDrag());
        };

        const isNwse = (kind) => kind === 'tl' || kind === 'br';

        const makeGrip = (kind) => {
          const node = document.createElement('div');
          node.className = GRIP_CLASS;
          if (kind === 'x') node.dataset.axis = 'x';
          else if (kind === 'y') node.dataset.axis = 'y';
          else node.dataset.corner = kind;
          node.setAttribute('title', t('hintWidth'));
          if (kind === 'x' || kind === 'y') {
            node.setAttribute('role', 'separator');
            node.setAttribute('aria-orientation', kind === 'x' ? 'vertical' : 'horizontal');
            node.setAttribute(
              'aria-label',
              t(kind === 'x' ? 'resizeWidth' : 'resizeHeight'),
            );
            node.setAttribute('aria-valuemin', String(kind === 'x' ? MIN_WIDTH : MIN_HEIGHT));
            node.tabIndex = 0;
          } else {
            node.setAttribute('aria-hidden', 'true');
            node.tabIndex = -1;
          }
          return { node, kind };
        };

        const detach = () => {
          for (const stop of stopDrags) stop();
          stopDrags = [];
          window.clearTimeout(flashTimer);
          if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
          }
          window.removeEventListener('resize', onWindowResize);
          for (const grip of grips) grip.node.remove();
          grips = [];
          for (const node of [controls, badge]) if (node) node.remove();
          controls = null;
          resetButton = null;
          fullscreenButton = null;
          badge = null;
          panel = null;
          root.removeAttribute(STATE_ATTR);
          root.removeAttribute(DRAG_ATTR);
          root.removeAttribute(FULLSCREEN_ATTR);
        };

        const attach = (element) => {
          detach();
          panel = element;

          const kinds = ['x', 'y', 'tl', 'tr', 'bl', 'br'];
          grips = kinds.map((kind) => makeGrip(kind));
          for (const grip of grips) document.body.appendChild(grip.node);

          badge = document.createElement('span');
          badge.className = BADGE_CLASS;
          badge.setAttribute('aria-hidden', 'true');
          document.body.appendChild(badge);

          // The two buttons belong to the dialog's header row. Sitting before
          // the close button in normal flow keeps them clear of the header's
          // own actions ("open config file") instead of covering them.
          controls = document.createElement('div');
          controls.className = CONTROLS_CLASS;
          resetButton = makeButton(t('reset'), t('reset'), ICON_RESET, resetSize);
          fullscreenButton = makeButton(t('fullscreen'), t('fullscreen'), ICON_FULLSCREEN, toggleFullscreen);
          fullscreenButton.setAttribute('aria-pressed', 'false');
          controls.appendChild(resetButton);
          controls.appendChild(fullscreenButton);

          const header = element.children && element.children[2];
          if (header) {
            const close = header.lastElementChild;
            if (close) header.insertBefore(controls, close);
            else header.appendChild(controls);
          }

          for (const grip of grips) bindGrip(grip, grip.kind);

          resizeObserver = new ResizeObserver(() => {
            place();
            updateMetrics();
          });
          resizeObserver.observe(element);
          window.addEventListener('resize', onWindowResize);

          // Fullscreen is a per-open mode, not a remembered preference: a fresh
          // dialog always reopens at the stored size.
          root.removeAttribute(FULLSCREEN_ATTR);
          syncFullscreenButton();

          setWidth(readStored(WIDTH_KEY) ?? DEFAULT_WIDTH);
          setHeight(readStored(HEIGHT_KEY) ?? DEFAULT_HEIGHT);
          place();
        };

        // DSH's narrow layout (below 768px) is full-viewport and has no size
        // to adjust, so the grips and buttons only exist in the desktop layout.
        const desktop = window.matchMedia('(min-width: ' + DESKTOP_MIN_WIDTH + 'px)');

        const sync = () => {
          if (!desktop.matches) {
            detach();
            return;
          }
          const element = document.querySelector(PANEL_SELECTOR);
          if (!element) {
            if (panel) detach();
            return;
          }
          if (element !== panel) attach(element);
        };

        // The dialog portals straight to <body>, so a shallow body observer is
        // enough to notice open and close without watching panel contents.
        const observer = new MutationObserver(sync);
        observer.observe(document.body || document.documentElement, { childList: true });
        desktop.addEventListener('change', sync);
        sync();

        return () => {
          observer.disconnect();
          desktop.removeEventListener('change', sync);
          detach();
          style.remove();
          root.style.removeProperty(WIDTH_VAR);
          root.style.removeProperty(HEIGHT_VAR);
        };
      }, 'settings-resize: settings panel');
    }

    exports.apply = apply;
    exports.inject = ['locale'];
    return module.exports;
  },
});
