import { ProductInput, UnitType } from '../types/product';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Geladeira & Freezer': [
    'frango', 'carne', 'peixe', 'queijo', 'presunto', 'manteiga', 'iogurte',
    'requeijão', 'requeijao', 'sorvete', 'gelo', 'congelado', 'congelada', 'linguiça',
  ],
  Limpeza: [
    'detergente', 'sabão', 'sabao', 'amaciante', 'água sanitária', 'agua sanitaria',
    'desinfetante', 'esponja', 'álcool', 'alcool', 'limpador', 'saco de lixo', 'pano',
  ],
  'Higiene Pessoal': [
    'sabonete', 'shampoo', 'xampu', 'condicionador', 'creme dental', 'pasta de dente',
    'papel higiênico', 'papel higienico', 'desodorante', 'fio dental', 'escova',
  ],
};

function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) {
      return category;
    }
  }
  return 'Despensa';
}

function normalizeUnit(raw?: string): UnitType {
  if (!raw) return 'un';
  const u = raw.toLowerCase();
  if (u.startsWith('kg') || u.startsWith('quil')) return 'kg';
  if (u === 'l' || u.startsWith('litr')) return 'L';
  if (u.startsWith('pct') || u.startsWith('pacot')) return 'pct';
  if (u.startsWith('cx') || u.startsWith('caix')) return 'cx';
  return 'un';
}

function capitalizeFirst(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Interpreta uma frase natural (ex: "2 pacotes de café, 3 litros de leite e 1 detergente")
 * de forma silenciosa para atualizar a interface de uma só vez.
 */
export async function parseSmartInputPhrase(phrase: string): Promise<ProductInput[]> {
  // Pausa silenciosa breve para transição suave do Skeleton Loader (sem streaming)
  await new Promise((resolve) => setTimeout(resolve, 650));

  const cleaned = phrase
    .replace(/^(comprei|adicione|adicionar|coloca|coloque|tenho)\s+/i, '')
    .trim();

  const segments = cleaned
    .split(/\s*(?:,|;|\be\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const results: ProductInput[] = [];

  for (const segment of segments) {
    // Ex: "2 pacotes de arroz", "3 L de leite", "1 detergente", "arroz"
    const match = segment.match(
      /^(\d+(?:[.,]\d+)?)?\s*(kg|quilos?|l|litros?|pct|pacotes?|cx|caixas?|un|unidades?)?\s*(?:de\s+)?(.+)$/i
    );

    if (!match) continue;

    const rawQty = match[1] ? Number(match[1].replace(',', '.')) : 1;
    const quantity = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
    const unit = normalizeUnit(match[2]);
    const rawName = match[3]?.trim();

    if (!rawName) continue;

    const name = capitalizeFirst(rawName);
    const categoryName = inferCategory(name);

    results.push({
      name,
      brand: null,
      barcode: null,
      categoryName,
      currentQuantity: quantity,
      minQuantity: 1,
      idealQuantity: Math.max(2, quantity),
      unit,
    });
  }

  return results;
}
