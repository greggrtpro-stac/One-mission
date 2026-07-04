# One Mission

SaaS de développement personnel et d'organisation **gamifié** : quêtes, quêtes hebdomadaires, DeepWork (pomodoro), suivi d'addictions avec coach IA, journal analysé par IA, XP/niveaux, classement, succès.

## Stack

- **Client** : React 19 + Vite + Tailwind CSS 4 + TanStack Query + Zustand + Recharts (`client/`)
- **Serveur** : Express 5 + Prisma 7 + PostgreSQL + JWT (access en mémoire, refresh en cookie httpOnly) (`server/`)
- **Partagé** : types et règles de gamification communs (`shared/`)
- Monorepo npm workspaces.

## Démarrage sur une nouvelle machine

Prérequis : **Node.js ≥ 20**, **Docker Desktop** (pour PostgreSQL), Git.

```bash
# 1. Cloner le projet
git clone https://github.com/greggrtpro-stac/One-mission.git
cd One-mission

# 2. Installer les dépendances (tous les workspaces)
npm install

# 3. Configurer l'environnement
#    Copier le modèle puis ajuster si besoin (les valeurs par défaut
#    fonctionnent telles quelles en développement local).
cp .env.example .env        # PowerShell : Copy-Item .env.example .env

# 4. Lancer la base de données PostgreSQL (Docker, port 5433)
npm run db:up

# 5. Appliquer les migrations (génère aussi le client Prisma)
npm run db:migrate

# 6. (Optionnel) Peupler les citations du tableau de bord
npm run db:seed

# 7. Démarrer le site + l'API
npm run dev                 # ou double-clic sur demarrer.bat (Windows)
```

- Site : http://localhost:5173
- API : http://localhost:4000/api/health

## Variables d'environnement (`.env`)

Toutes documentées dans [`.env.example`](.env.example). Obligatoires : `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`. Optionnelles : Google OAuth (connexion Google), `ANTHROPIC_API_KEY` (journal IA + coach — sans clé, les fonctions IA sont simplement masquées), SMTP (e-mails de réinitialisation — sans SMTP, les liens s'affichent dans la console serveur).

**Ne jamais commiter `.env`** (déjà ignoré par Git).

## Notes de développement

- Après une migration, si des champs Prisma sont `undefined` au runtime : `npx prisma generate` dans `server/`.
- Windows : si le port 4000 est déjà pris, le serveur refuse de démarrer (vérifier `Get-NetTCPConnection -LocalPort 4000`).
- Le client Prisma est généré dans `server/src/generated/` (ignoré par Git, recréé par `npm run db:migrate`).
