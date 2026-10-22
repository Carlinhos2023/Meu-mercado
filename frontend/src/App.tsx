import React, { useEffect, useState, useMemo } from 'react';
import { Product, ProductInput } from './types/product';
import {
  listProducts,
  saveProduct,
  updateProductQuantity,
  restockProducts,
  removeProduct,
} from './services/api';
import { Dashboard } from './pages/Dashboard';
import { ShoppingList } from './pages/ShoppingList';
import { ProductForm } from './pages/ProductForm';
import { BottomNav, ActiveTab } from './components/BottomNav';

export const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('meu-mercado-theme');
    if (saved) return saved === 'dark';
    return false; // Tema clean/warm off-white por padrão
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('meu-mercado-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('meu-mercado-theme', 'light');
    }
  }, [darkMode]);

  const fetchAllProducts = async () => {
    try {
      const data = await listProducts();
      setProducts(data);
    } catch (err) {
      console.error('Erro ao buscar itens:', err);
    }
  };

  useEffect(() => {
    fetchAllProducts();
  }, []);

  // Toque instantâneo (Optimistic UI) para botões + e -
  const handleUpdateQuantity = async (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === productId
          ? {
              ...item,
              currentQuantity: Math.max(0, Number((item.currentQuantity + delta).toFixed(2))),
            }
          : item
      )
    );

    try {
      await updateProductQuantity(productId, delta);
    } catch {
      fetchAllProducts();
    }
  };

  // Adição silenciosa em lote a partir do Input Inteligente (atualiza a UI de uma só vez)
  const handleSmartBatchAdd = async (items: ProductInput[]) => {
    for (const item of items) {
      const existing = products.find(
        (p) => p.name.toLowerCase() === item.name.toLowerCase()
      );
      if (existing) {
        await updateProductQuantity(existing.id, item.currentQuantity);
      } else {
        await saveProduct(item);
      }
    }
    await fetchAllProducts();
  };

  const handleSaveProduct = async (input: ProductInput) => {
    await saveProduct(input);
    await fetchAllProducts();
    setEditingProduct(null);
    setActiveTab('dashboard');
  };

  const handleDeleteProduct = async (id: string) => {
    await removeProduct(id);
    await fetchAllProducts();
    setEditingProduct(null);
    setActiveTab('dashboard');
  };

  const handleRestockChecked = async (
    items: { id: string; addQuantity: number }[]
  ) => {
    await restockProducts(items);
    await fetchAllProducts();
    setActiveTab('dashboard');
  };

  const lowStockCount = useMemo(
    () => products.filter((p) => p.currentQuantity <= p.minQuantity).length,
    [products]
  );

  return (
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#0F0F0E]">
      {activeTab === 'dashboard' && (
        <Dashboard
          products={products}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          onUpdateQuantity={handleUpdateQuantity}
          onSmartBatchAdd={handleSmartBatchAdd}
          onOpenNewProduct={() => {
            setEditingProduct(null);
            setActiveTab('form');
          }}
          onEditProduct={(product) => {
            setEditingProduct(product);
            setActiveTab('form');
          }}
        />
      )}

      {activeTab === 'shopping' && (
        <ShoppingList
          products={products}
          onRestockChecked={handleRestockChecked}
        />
      )}

      {activeTab === 'form' && (
        <ProductForm
          editingProduct={editingProduct}
          onSave={handleSaveProduct}
          onDelete={handleDeleteProduct}
          onCancel={() => {
            setEditingProduct(null);
            setActiveTab('dashboard');
          }}
        />
      )}

      <BottomNav
        activeTab={activeTab}
        lowStockCount={lowStockCount}
        onChangeTab={(tab) => {
          if (tab !== 'form') setEditingProduct(null);
          setActiveTab(tab);
        }}
      />
    </div>
  );
};

export default App;
