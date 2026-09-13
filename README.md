# LeagueHub

Les 5 grands championnats européens réunis sur un seul site : **Premier League** (Angleterre), **La Liga** (Espagne), **Serie A** (Italie), **Bundesliga** (Allemagne) et **Ligue 1** (France).

Pour chaque championnat :

- **Classement** : points, bilan, buts, zones européennes et relégation
- **Matchs** : scores en direct actualisés sans recharger la page, derniers résultats et calendrier des 14 prochains jours, avec les buteurs et les cartons rouges
- **Buteurs** : meilleurs buteurs et passeurs décisifs
- **Actualités** : derniers articles ESPN

La page d'accueil réunit les chiffres clés, le badge 3D « Pass supporter », les raccourcis vers chaque championnat, le bandeau des 96 clubs, les matchs du jour et le top 5 de chaque classement.

- **Forme d'un club** : un clic sur un club du bandeau ouvre ses 5 derniers matchs officiels (toutes compétitions), avec victoire / nul / défaite, score, adversaire, lieu et compétition.
- **Club favori** : chaque visiteur peut choisir son club ; il s'affiche sur le badge. Le choix est mémorisé dans le navigateur, sans compte.

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
│   ├── api/teams/[league]/[team] 5 derniers matchs d'un club (JSON)
│   └── [league]/                 premier-league, la-liga, serie-a, bundesliga, ligue-1
│       ├── layout.tsx            En-tête du championnat + onglets
│       ├── page.tsx              Classement
│       ├── matchs/page.tsx       Direct, résultats, calendrier
│       ├── buteurs/page.tsx      Buteurs et passeurs
│       └── actualites/page.tsx   Actualités
├── components/
│   ├── reactbits/                Composants React Bits adaptés au projet
│   ├── LiveMatches.tsx           Actualisation des scores en direct
│   ├── ClubsLoop.tsx             Bandeau des clubs cliquable
│   ├── ClubDialog.tsx            Fenêtre « 5 derniers matchs »
│   ├── HeroBadge.tsx             Badge 3D (chargement différé, version fixe de secours)
│   └── …                         Tableaux, cartes de match, logos, navigation
└── lib/
    ├── leagues.ts                Configuration des 5 championnats
    ├── live.ts                   Règles du suivi en direct (quels matchs, quand)
    ├── favorite-club.ts          Club favori mémorisé dans le navigateur
    ├── favorite-card.ts          Recto du badge dessiné avec le club favori
    ├── standings-style.ts        Couleurs partagées des classements
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
  | 5 derniers matchs d'un club (`/api/teams/…`) | 10 min + 5 min sur le CDN Vercel |
  | Buteurs, actualités | 15 min |

- Si ESPN ne répond pas, une page d'erreur propose de réessayer. Sur l'accueil, une ligue indisponible n'empêche pas l'affichage des autres.

### Scores en direct

- Dès qu'un match est en cours, ou commence dans moins de 10 minutes, le navigateur interroge `/api/live/[league]` toutes les **20 secondes**. Seuls les championnats concernés sont interrogés.
- Les cartes de match sont mises à jour **sur place**, sans recharger la page. Un but est mis en évidence quelques secondes et annoncé aux lecteurs d'écran.
- L'actualisation se met en pause quand l'onglet est masqué et reprend immédiatement au retour. En cas d'erreur, les tentatives s'espacent jusqu'à 5 minutes.
- Côté ESPN, la charge reste plafonnée à 4 requêtes par minute par championnat, quel que soit le nombre de visiteurs.

### Forme d'un club

- Les 5 derniers matchs viennent du calendrier ESPN « toutes compétitions » du club. Seules les compétitions officielles sont gardées (championnats, coupes nationales, compétitions UEFA/FIFA), avec leur nom en français ; les matchs amicaux sont ignorés.
- En début de saison, s'il y a moins de 5 matchs, la liste est complétée avec la fin de la saison précédente (y compris la division inférieure pour un club promu).

### Responsive

- Aucune page ne défile horizontalement, de 360 px à grand écran.
- Sur mobile, les classements de l'accueil défilent en carrousel horizontal ; sur tablette et grand écran, les grilles se remplissent sans case vide.
- Le panneau d'affichage (SplitFlapText) se dimensionne sur la largeur de sa colonne (container queries).
- Le badge 3D s'affiche sur tous les écrans. Il est remplacé par une version fixe si l'utilisateur a activé « réduire les animations » ou si WebGL n'est pas disponible.

### Composants React Bits

Huit composants de [React Bits](https://reactbits.dev) (licence MIT + Commons Clause) sont copiés dans `src/components/reactbits/`, en variante TypeScript + Tailwind. Chaque fichier indique en en-tête ce qui a été adapté (`"use client"`, respect du réglage « réduire les animations », corrections, etc.).

| Composant | Utilisation |
| --- | --- |
| Lanyard | Badge 3D « Pass supporter » accroché à sa sangle, personnalisable avec le club favori |
| PixelCard | Raccourcis vers les 5 championnats, pixels aux couleurs de chaque ligue |
| SplitFlapText | Panneau d'affichage des championnats sur l'accueil |
| CountUp | Chiffres clés de l'accueil |
| LogoLoop | Bandeau défilant des clubs (clic pour la forme du club) |
| SpotlightCard | Halo aux couleurs de la ligue sur les cartes top 5 |
| StarBorder | Bordure animée des matchs en direct |
| ShinyText | Minute de jeu des matchs en direct |

Le badge 3D (three.js et moteur physique Rapier) n'est téléchargé que lorsqu'il approche de la zone visible. Son modèle `public/lanyard/card.glb` a été allégé (texture intégrée remplacée par un aplat, de 2,4 Mo à 177 Ko) : le recto, le verso et la sangle sont des images séparées, et le recto du club favori est dessiné dans le navigateur.

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
