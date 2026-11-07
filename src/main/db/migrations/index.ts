// Lista das migrations, em ordem. Importadas com `?raw` para irem junto no
// bundle e funcionarem também no app empacotado.
import inicial from './001_inicial.sql?raw'

export type Migration = {
  id: string
  sql: string
}

// Sempre do número menor para o maior. Nunca reordenar nem editar o passado:
// mudança de schema é nova migration numerada.
export const migrations: Migration[] = [{ id: '001_inicial', sql: inicial }]
