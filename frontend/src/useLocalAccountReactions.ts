import { useEffect, useState } from 'react';

function readAccounts(storageKey: string): number[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (Array.isArray(value)) return [...new Set(value.filter(Number.isSafeInteger))];
  } catch {
    return [];
  }
  return [];
}

export function useLocalAccountReactions(storageKey: string) {
  const [accounts, setAccounts] = useState(() => readAccounts(storageKey));
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    function syncAccounts(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) setAccounts(readAccounts(storageKey));
    }
    window.addEventListener('storage', syncAccounts);
    return () => window.removeEventListener('storage', syncAccounts);
  }, [storageKey]);

  function toggle(accountId: number) {
    const current = readAccounts(storageKey);
    const updated = current.includes(accountId) ? current.filter((id) => id !== accountId) : [...current, accountId];
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setAccounts(updated);
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }

  return { accounts, saveError, toggle };
}
