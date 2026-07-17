import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useCart } from '../context/CartContext.jsx'
import { formatBRL } from '../utils/format'
import { buildOrderMessage, buildWhatsAppLink } from '../utils/whatsapp'
import { FRETE_PADRAO, DESCONTO_PIX } from '../config'

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart()
  const navigate = useNavigate()

  const [cliente, setCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [formaEntrega, setFormaEntrega] = useState('entrega')
  const [endereco, setEndereco] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)
  const [statusPix, setStatusPix] = useState('pendente')

  const [cpf, setCpf] = useState('')
  const [numeroCartao, setNumeroCartao] = useState('')
  const [nomeCartao, setNomeCartao] = useState('')
  const [validadeMes, setValidadeMes] = useState('')
  const [validadeAno, setValidadeAno] = useState('')
  const [cvv, setCvv] = useState('')

  useEffect(() => {
    if (items.length === 0 && !sucesso) {
      navigate('/carrinho', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, sucesso])

  useEffect(() => {
    if (!sucesso?.pix || statusPix !== 'pendente') return

    const intervalo = setInterval(async () => {
      const { data } = await supabase.rpc('consultar_status_pagamento', { p_pedido_id: sucesso.pedidoId })
      if (data && data !== 'pendente') {
        setStatusPix(data)
      }
    }, 4000)

    return () => clearInterval(intervalo)
  }, [sucesso, statusPix])

  const frete = formaEntrega === 'entrega' ? FRETE_PADRAO : 0
  const desconto = formaPagamento === 'pix' ? (subtotal + frete) * DESCONTO_PIX : 0
  const total = subtotal + frete - desconto

  async function gerarCobrancaPix(pedidoId) {
    const { data, error: pixError } = await supabase.functions.invoke('criar-cobranca-pix', {
      body: { pedido_id: pedidoId },
    })

    if (pixError || data?.error) {
      setSucesso((atual) => ({ ...atual, pix: null, erroPix: data?.error ?? pixError.message }))
      return
    }

    setSucesso((atual) => ({ ...atual, pix: data, erroPix: null }))
    setStatusPix('pendente')
  }

  async function processarCartao(pedidoId) {
    try {
      const { data: chave, error: chaveError } = await supabase.functions.invoke('chave-publica-cartao')
      if (chaveError || chave?.error) throw new Error(chave?.error ?? chaveError.message)

      const resultado = window.PagSeguro.encryptCard({
        publicKey: chave.public_key,
        holder: nomeCartao.trim(),
        number: numeroCartao.replace(/\D/g, ''),
        expMonth: validadeMes.trim(),
        expYear: validadeAno.trim(),
        securityCode: cvv.trim(),
      })

      if (resultado.hasErrors) {
        throw new Error(resultado.errors?.[0]?.message ?? 'Dados do cartão inválidos.')
      }

      const { data, error: cobrancaError } = await supabase.functions.invoke('criar-cobranca-cartao', {
        body: {
          pedido_id: pedidoId,
          encrypted_card: resultado.encryptedCard,
          holder_name: nomeCartao.trim(),
          holder_tax_id: cpf.replace(/\D/g, ''),
        },
      })

      if (cobrancaError || data?.error) throw new Error(data?.error ?? cobrancaError.message)

      setSucesso((atual) => ({ ...atual, cartao: data, erroCartao: null }))
    } catch (err) {
      setSucesso((atual) => ({ ...atual, cartao: null, erroCartao: err.message }))
    }
  }

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
    if (
      formaPagamento === 'cartao' &&
      (!cpf.trim() || !numeroCartao.trim() || !nomeCartao.trim() || !validadeMes.trim() || !validadeAno.trim() || !cvv.trim())
    ) {
      setErro('Preencha todos os dados do cartão.')
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

    const { data: pedidoId, error } = await supabase.rpc('criar_pedido', {
      payload: {
        cliente: cliente.trim(),
        telefone: telefone.trim(),
        itens: itensPayload,
        total,
        forma_entrega: formaEntrega,
        endereco: formaEntrega === 'entrega' ? endereco.trim() : null,
        forma_pagamento: formaPagamento,
      },
    })

    setEnviando(false)

    if (error) {
      setErro(error.message)
      return
    }

    const mensagem = buildOrderMessage({
      pedidoId,
      cliente: cliente.trim(),
      telefone: telefone.trim(),
      itens: itensPayload,
      subtotal,
      total,
      formaEntrega,
      endereco,
      formaPagamento,
    })
    const link = buildWhatsAppLink(mensagem)

    clearCart()

    if (formaPagamento === 'pix') {
      setSucesso({ pedidoId, link, total, pix: null, erroPix: null, carregandoPix: true })
      await gerarCobrancaPix(pedidoId)
      setSucesso((atual) => ({ ...atual, carregandoPix: false }))
    } else {
      setSucesso({ pedidoId, link, total, cartao: null, erroCartao: null, processandoCartao: true })
      await processarCartao(pedidoId)
      setSucesso((atual) => ({ ...atual, processandoCartao: false }))
    }
  }

  if (sucesso && formaPagamento === 'pix') {
    const pedidoCurto = sucesso.pedidoId.slice(0, 8).toUpperCase()

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-md px-gutter text-center bg-black py-xl">
        {statusPix === 'pago' ? (
          <>
            <span className="material-symbols-outlined fill text-primary-container text-6xl">check_circle</span>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
              Pagamento confirmado!
            </h1>
            <p className="text-on-surface-variant font-body-md max-w-md">
              Recebemos seu Pix. O pedido #{pedidoCurto} já está sendo preparado.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
              Escaneie para pagar
            </h1>
            <p className="text-on-surface-variant font-body-md max-w-md">
              Pedido #{pedidoCurto} — {formatBRL(sucesso.total)}. Assim que o pagamento cair, confirmamos aqui
              automaticamente.
            </p>

            {sucesso.carregandoPix && (
              <span className="material-symbols-outlined text-primary-container text-4xl animate-spin">
                progress_activity
              </span>
            )}

            {sucesso.pix && (
              <>
                <div className="glass-panel rounded-xl p-md">
                  <img src={sucesso.pix.qr_image_url} alt="QR Code Pix" className="w-64 h-64 object-contain" />
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(sucesso.pix.qr_text)}
                  className="btn-primary"
                >
                  <span className="material-symbols-outlined">content_copy</span>
                  Copiar código Pix
                </button>
                {statusPix === 'falhou' ? (
                  <p className="text-error font-label-sm text-label-sm">
                    O pagamento não foi confirmado. Gere um novo código ou combine pelo WhatsApp.
                  </p>
                ) : (
                  <div className="flex items-center gap-sm text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                    Aguardando pagamento...
                  </div>
                )}
              </>
            )}

            {sucesso.erroPix && !sucesso.carregandoPix && (
              <div className="glass-panel rounded-lg p-md max-w-md">
                <p className="text-error font-label-sm text-label-sm mb-sm">
                  Não conseguimos gerar o QR Code Pix agora ({sucesso.erroPix}).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSucesso((atual) => ({ ...atual, carregandoPix: true }))
                    gerarCobrancaPix(sucesso.pedidoId).then(() =>
                      setSucesso((atual) => ({ ...atual, carregandoPix: false }))
                    )
                  }}
                  className="btn-primary"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            <a
              href={sucesso.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-container font-label-sm text-label-sm underline mt-sm"
            >
              Ou combinar pelo WhatsApp
            </a>
          </>
        )}

        <Link to="/" className="text-primary-container font-label-sm text-label-sm underline mt-sm">
          Voltar à loja
        </Link>
      </div>
    )
  }

  if (sucesso) {
    const pedidoCurto = sucesso.pedidoId.slice(0, 8).toUpperCase()

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-md px-gutter text-center bg-black py-xl">
        {sucesso.processandoCartao && (
          <span className="material-symbols-outlined text-primary-container text-4xl animate-spin">
            progress_activity
          </span>
        )}

        {sucesso.cartao?.aprovado && (
          <>
            <span className="material-symbols-outlined fill text-primary-container text-6xl">check_circle</span>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
              Pagamento aprovado!
            </h1>
            <p className="text-on-surface-variant font-body-md max-w-md">
              Pedido #{pedidoCurto} — {formatBRL(sucesso.total)} no cartão
              {sucesso.cartao.bandeira ? ` (${sucesso.cartao.bandeira} final ${sucesso.cartao.ultimos_digitos})` : ''}.
            </p>
          </>
        )}

        {sucesso.cartao && !sucesso.cartao.aprovado && (
          <div className="glass-panel rounded-lg p-md max-w-md">
            <p className="text-error font-label-sm text-label-sm mb-sm">
              Pagamento recusado{sucesso.cartao.mensagem ? `: ${sucesso.cartao.mensagem}` : '.'} Nenhum valor foi
              cobrado.
            </p>
            <a href={sucesso.link} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <span className="material-symbols-outlined">chat</span>
              Combinar pelo WhatsApp
            </a>
          </div>
        )}

        {sucesso.erroCartao && !sucesso.processandoCartao && (
          <div className="glass-panel rounded-lg p-md max-w-md">
            <p className="text-error font-label-sm text-label-sm mb-sm">
              Não conseguimos processar o cartão agora ({sucesso.erroCartao}).
            </p>
            <a href={sucesso.link} target="_blank" rel="noopener noreferrer" className="btn-primary">
              <span className="material-symbols-outlined">chat</span>
              Combinar pelo WhatsApp
            </a>
          </div>
        )}

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
          <p className="text-body-md font-body-md text-on-surface-variant">Complete os dados abaixo para confirmar sua compra.</p>
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

            <div className="glass-panel rounded p-md space-y-md">
              <h3 className="text-headline-md font-headline-md text-primary flex items-center gap-sm border-b border-outline-variant/20 pb-sm">
                <span className="material-symbols-outlined text-primary-fixed">local_shipping</span>
                Entrega
              </h3>
              <div className="space-y-sm">
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
            </div>

            <div className="glass-panel rounded p-md space-y-md flex flex-col">
              <h3 className="text-headline-md font-headline-md text-primary flex items-center gap-sm border-b border-outline-variant/20 pb-sm">
                <span className="material-symbols-outlined text-primary-fixed">payments</span>
                Pagamento
              </h3>
              <div className="space-y-sm flex-grow">
                <label className="flex items-center gap-sm p-sm rounded-lg border border-outline-variant/30 bg-surface-container-high hover:bg-surface-variant cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="forma_pagamento"
                    checked={formaPagamento === 'pix'}
                    onChange={() => setFormaPagamento('pix')}
                  />
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-fixed">qr_code</span>
                    <span className="text-body-md font-body-md text-primary">Pix (Desconto de 5%)</span>
                  </div>
                </label>
                <label className="flex items-center gap-sm p-sm rounded-lg border border-outline-variant/30 bg-surface-container-high hover:bg-surface-variant cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="forma_pagamento"
                    checked={formaPagamento === 'cartao'}
                    onChange={() => setFormaPagamento('cartao')}
                  />
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-fixed">credit_card</span>
                    <span className="text-body-md font-body-md text-primary">Cartão de Crédito</span>
                  </div>
                </label>

                {formaPagamento === 'cartao' && (
                  <div className="space-y-sm pt-sm">
                    <div>
                      <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs uppercase">
                        CPF do titular
                      </label>
                      <input
                        type="text"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        className="field"
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs uppercase">
                        Número do cartão
                      </label>
                      <input
                        type="text"
                        value={numeroCartao}
                        onChange={(e) => setNumeroCartao(e.target.value)}
                        className="field"
                        placeholder="0000 0000 0000 0000"
                        inputMode="numeric"
                        autoComplete="cc-number"
                      />
                    </div>
                    <div>
                      <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs uppercase">
                        Nome impresso no cartão
                      </label>
                      <input
                        type="text"
                        value={nomeCartao}
                        onChange={(e) => setNomeCartao(e.target.value)}
                        className="field"
                        placeholder="Como está no cartão"
                        autoComplete="cc-name"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-sm">
                      <div>
                        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs uppercase">Mês</label>
                        <input
                          type="text"
                          value={validadeMes}
                          onChange={(e) => setValidadeMes(e.target.value)}
                          className="field"
                          placeholder="MM"
                          maxLength={2}
                          inputMode="numeric"
                          autoComplete="cc-exp-month"
                        />
                      </div>
                      <div>
                        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs uppercase">Ano</label>
                        <input
                          type="text"
                          value={validadeAno}
                          onChange={(e) => setValidadeAno(e.target.value)}
                          className="field"
                          placeholder="AAAA"
                          maxLength={4}
                          inputMode="numeric"
                          autoComplete="cc-exp-year"
                        />
                      </div>
                      <div>
                        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs uppercase">CVV</label>
                        <input
                          type="text"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          className="field"
                          placeholder="000"
                          maxLength={4}
                          inputMode="numeric"
                          autoComplete="cc-csc"
                        />
                      </div>
                    </div>
                    <p className="text-on-surface-variant/70 font-label-sm text-label-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">lock</span>
                      O cartão é criptografado no seu navegador antes de sair — nunca passa pelo nosso servidor.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-md border-t border-outline-variant/20 space-y-1">
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
                {desconto > 0 && (
                  <div className="flex justify-between items-center text-body-md font-body-md text-primary-container">
                    <span>Desconto Pix</span>
                    <span>-{formatBRL(desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-headline-md font-headline-md text-primary pt-1">
                  <span>Total</span>
                  <span className="text-primary-fixed">{formatBRL(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {erro && (
            <div className="glass-panel rounded-lg p-md text-error font-label-sm text-label-sm border border-error/30">{erro}</div>
          )}

          <div className="pt-lg pb-xl md:pb-lg flex justify-center sticky bottom-0 z-40 backdrop-blur-md px-gutter md:px-0 mx-[-24px] md:mx-0 py-md md:static md:bg-transparent md:backdrop-blur-none bg-black">
            <button type="submit" disabled={enviando} className="btn-primary w-full md:w-auto">
              <span className="material-symbols-outlined">{formaPagamento === 'pix' ? 'qr_code' : 'credit_card'}</span>
              {enviando
                ? 'Enviando...'
                : formaPagamento === 'pix'
                  ? 'Confirmar e gerar QR Code Pix'
                  : 'Confirmar e pagar com cartão'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
