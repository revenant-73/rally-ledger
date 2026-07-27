import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Traps Tab focus inside the modal while it's open, closes on Escape, and
// restores focus to whatever was focused before the modal opened.
export function useFocusTrap<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];

    // Respect an element that already grabbed focus on mount (e.g. autoFocus)
    // instead of always jumping to the first focusable element.
    if (!container?.contains(document.activeElement)) {
      const focusable = getFocusable();
      (focusable[0] ?? container)?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const elements = getFocusable();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  return containerRef;
}
