import React, { useState, useMemo } from 'react';
import { Product, ProductInput } from '../types/product';
import { ThemeToggle } from '../components/ThemeToggle';
import { parseSmartInputPhrase } from '../services/smartParser';
import { Search, Plus, Mic, ArrowUp, Sparkles } from 'lucide-react';

interface DashboardProps {
  products: Product[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onSmartBatchAdd: (items: ProductInput[]) => Promise<void>;
  onOpenNewProduct: () => void;
  onEditProduct: (product: Product) => void;
}

export const CATEGORIES = [
  'Tudo',
  'Despensa',
  'Geladeira & Freezer',
  'Limpeza',
  'Higiene Pessoal',
];

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  darkMode,
  onToggleDarkMode,
  onUpdateQuantity,
  onSmartBatchAdd,
  onOpenNewProduct,
  onEditProduct,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tudo');
  const [search, setSearch] = useState<string>('');
  const [smartPhrase, setSmartPhrase] = useState<string>('');
  const [isProcessingSmartInput, setIsProcessingSmartInput] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.currentQuantity <= p.minQuantity).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesCategory =
        selectedCategory === 'Tudo' || item.categoryName === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  const handleSmartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = smartPhrase.trim();
    if (!text || isProcessingSmartInput) return;

    setIsProcessingSmartInput(true);
    setSmartPhrase('');
    try {
      const parsedItems = await parseSmartInputPhrase(text);
      if (parsedItems.length > 0) {
        await onSmartBatchAdd(parsedItems);
      }
    } finally {
      setIsProcessingSmartInput(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = async (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setIsListening(false);
      if (transcript.trim()) {
        setIsProcessingSmartInput(true);
        try {
          const parsedItems = await parseSmartInputPhrase(transcript);
          if (parsedItems.length > 0) {
            await onSmartBatchAdd(parsedItems);
          }
        } finally {
          setIsProcessingSmartInput(false);
        }
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#0F0F0E] text-stone-900 dark:text-stone-100 pb-28">
      <header className="sticky top-0 z-20 bg-[#FAF9F5]/90 dark:bg-[#0F0F0E]/90 backdrop-blur-xl border-b border-stone-200/60 dark:border-stone-800/70 px-4 pt-4 pb-3">
        <div className="max-w-lg mx-auto space-y-3">
          {/* Topo Minimalista com Forte Hierarquia */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                Em Casa
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {lowStockCount === 0
                  ? 'Tudo em dia por aqui'
                  : `${lowStockCount} ${lowStockCount === 1 ? 'item acabando' : 'itens acabando'}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
              <button
                type="button"
                onClick={onOpenNewProduct}
                className="h-10 px-3.5 rounded-[12px] bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 hover:opacity-90 active:scale-95 transition text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.2]" />
                <span>Novo item</span>
              </button>
            </div>
          </div>

          {/* Input Inteligente por Frase / Voz (Processamento Silencioso sem Streaming) */}
          <form onSubmit={handleSmartSubmit} className="relative">
            <Sparkles className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={smartPhrase}
              onChange={(e) => setSmartPhrase(e.target.value)}
              disabled={isProcessingSmartInput}
              placeholder='Adicionar rápido: "2 pacotes de café e 3 leites"...'
              className="w-full rounded-[12px] bg-white dark:bg-[#171716] border border-stone-200/80 dark:border-stone-800 pl-10 pr-20 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={handleVoiceInput}
                aria-label="Ditar itens por voz"
                className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
              {smartPhrase.trim().length > 0 && (
                <button
                  type="submit"
                  aria-label="Adicionar frase"
                  className="w-8 h-8 rounded-[10px] bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center active:scale-90 transition"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* Busca + Categorias */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar itens..."
                className="w-full rounded-[12px] bg-stone-200/50 dark:bg-stone-900/80 pl-8 pr-3 py-1.5 text-xs text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-[12px] text-xs font-medium transition ${
                    active
                      ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900'
                      : 'bg-stone-200/60 text-stone-600 dark:bg-stone-900 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-2.5">
        {/* Skeleton Loader silencioso durante processamento de IA / frase */}
        {isProcessingSmartInput && (
          <div className="space-y-2.5" aria-busy="true" aria-label="Adicionando itens">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="rounded-[12px] p-4 bg-white dark:bg-[#171716] border border-stone-200/70 dark:border-stone-800/80 animate-pulse flex items-center justify-between"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-36 bg-stone-200 dark:bg-stone-800 rounded" />
                  <div className="h-3 w-24 bg-stone-100 dark:bg-stone-800/60 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-11 h-11 rounded-[12px] bg-stone-100 dark:bg-stone-800" />
                  <div className="w-10 h-5 bg-stone-100 dark:bg-stone-800 rounded" />
                  <div className="w-11 h-11 rounded-[12px] bg-stone-200 dark:bg-stone-700" />
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Nada por aqui ainda.
            </p>
            <button
              type="button"
              onClick={onOpenNewProduct}
              className="mt-2 text-xs font-semibold text-stone-900 dark:text-stone-100 underline underline-offset-4"
            >
              Adicionar primeiro item
            </button>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isEmpty = product.currentQuantity === 0;
            const isLow = product.currentQuantity <= product.minQuantity;

            // Proporção da barra de progresso discreta sob o item
            const target = Math.max(product.idealQuantity || product.minQuantity * 2, 1);
            const ratio = Math.min(100, Math.max(6, Math.round((product.currentQuantity / target) * 100)));

            const barColor = isEmpty
              ? 'bg-rose-500'
              : isLow
              ? 'bg-amber-500'
              : 'bg-emerald-600/70 dark:bg-emerald-500/60';

            return (
              <div
                key={product.id}
                className="relative overflow-hidden rounded-[12px] bg-white dark:bg-[#171716] border border-stone-200/70 dark:border-stone-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition"
              >
                <div className="p-4 flex items-center justify-between gap-3">
                  {/* Informações do Item (Toque no título abre edição rápida) */}
                  <button
                    type="button"
                    onClick={() => onEditProduct(product)}
                    className="min-w-0 flex-1 text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-[15px] leading-snug text-stone-900 dark:text-stone-100 truncate group-hover:underline">
                        {product.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-stone-400 dark:text-stone-500">
                      <span>{product.categoryName}</span>
                      {product.brand && <span>• {product.brand}</span>}
                      {isEmpty ? (
                        <span className="text-rose-600 dark:text-rose-400 font-medium">
                          • Acabou
                        </span>
                      ) : isLow ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          • Acabando
                        </span>
                      ) : null}
                    </div>
                  </button>

                  {/* Controles Grandes (+ e -) para celular */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label={`Diminuir ${product.name}`}
                      onClick={() => onUpdateQuantity(product.id, -1)}
                      disabled={product.currentQuantity <= 0}
                      className="w-11 h-11 rounded-[12px] bg-[#FAF9F5] dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-90 transition flex items-center justify-center text-lg font-medium text-stone-700 dark:text-stone-200 disabled:opacity-30 select-none"
                    >
                      −
                    </button>

                    <div className="min-w-[48px] text-center tabular-nums">
                      <span className="text-base font-semibold text-stone-900 dark:text-stone-100 block leading-none">
                        {product.currentQuantity}
                      </span>
                      <span className="text-[11px] text-stone-400 dark:text-stone-500">
                        {product.unit}
                      </span>
                    </div>

                    <button
                      type="button"
                      aria-label={`Aumentar ${product.name}`}
                      onClick={() => onUpdateQuantity(product.id, 1)}
                      className="w-11 h-11 rounded-[12px] bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 hover:opacity-90 active:scale-90 transition flex items-center justify-center text-lg font-medium select-none"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Barra de Progresso Discreta sob o item */}
                <div className="h-[3px] w-full bg-stone-100 dark:bg-stone-800/70">
                  <div
                    className={`h-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${isEmpty ? 100 : ratio}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};
