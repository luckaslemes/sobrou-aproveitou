# Configurar o Supabase — Sobrou, Aproveitou!

A área administrativa inicial foi adicionada em `/admin`. Ela precisa de um projeto Supabase e da migração SQL antes de funcionar com dados reais.

## 1. Criar o projeto
1. Acesse https://supabase.com/dashboard e crie um projeto.
2. Em **Project Settings / API** (ou **Connect**), copie a Project URL e a chave **publishable**.
3. Na raiz do projeto local, copie `.env.example` para `.env.local` e preencha:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Reinicie o Vite depois de criar/alterar variáveis: pare com Ctrl+C e execute `npm run dev`.

**Nunca coloque uma chave `service_role`, `sb_secret_...`, senha do banco ou token privado em variáveis `VITE_...`, no frontend ou no GitHub.** A publishable key só é apropriada porque as tabelas usam RLS.

## 2. Criar tabelas e políticas
1. No painel Supabase, abra **SQL Editor**.
2. Abra o arquivo `supabase/migrations/202610240001_admin_support.sql` deste repositório.
3. Cole o conteúdo inteiro e execute.
4. Confirme que as tabelas `profiles`, `stores`, `support_conversations`, `support_messages` e `app_settings` foram criadas.

## 3. Criar seu primeiro usuário Master
1. No Supabase, abra **Authentication → Users → Add user** e crie sua conta com o e-mail e senha desejados.
2. Confirme o usuário se necessário.
3. Copie o UUID desse usuário.
4. No SQL Editor, execute, substituindo o marcador pelo UUID real:
   `update public.profiles set role = 'admin' where id = 'COLE-SEU-UUID-AQUI';`
5. Entre em `http://localhost:5173/admin` (ou na porta que o Vite mostrar).

Por segurança, novos usuários recebem automaticamente a função `customer`; ninguém consegue se tornar Master pelo formulário do site.

## 4. Criar usuário de suporte
Crie o usuário em Authentication → Users. Depois, no SQL Editor, atribua a função `support` ao UUID da pessoa:
`update public.profiles set role = 'support' where id = 'UUID-DO-SUPORTE';`

O suporte pode consultar comércios e atender conversas; a lista de contas e a edição de aparência ficam restritas ao Master. Compartilhe somente o login individual de cada funcionário, nunca sua conta Master.

## 5. Chat e WhatsApp
- A central interna lê e grava conversas nas tabelas de suporte. Para iniciar conversas de ponta a ponta, ainda precisamos integrar o formulário/área do lojista para criar conversas e a tela do lojista para responder.
- O painel permite salvar o número do WhatsApp e abrir um link `wa.me`. Isso não é uma integração da API WhatsApp Business: mensagens não aparecem automaticamente no painel. Para isso será necessário configurar WhatsApp Business Platform/um provedor e um endpoint server-side (por exemplo, Supabase Edge Function) com tokens guardados como secrets.

## 6. Teste antes de usar com clientes
- Teste como Master, suporte, lojista, cliente e visitante sem login.
- Verifique que usuário comum não lê dados de outros comércios ou conversas.
- Configure recuperação de senha, confirmação de e-mail, domínio de produção e URLs de redirecionamento em Authentication → URL Configuration.
- Revise políticas RLS antes de armazenar dados pessoais reais.

## O que esta primeira etapa inclui
- Login por e-mail e senha via Supabase Auth.
- Controle de acesso por função (Master e suporte).
- Visão geral, listagem de comércios, contas (Master), central de conversas e configurações básicas.
- Migração SQL com políticas RLS.
- Campos para identidade visual e contato de WhatsApp.

O que ainda não inclui: cadastro público completo de lojistas, integração da identidade visual ao site público, criação da conversa pela área do lojista, notificações em tempo real, integração oficial WhatsApp API, upload de logotipo e moderação/alteração de status pela interface. Não use ainda como sistema de produção sem concluir esses pontos e validar as políticas.
