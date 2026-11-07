import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { migrar } from './migrar'

// Testes de fumaça da etapa 01: migrations reais em banco :memory:.

function novoBanco(): DatabaseSync {
  const banco = new DatabaseSync(':memory:')
  banco.exec('PRAGMA foreign_keys = ON')
  return banco
}

function bancoMigrado(): DatabaseSync {
  const banco = novoBanco()
  migrar(banco)
  return banco
}

function linhas(banco: DatabaseSync, sql: string, ...params: unknown[]): Record<string, unknown>[] {
  return banco.prepare(sql).all(...(params as never[])) as Record<string, unknown>[]
}

function contar(banco: DatabaseSync, sql: string): number {
  const linha = banco.prepare(sql).get()
  return Number(linha?.['n'])
}

function nomesDasTabelas(banco: DatabaseSync): string[] {
  return linhas(
    banco,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).map((linha) => String(linha['name']))
}

const CATEGORIAS_INICIAIS = [
  'Filamento / Resina',
  'Energia',
  'Embalagem',
  'Frete',
  'Manutenção e peças',
  'Impostos (ex.: DAS do MEI)',
  'Marketing',
  'Software e assinaturas',
  'Ferramentas e acessórios',
  'Equipamento (investimento)',
  'Outros'
]

describe('migrations (banco :memory:)', () => {
  it('cria as 3 tabelas do modelo (e os índices)', () => {
    const banco = bancoMigrado()
    const tabelas = nomesDasTabelas(banco)

    expect(tabelas).toContain('categorias')
    expect(tabelas).toContain('vendas')
    expect(tabelas).toContain('despesas')
    expect(tabelas).toContain('schema_migrations')

    const indices = linhas(
      banco,
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'"
    ).map((linha) => String(linha['name']))
    expect(indices).toEqual(
      expect.arrayContaining(['idx_vendas_data', 'idx_despesas_data', 'idx_despesas_categoria'])
    )
    banco.close()
  })

  it('aplicar as migrations duas vezes não falha nem duplica nada', () => {
    const banco = bancoMigrado()
    const tabelasAntes = nomesDasTabelas(banco)
    const categoriasAntes = contar(banco, 'SELECT COUNT(*) AS n FROM categorias')

    expect(() => migrar(banco)).not.toThrow()

    expect(nomesDasTabelas(banco)).toEqual(tabelasAntes)
    expect(contar(banco, 'SELECT COUNT(*) AS n FROM categorias')).toBe(categoriasAntes)
    // Cada migration registrada uma única vez.
    expect(contar(banco, 'SELECT COUNT(*) AS n FROM schema_migrations')).toBe(1)
    banco.close()
  })

  it('as categorias iniciais existem uma única vez', () => {
    const banco = bancoMigrado()
    migrar(banco) // segunda aplicação não pode duplicar o seed

    const categorias = linhas(banco, 'SELECT nome, conta_no_lucro, ativa FROM categorias ORDER BY id')
    expect(categorias.map((linha) => String(linha['nome']))).toEqual(CATEGORIAS_INICIAIS)

    // Nomes únicos (mesmo o COLLATE NOCASE da tabela garantindo isso).
    expect(new Set(CATEGORIAS_INICIAIS).size).toBe(CATEGORIAS_INICIAIS.length)

    for (const categoria of categorias) {
      const esperado = String(categoria['nome']) === 'Equipamento (investimento)' ? 0 : 1
      expect(Number(categoria['conta_no_lucro'])).toBe(esperado)
      expect(Number(categoria['ativa'])).toBe(1)
    }
    banco.close()
  })

  it('recusa despesa com categoria inexistente (chave estrangeira ativa)', () => {
    const banco = bancoMigrado()
    const inserir = (categoriaId: number): void => {
      banco
        .prepare(
          'INSERT INTO despesas (data, categoria_id, descricao, valor_centavos) VALUES (?, ?, ?, ?)'
        )
        .run('2026-11-06', categoriaId, 'Teste', 1000)
    }

    expect(() => inserir(999999)).toThrow()
    expect(contar(banco, 'SELECT COUNT(*) AS n FROM despesas')).toBe(0)

    // Controle: com categoria válida, grava normalmente.
    const valida = Number(banco.prepare('SELECT id FROM categorias LIMIT 1').get()?.['id'])
    expect(() => inserir(valida)).not.toThrow()
    expect(contar(banco, 'SELECT COUNT(*) AS n FROM despesas')).toBe(1)
    banco.close()
  })

  it('recusa venda com valor zero ou taxas maiores que o valor (CHECK)', () => {
    const banco = bancoMigrado()
    const inserir = (valor: number, taxas: number): void => {
      banco
        .prepare(
          'INSERT INTO vendas (data, descricao, valor_centavos, taxas_centavos) VALUES (?, ?, ?, ?)'
        )
        .run('2026-11-06', 'Teste', valor, taxas)
    }

    expect(() => inserir(0, 0)).toThrow() // valor_centavos > 0
    expect(() => inserir(-100, 0)).toThrow()
    expect(() => inserir(1000, 1001)).toThrow() // taxas <= valor
    expect(() => inserir(1000, 1000)).not.toThrow() // taxas iguais ao valor é permitido
    expect(contar(banco, 'SELECT COUNT(*) AS n FROM vendas')).toBe(1)
    banco.close()
  })
})
