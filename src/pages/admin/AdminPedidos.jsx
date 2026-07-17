import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import AdminShell from '../../components/admin/AdminShell.jsx'
import { formatBRL, formatDate } from '../../utils/format'

const STATUS_OPTIONS = ['pendente', 'confirmado', 'enviado', 'entregue', 'cancelado']

const STATUS_STYLES = {
  pendente: 'bg-surface-variant text-on-surface',
  confirmado: 'bg-primary-container text-on-primary-container',
  enviado: 'bg-secondary-container text-on-secondary-container',
  entregue: 'bg-primary-fixed text-on-primary-fixed',
  cancelado: 'bg-error-container text-on-error-container',
}

const STATUS_PAGAMENTO_LABELS = {
  pendente: 'Aguardando pagamento',
  pago: 'Pago',
  falhou: 'Não pago',
}

const STATUS_PAGAMENTO_STYLES = {
  pendente: 'bg-surface-variant text-on-surface',
  pago: 'bg-primary-container text-on-primary-container',
  falhou: 'bg-error-container text-on-error-container',
}

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [expandido, setExpandido] = useState(null)

  async function carregar() {
    setLoading(true)
    const { data, error } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false })
    if (error) setErro(error.message)
    else setPedidos(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function atualizarStatus(id, status) {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
    const { error } = await supabase.from('pedidos').update({ status }).eq('id', id)
    if (error) {
      setErro(error.message)
      carregar()
    }
  }

  return (
    <AdminShell active="orders" title="Histórico de Pedidos">
      {loading && (
        <div className="flex items-center justify-center py-xl">
          <span className="material-symbols-outlined text-primary-container text-4xl animate-spin">progress_activity</span>
        </div>
      )}

      {erro && <p className="text-error font-label-sm text-label-sm">{erro}</p>}

      {!loading && pedidos.length === 0 && (
        <p className="text-on-surface-variant font-body-md text-center py-xl">Nenhum pedido recebido ainda.</p>
      )}

      <div className="flex flex-col gap-md">
        {pedidos.map((pedido) => {
          const aberto = expandido === pedido.id
          return (
            <div key={pedido.id} className="glass-panel rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandido(aberto ? null : pedido.id)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-sm p-md text-left"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-headline-md text-headline-md text-on-surface">{pedido.cliente}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {pedido.telefone} • {formatDate(pedido.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-md">
                  <span className="font-headline-md text-headline-md text-primary-container">{formatBRL(pedido.total)}</span>
                  <span
                    className={`font-label-sm text-label-sm px-3 py-1 rounded-full uppercase ${
                      STATUS_PAGAMENTO_STYLES[pedido.status_pagamento] ?? ''
                    }`}
                  >
                    {STATUS_PAGAMENTO_LABELS[pedido.status_pagamento] ?? pedido.status_pagamento}
                  </span>
                  <span className={`font-label-sm text-label-sm px-3 py-1 rounded-full uppercase ${STATUS_STYLES[pedido.status] ?? ''}`}>
                    {pedido.status}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    {aberto ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
              </button>

              {aberto && (
                <div className="border-t border-white/10 p-md flex flex-col gap-md">
                  <div className="flex flex-col gap-2">
                    {(pedido.itens ?? []).map((item, i) => (
                      <div key={i} className="flex justify-between items-center font-body-md text-body-md text-on-surface-variant">
                        <span>
                          {item.quantidade}x {item.nome}
                          {(item.tamanho || item.cor) && (
                            <span className="text-on-surface-variant/70">
                              {' '}
                              ({[item.tamanho && `Tam ${item.tamanho}`, item.cor].filter(Boolean).join(' / ')})
                            </span>
                          )}
                        </span>
                        <span className="text-on-surface">{formatBRL(item.preco_unitario * item.quantidade)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm font-label-sm text-label-sm text-on-surface-variant border-t border-white/10 pt-sm">
                    <span>Subtotal: {formatBRL(pedido.subtotal)}</span>
                    <span>Entrega: {pedido.forma_entrega === 'retirada' ? 'Retirada na loja' : 'Endereço'}</span>
                    <span>
                      Pagamento: {pedido.forma_pagamento === 'pix' ? 'Pix' : 'Cartão'} —{' '}
                      {STATUS_PAGAMENTO_LABELS[pedido.status_pagamento] ?? pedido.status_pagamento}
                    </span>
                    {pedido.endereco && <span className="sm:col-span-2">Endereço: {pedido.endereco}</span>}
                  </div>

                  <div className="flex items-center gap-sm pt-sm">
                    <label className="font-label-sm text-label-sm text-on-surface-variant uppercase">Status</label>
                    <select
                      value={pedido.status}
                      onChange={(e) => atualizarStatus(pedido.id, e.target.value)}
                      className="field w-auto py-2"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </AdminShell>
  )
}
