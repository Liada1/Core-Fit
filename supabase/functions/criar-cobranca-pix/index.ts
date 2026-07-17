// Cria (ou reaproveita) uma cobrança Pix no PagBank para um pedido já existente.
// O token do PagBank fica só aqui (variável de ambiente da função), nunca no frontend.
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

    const { pedido_id } = await req.json()
    if (!pedido_id) throw new Error('pedido_id é obrigatório.')

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('id, total, forma_pagamento, status_pagamento, pix_qr_text, pix_qr_image_url, pix_expira_em')
      .eq('id', pedido_id)
      .single()

    if (pedidoError || !pedido) throw new Error('Pedido não encontrado.')
    if (pedido.forma_pagamento !== 'pix') throw new Error('Este pedido não está marcado como pagamento via Pix.')

    // Reaproveita o QR ainda válido em vez de abrir uma cobrança nova a cada retry/refresh de tela.
    const aindaValido = pedido.pix_qr_text && pedido.pix_expira_em && new Date(pedido.pix_expira_em) > new Date()
    if (pedido.status_pagamento === 'pendente' && aindaValido) {
      return new Response(
        JSON.stringify({
          qr_text: pedido.pix_qr_text,
          qr_image_url: pedido.pix_qr_image_url,
          expira_em: pedido.pix_expira_em,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        qr_codes: [{ amount: { value: totalCentavos } }],
        notification_urls: [webhookUrl],
      }),
    })

    const pagbankData = await pagbankRes.json()

    if (!pagbankRes.ok) {
      console.error('Erro ao criar pedido no PagBank:', JSON.stringify(pagbankData))
      throw new Error(pagbankData?.error_messages?.[0]?.description ?? 'Falha ao criar cobrança Pix no PagBank.')
    }

    const qr = pagbankData.qr_codes?.[0]
    if (!qr) throw new Error('PagBank não retornou QR Code para este pedido.')

    const qrImageUrl = qr.links?.find((link: { rel: string }) => link.rel === 'QRCODE.PNG')?.href ?? null

    const { error: updateError } = await supabase
      .from('pedidos')
      .update({
        pagbank_order_id: pagbankData.id,
        pix_qr_text: qr.text,
        pix_qr_image_url: qrImageUrl,
        pix_expira_em: qr.expiration_date,
      })
      .eq('id', pedido.id)

    if (updateError) throw new Error(updateError.message)

    return new Response(
      JSON.stringify({ qr_text: qr.text, qr_image_url: qrImageUrl, expira_em: qr.expiration_date }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
