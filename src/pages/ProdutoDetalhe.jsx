import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useCart } from '../context/CartContext.jsx'
import Header from '../components/Header.jsx'
import BottomNav from '../components/BottomNav.jsx'
import { formatBRL } from '../utils/format'
import { LIMITE_ESTOQUE_BAIXO } from '../config'

export default function ProdutoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()

  const [produto, setProduto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const [corSelecionada, setCorSelecionada] = useState(null)
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(null)
  const [quantidade, setQuantidade] = useState(1)
  const [imagemAtiva, setImagemAtiva] = useState(null)
  const [adicionado, setAdicionado] = useState(false)
  const [erroSelecao, setErroSelecao] = useState(null)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setLoading(true)
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (!ativo) return
      if (error) {
        setErro(error.message)
      } else {
        setProduto(data)
        setImagemAtiva(data.imagem_url)
        const primeiraCor = data.cores?.[0]?.nome ?? null
        setCorSelecionada(primeiraCor)
        const usaCor = (data.tamanhos ?? []).some((t) => (t.cor ?? '').trim() !== '')
        const primeiroDisponivel = (data.tamanhos ?? []).find(
          (t) => Number(t.estoque) > 0 && (!usaCor || (t.cor ?? '') === (primeiraCor ?? ''))
        )
        setTamanhoSelecionado(primeiroDisponivel?.tamanho ?? null)
      }
      setLoading(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow pt-md pb-xl px-gutter max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-xl lg:gap-gutter">
          <div className="lg:col-span-7">
            <div className="w-full rounded-xl glass-panel aspect-square animate-pulse bg-surface-container-lowest" />
          </div>
          <div className="lg:col-span-5 flex flex-col gap-lg animate-pulse">
            <div className="space-y-3">
              <div className="h-10 w-3/4 rounded bg-surface-variant" />
              <div className="h-6 w-1/4 rounded bg-surface-variant" />
              <div className="h-4 w-full rounded bg-surface-variant mt-md" />
              <div className="h-4 w-5/6 rounded bg-surface-variant" />
            </div>
            <div className="h-14 w-full rounded-full bg-surface-variant" />
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (erro || !produto) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-md text-center px-gutter">
        <p className="text-error font-body-md">{erro ?? 'Produto não encontrado.'}</p>
        <Link to="/" className="btn-primary">
          Voltar à loja
        </Link>
      </div>
    )
  }

  // Estoque por cor: quando qualquer linha de `tamanhos` tem `cor` preenchida, a disponibilidade
  // passa a depender da combinação cor + tamanho. Caso contrário, casa só por tamanho (comportamento antigo).
  const usaCorNoEstoque = (produto.tamanhos ?? []).some((t) => (t.cor ?? '').trim() !== '')

  function linhaEstoque(cor, tam) {
    return (produto.tamanhos ?? []).find(
      (t) => t.tamanho === tam && (!usaCorNoEstoque || (t.cor ?? '') === (cor ?? ''))
    )
  }

  const tamanhosUnicos = usaCorNoEstoque
    ? [...new Set((produto.tamanhos ?? []).map((t) => t.tamanho))].map((tamanho) => ({ tamanho }))
    : produto.tamanhos ?? []

  const tamanhoInfo = linhaEstoque(corSelecionada, tamanhoSelecionado)
  const estoqueTamanho = tamanhoInfo ? Number(tamanhoInfo.estoque) || 0 : 0
  const temTamanhos = tamanhosUnicos.length > 0
  const galeria = [produto.imagem_url, ...(produto.galeria ?? [])].filter(Boolean)

  function handleQuantidade(delta) {
    setQuantidade((q) => Math.max(1, Math.min(estoqueTamanho || 10, q + delta)))
  }

  function handleAdicionar() {
    setErroSelecao(null)
    if (temTamanhos && (!tamanhoSelecionado || estoqueTamanho <= 0)) {
      setErroSelecao('Selecione um tamanho disponível.')
      return
    }
    addItem(produto, { tamanho: tamanhoSelecionado, cor: corSelecionada, quantidade })
    setAdicionado(true)
    setTimeout(() => setAdicionado(false), 2500)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow pt-md pb-xl px-gutter max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-xl lg:gap-gutter">
        {/* Galeria */}
        <section className="lg:col-span-7 flex flex-col gap-sm">
          <div className="relative w-full rounded-xl overflow-hidden glass-panel aspect-square flex items-center justify-center group">
            <div className="absolute inset-0 bg-gradient-to-tr from-surface-dim via-surface-container to-surface opacity-80" />
            <div className="absolute w-3/4 h-3/4 rounded-full bg-primary-container/10 blur-[100px]" />
            <img
              src={imagemAtiva}
              alt={produto.nome}
              className="w-4/5 h-auto object-contain z-10 transition-transform duration-500 group-hover:scale-105 drop-shadow-2xl"
            />
            {produto.destaque && (
              <div className="absolute top-md left-md z-20 flex flex-col gap-xs">
                <span className="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-3 py-1 rounded-full w-max">
                  LANÇAMENTO
                </span>
              </div>
            )}
          </div>

          {galeria.length > 1 && (
            <div className="grid grid-cols-4 gap-sm">
              {galeria.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setImagemAtiva(src)}
                  className={`rounded-lg overflow-hidden glass-panel aspect-square flex items-center justify-center border transition-colors ${
                    imagemAtiva === src ? 'border-primary-container' : 'border-transparent hover:border-outline-variant/50'
                  }`}
                >
                  <img src={src} alt={`${produto.nome} ${i + 1}`} className="w-3/4 h-auto object-contain" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Configuração */}
        <section className="lg:col-span-5 flex flex-col gap-lg">
          <div className="flex flex-col gap-xs">
            <h1 className="font-display-lg text-display-lg lg:text-[64px] lg:leading-[64px] text-on-surface uppercase">
              {produto.nome}
            </h1>
            <p className="font-headline-md text-headline-md text-primary-container">{formatBRL(produto.preco)}</p>
            <div className="mt-md text-on-surface-variant font-body-md text-body-md space-y-4">
              <p>{produto.descricao}</p>
            </div>
          </div>

          <form
            className="flex flex-col gap-lg"
            onSubmit={(e) => {
              e.preventDefault()
              handleAdicionar()
            }}
          >
            {produto.cores?.length > 0 && (
              <div className="flex flex-col gap-sm">
                <div className="flex justify-between items-center">
                  <h3 className="font-label-sm text-label-sm text-on-surface uppercase">Cor</h3>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{corSelecionada}</span>
                </div>
                <div className="flex gap-4 items-center">
                  {produto.cores.map((cor) => {
                    const semEstoqueNaCor =
                      usaCorNoEstoque &&
                      !(produto.tamanhos ?? []).some((t) => (t.cor ?? '') === cor.nome && Number(t.estoque) > 0)
                    return (
                      <button
                        key={cor.nome}
                        type="button"
                        onClick={() => {
                          setCorSelecionada(cor.nome)
                          setQuantidade(1)
                          if (usaCorNoEstoque) {
                            const atualOk = Number(linhaEstoque(cor.nome, tamanhoSelecionado)?.estoque) > 0
                            if (!atualOk) {
                              const primeiro = [...new Set((produto.tamanhos ?? []).map((t) => t.tamanho))].find(
                                (tam) => Number(linhaEstoque(cor.nome, tam)?.estoque) > 0
                              )
                              setTamanhoSelecionado(primeiro ?? null)
                            }
                          }
                        }}
                        aria-label={cor.nome}
                        className={`color-swatch ${corSelecionada === cor.nome ? 'is-selected' : ''} ${
                          semEstoqueNaCor ? 'opacity-30' : ''
                        }`}
                        style={{ backgroundColor: cor.hex }}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {temTamanhos && (
              <div className="flex flex-col gap-sm">
                <div className="flex justify-between items-center">
                  <h3 className="font-label-sm text-label-sm text-on-surface uppercase">Selecione o Tamanho</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {tamanhosUnicos.map((t) => {
                    const disponivel = Number(linhaEstoque(corSelecionada, t.tamanho)?.estoque) > 0
                    const selecionado = tamanhoSelecionado === t.tamanho
                    return (
                      <button
                        key={t.tamanho}
                        type="button"
                        disabled={!disponivel}
                        onClick={() => {
                          setTamanhoSelecionado(t.tamanho)
                          setQuantidade(1)
                        }}
                        className={`size-option ${selecionado ? 'is-selected' : ''} ${!disponivel ? 'is-disabled' : ''}`}
                      >
                        {t.tamanho}
                      </button>
                    )
                  })}
                </div>
                {erroSelecao && <p className="text-error font-label-sm text-label-sm">{erroSelecao}</p>}
              </div>
            )}

            <div className="flex flex-col gap-sm">
              <label className="font-label-sm text-label-sm text-on-surface uppercase">Quantidade</label>
              <div className="flex items-center justify-between border border-outline-variant rounded-full bg-surface-container px-4 py-3 h-[52px] w-40">
                <button
                  type="button"
                  onClick={() => handleQuantidade(-1)}
                  className="text-on-surface-variant hover:text-primary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">remove</span>
                </button>
                <span className="font-headline-md text-headline-md text-on-surface w-8 text-center">{quantidade}</span>
                <button
                  type="button"
                  onClick={() => handleQuantidade(1)}
                  className="text-on-surface-variant hover:text-primary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                </button>
              </div>
              {temTamanhos && tamanhoSelecionado && (
                <span
                  className={`font-label-sm text-label-sm ${
                    estoqueTamanho > 0 && estoqueTamanho <= LIMITE_ESTOQUE_BAIXO
                      ? 'text-error font-bold'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {estoqueTamanho > 0 && estoqueTamanho <= LIMITE_ESTOQUE_BAIXO
                    ? `Só restam ${estoqueTamanho} unidade${estoqueTamanho > 1 ? 's' : ''}!`
                    : `${estoqueTamanho} em estoque`}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={temTamanhos && estoqueTamanho <= 0}
              className="btn-primary"
            >
              <span>{adicionado ? 'Adicionado!' : 'Adicionar ao carrinho'}</span>
              <span className="material-symbols-outlined fill">{adicionado ? 'check' : 'shopping_cart'}</span>
            </button>

            {adicionado && (
              <button type="button" onClick={() => navigate('/carrinho')} className="text-center text-primary-container font-label-sm text-label-sm underline">
                Ver carrinho
              </button>
            )}

            <div className="flex justify-center items-center gap-6 mt-4 opacity-60">
              <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface">
                <span className="material-symbols-outlined text-sm">local_shipping</span>
                Frete Expresso
              </div>
              <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface">
                <span className="material-symbols-outlined text-sm">assignment_return</span>
                Devolução em 30 dias
              </div>
            </div>
          </form>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
