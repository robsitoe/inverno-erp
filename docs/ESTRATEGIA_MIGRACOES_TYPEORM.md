# Estratégia de evolução de schema (TypeORM)

## Objetivo

Eliminar dependência de `synchronize: true` em runtime e padronizar evolução de schema por migrações versionadas.

## Padrão de configuração

- `DB_SYNCHRONIZE=false` por padrão para a base principal.
- `TENANT_DB_SYNCHRONIZE=false` por padrão para bases tenant.
- `DB_RUN_MIGRATIONS=false` por padrão (ativa execução automática de migrações na inicialização da app principal quando `true`).
- `TENANT_DB_RUN_MIGRATIONS=false` por padrão (ativa execução automática para cada conexão tenant quando `true`).

## Estrutura de migrações

- Migrações da base principal: `backend/src/database/migrations/main`
- Migrações das bases tenant: `backend/src/database/migrations/tenant`
- DataSources para CLI:
  - Principal: `backend/src/database/data-source-main.ts`
  - Tenant: `backend/src/database/data-source-tenant.ts`

## Pipeline recomendado

### 1) Base principal

1. Gerar migração:
   - `npm run migration:generate --name=NomeDaMigracao`
2. Revisar arquivo gerado em `src/database/migrations/main`.
3. Aplicar migrações:
   - `npm run migration:run`
4. Deploy:
   - executar `npm run migration:run` no pipeline antes de subir nova versão **ou** ativar `DB_RUN_MIGRATIONS=true` de forma controlada.

### 2) Bases tenant

1. Selecionar tenant alvo via variáveis `TENANT_DB_*` (principalmente `TENANT_DB_DATABASE`).
2. Gerar migração específica tenant:
   - `npm run tenant:migration:generate --name=NomeDaMigracaoTenant`
3. Revisar arquivo gerado em `src/database/migrations/tenant`.
4. Aplicar migrações:
   - `npm run tenant:migration:run`
5. Para rollout em múltiplos tenants, iterar tenant a tenant (job/script operacional), mantendo idempotência e observabilidade.

## Boas práticas

- Nunca confiar em `synchronize` em produção.
- Migrações pequenas, revisáveis e com rollback planejado.
- Evitar mudanças destrutivas sem etapa intermediária (expand/contract).
- Versionar migrações de main e tenant separadamente para clareza operacional.
