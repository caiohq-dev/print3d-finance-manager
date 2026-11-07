# Etapa 06 — Conforto e qualidade

Leia `AGENTS.md` e `docs/PROGRESSO.md`. Esta é a **ETAPA 06**. Pré-requisito: etapa 05 concluída. Se o `PROGRESSO.md` disser que não está, pare e me avise.

## Objetivo

Deixar o uso diário confortável (lançar muita coisa rápido, achar registros) e fechar as arestas de robustez e segurança. O app já funciona; aqui ele fica agradável e confiável.

## Tarefas

### 1. Busca e filtros

- Em Vendas: campo de busca (cliente e descrição, sem diferenciar maiúsculas/minúsculas) e filtro por canal.
- Em Despesas: busca (descrição e fornecedor) e filtro por categoria.
- Os filtros combinam entre si e com o mês e vivem na URL (`?q=`, `?canal=`, `?categoria=`). Adicione a opção "Todos os meses" (`?mes=todos`) para buscar no histórico inteiro; nesse modo a navegação de mês é escondida.
- Os totais do rodapé refletem **o que está filtrado**.
- Link "Limpar filtros". A busca espera uns 250 ms depois da digitação antes de consultar.

### 2. Entrada rápida

- Nos formulários de **nova** venda e **nova** despesa, adicione o botão **"Salvar e adicionar outro"**: salva e volta ao formulário vazio, **mantendo a data** (e a categoria, na despesa; o canal, na venda) do lançamento anterior.
- Botão **"Duplicar"** em cada linha das listas: abre o formulário de novo registro já preenchido com os dados daquele registro e a data de hoje (útil para despesas recorrentes).
- Foco automático no primeiro campo; Enter envia o formulário; Esc cancela e volta para a lista.
- Atalho `Ctrl+N` (`Cmd+N` no macOS) para "novo registro" nas telas de Vendas e Despesas.

### 3. Robustez

- Todo handler IPC com tratamento de erro central: exceção inesperada vira `{ ok: false, erro: 'Algo deu errado. Tente de novo.' }` para o usuário e é registrada com detalhes em `<userData>/logs/erro.log` (arquivo simples, acrescentando linhas com data e hora).
- `ErrorBoundary` no React com página amigável em português e link para voltar ao Resumo. Rota desconhecida mostra "Página não encontrada".
- Revise as mensagens de erro de todos os formulários: claras, em português, sem jargão.
- Revise e teste estes casos de borda: data inexistente (`30/02`), mês inválido na URL, ID inexistente, excluir o mesmo registro duas vezes (a segunda deve dar erro amigável, não travar), categoria inativa em despesa antiga, texto com HTML (`<script>`) em descrição/cliente (deve aparecer como texto, nunca interpretado), valores muito grandes (ex.: `9.999.999,99`) e textos longos (a tabela não pode quebrar o layout).

### 4. Revisão de segurança do Electron

Confira e corrija, se preciso, cada item da seção "Segurança do Electron" do `AGENTS.md`. Além disso:

- Cada handler IPC rejeita payload com formato inesperado (campo faltando, tipo errado, objeto em vez de texto) com erro amigável.
- `window.api` expõe apenas os métodos necessários, sem repassar `ipcRenderer` nem objetos do Electron.
- Escreva testes de serviço/validação para o que for possível; liste no `PROGRESSO.md` o que foi conferido manualmente.

### 5. Acabamento visual mínimo

- Valores alinhados à direita, cabeçalho da tabela legível, linhas com leve zebra, botões consistentes (primário/perigo).
- Lucro negativo em vermelho com sinal `−`; positivo em verde discreto.
- Layout aceitável em janela pequena e maximizada (não precisa ser perfeito). Janela lembra tamanho e posição da última vez, se for simples.

### 6. Testes

Um teste por item que for testável sem interface: busca e filtros com totais filtrados (serviços), validação de payload dos handlers, escape/armazenamento de texto com HTML, valores grandes, exclusão dupla.

## Critérios de aceite

- `npm run typecheck` e `npm test` passam.
- No app: lançar 10 despesas seguidas usando "Salvar e adicionar outro" é rápido e sem retrabalho; buscar um cliente em "Todos os meses" funciona; digitar `<b>teste</b>` numa descrição aparece literalmente.
- `docs/PROGRESSO.md` atualizado.

## Fora do escopo

Paginação, gráficos, CSV, backup (etapa 07).

Ao terminar, siga o "Protocolo de encerramento" do `AGENTS.md`.
