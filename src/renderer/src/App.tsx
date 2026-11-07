import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router'
import Categorias from './paginas/Categorias'
import CategoriaForm from './paginas/CategoriaForm'
import Despesas from './paginas/Despesas'
import DespesaForm from './paginas/DespesaForm'
import Resumo from './paginas/Resumo'
import Vendas from './paginas/Vendas'
import VendaForm from './paginas/VendaForm'

function Layout(): React.JSX.Element {
  return (
    <div className="app">
      <header className="cabecalho">
        <h1>Financeiro — Impressão 3D</h1>
        <nav className="menu">
          <NavLink to="/resumo" className={({ isActive }) => (isActive ? 'ativo' : undefined)}>
            Resumo
          </NavLink>
          <NavLink to="/vendas" className={({ isActive }) => (isActive ? 'ativo' : undefined)}>
            Vendas
          </NavLink>
          <NavLink to="/despesas" className={({ isActive }) => (isActive ? 'ativo' : undefined)}>
            Despesas
          </NavLink>
          <NavLink to="/categorias" className={({ isActive }) => (isActive ? 'ativo' : undefined)}>
            Categorias
          </NavLink>
        </nav>
      </header>
      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Navigate to="/resumo" replace />} />
          <Route path="/resumo" element={<Resumo />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/vendas/nova" element={<VendaForm key="nova" />} />
          <Route path="/vendas/:id/editar" element={<VendaForm key="editar" />} />
          <Route path="/despesas" element={<Despesas />} />
          <Route path="/despesas/nova" element={<DespesaForm key="nova" />} />
          <Route path="/despesas/:id/editar" element={<DespesaForm key="editar" />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/categorias/nova" element={<CategoriaForm key="nova" />} />
          <Route path="/categorias/:id/editar" element={<CategoriaForm key="editar" />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  )
}
