import { useEffect } from "react";

const NATIVE_CONTEXT_MENU_SELECTOR = [
  "input",
  "textarea",
  '[contenteditable]:not([contenteditable="false"])',
  "code",
  "pre",
  '[data-native-context-menu="true"]',
  '[data-allow-context-menu="true"]',
].join(",");

const APP_CONTROL_SELECTOR = [
  "a[href]",
  "button",
  "select",
  "summary",
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
].join(",");

export function MobileInteractionPolicy() {
  useEffect(() => {
    const preventAppControlContextMenu = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(NATIVE_CONTEXT_MENU_SELECTOR)) return;
      if (target.closest(APP_CONTROL_SELECTOR)) event.preventDefault();
    };

    document.addEventListener("contextmenu", preventAppControlContextMenu, true);
    return () => document.removeEventListener("contextmenu", preventAppControlContextMenu, true);
  }, []);

  return null;
}
