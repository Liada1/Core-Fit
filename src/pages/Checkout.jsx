import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useCart } from '../context/CartContext.jsx'
import { formatBRL } from '../utils/format'
import { buildOrderMessage, buildWhatsAppLink } from '../utils/whatsapp'
import { FRETE_PADRAO } from '../config'

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart()
  const navigate = useNavigate()

  const [cliente, setCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [formaEntrega, setFormaEntrega] = useState('entrega')
  const [endereco, setEndereco] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)

  useEffect(() => {
    if (items.length === 0 && !sucesso) {
      navigate('/carrinho', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, sucesso])

  const frete = formaEntrega === 'entrega' ? FRETE_PADRAO : 0
  const total = subtotal + frete

  async function handleSubmit(e) {
    e.preventDefault()
    setErro(null)

    if (!cliente.trim() || !telefone.trim()) {
      setErro('Preencha nome e telefone.')
      return
    }
    if (formaEntrega === 'entrega' && !endereco.trim()) {
      setErro('Informe o endereço de entrega.')
      return
    }

    setEnviando(true)

    const itensPayload = items.map((item) => ({
      produto_id: item.produtoId,
      nome: item.nome,
      imagem_url: item.imagemUrl,
      tamanho: item.tamanho,
      cor: item.cor,
      quantidade: item.quantidade,
      preco_unitario: item.preco,
    }))

    // Registra o pedido no banco (e baixa o estoque) quando possível. Se falhar,
    // não bloqueia o cliente — o pedido segue pelo WhatsApp mesmo assim.
    let pedidoId = null
    try {
      const { data, error } = await supabase.rpc('criar_pedido', {
        payload: {
          cliente: cliente.trim(),
          telefone: telefone.trim(),
          itens: itensPayload,
          total,
          forma_entrega: formaEntrega,
          endereco: formaEntrega === 'entrega' ? endereco.trim() : null,
        },
      })
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[criar_pedido] não foi possível registrar o pedido:', error.message)
      } else {
        pedidoId = data
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[criar_pedido] erro inesperado:', err)
    }

    const mensagem = buildOrderMessage({
      pedidoId,
      cliente: cliente.trim(),
      telefone: telefone.trim(),
      itens: itensPayload,
      subtotal,
      frete,
      total,
      formaEntrega,
      endereco: endereco.trim(),
      observacoes: observacoes.trim(),
    })
    const link = buildWhatsAppLink(mensagem)

    clearCart()
    setEnviando(false)
    setSucesso({ pedidoId, link, total })

    // Abre o WhatsApp já com o pedido montado.
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  if (sucesso) {
    const pedidoCurto = sucesso.pedidoId ? `#${sucesso.pedidoId.slice(0, 8).toUpperCase()}` : null

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-md px-gutter text-center bg-black py-xl">
        <span className="material-symbols-outlined fill text-primary-container text-6xl">chat</span>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
          Pedido pronto!
        </h1>
        <p className="text-on-surface-variant font-body-md max-w-md">
          {pedidoCurto ? `Pedido ${pedidoCurto} — ` : ''}
          {formatBRL(sucesso.total)}. Se o WhatsApp não abriu automaticamente, toque no botão abaixo para enviar seu
          pedido ao vendedor e combinar o pagamento.
        </p>

        <a href={sucesso.link} target="_blank" rel="noopener noreferrer" className="btn-primary">
          <span className="material-symbols-outlined">chat</span>
          Finalizar via WhatsApp
        </a>

        <Link to="/" className="text-primary-container font-label-sm text-label-sm underline mt-sm">
          Voltar à loja
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <header className="backdrop-blur-xl text-primary-container sticky top-0 flex items-center gap-sm px-gutter py-md w-full border-b border-outline-variant/20 z-50 bg-black">
        <Link to="/carrinho" className="text-primary-container">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <span className="font-headline-md text-headline-md font-extrabold text-primary-container tracking-tighter">CORE FIT</span>
      </header>

      <main className="flex-grow w-full max-w-3xl mx-auto px-gutter py-xl">
        <div className="mb-lg">
          <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-xs">
            Finalizar Pedido
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Preencha seus dados. O pedido é enviado ao vendedor pelo WhatsApp e o pagamento é combinado por lá.
          </p>
        </div>

        <form className="space-y-lg" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="glass-panel rounded p-md space-y-md md:col-span-2">
              <h3 className="text-headline-md font-headline-md text-primary flex items-center gap-sm border-b border-outline-variant/20 pb-sm">
                <span className="material-symbols-outlined text-primary-fixed">person</span>
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div>
                  <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs uppercase">Nome completo</label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="field"
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs uppercase">
                    Telefone (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="field"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="glass-panel rounded p-md space-y-md md:col-span-2">
              <h3 className="text-headline-md font-headline-md text-primary flex items-center gap-sm border-b border-outline-variant/20 pb-sm">
                <span className="material-symbols-outlined text-primary-fixed">local_shipping</span>
                Entrega
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                <label className="flex items-center gap-sm p-sm rounded-lg border border-outline-variant/30 bg-surface-container-high hover:bg-surface-variant cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="forma_entrega"
                    checked={formaEntrega === 'entrega'}
                    onChange={() => setFormaEntrega('entrega')}
                  />
                  <span className="text-body-md font-body-md text-primary">Entrega no endereço</span>
                </label>
                <label className="flex items-center gap-sm p-sm rounded-lg border border-outline-variant/30 bg-surface-container-high hover:bg-surface-variant cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="forma_entrega"
                    checked={formaEntrega === 'retirada'}
                    onChange={() => setFormaEntrega('retirada')}
                  />
                  <span className="text-body-md font-body-md text-primary">Retirada na loja</span>
                </label>
              </div>
              {formaEntrega === 'entrega' && (
                <div className="pt-sm">
                  <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs uppercase">
                    Endereço Completo
                  </label>
                  <textarea
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="field h-32 resize-none"
                    placeholder="Rua, Número, Bairro, Cidade, CEP..."
                  />
                </div>
              )}
              <div className="pt-sm">
                <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs uppercase">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="field h-24 resize-none"
                  placeholder="Ponto de referência, horário para entrega, etc."
                />
              </div>
            </div>

            <div className="glass-panel rounded p-md space-y-md md:col-span-2">
              <h3 className="text-headline-md font-headline-md text-primary flex items-center gap-sm border-b border-outline-variant/20 pb-sm">
                <span className="material-symbols-outlined text-primary-fixed">receipt_long</span>
                Resumo
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-body-md font-body-md text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>{formatBRL(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-body-md font-body-md text-on-surface-variant">
                  <span>Entrega</span>
                  <span className={frete === 0 ? 'text-primary-container font-bold uppercase' : ''}>
                    {frete === 0 ? 'Grátis' : formatBRL(frete)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-headline-md font-headline-md text-primary pt-1">
                  <span>Total</span>
                  <span className="text-primary-fixed">{formatBRL(total)}</span>
                </div>
              </div>
              <p className="text-on-surface-variant/70 font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">lock</span>
                Nenhum pagamento é feito no site. O vendedor confirma valores e forma de pagamento pelo WhatsApp.
              </p>
            </div>
          </div>

          {erro && (
            <div className="glass-panel rounded-lg p-md text-error font-label-sm text-label-sm border border-error/30">{erro}</div>
          )}

          <div className="pt-lg pb-xl md:pb-lg flex justify-center sticky bottom-0 z-40 backdrop-blur-md px-gutter md:px-0 mx-[-24px] md:mx-0 py-md md:static md:bg-transparent md:backdrop-blur-none bg-black">
            <button type="submit" disabled={enviando} className="btn-primary w-full md:w-auto">
              <span className="material-symbols-outlined">chat</span>
              {enviando ? 'Preparando pedido...' : 'Finalizar via WhatsApp'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
