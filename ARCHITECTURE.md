# ClientFlow — Arquitetura do Sistema

> CRM para prestadores de serviço (gestão de clientes e ordens de serviço)
> Stack: Next.js 14 App Router + NestJS + PostgreSQL + Prisma + Turborepo

---

## Decisões de Arquitetura

| Decisão | Escolha | Observação |
|---|---|---|
| Multi-tenancy | Single-tenant no MVP | Ver seção "Caminho V2" |
| Roles | Admin / Member | Simples, sem RBAC granular |
| Repositório | Monorepo (Turborepo) | `packages/types` compartilhado |
| Auth | Access + Refresh Token | httpOnly cookie, hash no banco |
| Objetivo atual | Portfólio / PJ remoto | SaaS vendável é meta futura |
| Next.js | App Router | Server/Client components |
| Nicho | Prestadores de serviço | Eletricistas, técnicos, freelancers |

---

## Estrutura do Monorepo

```
clientflow/
├── apps/
│   ├── web/                    # Next.js 14 (App Router)
│   └── api/                    # NestJS
├── packages/
│   └── schemas/                # Zod schemas compartilhados (build via tsup)
├── turbo.json
├── package.json
├── .env.example
└── docker-compose.yml          # PostgreSQL local
```

---

## Estrutura do Backend (`apps/api`)

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt-access.strategy.ts
│   │   │   │   └── jwt-refresh.strategy.ts
│   │   │   └── guards/
│   │   │       ├── jwt-auth.guard.ts
│   │   │       └── roles.guard.ts
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   ├── clients/
│   │   │   ├── clients.module.ts
│   │   │   ├── clients.controller.ts
│   │   │   ├── clients.service.ts
│   │   │   └── dto/
│   │   ├── leads/
│   │   ├── service-orders/
│   │   ├── tasks/
│   │   └── dashboard/
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── config/
│   │   └── jwt.config.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── test/
```

---

## Estrutura do Frontend (`apps/web`)

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Sidebar + Header + auth check
│   │   │   ├── page.tsx                # Dashboard
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── new/page.tsx
│   │   │   ├── leads/
│   │   │   ├── service-orders/
│   │   │   └── tasks/
│   │   ├── layout.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                         # shadcn/ui
│   │   └── features/
│   │       ├── clients/
│   │       ├── leads/
│   │       └── service-orders/
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts               # Axios instance com interceptors
│   │   │   ├── auth.ts
│   │   │   ├── clients.ts
│   │   │   └── leads.ts
│   │   └── auth/
│   │       └── session.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   └── use-clients.ts
│   └── store/
│       └── auth.store.ts               # Zustand
└── middleware.ts                       # Route protection (Edge)
```

---

## Schema Prisma

```prisma
generator client {
  provider = "prisma-client"
  output   = "./generated/prisma"
}

datasource db {
  provider = "postgresql"
  // URL configurada em prisma.config.ts (Prisma v7)
  // PrismaClient recebe datasourceUrl no construtor
}

// ─── FUTURE V2: Multi-tenancy ───────────────────────────────────────────────
// 1. Adicionar: model Organization { id, name, slug, plan, createdAt }
// 2. Adicionar organizationId em: User, Client, Lead, ServiceOrder, Task
// 3. Criar OrganizationMiddleware no NestJS que extrai org do JWT
// 4. Criar PrismaService wrapper que auto-filtra por organizationId
// 5. Adicionar slug da org como subdomain ou query param na URL
// ────────────────────────────────────────────────────────────────────────────

model User {
  id               String   @id @default(uuid(7)) @db.Uuid
  email            String   @unique
  name             String
  passwordHash     String
  role             Role     @default(MEMBER)
  refreshTokenHash String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  createdClients Client[]       @relation("ClientCreatedBy")
  assignedLeads  Lead[]         @relation("LeadAssignedTo")
  serviceOrders  ServiceOrder[] @relation("ServiceOrderAssignedTo")
  tasks          Task[]         @relation("TaskAssignedTo")

  @@map("users")
}

enum Role {
  ADMIN
  MEMBER
}

model Client {
  id        String   @id @default(uuid(7)) @db.Uuid
  name      String
  email     String?
  phone     String?
  document  String?
  address   String?
  notes     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  createdById String  @db.Uuid
  createdBy   User   @relation("ClientCreatedBy", fields: [createdById], references: [id])

  serviceOrders ServiceOrder[]
  leads         Lead[]

  @@map("clients")
}

model Lead {
  id        String     @id @default(uuid(7)) @db.Uuid
  name      String
  email     String?
  phone     String?
  source    LeadSource @default(MANUAL)
  status    LeadStatus @default(NEW)
  notes     String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  assignedToId String?  @db.Uuid
  assignedTo   User?    @relation("LeadAssignedTo", fields: [assignedToId], references: [id])

  convertedToId String? @unique @db.Uuid
  convertedTo   Client? @relation(fields: [convertedToId], references: [id])

  @@map("leads")
}

enum LeadStatus {
  NEW           // Novo
  CONTACTED     // Contatado
  QUALIFIED     // Qualificado
  PROPOSAL_SENT // Proposta enviada
  WON           // Ganho — virou cliente
  LOST          // Perdido
}

enum LeadSource {
  MANUAL
  REFERRAL
  INSTAGRAM
  WHATSAPP
  WEBSITE
  OTHER
}

model ServiceOrder {
  id          String             @id @default(uuid(7)) @db.Uuid
  title       String
  description String?
  status      ServiceOrderStatus @default(OPEN)
  priority    Priority           @default(MEDIUM)
  dueDate     DateTime?
  completedAt DateTime?
  totalValue  Decimal?           @db.Decimal(10, 2)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  clientId String  @db.Uuid
  client   Client  @relation(fields: [clientId], references: [id])

  assignedToId String?  @db.Uuid
  assignedTo   User?    @relation("ServiceOrderAssignedTo", fields: [assignedToId], references: [id])

  tasks Task[]

  @@map("service_orders")
}

enum ServiceOrderStatus {
  OPEN           // Aberta
  IN_PROGRESS    // Em andamento
  WAITING_CLIENT // Aguardando cliente
  DONE           // Concluída
  CANCELLED      // Cancelada
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model Task {
  id          String     @id @default(uuid(7)) @db.Uuid
  title       String
  description String?
  status      TaskStatus @default(TODO)
  dueDate     DateTime?
  completedAt DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  assignedToId String?  @db.Uuid
  assignedTo   User?    @relation("TaskAssignedTo", fields: [assignedToId], references: [id])

  serviceOrderId String?  @db.Uuid
  serviceOrder   ServiceOrder? @relation(fields: [serviceOrderId], references: [id])

  @@map("tasks")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}
```

---

## Fluxo de Autenticação

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cria conta + retorna tokens |
| POST | `/auth/login` | Autentica + retorna tokens |
| POST | `/auth/refresh` | Renova access token via cookie |
| POST | `/auth/logout` | Invalida refresh token |

### Detalhes de implementação

**Register / Login:**
1. Hash da senha com bcrypt (rounds: 12)
2. Gera `accessToken` JWT (15min, payload: `{ sub, email, role }`)
3. Gera `refreshToken` UUID v4 (30 dias)
4. Salva `bcrypt.hash(refreshToken)` em `User.refreshTokenHash`
5. Response: `{ accessToken, user }`
6. Set-Cookie: `refreshToken` (httpOnly, secure, sameSite: strict, maxAge: 30d)

**Refresh:**
1. Extrai refresh token do httpOnly cookie (via `JwtRefreshStrategy`)
2. Busca usuário por id
3. Compara token com hash: `bcrypt.compare(token, user.refreshTokenHash)`
4. Gera e retorna novo `accessToken`

**Logout:**
1. Seta `User.refreshTokenHash = null`
2. Limpa o cookie

### Fluxo do Axios (frontend)

```
Request → adiciona Authorization: Bearer <accessToken>
Response 401 → chama POST /auth/refresh (cookie vai automaticamente)
            → recebe novo accessToken → atualiza Zustand store
            → retenta request original
Refresh 401 → logout → redirect /login
```

O `accessToken` fica em memória (Zustand), nunca em localStorage.
Na recarga da página, o app chama `/auth/refresh` na inicialização usando o cookie persistido.

---

## MVP — Escopo

### Entra no MVP

| Feature | Justificativa |
|---|---|
| Auth completo | Base de tudo |
| CRUD de Clientes | Core do sistema |
| CRUD de Leads + Kanban por status | Diferencial visual |
| CRUD de Ordens de Serviço | Diferencial do nicho |
| CRUD de Tarefas (vinculadas a OS ou avulsas) | Completude do fluxo |
| Dashboard com métricas básicas | Primeiro impacto visual |
| Roles Admin/Member | Básico de SaaS |
| Swagger/OpenAPI | Profissionalismo técnico |

### Fora do MVP

| Feature | Versão |
|---|---|
| Multi-tenancy (organization_id) | V2 |
| Email transacional (Resend) | V2 |
| Upload de arquivos (S3/R2) | V2 |
| Comentários em OS | V2 |
| Relatórios e exportação PDF | V2 |
| Planos e pagamento (Stripe) | V3 |
| Notificações push/WhatsApp | V3 |
| App mobile | Fora de escopo |

---

## Roadmap de Sprints

### Sprint 0 — Setup (2-3 dias)
- [ ] Turborepo init + workspaces
- [ ] `packages/types` com primeiros DTOs
- [ ] NestJS scaffold (AppModule, PrismaModule, ConfigModule)
- [ ] Next.js scaffold (Tailwind + shadcn/ui)
- [ ] Docker Compose com PostgreSQL
- [ ] Prisma schema + primeira migration
- [ ] ESLint + Prettier nos dois apps
- [ ] `.env.example` documentado

### Sprint 1 — Auth (3-4 dias)
- [ ] Backend: `AuthModule` completo (register, login, refresh, logout)
- [ ] Backend: `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()` decorator
- [ ] Frontend: páginas login e register
- [ ] Frontend: Zustand store + Axios interceptors com refresh automático
- [ ] Frontend: `middleware.ts` protegendo rotas do dashboard
- [ ] Frontend: layout do dashboard (sidebar + header)

### Sprint 2 — Clientes (3 dias)
- [ ] Backend: `ClientsModule` CRUD com paginação
- [ ] Frontend: lista de clientes com busca
- [ ] Frontend: formulário criação/edição (react-hook-form + zod)
- [ ] Frontend: página de detalhe do cliente

### Sprint 3 — Leads (3-4 dias)
- [ ] Backend: `LeadsModule` CRUD + endpoint de conversão para cliente
- [ ] Frontend: Kanban de leads por status (dnd-kit)
- [ ] Frontend: formulário de lead + modal de conversão

### Sprint 4 — Ordens de Serviço (4 dias)
- [ ] Backend: `ServiceOrdersModule` CRUD
- [ ] Frontend: lista de OS com filtro por status
- [ ] Frontend: formulário de OS (vincula a cliente existente)
- [ ] Frontend: página de detalhe da OS com tarefas vinculadas

### Sprint 5 — Tarefas + Dashboard (3 dias)
- [ ] Backend: `TasksModule` CRUD
- [ ] Backend: `DashboardModule` (contagens, OS por status, leads por status)
- [ ] Frontend: página de tarefas com filtros
- [ ] Frontend: dashboard com cards de métricas

### Sprint 6 — Polish + Deploy (3-4 dias)
- [ ] Swagger configurado
- [ ] Error handling global (NestJS exception filters)
- [ ] Loading states e empty states no frontend
- [ ] README completo (setup, arquitetura, decisões)
- [ ] Deploy: Railway (API) + Vercel (Web) + Neon.tech (PostgreSQL)
- [ ] Seed de dados para demo

---

## Posicionamento de Portfólio

### O que esse projeto demonstra

| Competência | Como aparece |
|---|---|
| NestJS avançado | Guards, Interceptors, Decorators, Passport Strategies |
| Auth production-grade | Refresh token, bcrypt hash, httpOnly cookie |
| Prisma com relações | Relações N:1, cascade, soft delete, paginação |
| Next.js App Router | Server/Client components, route groups, middleware Edge |
| TypeScript rigoroso | Tipos compartilhados front/back via monorepo |
| Arquitetura escalável | Documentação explícita do caminho para multi-tenancy |

### Pitch para entrevistas

> "Projetei e implementei um CRM SaaS do zero com NestJS, Next.js App Router e Prisma.
> Tomei decisões conscientes de arquitetura: refresh token com httpOnly cookies e hash no banco,
> monorepo Turborepo para compartilhar tipos entre front e back, e estrutura documentada
> para evolução para multi-tenancy sem reescrita."

---

## Caminho V2 — Multi-tenancy

Quando for implementar suporte a múltiplas empresas:

1. Adicionar model `Organization` com campos `id`, `name`, `slug`, `plan`
2. Adicionar `organizationId` em todas as entidades (User, Client, Lead, ServiceOrder, Task)
3. Criar `OrganizationMiddleware` no NestJS que extrai `organizationId` do JWT
4. Criar wrapper no `PrismaService` que auto-injeta filtro `organizationId` em todas as queries
5. Atualizar JWT payload para incluir `organizationId`
6. Adicionar rota de onboarding: criação de organização no primeiro acesso

A abordagem column-based (um banco, todas as orgs) é suficiente para até alguns milhares de tenants.
Schema-per-tenant só faz sentido com requisitos de compliance (LGPD, HIPAA) ou isolamento contratual.

---

## Variáveis de Ambiente

```env
# apps/api
DATABASE_URL="postgresql://user:password@localhost:5432/clientflow"
JWT_ACCESS_SECRET="seu-secret-muito-longo-aqui"
JWT_REFRESH_SECRET="outro-secret-diferente-aqui"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"
PORT=3001
NODE_ENV=development

# apps/web
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## Deploy

| Serviço | Plataforma | Observação |
|---|---|---|
| Frontend | Vercel | Free tier suficiente para portfólio |
| Backend | Railway ou Render | Railway tem DX melhor, Render tem free tier |
| Banco | Neon.tech | PostgreSQL serverless, free tier generoso |
