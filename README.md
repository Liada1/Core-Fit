# CORE FIT — E-commerce (React + Vite + Tailwind + Supabase)

Loja completa com vitrine dinâmica, carrinho, checkout com envio para WhatsApp e painel administrativo
(login + gestão de estoque/pedidos), toda a UI seguindo o design exportado do Stitch (fundo escuro,
detalhes em verde neon `#CCFF00`, tipografia Anybody / Hanken Grotesk / JetBrains Mono).

> **Este ambiente não tinha Node.js/npm instalados**, então o projeto foi escrito por completo mas
> nunca rodado/testado aqui. Siga os passos abaixo na sua máquina.

## 1. Instalar o Node.js

Baixe e instale a versão LTS em https://nodejs.org (recomendado Node 18 ou 20). Confirme com:

```bash
node -v
npm -v
```

## 2. Instalar as dependências do projeto

Na pasta do projeto:

```bash
npm install
```

## 3. Criar o projeto Supabase

1. Crie uma conta/projeto em https://supabase.com.
2. Vá em **SQL Editor** → **New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
   Isso cria as tabelas `products` e `pedidos`, as políticas de RLS e a função `criar_pedido()`
   (responsável por decrementar o estoque e gravar o pedido de forma atômica). Já inclui 5 produtos de
   exemplo — apague o bloco final do SQL se não quiser os dados de demonstração.
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
4. Copie `.env.example` para `.env` e preencha:

   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
   ```

## 4. Criar o usuário administrador

O login em `/admin/login` usa o Supabase Auth (e-mail + senha). Não existe cadastro público — crie o
admin manualmente em **Authentication → Users → Add user** no dashboard do Supabase (marque
"Auto Confirm User"). Use esse e-mail/senha para logar em `/admin/login`.

## 5. Rodar o projeto

```bash
npm run dev
```

Acesse `http://localhost:5173`. O painel administrativo fica em `http://localhost:5173/admin/login`.

## 6. Ativar Pix e cartão automáticos via PagBank (opcional)

Por padrão, Pix e cartão no checkout são só um rótulo enviado no resumo do WhatsApp — o pagamento
é combinado manualmente. Pra processar de verdade (QR Code Pix com confirmação automática, e
cobrança de cartão de verdade), siga os passos abaixo. **O token do PagBank nunca deve ir para o
`.env`/frontend** — ele fica só nas Edge Functions do Supabase, guardado como secret.

1. No **Supabase Dashboard > SQL Editor**, rode, nesta ordem:
   - `supabase/migration_pagbank_pix.sql` (status de pagamento + `consultar_status_pagamento()`)
   - `supabase/migration_2_estoque_pix.sql` (devolve o estoque automaticamente se o Pix expirar
     sem pagamento — sem isso, pedidos abandonados prendem estoque pra sempre)
   - `supabase/migration_3_notificacao_admin.sql` (dispara o aviso no Telegram a cada pedido novo
     — veja o passo 4)
2. Instale a Supabase CLI e faça login (abre o navegador para autenticar):
   ```bash
   npx supabase login
   npx supabase link --project-ref SEU-PROJECT-REF
   ```
   (o `project-ref` é o subdomínio antes de `.supabase.co` na sua `VITE_SUPABASE_URL`.)
3. Gere um token de API no PagBank (**Venda online → Integrações → Gerar Token**, com a conta
   logada) e cadastre como secret da função — **nunca cole esse token em arquivos do projeto ou no
   chat**:
   ```bash
   npx supabase secrets set PAGBANK_TOKEN=seu_token_aqui
   ```
   Para testar em sandbox antes de ir pra produção, defina também
   `npx supabase secrets set PAGBANK_API_URL=https://sandbox.api.pagseguro.com` (use um token de
   sandbox nesse caso).
4. (Opcional, pra notificação automática) Crie um bot no Telegram:
   - Fale com **[@BotFather](https://t.me/BotFather)** no Telegram, mande `/newbot` e siga as
     instruções — ele te dá um **token**.
   - Fale com o bot que você acabou de criar (manda qualquer mensagem tipo "oi").
   - Abra `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates` no navegador e pegue o valor de
     `"chat":{"id": ...}` — esse é o seu `chat_id`.
   - Cadastre as duas secrets:
     ```bash
     npx supabase secrets set TELEGRAM_BOT_TOKEN=seu_token_do_bot
     npx supabase secrets set TELEGRAM_CHAT_ID=seu_chat_id
     ```
5. Publique as cinco funções:
   ```bash
   npx supabase functions deploy criar-cobranca-pix
   npx supabase functions deploy chave-publica-cartao
   npx supabase functions deploy criar-cobranca-cartao
   npx supabase functions deploy webhook-pagbank --no-verify-jwt
   npx supabase functions deploy notificar-novo-pedido --no-verify-jwt
   ```
   A flag `--no-verify-jwt` é obrigatória em `webhook-pagbank` e `notificar-novo-pedido`: quem
   chama essas funções é o PagBank e o próprio banco de dados (não o seu frontend), então elas não
   vêm com um JWT do Supabase.
6. Pronto:
   - **Pix:** o site chama `criar-cobranca-pix`, mostra o QR Code e fica consultando o status a
     cada poucos segundos. Se o cliente nunca pagar, o estoque volta sozinho depois que o QR expira.
   - **Cartão:** o número do cartão é criptografado no navegador do cliente (SDK do PagBank,
     `chave-publica-cartao` só fornece a chave pública) — o número/CVV em texto puro nunca chegam
     ao nosso servidor. `criar-cobranca-cartao` cobra e devolve aprovado/recusado na hora.
   - **Admin:** toda vez que um pedido é criado, o banco dispara `notificar-novo-pedido`, que manda
     um resumo pro seu Telegram. O painel `/admin/pedidos` mostra se cada pedido está "Pago",
     "Aguardando pagamento" ou "Não pago".

> ⚠️ Se você já colou um token do PagBank em algum chat/lugar não seguro, gere um novo no painel do
> PagBank e revogue o antigo antes de usar em produção.

## 7. Configurar o WhatsApp da loja

Edite `src/config.js` e troque `WHATSAPP_NUMBER` pelo número real da loja (formato internacional,
só dígitos: DDI+DDD+número, ex: `5511999999999`). Esse é o número que recebe o resumo de cada pedido
finalizado via `wa.me`.

Outras constantes úteis no mesmo arquivo: `FRETE_PADRAO` (valor fixo de frete), `DESCONTO_PIX`
(desconto aplicado ao escolher Pix) e `LIMITE_ESTOQUE_BAIXO` (a partir de quantas unidades o painel
admin alerta "estoque baixo").

## Como funciona o estoque

Cada produto guarda a disponibilidade por tamanho em `products.tamanhos` (jsonb), por exemplo:

```json
[{ "tamanho": "40", "estoque": 15 }, { "tamanho": "41", "estoque": 0 }]
```

Produtos sem grade de tamanho (ex: acessórios) usam uma única entrada `{"tamanho": "Único", "estoque": N}`.

Ao finalizar a compra, o front-end chama a função `criar_pedido()` via `supabase.rpc(...)` — ela roda
no banco dentro de uma transação (`SECURITY DEFINER`, com `for update` para travar a linha), então:

1. Verifica se há estoque suficiente para cada item do carrinho.
2. Decrementa o estoque do tamanho comprado.
3. Insere o pedido em `pedidos`.

Se o estoque acabou entre o momento em que o cliente abriu a página e o clique em "Finalizar", a função
recusa a operação com um erro descritivo (ex: *"Estoque insuficiente para Zenith Runner (tamanho 42):
restam 1 unidade(s)."*) e nada é debitado — evita concorrência/overselling. Por isso os clientes (`anon`)
não têm permissão de `UPDATE`/`INSERT` direto nas tabelas — só o `admin` autenticado e a função.

## Estrutura do projeto

```
src/
  components/          Header, CategoryNav, BottomNav, ProductCard, ProtectedRoute, admin/AdminShell
  context/              AuthContext (Supabase Auth) e CartContext (carrinho em localStorage)
  lib/supabaseClient.js Cliente Supabase (lê variáveis VITE_SUPABASE_*)
  pages/
    Vitrine.jsx          "/"              — vitrine com filtro por categoria/gênero e busca
    ProdutoDetalhe.jsx   "/produto/:id"   — seleção de cor/tamanho/quantidade + adicionar ao carrinho
    Carrinho.jsx         "/carrinho"      — editar quantidades, remover itens, resumo
    Checkout.jsx         "/checkout"      — dados do cliente, entrega, pagamento, chama criar_pedido()
    admin/
      AdminLogin.jsx        "/admin/login"
      AdminDashboard.jsx    "/admin"                — grade de estoque, alerta de estoque baixo
      AdminPedidos.jsx      "/admin/pedidos"         — histórico de pedidos, atualizar status
      AdminProdutoForm.jsx  "/admin/produtos/novo" e "/admin/produtos/:id" — criar/editar produto
  utils/
    format.js   formatação de moeda BRL, data, soma de estoque
    whatsapp.js monta a mensagem do pedido e o link wa.me
supabase/schema.sql                        Tabelas, RLS e função criar_pedido()
supabase/migration_pagbank_pix.sql         Colunas de status de pagamento + consultar_status_pagamento()
supabase/migration_2_estoque_pix.sql       Devolve estoque de pedidos Pix expirados (cron a cada 10 min)
supabase/migration_3_notificacao_admin.sql Trigger que avisa o Telegram a cada pedido novo
supabase/functions/
  criar-cobranca-pix/     cria a cobrança Pix no PagBank e devolve o QR Code
  chave-publica-cartao/   devolve a chave pública usada pra criptografar o cartão no navegador
  criar-cobranca-cartao/  cobra o cartão (já criptografado) no PagBank
  webhook-pagbank/        recebe a confirmação de pagamento do PagBank (Pix e cartão)
  notificar-novo-pedido/  manda o resumo do pedido pro Telegram do admin
```

## Build de produção

```bash
npm run build
npm run preview
```

O diretório `dist/` gerado pode ser publicado em qualquer host estático (Vercel, Netlify, Cloudflare
Pages etc.) — lembre de configurar as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no
provedor de hospedagem.

## Melhorias futuras sugeridas (fora do escopo atual)

- Upload de imagem via Supabase Storage no lugar de colar URLs.
- Paginação/infinite scroll na vitrine para catálogos grandes.
- Notificação por e-mail/Slack ao admin quando um novo pedido chega.
