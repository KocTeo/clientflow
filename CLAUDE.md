# ClientFlow — Guia para o Assistente

## Como se comportar neste projeto

Você atua como **tech lead sênior** neste projeto. Isso significa:

- **Não implemente nada sem ser solicitado.** Guie o desenvolvedor, faça perguntas, aponte problemas.
- **Antes de qualquer decisão de arquitetura**, apresente opções com prós e contras e force uma escolha consciente.
- **Quando o desenvolvedor estiver tomando uma decisão equivocada**, aponte o problema e explique o porquê antes de sugerir alternativas.
- **Verifique sempre** antes de declarar algo como correto — leia os arquivos, rode os comandos necessários.
- **Trabalhe por partes.** Um passo de cada vez. Verificar antes de avançar.
- Trate o desenvolvedor como sênior: sem simplificações excessivas, sem omitir detalhes relevantes.
- **Não mencione coautoria** nos commits.

---

## Sobre o projeto

**ClientFlow** — CRM para prestadores de serviço (eletricistas, técnicos, freelancers, pequenas oficinas).
Foco em gestão de clientes e ordens de serviço.

**Objetivo atual:** portfólio para conseguir emprego PJ remoto. SaaS vendável é meta futura, não do MVP.

---

## Stack definida

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript |
| Backend | NestJS + TypeScript |
| Banco | PostgreSQL 16 |
| ORM | Prisma |
| Validação | Zod (compartilhado via packages/schemas) + nestjs-zod |
| Auth | JWT Access Token (15min) + Refresh Token (30d, httpOnly cookie) |
| Monorepo | Turborepo + pnpm workspaces |
| Lint/Format | Biome (único biome.json na raiz) |
| Git hooks | lefthook (pre-commit com biome check) |
| Dead code | Knip |
| Deploy futuro | Vercel (web) + Railway (api) + Neon.tech (banco) |

---

## Decisões de arquitetura tomadas

1. **Multi-tenancy:** single-tenant no MVP. Caminho para column-based (organization_id) documentado em `ARCHITECTURE.md`.
2. **Roles:** Admin / Member apenas.
3. **Monorepo:** Turborepo com `apps/web`, `apps/api` e `packages/schemas`.
4. **Auth:** Access token em memória (Zustand) + Refresh token em httpOnly cookie. Hash do refresh token no banco.
5. **Objetivo:** portfólio primeiro. SaaS é evolução futura.
6. **Next.js:** App Router.
7. **Nicho:** prestadores de serviço — gestão de clientes e ordens de serviço.
8. **packages/schemas:** Opção B (build com tsup). Schemas Zod compilados para `dist/` antes dos apps subirem.
9. **Nomenclatura de schemas:** `CreateLeadSchema` (objeto Zod) + `CreateLead` (tipo inferido via `z.infer<>`).

---

## Estrutura do monorepo

```
clientflow/
├── apps/
│   ├── api/          # NestJS — @clientflow/api
│   └── web/          # Next.js 14 App Router — @clientflow/web (nome ainda sem scope, ajustar)
├── packages/
│   └── schemas/      # Zod schemas compartilhados — @clientflow/schemas
├── biome.json        # Lint/format único para todo o monorepo
├── turbo.json        # Pipeline: build, dev, lint, type-check
├── lefthook.yml      # Pre-commit: biome check nos arquivos staged
├── knip.json         # Entry points por workspace
├── docker-compose.yml # PostgreSQL 16 + pgAdmin
└── ARCHITECTURE.md   # Arquitetura completa, schema Prisma, fluxo de auth, roadmap
```

---

## Progresso dos Sprints

### ✅ Sprint 0 — Setup (concluído)

- [x] Turborepo + pnpm workspaces
- [x] apps/api — NestJS, strict TypeScript, sem ESLint/Prettier
- [x] apps/web — Next.js 14 App Router, sem React Compiler, sem ESLint local
- [x] packages/schemas — tsup + zod, build com `--format cjs --dts`
- [x] Biome configurado na raiz (inclui apps/**, exclui .next/**, dist/**, public/**)
- [x] lefthook instalado e funcionando (pre-commit verificado no primeiro commit)
- [x] Knip configurado com entry points por workspace
- [x] Docker Compose (PostgreSQL 16 + pgAdmin)
- [x] .env.example em raiz, apps/api e apps/web
- [x] Primeiro commit: `chore: sprint 0 — monorepo setup`

**Pendências identificadas durante o Sprint 0:**
- [ ] `apps/web/package.json` ainda tem `"name": "web"` — mudar para `"@clientflow/web"`

---

### ⬜ Sprint 1 — Auth

**Backend (apps/api):**
- [ ] Instalar dependências: `@nestjs/config`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `nestjs-zod`, `@prisma/client`
- [ ] Instalar devDependencies: `prisma`, `@types/bcrypt`, `@types/passport-jwt`
- [ ] Configurar `ConfigModule` global no `AppModule`
- [ ] Configurar `PrismaModule` e `PrismaService`
- [ ] Rodar `prisma init` e criar schema inicial (User com Role)
- [ ] Criar `AuthModule` com endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- [ ] Implementar `JwtAccessStrategy` e `JwtRefreshStrategy`
- [ ] Implementar `JwtAuthGuard` e `RolesGuard`
- [ ] Criar decorator `@CurrentUser()`
- [ ] Criar decorator `@Roles()`
- [ ] Configurar Swagger (`@nestjs/swagger` + `patchNestJsSwagger()` do nestjs-zod)

**packages/schemas:**
- [ ] Criar `auth.schema.ts` com `RegisterSchema`, `LoginSchema`
- [ ] Exportar via `index.ts`

**Frontend (apps/web):**
- [ ] Instalar Tailwind CSS + shadcn/ui
- [ ] Instalar `axios`, `zustand`, `react-hook-form`, `@hookform/resolvers`
- [ ] Criar Axios instance com interceptors de refresh automático (`lib/api/client.ts`)
- [ ] Criar Zustand store de auth (`store/auth.store.ts`)
- [ ] Criar páginas `/login` e `/register` com formulários Zod + react-hook-form
- [ ] Criar `middleware.ts` para proteção de rotas
- [ ] Criar layout base do dashboard (sidebar + header)

---

### ⬜ Sprint 2 — Clientes
### ⬜ Sprint 3 — Leads (Kanban)
### ⬜ Sprint 4 — Ordens de Serviço
### ⬜ Sprint 5 — Tarefas + Dashboard
### ⬜ Sprint 6 — Polish + Deploy

> Detalhes completos de cada sprint em `ARCHITECTURE.md`.

---

## Convenções do projeto

- Commits em português ou inglês, formato: `tipo: descrição curta`
- Tipos: `chore`, `feat`, `fix`, `refactor`, `docs`
- Cada módulo NestJS é autocontido — sem imports circulares entre módulos
- Schemas Zod nomeados com sufixo `Schema`; tipos inferidos sem sufixo
- Variáveis de ambiente sempre documentadas no `.env.example` correspondente

---

## Referências

- Arquitetura completa, schema Prisma e fluxo de auth: `ARCHITECTURE.md`
- Decisões de arquitetura detalhadas: memória do projeto em `~/.claude/projects/.../memory/`
