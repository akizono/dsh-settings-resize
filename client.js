/**
 * Client half of dsh-settings-resize.
 *
 * The settings dialog is a fixed 800×800 modal in
 * `dsh-client-ui-settings-general` (`SettingsRoot.module.css`: `.panel {
 * width: 800px }`). This module makes its width user-adjustable without
 * touching any installed file:
 *
 * - a grip is mounted on `<body>`, just outside the panel's right edge, and
 *   positioned from the panel's own bounding box (no layout of the panel is
 *   mutated, so the stock dialog looks and scrolls exactly as before);
 * - dragging the grip changes the width, keeping the panel centered, between
 *   560px and the viewport width minus 48px;
 * - the chosen width is stored in `localStorage` and restored on the next open;
 * - double-click or Home resets to the shipped 800px;
 * - ArrowLeft/ArrowRight (Shift for a bigger step) work from the focused grip.
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
    const STORAGE_KEY = 'dsh.settings-resize.width';
    const WIDTH_VAR = '--dsh-settings-resize-width';
    const STATE_ATTR = 'data-dsh-settings-resize';
    const DEFAULT_WIDTH = 800;
    const MIN_WIDTH = 560;
    const VIEWPORT_GUTTER = 48;
    const DESKTOP_MIN_WIDTH = 768;
    const GRIP_CLASS = 'dsh-settings-resize-grip';
    const BADGE_CLASS = 'dsh-settings-resize-badge';
    const PANEL_SELECTOR = 'div[data-shortcut-modal="settings"]';

    const EN = {
      resize: 'Resize settings panel',
      hint: 'Drag to resize, double-click to reset',
    };
    const ZH = {
      resize: '调整设置面板宽度',
      hint: '拖动调整宽度，双击恢复默认',
    };

    const CSS = `
@media (min-width: ${DESKTOP_MIN_WIDTH}px) {
  div[data-shortcut-modal="settings"] {
    width: var(${WIDTH_VAR}, ${DEFAULT_WIDTH}px) !important;
  }

  .${GRIP_CLASS} {
    position: fixed;
    z-index: 1001;
    width: 12px;
    box-sizing: border-box;
    cursor: col-resize;
    touch-action: none;
    user-select: none;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .${GRIP_CLASS}::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 3px;
    height: 44px;
    border-radius: 0 2px 2px 0;
    background: var(--dsw-alias-label-secondary);
    transform: translateY(-50%);
    /* 0.75 of --dsw-alias-label-secondary keeps the idle bar at >= 3:1
       against the panel surface (the 3:1 minimum for a control's own
       indicator) while staying a quiet hairline. */
    opacity: 0.75;
    transition: opacity 120ms ease, width 120ms ease, height 120ms ease;
  }

  .${GRIP_CLASS}:hover::before,
  .${GRIP_CLASS}:focus-visible::before,
  html[${STATE_ATTR}] .${GRIP_CLASS}::before {
    width: 4px;
    height: 56px;
    opacity: 1;
  }

  .${GRIP_CLASS}:focus-visible {
    outline: 2px solid var(--dsw-alias-label-secondary);
    outline-offset: -2px;
  }

  .${BADGE_CLASS} {
    position: absolute;
    right: 18px;
    bottom: 14px;
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

  html[${STATE_ATTR}='dragging'] * {
    cursor: col-resize !important;
    user-select: none !important;
  }
}
`;

    function readStoredWidth() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === null) return undefined;
        const value = Number.parseFloat(raw);
        return Number.isFinite(value) ? value : undefined;
      } catch {
        return undefined;
      }
    }

    function storeWidth(width) {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(Math.round(width)));
      } catch {
        /* Storage can be unavailable; the panel still resizes for this open. */
      }
    }

    function clearStoredWidth() {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* Same as storeWidth: nothing to clean up when storage is blocked. */
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
        let grip = null;
        let badge = null;
        let resizeObserver = null;
        let flashTimer = 0;
        let stopDrag = () => {};

        const maxWidth = () => Math.max(MIN_WIDTH, window.innerWidth - VIEWPORT_GUTTER);
        const clampWidth = (width) => Math.min(Math.max(Math.round(width), MIN_WIDTH), maxWidth());
        const actualWidth = () => (panel ? panel.getBoundingClientRect().width : DEFAULT_WIDTH);

        /** Aligns the body-level grip with the panel's current box. */
        const place = () => {
          if (!panel || !grip) return;
          const rect = panel.getBoundingClientRect();
          if (rect.width < 1 || rect.height < 1) return;
          grip.style.top = Math.round(rect.top) + 'px';
          grip.style.left = Math.round(rect.right) + 'px';
          grip.style.height = Math.round(rect.height) + 'px';
        };

        const updateMetrics = () => {
          if (!grip) return;
          const width = Math.round(actualWidth());
          grip.setAttribute('aria-valuemax', String(Math.round(maxWidth())));
          grip.setAttribute('aria-valuenow', String(width));
          grip.setAttribute('aria-valuetext', width + ' px');
          if (badge) badge.textContent = width + ' px';
        };

        const setWidth = (width) => {
          const next = clampWidth(width);
          root.style.setProperty(WIDTH_VAR, next + 'px');
          place();
          updateMetrics();
        };

        const flash = () => {
          if (!grip) return;
          root.setAttribute(STATE_ATTR, 'adjusting');
          window.clearTimeout(flashTimer);
          flashTimer = window.setTimeout(() => {
            if (root.getAttribute(STATE_ATTR) === 'adjusting') root.removeAttribute(STATE_ATTR);
          }, 900);
        };

        const onWindowResize = () => {
          place();
          updateMetrics();
        };

        const detach = () => {
          stopDrag();
          stopDrag = () => {};
          window.clearTimeout(flashTimer);
          if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
          }
          window.removeEventListener('resize', onWindowResize);
          if (grip) grip.remove();
          grip = null;
          badge = null;
          panel = null;
          root.removeAttribute(STATE_ATTR);
        };

        const bindGrip = (element) => {
          let pointerId = null;
          let startX = 0;
          let startWidth = 0;

          const onPointerMove = (event) => {
            if (pointerId === null || event.pointerId !== pointerId) return;
            // The panel stays centered, so its right edge travels half of the
            // width change: width = start + 2 * dx makes the edge follow the
            // pointer exactly.
            setWidth(startWidth + 2 * (event.clientX - startX));
          };

          const removeDragListeners = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', finishDrag);
            window.removeEventListener('pointercancel', finishDrag);
            window.removeEventListener('blur', onBlur);
            const node = grip;
            if (node) node.removeEventListener('lostpointercapture', finishDrag);
          };

          const finishDrag = (event) => {
            if (pointerId === null) return;
            if (event && typeof event.pointerId === 'number' && event.pointerId !== pointerId) return;
            pointerId = null;
            removeDragListeners();
            root.removeAttribute(STATE_ATTR);
            const width = actualWidth();
            if (Math.round(width) !== Math.round(startWidth)) storeWidth(width);
          };

          const onBlur = () => finishDrag();

          stopDrag = () => finishDrag();

          grip.addEventListener('pointerdown', (event) => {
            if (event.button !== 0 || pointerId !== null) return;
            // Focus explicitly (instead of relying on the implicit pointer
            // focus) so ArrowLeft/ArrowRight keep working right after a drag.
            if (typeof grip.focus === 'function') grip.focus({ preventScroll: true });
            pointerId = event.pointerId;
            startX = event.clientX;
            startWidth = element.getBoundingClientRect().width;
            root.setAttribute(STATE_ATTR, 'dragging');
            try {
              grip.setPointerCapture(pointerId);
            } catch {
              /* Enhancement only: window-level listeners still track the drag. */
            }
            // Window-level listeners keep tracking even when the pointer leaves
            // the 12px grip or the browser drops the capture.
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', finishDrag);
            window.addEventListener('pointercancel', finishDrag);
            window.addEventListener('blur', onBlur);
            grip.addEventListener('lostpointercapture', finishDrag);
          });

          grip.addEventListener('keydown', (event) => {
            const step = event.shiftKey ? 64 : 16;
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              setWidth(actualWidth() - step);
              storeWidth(actualWidth());
              flash();
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              setWidth(actualWidth() + step);
              storeWidth(actualWidth());
              flash();
            } else if (event.key === 'Home') {
              event.preventDefault();
              clearStoredWidth();
              setWidth(DEFAULT_WIDTH);
              flash();
            }
          });

          grip.addEventListener('dblclick', (event) => {
            event.preventDefault();
            clearStoredWidth();
            setWidth(DEFAULT_WIDTH);
            flash();
          });
        };

        const attach = (element) => {
          detach();
          panel = element;
          grip = document.createElement('div');
          grip.className = GRIP_CLASS;
          grip.setAttribute('role', 'separator');
          grip.setAttribute('aria-orientation', 'vertical');
          grip.setAttribute('aria-label', t('resize'));
          grip.setAttribute('aria-valuemin', String(MIN_WIDTH));
          grip.setAttribute('title', t('hint'));
          grip.tabIndex = 0;

          badge = document.createElement('span');
          badge.className = BADGE_CLASS;
          badge.setAttribute('aria-hidden', 'true');
          grip.appendChild(badge);

          document.body.appendChild(grip);
          bindGrip(element);

          resizeObserver = new ResizeObserver(() => {
            place();
            updateMetrics();
          });
          resizeObserver.observe(element);
          window.addEventListener('resize', onWindowResize);

          setWidth(readStoredWidth() ?? DEFAULT_WIDTH);
        };

        // DSH's narrow layout (below 768px) is full-viewport and has no width
        // to adjust, so the grip only exists in the desktop layout.
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
        };
      }, 'settings-resize: settings panel');
    }

    exports.apply = apply;
    exports.inject = ['locale'];
    return module.exports;
  },
});
