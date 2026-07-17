import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Header from '../components/Header.jsx'
import CategoryNav from '../components/CategoryNav.jsx'
import BottomNav from '../components/BottomNav.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { CATEGORIAS } from '../config'

function matchesCategoria(produto, valor) {
  if (valor === 'todos') return true
  const config = CATEGORIAS.find((c) => c.valor === valor)
  if (!config) return true
  if (config.tipo === 'genero') return produto.genero === valor || produto.genero === 'unissex'
  if (config.tipo === 'categoria') return produto.categoria === valor
  return true
}

export default function Vitrine() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false })

      if (!ativo) return
      if (error) {
        setErro(error.message)
      } else {
        setProdutos(data ?? [])
      }
      setLoading(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return produtos.filter((p) => {
      if (!matchesCategoria(p, categoriaAtiva)) return false
      if (termo && !p.nome.toLowerCase().includes(termo)) return false
      return true
    })
  }, [produtos, categoriaAtiva, busca])

  const destaque = produtosFiltrados.find((p) => p.destaque)
  const restantes = produtosFiltrados.filter((p) => p.id !== destaque?.id)

  return (
    <div className="min-h-screen flex flex-col">
      <Header searchValue={busca} onSearchChange={setBusca} />

      <div className="flex flex-col md:flex-row max-w-container-max mx-auto w-full px-0 md:px-gutter">
        <CategoryNav ativo={categoriaAtiva} onSelect={setCategoriaAtiva} />

        <main className="flex-1 px-gutter py-md">
          <div className="mb-lg">
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Lançamentos <span className="text-primary-container">Exclusivos</span>
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">Elevando a performance ao extremo.</p>
          </div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
              <div className="glass-panel rounded-[2rem] overflow-hidden flex flex-col md:col-span-2 animate-pulse">
                <div className="h-64 md:h-80 w-full bg-surface-container-lowest" />
                <div className="p-6 space-y-3">
                  <div className="h-6 w-2/3 rounded bg-surface-variant" />
                  <div className="h-4 w-1/3 rounded bg-surface-variant" />
                </div>
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="glass-panel rounded-[2rem] overflow-hidden flex flex-col animate-pulse">
                  <div className="h-48 w-full bg-surface-container-lowest" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 w-3/4 rounded bg-surface-variant" />
                    <div className="h-4 w-1/2 rounded bg-surface-variant" />
                    <div className="h-5 w-1/3 rounded bg-surface-variant mt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {erro && (
            <div className="glass-panel rounded-lg p-md text-error font-label-sm text-label-sm">
              Erro ao carregar produtos: {erro}
            </div>
          )}

          {!loading && !erro && produtosFiltrados.length === 0 && (
            <div className="glass-panel rounded-lg p-xl flex flex-col items-center justify-center text-center gap-md border border-dashed border-outline-variant/50">
              <span className="material-symbols-outlined text-[64px] text-surface-variant">inventory_2</span>
              <h3 className="font-headline-md text-headline-md text-on-surface">Nenhum produto encontrado</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                Tente outra categoria ou termo de busca.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {destaque && <ProductCard produto={destaque} featured />}
            {restantes.map((produto) => (
              <ProductCard key={produto.id} produto={produto} />
            ))}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
