import React, { useState, useEffect } from 'react';
import { Product, ProductInput, UnitType } from '../types/product';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { OpenFoodFactsResult, fetchOpenFoodFactsProduct } from '../services/openFoodFacts';
import { ScanBarcode, Trash2, ArrowLeft } from 'lucide-react';

interface ProductFormProps {
  editingProduct: Product | null;
  onSave: (data: ProductInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onCancel: () => void;
}

const CATEGORY_OPTIONS = [
  'Despensa',
  'Geladeira & Freezer',
  'Limpeza',
  'Higiene Pessoal',
];

const UNIT_OPTIONS: { value: UnitType; label: string }[] = [
  { value: 'un', label: 'Unidades (un)' },
  { value: 'pct', label: 'Pacotes (pct)' },
  { value: 'kg', label: 'Quilos (kg)' },
  { value: 'L', label: 'Litros (L)' },
  { value: 'cx', label: 'Caixas (cx)' },
];

export const ProductForm: React.FC<ProductFormProps> = ({
  editingProduct,
  onSave,
  onDelete,
  onCancel,
}) => {
  const [barcode, setBarcode] = useState(editingProduct?.barcode || '');
  const [name, setName] = useState(editingProduct?.name || '');
  const [brand, setBrand] = useState(editingProduct?.brand || '');
  const [categoryName, setCategoryName] = useState(
    editingProduct?.categoryName || 'Despensa'
  );
  const [currentQuantity, setCurrentQuantity] = useState<number>(
    editingProduct?.currentQuantity ?? 1
  );
  const [minQuantity, setMinQuantity] = useState<number>(
    editingProduct?.minQuantity ?? 1
  );
  const [idealQuantity, setIdealQuantity] = useState<number>(
    editingProduct?.idealQuantity ?? 2
  );
  const [unit, setUnit] = useState<UnitType>(editingProduct?.unit || 'un');

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingProduct) {
      setBarcode(editingProduct.barcode || '');
      setName(editingProduct.name);
      setBrand(editingProduct.brand || '');
      setCategoryName(editingProduct.categoryName);
      setCurrentQuantity(editingProduct.currentQuantity);
      setMinQuantity(editingProduct.minQuantity);
      setIdealQuantity(editingProduct.idealQuantity);
      setUnit(editingProduct.unit);
    }
  }, [editingProduct]);

  const applyScannedResult = (result: OpenFoodFactsResult) => {
    setBarcode(result.barcode);
    if (result.found) {
      setName(result.name);
      setBrand(result.brand);
      setCategoryName(result.suggestedCategory);
    }
  };

  const handleScannedProduct = (result: OpenFoodFactsResult) => {
    setIsScannerOpen(false);
    applyScannedResult(result);
  };

  const handleBarcodeBlur = async () => {
    const clean = barcode.trim();
    if (clean.length >= 8 && !name.trim()) {
      setIsLookingUpBarcode(true);
      try {
        const result = await fetchOpenFoodFactsProduct(clean);
        applyScannedResult(result);
      } finally {
        setIsLookingUpBarcode(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        id: editingProduct?.id,
        barcode: barcode.trim() || null,
        name: name.trim(),
        brand: brand.trim() || null,
        categoryName,
        currentQuantity: Math.max(0, Number(currentQuantity) || 0),
        minQuantity: Math.max(0, Number(minQuantity) || 0),
        idealQuantity: Math.max(1, Number(idealQuantity) || 1),
        unit,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#0F0F0E] text-stone-900 dark:text-stone-100 pb-28">
      <header className="sticky top-0 z-20 bg-[#FAF9F5]/90 dark:bg-[#0F0F0E]/90 backdrop-blur-xl border-b border-stone-200/60 dark:border-stone-800/70 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="w-10 h-10 rounded-[12px] bg-stone-200/60 dark:bg-stone-800 flex items-center justify-center"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-semibold tracking-tight">
              {editingProduct ? 'Editar item' : 'Novo item'}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="h-10 px-3.5 rounded-[12px] bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition"
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Ler código</span>
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {isLookingUpBarcode ? (
          /* Skeleton Loader silencioso ao buscar código de barras */
          <div className="bg-white dark:bg-[#171716] rounded-[12px] border border-stone-200/70 dark:border-stone-800/80 p-4 space-y-4 animate-pulse">
            <div className="h-10 bg-stone-100 dark:bg-stone-800 rounded-[12px]" />
            <div className="h-10 bg-stone-100 dark:bg-stone-800 rounded-[12px]" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-10 bg-stone-100 dark:bg-stone-800 rounded-[12px]" />
              <div className="h-10 bg-stone-100 dark:bg-stone-800 rounded-[12px]" />
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#171716] rounded-[12px] border border-stone-200/70 dark:border-stone-800/80 p-4 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            <div>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                Nome do item
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Café em pó 500g"
                className="w-full rounded-[12px] bg-[#FAF9F5] dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 px-3.5 py-2.5 text-sm focus:outline-none focus:border-stone-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                  Marca (opcional)
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: Pilão"
                  className="w-full rounded-[12px] bg-[#FAF9F5] dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 px-3.5 py-2.5 text-sm focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                  Onde fica
                </label>
                <select
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full rounded-[12px] bg-[#FAF9F5] dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 px-3.5 py-2.5 text-sm focus:outline-none focus:border-stone-400"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Controles grandes de + e - também no formulário */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#FAF9F5] dark:bg-stone-900/70 border border-stone-200/60 dark:border-stone-800">
                <div>
                  <p className="text-sm font-medium">Tenho em casa</p>
                  <p className="text-xs text-stone-400">Quantidade atual</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentQuantity((q) => Math.max(0, q - 1))}
                    className="w-11 h-11 rounded-[12px] bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 text-lg font-medium flex items-center justify-center active:scale-90 transition"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-semibold text-base tabular-nums">
                    {currentQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentQuantity((q) => q + 1)}
                    className="w-11 h-11 rounded-[12px] bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-lg font-medium flex items-center justify-center active:scale-90 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#FAF9F5] dark:bg-stone-900/70 border border-stone-200/60 dark:border-stone-800">
                <div>
                  <p className="text-sm font-medium">Avisar quando chegar em</p>
                  <p className="text-xs text-stone-400">Entra na lista Para Comprar</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMinQuantity((q) => Math.max(0, q - 1))}
                    className="w-11 h-11 rounded-[12px] bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 text-lg font-medium flex items-center justify-center active:scale-90 transition"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-semibold text-base tabular-nums">
                    {minQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMinQuantity((q) => {
                        const next = q + 1;
                        if (idealQuantity <= next) setIdealQuantity(next + 1);
                        return next;
                      });
                    }}
                    className="w-11 h-11 rounded-[12px] bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-lg font-medium flex items-center justify-center active:scale-90 transition"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                  Unidade
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitType)}
                  className="w-full rounded-[12px] bg-[#FAF9F5] dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 px-3.5 py-2.5 text-sm focus:outline-none focus:border-stone-400"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                  Código de barras
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onBlur={handleBarcodeBlur}
                  placeholder="EAN-13 opcional"
                  className="w-full rounded-[12px] bg-[#FAF9F5] dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 px-3.5 py-2.5 text-sm focus:outline-none focus:border-stone-400"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2.5">
              {editingProduct && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(editingProduct.id)}
                  className="px-4 py-3.5 rounded-[12px] bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3.5 px-6 rounded-[12px] bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-semibold text-sm active:scale-[0.99] transition disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar item'}
              </button>
            </div>
          </form>
        )}
      </main>

      {isScannerOpen && (
        <BarcodeScanner
          onProductResolved={handleScannedProduct}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
};
