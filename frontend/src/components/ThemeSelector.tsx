import { useLayoutEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';
const storageKey = 'protube:theme';

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

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function chooseTheme(value: Theme) {
    setTheme(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // The selection still applies to this visit.
    }
  }

  return (
    <label className="theme-selector">
      Tema
      <select value={theme} onChange={(event) => chooseTheme(event.target.value as Theme)}>
        <option value="system">Sistema</option>
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
      </select>
    </label>
  );
}
