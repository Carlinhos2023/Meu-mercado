import React from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  darkMode: boolean;
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ darkMode, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Alternar aparência"
      className="w-10 h-10 rounded-[12px] bg-stone-200/60 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 active:scale-95 transition flex items-center justify-center"
    >
      {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};
