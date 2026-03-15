# Auto Deploy On Main Design

**Date:** 2026-03-15

**Goal:** Hacer que cada `push` a `main` en `iaduartec/portfolio` despliegue automaticamente la web que sirve `portfolio.service` en `/srv/apps/portfolio`.

## Root Cause

La produccion de Portfolio la sirve `portfolio.service` desde `/srv/apps/portfolio`.
Si el checkout local deriva de GitHub, la web publicada puede no coincidir con el repo remoto.

## Chosen Approach

Usar GitHub Actions en cada `push` a `main` con dos fases:

1. `verify` en runner GitHub-hosted:
   - checkout
   - Node 24 + pnpm
   - `pnpm install --frozen-lockfile`
   - `pnpm check`
   - `pnpm build`

2. `deploy` por SSH al servidor:
   - entrar en `/srv/apps/portfolio`
   - `git fetch origin`
   - `git reset --hard origin/main`
   - ejecutar el script de deploy ya actualizado en ese checkout
   - `pnpm install --frozen-lockfile`
   - `pnpm build`
   - `systemctl restart portfolio`
   - verificar salud local y publica

## Server Setup

El servidor debe tener una regla `sudoers` acotada para el usuario `ubuntu`:

- `systemctl restart portfolio`
- `systemctl is-active portfolio`

## Required Secrets

- `PROD_SSH_HOST`
- `PROD_SSH_PORT`
- `PROD_SSH_USER`
- `PROD_SSH_KEY`

## Safety Rules

- El workflow solo despliega `main`.
- El workflow hace `reset --hard origin/main` sobre `/srv/apps/portfolio` para eliminar deriva local.
- La app solo se reinicia despues de `pnpm build` exitoso.
- El deploy valida una ruta local y otra publica antes de declararse correcto.
