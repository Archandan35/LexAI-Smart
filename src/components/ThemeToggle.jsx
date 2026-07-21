import { useState, useEffect } from 'react';
import Icon from './Icon.jsx';

function getInitialTheme() {
  const saved = localStorage.getItem('themeMode');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('themeMode', theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <button className="topbar__toggle" onClick={toggle} aria-label="Toggle theme" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
