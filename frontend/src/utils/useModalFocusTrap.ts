import { useEffect } from 'react';

const focusableSelector = [
  'button:not([disabled])', 'a[href]', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useModalFocusTrap(open: boolean, overlaySelector: string) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const overlays = document.querySelectorAll<HTMLElement>(overlaySelector);
      const overlay = overlays.item(overlays.length - 1);
      overlay?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const overlays = document.querySelectorAll<HTMLElement>(overlaySelector);
      const overlay = overlays.item(overlays.length - 1);
      if (!overlay) return;
      const items = Array.from(overlay.querySelectorAll<HTMLElement>(focusableSelector));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', trap);
      previous?.focus();
    };
  }, [open, overlaySelector]);
}
