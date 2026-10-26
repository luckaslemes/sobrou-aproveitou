# Sobrou, Aproveitou!

Aplicativo de ofertas locais para Londrina e região, usando React, Vite, Supabase e Capacitor para Android.

## Ofertas reais no Supabase

1. Abra o projeto no [Supabase](https://supabase.com/dashboard).
2. Entre em **SQL Editor** e execute o conteúdo de `supabase/migrations/202610260001_create_offers.sql`.
3. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente de build (por exemplo, nas variáveis da Vercel).
4. Cadastre ofertas na tabela `public.offers`. Elas começam como `draft`; altere `status` para `published` e mantenha `is_active = true` para aparecerem no app. A política de leitura pública limita a consulta às ofertas publicadas e ativas.

Campos principais: `title`, `description`, `category`, `store_name`, `neighborhood`, `original_price`, `price`, `image_url`, `status`, `expires_at`.

## Preparar o Android

Requisitos: Node.js compatível com Capacitor 7, Android Studio e Android SDK instalados.

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

No Android Studio, teste o app e gere um Android App Bundle (AAB) assinado para enviar ao Google Play Console. O código-fonte por si só não publica o app automaticamente; ainda é necessário configurar a conta da loja, assinatura, ficha do app, política de privacidade e cumprir os requisitos do Google Play.

## Desenvolvimento web

```bash
npm run dev
```
