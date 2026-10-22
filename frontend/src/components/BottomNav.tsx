import React from 'react';
import { Home, ShoppingBag, Plus } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'shopping' | 'form';

interface BottomNavProps {
  activeTab: ActiveTab;
  lowStockCount: number;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  lowStockCount,
  onChangeTab,
}) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#FAF9F5]/90 dark:bg-[#0F0F0E]/90 backdrop-blur-xl border-t border-stone-200/70 dark:border-stone-800/80">
      <div className="max-w-lg mx-auto grid grid-cols-3 h-16 px-2">
        <button
          type="button"
          onClick={() => onChangeTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
            activeTab === 'dashboard'
              ? 'text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-400 dark:text-stone-500'
          }`}
        >
          <Home className="w-5 h-5 stroke-[1.8]" />
          <span>Em Casa</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('shopping')}
          className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
            activeTab === 'shopping'
              ? 'text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-400 dark:text-stone-500'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                {lowStockCount}
              </span>
            )}
          </div>
          <span>Para Comprar</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('form')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
            activeTab === 'form'
              ? 'text-stone-900 dark:text-stone-100 font-semibold'
              : 'text-stone-400 dark:text-stone-500'
          }`}
        >
          <Plus className="w-5 h-5 stroke-[1.8]" />
          <span>Novo Item</span>
        </button>
      </div>
    </nav>
  );
};
