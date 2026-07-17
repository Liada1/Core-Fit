// Ajuste estas constantes conforme o negócio.

// Número de WhatsApp que recebe os pedidos, formato internacional sem espaços/símbolos
// (DDI + DDD + número). TROQUE pelo número real da loja antes de publicar.
export const WHATSAPP_NUMBER = '5588994458401'

export const STORE_NAME = 'CORE FIT'

// Valor fixo de frete exibido no carrinho/checkout quando a entrega é "no endereço".
// 0 = frete grátis em todo o site (decisão de lançamento).
export const FRETE_PADRAO = 0.0

// Desconto aplicado ao escolher Pix como forma de pagamento.
export const DESCONTO_PIX = 0.05

// Estoque igual ou abaixo deste valor é sinalizado como "baixo estoque" no painel admin.
export const LIMITE_ESTOQUE_BAIXO = 5

export const CATEGORIAS = [
  { valor: 'todos', label: 'Todos', icon: 'apps' },
  { valor: 'homem', label: 'Homem', icon: 'male', tipo: 'genero' },
  { valor: 'mulher', label: 'Mulher', icon: 'female', tipo: 'genero' },
  { valor: 'tenis', label: 'Tênis', icon: 'sports_soccer', tipo: 'categoria' },
  { valor: 'roupas', label: 'Roupas', icon: 'checkroom', tipo: 'categoria' },
  { valor: 'acessorios', label: 'Acessórios', icon: 'watch', tipo: 'categoria' },
]
