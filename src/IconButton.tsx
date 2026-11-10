import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

type Props = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "title" | "aria-label"
> & {
  label: string;
  icon: string;
  visibleText?: string;
};

/** Icon action with the same two-second explanation delay for hover and focus. */
export function IconButton({
  label,
  icon,
  visibleText,
  className = "",
  type = "button",
  ...props
}: Props) {
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();
  const [tip, setTip] = useState<{
    left: number;
    top: number;
    above: boolean;
    host: Element;
  } | null>(null);
  function hide() {
    clearTimeout(timer.current);
    timer.current = undefined;
    setTip(null);
  }
  function schedule() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const node = button.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const above = rect.bottom + 65 > window.innerHeight;
      setTip({
        left: Math.max(
          128,
          Math.min(window.innerWidth - 128, rect.left + rect.width / 2),
        ),
        top: above ? rect.top - 8 : rect.bottom + 8,
        above,
        // Modal dialogs occupy the top layer: their tooltips must live inside it too.
        host: node.closest("dialog") ?? document.body,
      });
    }, 2000);
  }
  useEffect(() => {
    function dismiss() {
      clearTimeout(timer.current);
      setTip(null);
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("keydown", keydown);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("keydown", keydown);
    };
  }, []);
  return (
    <>
      <button
        {...props}
        ref={button}
        type={type}
        className={`action-icon ${visibleText ? "action-with-label" : ""} ${className}`}
        aria-label={label}
        aria-describedby={tip ? id : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") schedule();
          props.onPointerEnter?.(event);
        }}
        onPointerLeave={(event) => {
          hide();
          props.onPointerLeave?.(event);
        }}
        onFocus={(event) => {
          schedule();
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          hide();
          props.onBlur?.(event);
        }}
        onClick={(event) => {
          hide();
          props.onClick?.(event);
        }}
      >
        <Icon name={icon} />
        {visibleText && <span>{visibleText}</span>}
      </button>
      {tip &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className="action-tooltip"
            style={{
              left: tip.left,
              top: tip.top,
              transform: tip.above
                ? "translate(-50%, -100%)"
                : "translateX(-50%)",
            }}
          >
            {label}
          </span>,
          tip.host,
        )}
    </>
  );
}
