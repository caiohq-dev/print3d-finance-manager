import type { Api } from '../shared/tipos'

// Tipos de `window.api` para o renderer, derivados do contrato em shared/tipos.ts.
declare global {
  interface Window {
    api: Api
  }
}
