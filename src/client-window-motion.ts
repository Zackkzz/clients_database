/** Connect a native detail dialog to its table opener without delaying focus.
 * Geometry is captured only at transition boundaries; no per-frame layout work.
 */
export function clientWindowMotion(
  dialog: HTMLDialogElement,
  opener: HTMLElement | null,
) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animation: Animation | undefined;
  let closing = false;
  let disposed = false;
  function originTransform(): string | undefined {
    const row = opener?.closest("tr");
    if (!row?.isConnected) return;
    const source = row.getBoundingClientRect();
    const target = dialog.getBoundingClientRect();
    if (
      !target.width ||
      !target.height ||
      source.bottom < 0 ||
      source.top > innerHeight
    )
      return;
    // A wide table may extend beyond the viewport; use its visible row segment.
    const left = Math.max(0, source.left);
    const right = Math.min(innerWidth, source.right);
    if (right <= left) return;
    return `translate(${left - target.left}px, ${source.top - target.top}px) scale(${(right - left) / target.width}, ${source.height / target.height})`;
  }
  const enabled = () =>
    !preference.matches && typeof dialog.animate === "function";
  const origin = originTransform();
  if (enabled() && origin) {
    animation = dialog.animate(
      [
        { transform: origin, opacity: 0.25 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  }
  const interrupt = () => animation?.cancel();
  // Resizing invalidates captured geometry; settle immediately at the final UI.
  window.addEventListener("resize", interrupt);
  preference.addEventListener("change", interrupt);
  return {
    async close(done: () => void) {
      if (closing || disposed) return;
      closing = true;
      const current = getComputedStyle(dialog);
      const start = { transform: current.transform, opacity: current.opacity };
      animation?.cancel();
      const destination = originTransform();
      if (enabled() && destination) {
        animation = dialog.animate(
          [start, { transform: destination, opacity: 0 }],
          {
            duration: 160,
            easing: "cubic-bezier(0.4, 0, 1, 1)",
            fill: "forwards",
          },
        );
        try {
          await animation.finished;
        } catch {
          /* Resize or reduced-motion changes settle immediately. */
        }
      }
      if (!disposed) done();
    },
    dispose() {
      disposed = true;
      animation?.cancel();
      window.removeEventListener("resize", interrupt);
      preference.removeEventListener("change", interrupt);
      dialog.close();
      // A deleted/filtered row cannot receive focus; keep the user in the toolbar.
      const destination = opener?.isConnected
        ? opener
        : document.querySelector<HTMLElement>(".refresh-button");
      destination?.focus({ preventScroll: true });
    },
  };
}
