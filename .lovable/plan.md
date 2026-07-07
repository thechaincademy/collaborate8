# Adicionar Apple Pay, Google Pay, Credit e Debit Card

## Descoberta principal (da documentação Stripe)

Boa notícia: **Apple Pay, Google Pay, credit card e debit card são todos o mesmo "payment method type" no Stripe: `card`**. Não são integrações separadas - são "wallets" que aparecem automaticamente em cima do fluxo de cartão, desde que:

1. Estejam habilitados no Dashboard Stripe (Settings → Payment methods)
2. O domínio da app esteja registrado (Payment Method Domains) - válido separadamente para test/live e para plataforma/connected accounts
3. O usuário esteja num device/browser compatível (Safari iOS/macOS para Apple Pay; Chrome/Android com cartão salvo para Google Pay)
4. O fluxo de coleta suporte wallets

Debit cards já funcionam hoje - qualquer cartão Visa/Mastercard debit passa pelo mesmo `payment_method_types: ["card"]` que já usamos.

## O problema com o fluxo atual

Hoje `stripe-subscriptions/setup-card` cria uma **Checkout Session em `mode: "setup"`** para salvar cartão, e depois `create-subscription` chama `stripe.subscriptions.create` off-session. Esse fluxo:

- Aceita Apple Pay/Google Pay em teoria (SetupIntent suporta), **mas** muitos bancos exigem 3DS na primeira cobrança off-session, o que quebra a UX com wallets
- Não é a forma recomendada pela Stripe para wallets em subscriptions

## Solução recomendada

Migrar o fluxo de "salvar cartão + criar subscription depois" para **um único Checkout Session `mode: "subscription"`**, que:

- Renderiza automaticamente Apple Pay, Google Pay, cartão (credit + debit) num carrossel
- Autentica 3DS na hora (SCA compliant no Reino Unido)
- Cria a subscription com `transfer_data.destination` (Connect) já no mesmo passo
- Salva o payment method para renovações automáticas

## Mudanças de código

### 1. `supabase/functions/stripe-subscriptions/index.ts`
Substituir as duas ações separadas (`setup-card` + `create-subscription`) por uma nova ação **`create-subscription-checkout`** que:
- Recebe `amount`, `currency`, `interval`, `receiverId`
- Cria/reusa o Stripe customer do payer
- Verifica que o receiver tem Connect account com `charges_enabled` + `payouts_enabled`
- Cria price dinâmico (mantendo padrão atual via `StripeDynamicPricing`)
- Chama `stripe.checkout.sessions.create` com:
  ```
  mode: "subscription"
  payment_method_types: ["card"]   // wallets ridem no card
  line_items: [{ price, quantity: 1 }]
  subscription_data: {
    transfer_data: { destination: receiverAccountId },
    metadata: { arrangement_id, payer_id, payee_id }
  }
  success_url, cancel_url
  ```
- Retorna `{ url }` para o frontend redirecionar

Manter `list-cards`, `get-status`, `cancel-subscription`, `recreate-subscription` como estão (ainda úteis para exibir método salvo e gerenciar).

Manter `setup-card` como fallback opcional (adicionar novo cartão fora de um checkout).

### 2. `supabase/functions/_shared/stripe-adapter.ts`
Adicionar método `createSubscriptionCheckoutSession` em `StripeRecurringProvider` que encapsula a lógica de Checkout Session com `transfer_data`.

### 3. `src/hooks/useStripe.tsx`
- Adicionar `createSubscriptionCheckout(params)` que invoca a nova action e retorna `{ url }` para redirecionar
- Manter `setupCard` / `createSubscription` para retro-compatibilidade enquanto migramos as telas

### 4. Telas que iniciam pagamento recorrente
Trocar o fluxo "adicionar cartão → confirmar valor → criar subscription" por "confirmar valor → redirecionar para Checkout Stripe (com Apple Pay/Google Pay/cartão)".
- `src/pages/NewEnvelope.tsx` (criação de novo pagamento recorrente)
- `src/pages/EditRecurringPayment.tsx` (mudança de valor - vai precisar cancelar + recriar via checkout, ou seguir usando `updateSubscription`)
- `src/pages/TopUp.tsx` e `src/pages/SendMoney.tsx` (se aplicável a one-off)

### 5. One-off payments (opcional, se o app tiver "enviar agora")
Se houver caso de uso de pagamento único payer → payee, criar action `create-payment-checkout` com `mode: "payment"` + `payment_intent_data.transfer_data`. Não obrigatório nesta iteração se o foco é recorrente.

## Configuração fora do código (o usuário precisa fazer)

Instruções que o app **não pode fazer sozinho** e vou detalhar no chat quando implementarmos:

1. **Habilitar Apple Pay + Google Pay** no Stripe Dashboard (test e live)
2. **Registrar Payment Method Domains** para `collabor8.lovable.app`, `collabor8.com`, `www.collabor8.com` (test e live separadamente)
3. Para Connect com destination charges: registrar os domínios também no contexto da plataforma (Stripe faz isso automaticamente em destination charges, sem ação extra por conta conectada)
4. Apple Pay não requer certificados extras quando usado via Stripe Checkout (Stripe hospeda a página) - só via Elements/Express Checkout embutido

## O que NÃO muda

- Modelo Stripe Connect charge-and-transfer (destination charge com `transfer_data`) permanece igual
- Onboarding do receiver via `stripe-connect` permanece igual
- Webhooks `stripe-webhooks` continuam processando `invoice.paid` / `invoice.payment_failed` da mesma forma
- Estrutura do banco (arrangements, payments) não muda
- RLS, políticas, hooks de auth - nada muda

## Riscos e considerações

- **UX shift**: hoje o usuário fica dentro do app; passará a ser redirecionado ao Stripe Checkout hospedado (opção mais confiável para wallets). Se quiser experiência embutida, usar Payment Element + Express Checkout Element, mas é significativamente mais complexo. Recomendo Checkout hospedado.
- **Editar valor**: mudar valor de subscription existente não precisa novo Checkout - `updateSubscription` continua funcionando.
- **Primeira cobrança acontece no Checkout**, não off-session depois. Isso simplifica 3DS e Apple/Google Pay, mas muda o timing atual (hoje a subscription é criada e a primeira invoice roda em background).

## Detalhes técnicos

- API version: manter `2025-08-27.basil`
- `payment_method_types: ["card"]` inclui Apple Pay e Google Pay automaticamente (não precisa listar separadamente)
- Para Connect destination charges, `transfer_data.destination` vai em `subscription_data` no Checkout Session
- Wallets aparecem em carrossel se `consent_collection.terms_of_service` estiver configurado; sem essa flag, aparecem como botões separados no topo

## Ordem de implementação sugerida

1. Adicionar action `create-subscription-checkout` em `stripe-subscriptions/index.ts`
2. Adicionar `createSubscriptionCheckout` em `useStripe.tsx`
3. Migrar `NewEnvelope.tsx` para usar o novo fluxo
4. Testar com cartão de teste `4242 4242 4242 4242` e verificar wallets aparecerem no Safari/Chrome
5. Migrar `EditRecurringPayment.tsx` se necessário
6. Passar instruções de Dashboard para o usuário habilitar wallets em live mode

Confirma que quer que eu implemente exatamente isso? Alguma preferência entre **Checkout hospedado** (redirect, mais simples, recomendado) vs **Payment Element embutido** (fica dentro do app, mais complexo)?
