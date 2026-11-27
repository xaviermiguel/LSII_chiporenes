import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

type Theme = 'system' | 'light' | 'dark';
const storageKey = 'protube:theme';
const themes = ['system', 'light', 'dark'] as const;
const labels = { system: 'Sistema', light: 'Claro', dark: 'Oscuro' };

function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {theme === 'system' && (
        <>
          <rect x="2.5" y="4" width="19" height="13" rx="2" />
          <path d="M12 17v3m-4 0h8" />
        </>
      )}
      {theme === 'light' && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </>
      )}
      {theme === 'dark' && <path d="M20.8 14.2A9 9 0 0 1 9.8 3.2a9 9 0 1 0 11 11Z" />}
    </svg>
  );
}

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }
  return 'system';
}

export function ThemeSelector() {
  const [theme, setTheme] = useState(readTheme);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useLayoutEffect(() => {
    if (open) menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function closeMenu() {
    setOpen(false);
    trigger.current?.focus();
  }

  function navigateMenu(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = themes.length - 1;
    const next: Record<string, number> = {
      ArrowDown: (index + 1) % themes.length,
      ArrowUp: (index + last) % themes.length,
      Home: 0,
      End: last,
    };
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (typeof next[event.key] === 'number') {
      event.preventDefault();
      menu.current?.querySelectorAll('button')[next[event.key]].focus();
    }
  }

  function chooseTheme(value: Theme) {
    setTheme(value);
    closeMenu();
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // The selection still applies to this visit.
    }
  }

  return (
    <div
      className="theme-selector"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="theme-trigger"
        ref={trigger}
        aria-label={`Tema: ${labels[theme]}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <ThemeIcon theme={theme} />
      </button>
      {open && (
        <div className="theme-menu" id={menuId} ref={menu} role="menu" aria-label="Tema">
          {themes.map((value, index) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              tabIndex={-1}
              onKeyDown={(event) => navigateMenu(event, index)}
              onClick={() => chooseTheme(value)}
            >
              <ThemeIcon theme={value} />
              {labels[value]}
              {theme === value && (
                <span className="theme-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
