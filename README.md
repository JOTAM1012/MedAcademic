# MedStudy — Gestão de Estudos Médicos

Plataforma para estudantes de medicina: disciplinas e assuntos, revisões espaçadas, MedRevision,
cronômetro Pomodoro com ciclos de estudo, notas, grade horária, calendário (dia / semana / mês) e conquistas.
Os dados ficam no navegador e são sincronizados com o Firebase Firestore.

## Rodar localmente

Pré-requisito: [Node.js](https://nodejs.org) 20 ou superior.

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

Para desenvolver sem gravar nada no Firestore de produção, crie um arquivo `.env.development.local` com:

```
VITE_LOCAL_ONLY=true
```

## Publicar na Vercel

1. Envie este repositório para o GitHub.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. A Vercel lê o `vercel.json` (Vite, build `npx vite build`, saída `dist`) — não é preciso mudar nada. Clique em **Deploy**.

Cada `git push` na branch principal publica uma nova versão automaticamente.

## Supabase (login e banco de dados)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) (cria a tabela
   `app_state` com regras para cada usuário acessar só os próprios dados).
3. Em **Project Settings → API**, copie a **Project URL** e a chave **publishable** e coloque em
   [`src/config/supabase.ts`](src/config/supabase.ts) — ou defina `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_PUBLISHABLE_KEY` nas variáveis de ambiente da Vercel.
4. (Opcional) Em **Authentication → Providers → Email**, desative "Confirm email" se não quiser exigir
   confirmação por e-mail no cadastro. Em **Authentication → URL Configuration**, coloque o endereço do site
   (ex.: `https://seu-site.vercel.app`) para os links de confirmação apontarem para ele.

Nunca coloque a chave **secret / service_role** no site. Sem Supabase configurado, o app roda em modo local
(dados apenas no navegador).
