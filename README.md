# LeagueHub

Les 5 grands championnats européens réunis sur un seul site : **Premier League** (Angleterre), **La Liga** (Espagne), **Serie A** (Italie), **Bundesliga** (Allemagne) et **Ligue 1** (France).

Pour chaque championnat :

- **Classement** : points, bilan, buts, zones européennes et relégation
- **Matchs** : scores en direct (rafraîchis automatiquement), derniers résultats et calendrier des 14 prochains jours, avec les buteurs et les cartons rouges
- **Buteurs** : meilleurs buteurs et passeurs décisifs
- **Actualités** : derniers articles ESPN

La page d'accueil affiche les matchs du jour et le top 5 de chaque championnat.

## Stack

| Rôle | Outil |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Components) |
| Langage | TypeScript |
| Style | Tailwind CSS 4 |
| Icônes | Lucide React |
| Données | API publique ESPN |
| Hébergement | Vercel |

## Architecture

```
src/
├── app/
│   ├── page.tsx                  Accueil : matchs du jour + top 5 des classements
│   └── [league]/                 premier-league, la-liga, serie-a, bundesliga, ligue-1
│       ├── layout.tsx            En-tête du championnat + onglets
│       ├── page.tsx              Classement
│       ├── matchs/page.tsx       Direct, résultats, calendrier
│       ├── buteurs/page.tsx      Buteurs et passeurs
│       └── actualites/page.tsx   Actualités
├── components/                   Tableaux, cartes de match, logos, navigation
└── lib/
    ├── leagues.ts                Configuration des 5 championnats
    ├── types.ts                  Modèles normalisés utilisés par l'interface
    ├── format.ts                 Dates en français (heure de Paris)
    └── espn/
        ├── client.ts             fetch serveur + cache Next.js (server-only)
        ├── types.ts              Typage des réponses JSON d'ESPN
        └── api.ts                Normalisation : JSON ESPN → modèles de l'app
```

### Données et cache

- Les appels à ESPN sont faits **uniquement côté serveur** (`import "server-only"`). Le navigateur ne reçoit que le HTML rendu : l'URL de l'API n'apparaît jamais côté client.
- Chaque requête passe par le **Data Cache** de Next.js, et chaque page est régénérée en **ISR**. ESPN n'est donc interrogé qu'une fois par période, quel que soit le nombre de visiteurs :

  | Donnée | Cache |
  | --- | --- |
  | Matchs / accueil | 60 s |
  | Classements | 5 min |
  | Buteurs, actualités | 15 min |

- Pendant un match en direct, la page se recharge toutes les 60 s en relisant **le cache Next.js**, pas l'API.
- Si ESPN ne répond pas, une page d'erreur propose de réessayer. Sur l'accueil, une ligue indisponible n'empêche pas l'affichage des autres.

Pour ajouter un championnat, il suffit d'ajouter une entrée dans `src/lib/leagues.ts` (code ESPN, par exemple `ned.1` pour l'Eredivisie).

## Développement

Node.js 18.18 ou plus récent est requis.

```bash
npm install
npm run dev
```

Le site est alors disponible sur [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # build de production (vérifie aussi les types et le lint)
npm run start   # sert le build de production
```

## Déploiement sur Vercel

1. Pousser le dépôt sur GitHub.
2. Sur [vercel.com/new](https://vercel.com/new), importer le dépôt : Next.js est détecté automatiquement.
3. Déployer. Aucune variable d'environnement n'est nécessaire.

---

Site non officiel, sans lien avec les ligues ni les clubs. Données fournies par ESPN.
