// Recebe a notificação do PagBank quando o status de um pedido muda (ex: Pix pago).
// Deploy desta função precisa da flag --no-verify-jwt: o PagBank não manda o JWT do
// Supabase, então a verificação padrão bloquearia toda notificação com 401.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAGBANK_API_URL = Deno.env.get('PAGBANK_API_URL') ?? 'https://api.pagseguro.com'
const PAGBANK_TOKEN = Deno.env.get('PAGBANK_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => null)
    const orderId = body?.id
    if (!orderId) return new Response('ok', { status: 200 })

    // Nunca confia no status que vem dentro do corpo do webhook — qualquer um que descubra
    // essa URL poderia forjar um POST dizendo "PAID". Em vez disso, reconsulta o próprio
    // PagBank (com o nosso token) para obter o status verdadeiro antes de liberar o pedido.
    const orderRes = await fetch(`${PAGBANK_API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${PAGBANK_TOKEN}` },
    })

    if (!orderRes.ok) {
      console.error('Falha ao consultar pedido no PagBank:', orderId, await orderRes.text())
      return new Response('erro ao consultar PagBank', { status: 502 })
    }

    const order = await orderRes.json()
    const charge = order.charges?.[0]
    if (!charge) return new Response('ok', { status: 200 })

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: pedido } = await supabase
      .from('pedidos')
      .select('id, status_pagamento')
      .eq('pagbank_order_id', orderId)
      .single()

    if (!pedido || pedido.status_pagamento !== 'pendente') {
      return new Response('ok', { status: 200 })
    }

    if (charge.status === 'PAID') {
      await supabase.from('pedidos').update({ status_pagamento: 'pago', status: 'confirmado' }).eq('id', pedido.id)
    } else if (['DECLINED', 'CANCELED'].includes(charge.status)) {
      // Devolve o estoque reservado na hora — não precisa esperar a varredura periódica
      // de pedidos Pix expirados.
      await supabase.rpc('liberar_estoque_pedido', { p_pedido_id: pedido.id })
      await supabase.from('pedidos').update({ status_pagamento: 'falhou' }).eq('id', pedido.id)
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('Erro no webhook do PagBank:', err)
    return new Response('erro interno', { status: 500 })
  }
})
