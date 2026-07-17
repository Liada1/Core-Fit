// Chamado pelo trigger `trigger_notificar_novo_pedido` (via pg_net) toda vez que um pedido é
// criado. Manda um aviso pro Telegram do admin — não bloqueia a criação do pedido se falhar.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async (req) => {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID não configurados nas secrets da função.')
      return new Response('ok', { status: 200 })
    }

    const { pedido_id } = await req.json()
    if (!pedido_id) return new Response('ok', { status: 200 })

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: pedido } = await supabase.from('pedidos').select('*').eq('id', pedido_id).single()
    if (!pedido) return new Response('ok', { status: 200 })

    const itensTexto = (pedido.itens ?? [])
      .map((item: { quantidade: number; nome: string; tamanho?: string }) =>
        `• ${item.quantidade}x ${item.nome}${item.tamanho ? ` (Tam ${item.tamanho})` : ''}`
      )
      .join('\n')

    const texto = [
      '🛒 Novo pedido — CORE FIT',
      `Pedido: #${String(pedido.id).slice(0, 8).toUpperCase()}`,
      '',
      itensTexto,
      '',
      `Total: R$ ${Number(pedido.total).toFixed(2)}`,
      `Pagamento: ${pedido.forma_pagamento === 'pix' ? 'Pix' : 'Cartão'}`,
      `Cliente: ${pedido.cliente} (${pedido.telefone})`,
      `Entrega: ${pedido.forma_entrega === 'retirada' ? 'Retirada na loja' : pedido.endereco ?? 'Endereço não informado'}`,
    ].join('\n')

    const telegramRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: texto }),
    })

    if (!telegramRes.ok) {
      console.error('Falha ao enviar notificação no Telegram:', await telegramRes.text())
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('Erro ao notificar novo pedido:', err)
    return new Response('erro interno', { status: 500 })
  }
})
