# Modelo de dados

Banco: SQLite, arquivo `financeiro.db`. Local e variáveis de ambiente estão em `docs/STACK_E_CONVENCOES.md` (seção "Onde ficam os dados").

Convenções:

- **Dinheiro:** inteiro em centavos (`valor_centavos`). R$ 12,50 → `1250`.
- **Datas:** texto `AAAA-MM-DD`. **Mês:** texto `AAAA-MM`.
- **Carimbos:** `criado_em` e `atualizado_em` em `AAAA-MM-DD HH:MM:SS`, hora local.
- **Nomes:** no banco, `snake_case` em português (`valor_centavos`). No TypeScript, `camelCase` (`valorCentavos`). A conversão acontece **na camada de serviço** (`src/main/servicos/`); linhas cruas do banco nunca chegam ao renderer.
- A tabela `schema_migrations` é criada pelo próprio código de migração, não pela migration 001.
- Não ativar WAL: o modo padrão mantém tudo em um único arquivo, o que facilita copiar e fazer backup manual.

## Etapa 01 — `001_inicial.sql`

```sql
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
```

### Categorias iniciais (seed, inseridas pela migration 001)

| Nome | conta_no_lucro |
|---|---|
| Filamento / Resina | 1 |
| Energia | 1 |
| Embalagem | 1 |
| Frete | 1 |
| Manutenção e peças | 1 |
| Impostos (ex.: DAS do MEI) | 1 |
| Marketing | 1 |
| Software e assinaturas | 1 |
| Ferramentas e acessórios | 1 |
| Equipamento (investimento) | **0** |
| Outros | 1 |

## Regras de integridade

- `categorias.nome` é único sem diferenciar maiúsculas/minúsculas (comparar já com `trim`).
- Categoria **com despesas** não pode ser excluída, só desativada (`ativa = 0`). Categoria sem despesas pode ser excluída.
- Categoria inativa não aparece no formulário de nova despesa, mas continua aparecendo nas despesas antigas e no resumo.
- `canal` é texto livre. A interface sugere (datalist) os valores já usados mais: Shopee, Mercado Livre, Instagram, WhatsApp, Presencial.
- Textos opcionais vazios são salvos como `NULL`, não como string vazia.
- `atualizado_em` é atualizado a cada edição.
- `PRAGMA foreign_keys = ON` em toda conexão (e há teste provando que a chave estrangeira é respeitada).

## Etapa 09 (opcional) — não criar antes

Em uma migration nova (`00N_insumos.sql`):

```sql
CREATE TABLE insumos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'filamento',  -- filamento | resina | outro
  material TEXT,                            -- PLA, PETG, ABS, TPU...
  cor TEXT,
  marca TEXT,
  peso_total_gramas INTEGER NOT NULL CHECK (peso_total_gramas > 0),
  preco_centavos INTEGER NOT NULL CHECK (preco_centavos > 0),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1))
);

CREATE TABLE configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
```

Exceção à regra de centavos: parâmetros da calculadora (tarifa de kWh, potência da impressora, % de perdas etc.) ficam como texto decimal em `configuracoes` e são convertidos para `number` só dentro da calculadora, arredondando o resultado final para centavos. Isso vale **só** para a calculadora, que é informativa.
