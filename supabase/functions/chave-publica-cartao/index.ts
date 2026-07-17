// Devolve a chave pública do PagBank usada pelo SDK do navegador (PagSeguro.encryptCard) pra
// criptografar o cartão localmente, antes de qualquer dado sair do dispositivo do cliente.
// A chave pública não é secreta — só o token do PagBank (usado aqui pra buscá-la) é.
import { corsHeaders } from '../_shared/cors.ts'

const PAGBANK_API_URL = Deno.env.get('PAGBANK_API_URL') ?? 'https://api.pagseguro.com'
const PAGBANK_TOKEN = Deno.env.get('PAGBANK_TOKEN')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!PAGBANK_TOKEN) throw new Error('PAGBANK_TOKEN não configurado nas secrets da função.')

    let res = await fetch(`${PAGBANK_API_URL}/public-keys/card`, {
      headers: { Authorization: `Bearer ${PAGBANK_TOKEN}` },
    })

    // Conta ainda não tem chave pública gerada — cria uma na primeira vez que alguém abre o checkout.
    if (res.status === 404) {
      res = await fetch(`${PAGBANK_API_URL}/public-keys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAGBANK_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'card' }),
      })
    }

    const data = await res.json()
    if (!res.ok) {
      console.error('Erro ao obter chave pública do PagBank:', JSON.stringify(data))
      throw new Error(data?.error_messages?.[0]?.description ?? 'Falha ao obter chave pública do PagBank.')
    }

    const publicKey = data.public_key ?? data.publicKey ?? data.value
    if (!publicKey) throw new Error('PagBank não retornou a chave pública.')

    return new Response(JSON.stringify({ public_key: publicKey }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
