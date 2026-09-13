# LeagueHub

Les 5 grands championnats européens réunis sur un seul site : **Premier League** (Angleterre), **La Liga** (Espagne), **Serie A** (Italie), **Bundesliga** (Allemagne) et **Ligue 1** (France).

Pour chaque championnat :

- **Classement** : points, bilan, buts, zones européennes et relégation
- **Matchs** : scores en direct actualisés sans recharger la page, derniers résultats et calendrier des 14 prochains jours, avec les buteurs et les cartons rouges
- **Buteurs** : meilleurs buteurs et passeurs décisifs
- **Actualités** : derniers articles ESPN

La page d'accueil affiche les chiffres clés, le badge 3D LeagueHub, les raccourcis vers chaque championnat, le bandeau des clubs, les matchs du jour et le top 5 de chaque championnat.

## Stack

| Rôle | Outil |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Components) |
| Langage | TypeScript |
| Style | Tailwind CSS 4 |
| Icônes | Lucide React |
| Animations | [React Bits](https://reactbits.dev) + motion, three.js / React Three Fiber pour le badge 3D |
| Données | API publique ESPN |
| Hébergement | Vercel |

## Architecture

```
src/
├── app/
│   ├── page.tsx                  Accueil
│   ├── icon.svg, apple-icon.png  Favicon et icône iOS
│   ├── api/live/[league]/        Scores en direct (JSON) pour le navigateur
│   └── [league]/                 premier-league, la-liga, serie-a, bundesliga, ligue-1
│       ├── layout.tsx            En-tête du championnat + onglets
│       ├── page.tsx              Classement
│       ├── matchs/page.tsx       Direct, résultats, calendrier
│       ├── buteurs/page.tsx      Buteurs et passeurs
│       └── actualites/page.tsx   Actualités
├── components/
│   ├── reactbits/                Composants React Bits adaptés au projet
│   ├── LiveMatches.tsx           Actualisation des scores en direct
│   ├── HeroBadge.tsx             Chargement différé du badge 3D
│   └── …                         Tableaux, cartes de match, logos, navigation
└── lib/
    ├── leagues.ts                Configuration des 5 championnats
    ├── live.ts                   Règles du suivi en direct (quels matchs, quand)
    ├── types.ts                  Modèles normalisés utilisés par l'interface
    ├── format.ts                 Dates en français (heure de Paris)
    └── espn/
        ├── client.ts             fetch serveur + cache Next.js (server-only)
        ├── types.ts              Typage des réponses JSON d'ESPN
        └── api.ts                Normalisation : JSON ESPN → modèles de l'app
public/
└── lanyard/                      Modèle 3D du badge, recto, verso et sangle
```

### Données et cache

- Les appels à ESPN sont faits **uniquement côté serveur** (`import "server-only"`). Le navigateur ne reçoit que du HTML ou le JSON de nos propres routes : l'URL de l'API n'apparaît jamais côté client.
- Chaque requête passe par le **Data Cache** de Next.js, et chaque page est régénérée en **ISR**. ESPN n'est donc interrogé qu'une fois par période, quel que soit le nombre de visiteurs :

  | Donnée | Cache |
  | --- | --- |
  | Scores en direct (`/api/live/[league]`) | 15 s + 10 s sur le CDN Vercel |
  | Pages matchs / accueil | 60 s |
  | Classements | 5 min |
  | Buteurs, actualités | 15 min |

- Si ESPN ne répond pas, une page d'erreur propose de réessayer. Sur l'accueil, une ligue indisponible n'empêche pas l'affichage des autres.

### Scores en direct

- Dès qu'un match est en cours, ou commence dans moins de 10 minutes, le navigateur interroge `/api/live/[league]` toutes les **20 secondes**. Seuls les championnats concernés sont interrogés.
- Les cartes de match sont mises à jour **sur place**, sans recharger la page. Un but est mis en évidence quelques secondes et annoncé aux lecteurs d'écran.
- L'actualisation se met en pause quand l'onglet est masqué et reprend immédiatement au retour. En cas d'erreur, les tentatives s'espacent jusqu'à 5 minutes.
- Côté ESPN, la charge reste plafonnée à 4 requêtes par minute par championnat, quel que soit le nombre de visiteurs.

### Composants React Bits

Huit composants de [React Bits](https://reactbits.dev) (licence MIT + Commons Clause) sont copiés dans `src/components/reactbits/`, en variante TypeScript + Tailwind. Chaque fichier indique en en-tête ce qui a été adapté (`"use client"`, respect du réglage « réduire les animations », etc.).

| Composant | Utilisation |
| --- | --- |
| Lanyard | Badge 3D « Pass supporter » accroché à sa sangle, sur l'accueil |
| PixelCard | Raccourcis vers les 5 championnats, pixels aux couleurs de chaque ligue |
| SplitFlapText | Panneau d'affichage des championnats sur l'accueil |
| CountUp | Chiffres clés de l'accueil |
| LogoLoop | Bandeau défilant des clubs |
| SpotlightCard | Halo aux couleurs de la ligue sur les cartes top 5 |
| StarBorder | Bordure animée des matchs en direct |
| ShinyText | Minute de jeu des matchs en direct |

Le badge 3D (three.js et moteur physique Rapier) n'est téléchargé que sur grand écran, quand il approche de la zone visible, et jamais si l'utilisateur a activé « réduire les animations ». Son modèle `public/lanyard/card.glb` a été allégé (texture intégrée remplacée par un aplat, de 2,4 Mo à 177 Ko) : le recto, le verso et la sangle sont des images séparées.

Pour ajouter un championnat, il suffit d'ajouter une entrée dans `src/lib/leagues.ts` (code ESPN, par exemple `ned.1` pour l'Eredivisie).

## Serveur MCP shadcn

Le fichier `.mcp.json` déclare le serveur MCP de shadcn pour Claude Code. Il permet de chercher et d'ajouter des composants des registres shadcn, dont React Bits (`@react-bits`). Claude Code demande de l'approuver au premier lancement dans le projet.

Il est épinglé sur **shadcn 3.8.5** : les versions 4.x exigent Node.js 20.18 ou plus récent. Après une mise à jour de Node, on peut revenir à `shadcn@latest` (commande d'origine : `npx shadcn@latest mcp init --client claude`).

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
