import { useLayoutEffect, useRef, type HTMLAttributes } from "react";

/** Render directly after the input control. The top layer escapes table and dialog clipping. */
export function FloatingDropdown({
  children,
  style,
  placement = "auto",
  ...props
}: HTMLAttributes<HTMLDivElement> & { placement?: "auto" | "bottom" }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const menu = ref.current;
    const anchor = menu?.previousElementSibling;
    if (!menu || !(anchor instanceof HTMLElement)) return;
    // Keep the DOM relationship intact for blur handling and modal focus containment.
    menu.showPopover?.();
    function position() {
      if (!menu || !anchor) return;
      const rect = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const below = Math.max(0, top + height - rect.bottom - 14);
      const above = Math.max(0, rect.top - top - 14);
      const upwards = placement === "auto" && below < 240 && above > below;
      const limit = Math.min(300, upwards ? above : below);
      menu.style.width = `${Math.min(rect.width, Math.max(0, width - 16))}px`;
      menu.style.maxHeight = `${limit}px`;
      menu.style.left = `${Math.max(left + 8, Math.min(rect.left, left + width - menu.offsetWidth - 8))}px`;
      menu.style.top = `${upwards ? rect.top - menu.offsetHeight - 6 : rect.bottom + 6}px`;
    }
    position();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(position);
    observer?.observe(anchor);
    observer?.observe(menu);
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
      if (menu.matches(":popover-open")) menu.hidePopover?.();
    };
  }, [placement]);
  return (
    <div
      {...props}
      ref={ref}
      popover="manual"
      style={{
        ...style,
        position: "fixed",
        margin: 0,
        right: "auto",
        bottom: "auto",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}
