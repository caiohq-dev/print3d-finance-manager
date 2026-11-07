-- Migration 001 — esquema inicial (exatamente como em docs/MODELO_DE_DADOS.md)
CREATE TABLE categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
  conta_no_lucro INTEGER NOT NULL DEFAULT 1 CHECK (conta_no_lucro IN (0,1)),
  ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0,1))
);

CREATE TABLE vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  cliente TEXT,
  descricao TEXT NOT NULL,
  canal TEXT,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  taxas_centavos INTEGER NOT NULL DEFAULT 0 CHECK (taxas_centavos >= 0),
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  CHECK (taxas_centavos <= valor_centavos)
);
CREATE INDEX idx_vendas_data ON vendas(data);

CREATE TABLE despesas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  descricao TEXT NOT NULL,
  fornecedor TEXT,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX idx_despesas_data ON despesas(data);
CREATE INDEX idx_despesas_categoria ON despesas(categoria_id);

-- Categorias iniciais (seed)
INSERT INTO categorias (nome, conta_no_lucro) VALUES
  ('Filamento / Resina', 1),
  ('Energia', 1),
  ('Embalagem', 1),
  ('Frete', 1),
  ('Manutenção e peças', 1),
  ('Impostos (ex.: DAS do MEI)', 1),
  ('Marketing', 1),
  ('Software e assinaturas', 1),
  ('Ferramentas e acessórios', 1),
  ('Equipamento (investimento)', 0),
  ('Outros', 1);
