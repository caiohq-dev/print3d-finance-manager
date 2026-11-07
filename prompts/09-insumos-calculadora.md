# Etapa 09 (opcional) — Insumos e calculadora de custo por peça

Leia `AGENTS.md` e `docs/PROGRESSO.md`. Esta é a **ETAPA 09**. Pré-requisito: etapa 08 concluída. Se o `PROGRESSO.md` disser que não está, pare e me avise.

## Objetivo

Ajudar a **precificar** peças: cadastrar insumos (filamento, resina) com preço e peso e calcular o custo estimado e o preço sugerido de uma peça. É uma ferramenta de apoio: **não altera o lucro mensal** nem cria despesas ou vendas (veja a nota em `docs/PROJETO.md` sobre contar o filamento duas vezes).

## Tarefas

### 1. Migration nova

Crie `00N_insumos.sql` (N = próximo número livre) com as tabelas `insumos` e `configuracoes`, conforme a seção "Etapa 09" de `docs/MODELO_DE_DADOS.md`, e registre-a em `migrations/index.ts`. Não edite migrations antigas. Como a migration roda em bancos já existentes, o app instalado vai atualizar o banco real na primeira abertura: o backup automático do dia (etapa 07) precisa acontecer **antes** de aplicar migrations novas. Ajuste a ordem de inicialização se for preciso e teste.

### 2. CRUD de insumos (`/insumos`)

Mesmo padrão em camadas das etapas anteriores (serviço, IPC, `window.api.insumos`, páginas).

- Lista: nome, tipo, material, cor, marca, preço pago, peso do rolo (g) e **custo por grama** (preço ÷ peso, exibido com 4 casas, ex.: `R$ 0,0899/g`).
- Formulário: nome, tipo (filamento/resina/outro), material, cor, marca, peso total em gramas (maior que zero), preço pago (maior que zero).
- Desativar/reativar; excluir com `ConfirmarModal`. Insumo inativo não aparece na calculadora.
- Item de menu "Insumos".

### 3. Configurações da calculadora

Tela `/insumos/configuracoes` (ou bloco na própria página). Parâmetros guardados em `configuracoes` como texto decimal: tarifa de energia (R$/kWh), potência média da impressora (W), custo fixo de embalagem por peça (R$), percentual de perdas/falhas (%), margem desejada (%) e taxa média da plataforma (%). Todos editáveis, com padrões razoáveis e identificados como "estimativa". Aceitam vírgula decimal.

### 4. Calculadora (`/insumos/calculadora`)

Entradas: insumo, peso da peça (g), tempo de impressão (horas, aceita decimais), e os parâmetros acima pré-preenchidos (podem ser alterados na hora sem salvar).

Cálculo (a regra de centavos tem exceção aqui; veja `docs/MODELO_DE_DADOS.md`; arredonde só o resultado final para centavos):

- custo do material = peso da peça × custo por grama do insumo
- custo de energia = horas × (potência em W ÷ 1000) × tarifa kWh
- subtotal = material + energia + embalagem
- custo total = subtotal × (1 + perdas%)
- **preço sugerido** = custo total ÷ (1 − margem% − taxa%), com a margem calculada **sobre o preço**
- validar que margem% + taxa% seja menor que 100%, com mensagem clara

Saída: tabela com cada parcela, custo total, preço sugerido, lucro estimado por peça (preço − custo total − taxa) e uma frase lembrando que é **estimativa e não entra no resumo mensal**. O cálculo vive em uma função pura em `src/shared/` para ser testada sem banco.

### 5. Testes (Vitest)

- Custo por grama (ex.: R$ 89,90 por 1000 g → `0,0899`).
- Exemplo numérico completo da calculadora com resultado conferido à mão, escrito no próprio teste.
- Validação de margem + taxa ≥ 100%.
- CRUD de insumos e inativo fora da calculadora.
- Aplicar a nova migration em banco já populado não perde dados e o backup acontece antes.

## Critérios de aceite

- `npm run typecheck` e `npm test` passam.
- No app: cadastrar 2 insumos, ajustar configurações, calcular o preço de uma peça e conferir o resultado com uma conta manual.
- O resumo mensal continua exatamente igual (nada nele mudou).
- `docs/PROGRESSO.md` atualizado.

## Fora do escopo

Controle de estoque com baixa automática, vincular insumos a vendas, histórico de preços do filamento.

Ao terminar, siga o "Protocolo de encerramento" do `AGENTS.md`.
