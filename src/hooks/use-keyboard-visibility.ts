import { useEffect, useState } from "react";

const KEYBOARD_THRESHOLD = 120;

function isEditable(element: Element | null): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

export function useKeyboardVisibility(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    let baselineHeight = viewport?.height ?? window.innerHeight;

    const update = () => {
      const focused = isEditable(document.activeElement);
      const currentHeight = viewport?.height ?? window.innerHeight;
      const obscuredHeight = Math.max(
        baselineHeight - currentHeight,
        window.innerHeight - currentHeight - (viewport?.offsetTop ?? 0),
      );
      const keyboardVisible = focused && obscuredHeight > KEYBOARD_THRESHOLD;
      setVisible(keyboardVisible);

      if (!focused && !keyboardVisible) baselineHeight = currentHeight;
    };

    const updateAfterFocus = () => window.setTimeout(update, 50);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", updateAfterFocus);
    document.addEventListener("focusout", updateAfterFocus);
    update();

    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", updateAfterFocus);
      document.removeEventListener("focusout", updateAfterFocus);
    };
  }, []);

  return visible;
}
