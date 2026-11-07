// Permite importar arquivos .sql com `?raw` no projeto do processo main.
declare module '*.sql?raw' {
  const sql: string
  export default sql
}
