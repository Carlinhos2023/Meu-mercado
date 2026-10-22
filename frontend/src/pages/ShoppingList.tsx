import React, { useState, useMemo } from 'react';
import { Product } from '../types/product';
import { Check } from 'lucide-react';

interface ShoppingListProps {
  products: Product[];
  onRestockChecked: (restockItems: { id: string; addQuantity: number }[]) => Promise<void>;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({
  products,
  onRestockChecked,
}) => {
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [customBuyQty, setCustomBuyQty] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.currentQuantity <= p.minQuantity),
    [products]
  );

  const getSuggestedBuyQuantity = (product: Product): number => {
    if (customBuyQty[product.id] !== undefined) {
      return customBuyQty[product.id];
    }
    const target = Math.max(
      product.idealQuantity || product.minQuantity + 1,
      product.minQuantity + 1
    );
    return Math.max(1, Number((target - product.currentQuantity).toFixed(2)));
  };

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const changeBuyQty = (product: Product, delta: number) => {
    const current = getSuggestedBuyQuantity(product);
    const next = Math.max(1, Number((current + delta).toFixed(2)));
    setCustomBuyQty((prev) => ({ ...prev, [product.id]: next }));
  };

  const selectedCount = lowStockProducts.filter((p) => checkedIds[p.id]).length;

  const handleFinishShopping = async () => {
    const itemsToRestock = lowStockProducts
      .filter((p) => checkedIds[p.id])
      .map((p) => ({
        id: p.id,
        addQuantity: getSuggestedBuyQuantity(p),
      }));

    if (itemsToRestock.length === 0) return;

    setIsSubmitting(true);
    try {
      await onRestockChecked(itemsToRestock);
      setCheckedIds({});
      setCustomBuyQty({});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#0F0F0E] text-stone-900 dark:text-stone-100 pb-36">
      <header className="sticky top-0 z-20 bg-[#FAF9F5]/90 dark:bg-[#0F0F0E]/90 backdrop-blur-xl border-b border-stone-200/60 dark:border-stone-800/70 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Para Comprar
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Toque no item ao colocar no carrinho
            </p>
          </div>
          {lowStockProducts.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const allChecked = lowStockProducts.every((p) => checkedIds[p.id]);
                const next: Record<string, boolean> = {};
                if (!allChecked) {
                  lowStockProducts.forEach((p) => {
                    next[p.id] = true;
                  });
                }
                setCheckedIds(next);
              }}
              className="text-xs font-medium text-stone-600 dark:text-stone-300 px-3 py-1.5 rounded-[12px] bg-stone-200/70 dark:bg-stone-800"
            >
              {lowStockProducts.every((p) => checkedIds[p.id])
                ? 'Limpar seleção'
                : 'Marcar tudo'}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-2.5">
        {lowStockProducts.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-[12px] bg-white dark:bg-[#171716] border border-stone-200/70 dark:border-stone-800/80">
            <p className="text-base font-semibold text-stone-800 dark:text-stone-100">
              Nada falta em casa
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Quando algum item baixar, ele aparece aqui sozinho.
            </p>
          </div>
        ) : (
          lowStockProducts.map((product) => {
            const isChecked = !!checkedIds[product.id];
            const isEmpty = product.currentQuantity === 0;
            const buyQty = getSuggestedBuyQuantity(product);

            return (
              <div
                key={product.id}
                onClick={() => toggleItem(product.id)}
                className={`relative overflow-hidden rounded-[12px] border cursor-pointer select-none transition ${
                  isChecked
                    ? 'bg-stone-100/80 dark:bg-stone-900/50 border-stone-200/50 dark:border-stone-800/50'
                    : 'bg-white dark:bg-[#171716] border-stone-200/70 dark:border-stone-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                }`}
              >
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-6 h-6 rounded-[8px] border flex items-center justify-center transition shrink-0 ${
                        isChecked
                          ? 'bg-stone-900 border-stone-900 text-white dark:bg-stone-100 dark:border-stone-100 dark:text-stone-900'
                          : 'border-stone-300 dark:border-stone-600'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`font-semibold text-[15px] truncate ${
                          isChecked
                            ? 'line-through text-stone-400 dark:text-stone-500'
                            : 'text-stone-900 dark:text-stone-100'
                        }`}
                      >
                        {product.name}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                        {isEmpty
                          ? 'Acabou'
                          : `Restam ${product.currentQuantity} ${product.unit}`}
                        {product.brand ? ` • ${product.brand}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Botões grandes (+ e -) para ajustar quanto vai levar */}
                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      aria-label="Levar menos"
                      onClick={() => changeBuyQty(product, -1)}
                      className="w-10 h-10 rounded-[12px] bg-[#FAF9F5] dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 font-medium text-base flex items-center justify-center active:scale-90 transition"
                    >
                      −
                    </button>
                    <span className="text-xs font-semibold px-2 min-w-[54px] text-center tabular-nums text-stone-800 dark:text-stone-200">
                      +{buyQty} {product.unit}
                    </span>
                    <button
                      type="button"
                      aria-label="Levar mais"
                      onClick={() => changeBuyQty(product, 1)}
                      className="w-10 h-10 rounded-[12px] bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-medium text-base flex items-center justify-center active:scale-90 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Barra discreta de status sob o item */}
                <div className="h-[3px] w-full bg-stone-100 dark:bg-stone-800/70">
                  <div
                    className={`h-full transition-all ${
                      isChecked
                        ? 'bg-emerald-500 w-full'
                        : isEmpty
                        ? 'bg-rose-500 w-full'
                        : 'bg-amber-500 w-1/3'
                    }`}
                  />
                </div>
              </div>
            );
          })
        )}
      </main>

      {selectedCount > 0 && (
        <div className="fixed bottom-20 inset-x-4 z-30 max-w-lg mx-auto">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleFinishShopping}
            className="w-full py-4 px-6 rounded-[12px] bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-semibold text-sm shadow-lg active:scale-[0.99] transition disabled:opacity-50"
          >
            {isSubmitting
              ? 'Guardando...'
              : `Guardar em casa (${selectedCount} ${
                  selectedCount === 1 ? 'item' : 'itens'
                })`}
          </button>
        </div>
      )}
    </div>
  );
};
