---
name: verify
description: Vérifier un changement One Mission en conditions réelles (app lancée, navigateur)
---

# Vérifier One Mission en conditions réelles

## Lancer / réutiliser les serveurs dev

- `npm run dev` à la racine lance client (Vite, port 5173) et serveur (tsx watch, port 4000) en parallèle.
- Vérifier d'abord si les ports sont déjà pris : `Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 4000,5173 }`. Un serveur `tsx watch` déjà lancé recharge automatiquement les modifications — inutile de redémarrer si le process vient de ce dossier (vérifier via `Get-CimInstance Win32_Process`).

## Se connecter dans le navigateur

- App : `http://localhost:5173`, routes authentifiées sous `/app/...`.
- Naviguer vers une route `/app/*` redirige vers `/login` si la session est absente. Chrome pré-remplit les identifiants du compte dev (greggrt.pro@gmail.com) — cliquer « Se connecter » suffit.

## Scripts ponctuels contre la base de dev

- Le client Prisma est généré dans `server/src/generated/prisma` — **ne pas** importer `@prisma/client` (échoue). Importer l'instance partagée :
  ```ts
  import { prisma } from './src/lib/prisma.js'
  ```
- Lancer depuis `server/` avec : `npx tsx --env-file=../.env mon-script.ts` (le fichier doit être dans `server/` pour la résolution des modules). Supprimer le script après usage.

## Auditer une réponse API authentifiée

Depuis la console du navigateur (page de l'app), récupérer un jeton via le cookie refresh puis appeler l'API :
```js
const { accessToken } = await (await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })).json()
await (await fetch('/api/...', { headers: { Authorization: `Bearer ${accessToken}` } })).json()
```

## Pièges connus

- `npm run verify` = typecheck + lint seulement, ce n'est pas une vérification runtime.
- Ne jamais ouvrir `index.html` en `file://` — toujours `http://localhost:5173`.
- Captures CDP : si timeout, réessayer la capture seule ; les animations se figent si l'onglet est masqué.
