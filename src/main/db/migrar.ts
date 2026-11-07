import type { DatabaseSync } from 'node:sqlite'
import { migrations } from './migrations'

/**
 * Aplica, em ordem, as migrations ainda não aplicadas.
 * - Cada migration roda em transação (BEGIN/COMMIT/ROLLBACK);
 * - o que foi aplicado fica registrado em `schema_migrations`;
 * - idempotente: rodar de novo não falha nem duplica nada.
 * Recebe a conexão como parâmetro para poder ser testada com `:memory:`.
 */
export function migrar(banco: DatabaseSync): void {
  // Tabela criada pelo código de migração, não pela migration 001.
  banco.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      aplicada_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  for (const migracao of migrations) {
    const jaAplicada = banco.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(migracao.id)
    if (jaAplicada) continue

    banco.exec('BEGIN')
    try {
      banco.exec(migracao.sql)
      banco.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(migracao.id)
      banco.exec('COMMIT')
    } catch (erro) {
      banco.exec('ROLLBACK')
      throw erro
    }
  }
}
