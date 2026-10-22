# Meu Mercado — Controle de Estoque Doméstico & Lista de Compras (PWA)

Aplicação web progressiva (PWA) **Mobile-First** para controle de itens domésticos (Despensa, Geladeira & Freezer, Limpeza e Higiene Pessoal) com leitor de código de barras EAN-13 integrado à API do **Open Food Facts** e suporte ao **PostgreSQL (Neon)**.

---

## Como Executar Localmente

### 1. Iniciar o Backend (Node.js + Express)
```bash
cd backend
npm run dev
```
- O servidor iniciará em `http://localhost:3333`.
- **Modo Híbrido Inteligente:** Se você ainda não configurou o arquivo `.env` com sua URL do **Neon PostgreSQL** (`DATABASE_URL`), o backend funciona imediatamente salvando os dados em `backend/data/local-products.json`.
- Para conectar ao **Neon PostgreSQL**:
  1. Copie `.env.example` para `.env` dentro de `backend/`
  2. Preencha `DATABASE_URL="postgresql://..."`
  3. Rode `npm run db:init` para criar as tabelas e categorias automaticamente.

### 2. Iniciar o Frontend (React + TypeScript + Tailwind CSS + PWA)
Em outro terminal:
```bash
cd frontend
npm run dev
```
- Acesse `http://localhost:5173` pelo navegador ou pelo celular na mesma rede Wi-Fi.
