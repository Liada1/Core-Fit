import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import AdminShell from '../../components/admin/AdminShell.jsx'
import { formatBRL, totalEstoque } from '../../utils/format'
import { LIMITE_ESTOQUE_BAIXO } from '../../config'

const CATEGORIAS_ADMIN = [
  { valor: 'todos', label: 'Todas as categorias' },
  { valor: 'tenis', label: 'Tênis' },
  { valor: 'roupas', label: 'Roupas' },
  { valor: 'acessorios', label: 'Acessórios' },
]

export default function AdminDashboard() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [categoria, setCategoria] = useState('todos')
  const [busca, setBusca] = useState('')
  const [somenteBaixoEstoque, setSomenteBaixoEstoque] = useState(false)

  async function carregar() {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (error) setErro(error.message)
    else setProdutos(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const produtosComEstoqueBaixo = useMemo(
    () => produtos.filter((p) => (p.tamanhos ?? []).some((t) => Number(t.estoque) <= LIMITE_ESTOQUE_BAIXO)),
    [produtos]
  )

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return produtos.filter((p) => {
      if (categoria !== 'todos' && p.categoria !== categoria) return false
      if (termo && !p.nome.toLowerCase().includes(termo)) return false
      if (somenteBaixoEstoque && !produtosComEstoqueBaixo.includes(p)) return false
      return true
    })
  }, [produtos, categoria, busca, somenteBaixoEstoque, produtosComEstoqueBaixo])

  return (
    <AdminShell active="inventory" title="Inventory Management">
      {produtosComEstoqueBaixo.length > 0 && (
        <section className="bg-surface-container-lowest/80 backdrop-blur-lg rounded-xl p-md border border-error/20 flex flex-col sm:flex-row items-center justify-between gap-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-error/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-md z-10">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error border border-error/30">
              <span className="material-symbols-outlined fill">warning</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-error">Estoque Baixo</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {produtosComEstoqueBaixo.length} produto(s) precisam de reposição
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSomenteBaixoEstoque((v) => !v)}
            className="bg-surface-container border border-white/10 text-on-surface hover:text-primary-fixed font-label-sm px-md py-2 rounded-full transition-colors z-10"
          >
            {somenteBaixoEstoque ? 'MOSTRAR TODOS' : 'REVISAR ITENS'}
          </button>
        </section>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-md">
        <div className="flex gap-sm overflow-x-auto pb-2 w-full sm:w-auto no-scrollbar">
          {CATEGORIAS_ADMIN.map((cat) => (
            <button
              key={cat.valor}
              type="button"
              onClick={() => setCategoria(cat.valor)}
              className={`font-label-sm px-4 py-2 rounded-full whitespace-nowrap transition-colors border ${
                categoria === cat.valor
                  ? 'bg-primary-container text-on-primary-container border-transparent'
                  : 'bg-surface-container text-on-surface-variant hover:text-primary-fixed border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produtos..."
          className="field w-full sm:w-64 py-2 rounded-full"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-xl">
          <span className="material-symbols-outlined text-primary-container text-4xl animate-spin">progress_activity</span>
        </div>
      )}

      {erro && <p className="text-error font-label-sm text-label-sm">{erro}</p>}

      {!loading && !erro && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {produtosFiltrados.map((produto) => {
            const estoque = totalEstoque(produto)
            const baixo = (produto.tamanhos ?? []).some((t) => Number(t.estoque) <= LIMITE_ESTOQUE_BAIXO)
            const percentual = Math.min(100, Math.round((estoque / 50) * 100))
            return (
              <Link
                key={produto.id}
                to={`/admin/produtos/${produto.id}`}
                className={`bg-surface rounded-xl border overflow-hidden group hover:border-white/20 transition-all ${
                  baixo ? 'border-error/30' : 'border-white/5'
                }`}
              >
                <div className="h-48 relative overflow-hidden bg-surface-container-lowest">
                  <img
                    src={produto.imagem_url}
                    alt={produto.nome}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-sm right-sm bg-surface-container-highest/80 backdrop-blur-md px-2 py-1 rounded font-label-sm text-primary-fixed text-[10px] border border-white/10 uppercase">
                    {produto.categoria}
                  </div>
                  {!produto.ativo && (
                    <div className="absolute top-sm left-sm bg-black/70 px-2 py-1 rounded font-label-sm text-on-surface-variant text-[10px] border border-white/10 uppercase">
                      Inativo
                    </div>
                  )}
                </div>
                <div className="p-md flex flex-col gap-sm">
                  <div className="flex justify-between items-start gap-sm">
                    <h3 className="font-headline-md text-headline-md text-on-surface">{produto.nome}</h3>
                    <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{formatBRL(produto.preco)}</span>
                  </div>
                  <div className="mt-sm">
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Estoque Total</span>
                      <span className={`font-label-sm text-label-sm ${baixo ? 'text-error' : 'text-primary-fixed'}`}>
                        {estoque} un.
                      </span>
                    </div>
                    <div className="stock-bar">
                      <div className={`stock-bar-fill ${baixo ? 'is-low' : ''}`} style={{ width: `${percentual}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {!loading && !erro && produtosFiltrados.length === 0 && (
        <p className="text-on-surface-variant font-body-md text-center py-xl">Nenhum produto encontrado.</p>
      )}

      <Link
        to="/admin/produtos/novo"
        className="fixed bottom-32 md:bottom-12 right-md md:right-lg w-14 h-14 bg-primary-fixed text-on-primary-fixed rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(195,244,0,0.4)] hover:scale-105 active:scale-95 transition-all z-40"
        aria-label="Adicionar produto"
      >
        <span className="material-symbols-outlined text-2xl font-bold">add</span>
      </Link>
    </AdminShell>
  )
}
