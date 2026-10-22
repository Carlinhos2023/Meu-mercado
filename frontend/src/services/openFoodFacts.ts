export interface OpenFoodFactsResult {
  found: boolean;
  barcode: string;
  name: string;
  brand: string;
  suggestedCategory: string;
}

export async function fetchOpenFoodFactsProduct(barcode: string): Promise<OpenFoodFactsResult> {
  const cleanBarcode = barcode.trim();
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(cleanBarcode)}.json`
    );
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const p = data.product;
      const name = (p.product_name_pt || p.product_name || '').trim();
      const brand = p.brands ? String(p.brands).split(',')[0].trim() : '';
      const rawCategories = String(p.categories || '').toLowerCase();

      let suggestedCategory = 'Despensa';
      if (
        rawCategories.includes('frozen') ||
        rawCategories.includes('congelad') ||
        rawCategories.includes('dairy') ||
        rawCategories.includes('queijo') ||
        rawCategories.includes('iogurte')
      ) {
        suggestedCategory = 'Geladeira & Freezer';
      }

      return {
        found: Boolean(name),
        barcode: cleanBarcode,
        name,
        brand,
        suggestedCategory,
      };
    }
  } catch (err) {
    console.warn('Falha ao consultar Open Food Facts:', err);
  }

  return {
    found: false,
    barcode: cleanBarcode,
    name: '',
    brand: '',
    suggestedCategory: 'Despensa',
  };
}
