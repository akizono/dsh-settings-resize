/**
 * Host half of dsh-settings-resize.
 *
 * The capability lives entirely in the browser: the Client module injects the
 * panel CSS, the drag grip, the keyboard handling, and the remembered width.
 * The Host row exists so the bundle has a plugin entry the profile can load
 * and list; it registers nothing.
 */

/** No Host-side resources. */
export function apply() {}
