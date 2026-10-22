import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { pool, isPostgresConfigured } from '../config/db';

export interface ProductRecord {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  categoryName: string;
  currentQuantity: number;
  minQuantity: number;
  idealQuantity: number;
  unit: string;
}

const LOCAL_DB_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), 'local-products.json')
  : path.join(__dirname, '../../data/local-products.json');

const DEFAULT_PRODUCTS: ProductRecord[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    barcode: '7891000100103',
    name: 'Leite Integral',
    brand: 'Ninho',
    categoryName: 'Despensa',
    currentQuantity: 2,
    minQuantity: 3,
    idealQuantity: 6,
    unit: 'L',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    barcode: '7896006711154',
    name: 'Arroz Branco Tipo 1 (5kg)',
    brand: 'Camil',
    categoryName: 'Despensa',
    currentQuantity: 2,
    minQuantity: 1,
    idealQuantity: 2,
    unit: 'pct',
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    barcode: '7891150056404',
    name: 'Detergente Líquido Neutro',
    brand: 'Ypê',
    categoryName: 'Limpeza',
    currentQuantity: 1,
    minQuantity: 2,
    idealQuantity: 4,
    unit: 'un',
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    barcode: null,
    name: 'Peito de Frango Congelado',
    brand: 'Sadia',
    categoryName: 'Geladeira & Freezer',
    currentQuantity: 1,
    minQuantity: 2,
    idealQuantity: 4,
    unit: 'kg',
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    barcode: '7891010038908',
    name: 'Creme Dental Total 12',
    brand: 'Colgate',
    categoryName: 'Higiene Pessoal',
    currentQuantity: 3,
    minQuantity: 1,
    idealQuantity: 3,
    unit: 'un',
  },
];

function readLocalProducts(): ProductRecord[] {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(DEFAULT_PRODUCTS, null, 2), 'utf-8');
      return DEFAULT_PRODUCTS;
    }
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(raw) as ProductRecord[];
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

function writeLocalProducts(products: ProductRecord[]): void {
  fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(products, null, 2), 'utf-8');
}

export const getProducts = async (_req: Request, res: Response) => {
  try {
    if (isPostgresConfigured && pool) {
      const result = await pool.query(`
        SELECT
          p.id,
          p.barcode,
          p.name,
          p.brand,
          c.name AS "categoryName",
          p.current_quantity::float AS "currentQuantity",
          p.min_quantity::float AS "minQuantity",
          p.ideal_quantity::float AS "idealQuantity",
          p.unit
        FROM products p
        JOIN categories c ON c.id = p.category_id
        ORDER BY c.sort_order ASC, p.name ASC
      `);
      return res.json(result.rows);
    }

    const items = readLocalProducts();
    return res.json(items);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    return res.status(500).json({ message: 'Erro ao listar produtos' });
  }
};

export const createOrUpdateProduct = async (req: Request, res: Response) => {
  try {
    const {
      id,
      barcode,
      name,
      brand,
      categoryName = 'Despensa',
      currentQuantity = 0,
      minQuantity = 1,
      idealQuantity = 2,
      unit = 'un',
    } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ message: 'O nome do produto é obrigatório.' });
    }

    const safeCurrent = Math.max(0, Number(currentQuantity));
    const safeMin = Math.max(0, Number(minQuantity));
    const safeIdeal = Math.max(safeMin, Number(idealQuantity || safeMin + 1));

    if (isPostgresConfigured && pool) {
      const catRes = await pool.query(
        `INSERT INTO categories (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [categoryName]
      );
      const categoryId = catRes.rows[0].id;

      if (id) {
        const updateRes = await pool.query(
          `UPDATE products
           SET barcode = $1, name = $2, brand = $3, category_id = $4,
               current_quantity = $5, min_quantity = $6, ideal_quantity = $7, unit = $8
           WHERE id = $9
           RETURNING id, barcode, name, brand, current_quantity::float AS "currentQuantity",
                     min_quantity::float AS "minQuantity", ideal_quantity::float AS "idealQuantity", unit`,
          [barcode || null, name.trim(), brand || null, categoryId, safeCurrent, safeMin, safeIdeal, unit, id]
        );
        return res.json({ ...updateRes.rows[0], categoryName });
      }

      const insertRes = await pool.query(
        `INSERT INTO products (barcode, name, brand, category_id, current_quantity, min_quantity, ideal_quantity, unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, barcode, name, brand, current_quantity::float AS "currentQuantity",
                   min_quantity::float AS "minQuantity", ideal_quantity::float AS "idealQuantity", unit`,
        [barcode || null, name.trim(), brand || null, categoryId, safeCurrent, safeMin, safeIdeal, unit]
      );
      return res.status(201).json({ ...insertRes.rows[0], categoryName });
    }

    // Modo Local JSON
    const products = readLocalProducts();
    if (id) {
      const idx = products.findIndex((p) => p.id === id);
      if (idx === -1) return res.status(404).json({ message: 'Produto não encontrado' });
      products[idx] = {
        ...products[idx],
        barcode: barcode || null,
        name: name.trim(),
        brand: brand || null,
        categoryName,
        currentQuantity: safeCurrent,
        minQuantity: safeMin,
        idealQuantity: safeIdeal,
        unit,
      };
      writeLocalProducts(products);
      return res.json(products[idx]);
    }

    const newProduct: ProductRecord = {
      id: crypto.randomUUID(),
      barcode: barcode || null,
      name: name.trim(),
      brand: brand || null,
      categoryName,
      currentQuantity: safeCurrent,
      minQuantity: safeMin,
      idealQuantity: safeIdeal,
      unit,
    };
    products.push(newProduct);
    writeLocalProducts(products);
    return res.status(201).json(newProduct);
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    return res.status(500).json({ message: 'Erro ao salvar produto' });
  }
};

export const adjustProductQuantity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { delta } = req.body;

    const numericDelta = Number(delta);
    if (Number.isNaN(numericDelta)) {
      return res.status(400).json({ message: 'Delta inválido' });
    }

    if (isPostgresConfigured && pool) {
      const result = await pool.query(
        `UPDATE products
         SET current_quantity = GREATEST(0, current_quantity + $1)
         WHERE id = $2
         RETURNING id, current_quantity::float AS "currentQuantity"`,
        [numericDelta, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Produto não encontrado' });
      }
      return res.json(result.rows[0]);
    }

    const products = readLocalProducts();
    const product = products.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    product.currentQuantity = Math.max(0, Number((product.currentQuantity + numericDelta).toFixed(2)));
    writeLocalProducts(products);
    return res.json({ id: product.id, currentQuantity: product.currentQuantity });
  } catch (error) {
    console.error('Erro ao ajustar quantidade:', error);
    return res.status(500).json({ message: 'Erro ao ajustar estoque' });
  }
};

export const restockProductsBatch = async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: { id: string; addQuantity: number }[] };
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Nenhum item enviado para reposição.' });
    }

    if (isPostgresConfigured && pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const item of items) {
          await client.query(
            `UPDATE products
             SET current_quantity = GREATEST(0, current_quantity + $1)
             WHERE id = $2`,
            [Math.max(0, Number(item.addQuantity)), item.id]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      return res.json({ ok: true });
    }

    const products = readLocalProducts();
    for (const item of items) {
      const found = products.find((p) => p.id === item.id);
      if (found) {
        found.currentQuantity = Number(
          (found.currentQuantity + Math.max(0, Number(item.addQuantity))).toFixed(2)
        );
      }
    }
    writeLocalProducts(products);
    return res.json({ ok: true });
  } catch (error) {
    console.error('Erro na reposição em lote:', error);
    return res.status(500).json({ message: 'Erro ao repor itens' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (isPostgresConfigured && pool) {
      await pool.query('DELETE FROM products WHERE id = $1', [id]);
      return res.status(204).send();
    }

    const products = readLocalProducts().filter((p) => p.id !== id);
    writeLocalProducts(products);
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    return res.status(500).json({ message: 'Erro ao excluir produto' });
  }
};
