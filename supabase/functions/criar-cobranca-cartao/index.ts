// Cobra o cartão de um pedido no PagBank. Recebe só o cartão já criptografado no navegador do
// cliente (PagSeguro.encryptCard) — número, validade e CVV em texto puro nunca chegam aqui.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const PAGBANK_API_URL = Deno.env.get('PAGBANK_API_URL') ?? 'https://api.pagseguro.com'
const PAGBANK_TOKEN = Deno.env.get('PAGBANK_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!PAGBANK_TOKEN) throw new Error('PAGBANK_TOKEN não configurado nas secrets da função.')

    const { pedido_id, encrypted_card, holder_name, holder_tax_id } = await req.json()
    if (!pedido_id || !encrypted_card || !holder_name || !holder_tax_id) {
      throw new Error('Dados do cartão incompletos.')
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('id, total, telefone, forma_pagamento, status_pagamento')
      .eq('id', pedido_id)
      .single()

    if (pedidoError || !pedido) throw new Error('Pedido não encontrado.')
    if (pedido.forma_pagamento !== 'cartao') throw new Error('Este pedido não está marcado como pagamento no cartão.')
    if (pedido.status_pagamento !== 'pendente') throw new Error('Este pedido já foi processado.')

    const totalCentavos = Math.round(Number(pedido.total) * 100)
    const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-pagbank`

    const pagbankRes = await fetch(`${PAGBANK_API_URL}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAGBANK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference_id: pedido.id,
        items: [
          {
            reference_id: pedido.id,
            name: `Pedido CORE FIT #${pedido.id.slice(0, 8).toUpperCase()}`,
            quantity: 1,
            unit_amount: totalCentavos,
          },
        ],
        notification_urls: [webhookUrl],
        charges: [
          {
            reference_id: pedido.id,
            amount: { value: totalCentavos, currency: 'BRL' },
            payment_method: {
              type: 'CREDIT_CARD',
              installments: 1,
              capture: true,
              card: { encrypted: encrypted_card },
              holder: { name: holder_name, tax_id: holder_tax_id },
            },
          },
        ],
      }),
    })

    const pagbankData = await pagbankRes.json()

    if (!pagbankRes.ok) {
      console.error('Erro ao criar cobrança de cartão no PagBank:', JSON.stringify(pagbankData))
      throw new Error(pagbankData?.error_messages?.[0]?.description ?? 'Falha ao processar o cartão.')
    }

    const charge = pagbankData.charges?.[0]
    if (!charge) throw new Error('PagBank não retornou o resultado da cobrança.')

    const aprovado = charge.status === 'PAID'

    await supabase
      .from('pedidos')
      .update({
        pagbank_order_id: pagbankData.id,
        status_pagamento: aprovado ? 'pago' : 'falhou',
        ...(aprovado ? { status: 'confirmado' } : {}),
      })
      .eq('id', pedido.id)

    // Cobrança recusada é síncrona (não vamos esperar o webhook pra devolver o estoque).
    if (!aprovado) {
      await supabase.rpc('liberar_estoque_pedido', { p_pedido_id: pedido.id })
    }

    return new Response(
      JSON.stringify({
        aprovado,
        status: charge.status,
        mensagem: charge.payment_response?.message ?? null,
        bandeira: charge.payment_method?.card?.brand ?? null,
        ultimos_digitos: charge.payment_method?.card?.last_digits ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
