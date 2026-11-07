// Contrato entre renderer e renderer/main. O renderer só enxerga o que está aqui.
// Código puro: sem Electron e sem DOM.

/** Resposta de todo método da API para o renderer. `erro` é mensagem pronta para o usuário. */
export type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; campos?: Record<string, string> }

/** Informações básicas do app (etapa 01). */
export type AppInfo = {
  versao: string
  caminhoBanco: string
}

/** Forma de `window.api`, derivada dos tipos acima. */
export type Api = {
  app: {
    info: () => Promise<Resultado<AppInfo>>
  }
}
