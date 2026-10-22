-- Extensão para geração de UUIDs (nativa no PostgreSQL 13+ / Neon)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela de Categorias
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(60) NOT NULL UNIQUE,
    icon VARCHAR(30) NOT NULL DEFAULT 'package',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Produtos
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(32) UNIQUE,
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    current_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    min_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (min_quantity >= 0),
    ideal_quantity NUMERIC(10, 2) NOT NULL DEFAULT 2 CHECK (ideal_quantity >= min_quantity),
    unit VARCHAR(20) NOT NULL DEFAULT 'un',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance em Mobile
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(current_quantity, min_quantity)
    WHERE current_quantity <= min_quantity;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seeds iniciais de Categorias Domésticas
INSERT INTO categories (name, icon, sort_order) VALUES
    ('Despensa', 'utensils', 1),
    ('Geladeira & Freezer', 'snowflake', 2),
    ('Limpeza', 'sparkles', 3),
    ('Higiene Pessoal', 'heart', 4)
ON CONFLICT (name) DO NOTHING;
