# Inverno ERP — Guia de Instalação (Self-Hosted)

Guia para instalar o **Inverno ERP** numa máquina/servidor de um cliente.
Cada cliente tem a sua própria instalação isolada.

---

## 1. Requisitos

| Software | Versão mínima | Notas |
|----------|---------------|-------|
| **Node.js** | 20 LTS | inclui `npm` |
| **PostgreSQL** | 14+ | base de dados |
| **Docker** (opcional) | — | forma mais simples de correr o PostgreSQL |
| Navegador | Chrome/Edge recente | para usar a aplicação |

---

## 2. Base de Dados (PostgreSQL)

### Opção A — Docker (recomendado)
Na pasta `backend/`:
```bash
docker compose up -d
```

### Opção B — PostgreSQL já instalado
Crie a base de dados:
```sql
CREATE DATABASE inverno_erp;
```

---

## 3. Backend (API)

```bash
cd backend
cp .env.example .env          # criar configuração
npm install
```

### Editar o `.env` (IMPORTANTE para produção)
```ini
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<a_sua_password>
DB_DATABASE=inverno_erp
PORT=3000

# Gerar segredos fortes (correr o comando abaixo e colar o resultado):
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=<colar_segredo_1>
LICENSE_SECRET=<colar_segredo_2>

# Segurança
ALLOW_ADMIN_FALLBACK=false     # manter false após o 1.º acesso
ALLOWED_ORIGINS=               # ex: http://192.168.1.50:4200 (vazio = aceita LAN)
SEED_DEMO=false                # false = instalação limpa (sem empresa demo)
```

### Arrancar o backend
```bash
# Desenvolvimento (recarrega automaticamente)
npm run start:dev

# Produção
npm run build
npm run start:prod
```
O backend fica disponível em `http://localhost:3000`.
No primeiro arranque cria automaticamente o utilizador **admin** e o Plano de Contas (PGC Moçambique).

---

## 4. Frontend (Aplicação Web)

```bash
cd frontend
npm install
```

### Configurar o endereço da API
Editar `frontend/app/shared/config.ts`:
```ts
export const environment = {
  production: true,
  apiUrl: 'http://localhost:3000',     // IP/domínio do servidor backend
  frontendUrl: 'http://localhost:4200'
};
```
> Para acesso em rede local, use o IP do servidor (ex.: `http://192.168.1.50:3000`)
> e defina `ALLOWED_ORIGINS` no `.env` do backend em conformidade.

### Arrancar / Compilar
```bash
# Desenvolvimento
npm run dev          # http://localhost:4200

# Produção (gera ficheiros estáticos em dist/)
npm run build
```
Para produção, sirva a pasta `dist/` com um servidor estático (Nginx, IIS, `npx serve`, etc.).

---

## 5. Primeiro Acesso

1. Abrir `http://localhost:4200` (ou o IP do servidor)
2. Login inicial: **admin** / **admin**
3. **Mudar imediatamente a password** do admin (Administração → Utilizadores)
4. Criar/editar a empresa do cliente (Administração → Empresas)
5. Confirmar Plano de Contas (Contabilidade → Plano de Contas)
6. Configurar séries de documentos e ano fiscal

---

## 6. App Mobile (opcional — motoristas/revendedores)

```bash
cd mobile
npm install
```
Editar `mobile/src/environments/environment.ts` com o IP do backend, depois:
```bash
npm start            # navegador
# ou build nativo Android via Capacitor (ver documentação Ionic)
```

---

## 7. Checklist de Produção (Segurança)

- [ ] `JWT_SECRET` e `LICENSE_SECRET` definidos com valores aleatórios fortes
- [ ] `ALLOW_ADMIN_FALLBACK=false`
- [ ] `SEED_DEMO=false`
- [ ] Password do utilizador **admin** alterada
- [ ] `DB_PASSWORD` forte e o `.env` **nunca** versionado no git
- [ ] `ALLOWED_ORIGINS` definido com o domínio/IP real do cliente
- [ ] `production: true` no `config.ts` do frontend
- [ ] Backups regulares da base de dados PostgreSQL

---

## 8. Backups

```bash
# Exportar
pg_dump -U postgres inverno_erp > backup_$(date +%F).sql
# Restaurar
psql -U postgres inverno_erp < backup_AAAA-MM-DD.sql
```

---

## Suporte
Inverno ERP — Sistema de Gestão Empresarial.
