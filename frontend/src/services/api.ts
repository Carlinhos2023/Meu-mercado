import { Product, ProductInput } from '../types/product';

const BASE_URL = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '';
const API_BASE = `${BASE_URL.replace(/\/$/, '')}/api/products`;

export async function listProducts(): Promise<Product[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Falha ao carregar produtos');
  return res.json();
}

export async function saveProduct(input: ProductInput): Promise<Product> {
  const method = input.id ? 'PUT' : 'POST';
  const url = input.id ? `${API_BASE}/${input.id}` : API_BASE;

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Falha ao salvar produto');
  return res.json();
}

export async function updateProductQuantity(
  id: string,
  delta: number
): Promise<{ id: string; currentQuantity: number }> {
  const res = await fetch(`${API_BASE}/${id}/quantity`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  });
  if (!res.ok) throw new Error('Falha ao atualizar quantidade');
  return res.json();
}

export async function restockProducts(
  items: { id: string; addQuantity: number }[]
): Promise<void> {
  const res = await fetch(`${API_BASE}/restock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Falha ao repor estoque');
}

export async function removeProduct(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Falha ao excluir produto');
}
