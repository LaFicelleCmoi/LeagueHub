# LeagueHub

Les 5 grands championnats européens réunis sur un seul site : **Premier League** (Angleterre), **La Liga** (Espagne), **Serie A** (Italie), **Bundesliga** (Allemagne) et **Ligue 1** (France).

Pour chaque championnat :

- **Chiffres clés** : nombre de clubs, matchs et buts du jour, buts au total en saison régulière avec la moyenne par match

- **Classement** : points, bilan, buts, zones européennes et relégation
- **Matchs** : scores en direct actualisés sans recharger la page, derniers résultats et calendrier des 14 prochains jours, avec les buteurs et les cartons rouges
- **Buteurs** : meilleurs buteurs et passeurs décisifs
- **Actualités** : derniers articles ESPN

La page d'accueil réunit les chiffres clés (dont le total de buts de la saison régulière des 5 championnats et la moyenne par match), le badge 3D « Pass supporter », les raccourcis vers chaque championnat, le bandeau des 96 clubs, les matchs du jour et le top 5 de chaque classement.

- **Forme d'un club** : un clic sur un club, dans le bandeau ou dans les classements, ouvre ses 5 derniers matchs officiels (toutes compétitions), avec victoire / nul / défaite, score, adversaire, lieu et compétition.
- **Thème clair ou sombre** : un bouton dans l'en-tête (et une ligne dans le menu mobile) fait le tour des trois réglages — système, clair, sombre. Le choix est mémorisé dans le navigateur et appliqué avant la première peinture : une page réglée en sombre ne s'affiche jamais en clair au chargement. Sans choix explicite, le site suit le réglage de l'appareil.
- **Club favori** : chaque visiteur peut choisir son club (mémorisé dans le navigateur, sans compte). Il a droit à un traitement spécial : section « Mon club » sur l'accueil (place au classement, forme, match du jour en direct ou prochain match), logo sur le badge 3D, étoile dorée et ligne ambrée dans les classements, cadre doré sur ses matchs, célébration quand il marque en direct et fiche « Votre club » dorée.
- **Tracker Ligue des champions 2026-2027** : bannière sur l'accueil, pastille « LDC » dans l'en-tête et adresses courtes `/ldc` et `/ligue-des-champions` qui redirigent vers [ldc-2026-2027.vercel.app](https://ldc-2026-2027.vercel.app/) (projet indépendant, ouvert dans un nouvel onglet).
- **Onglet Coupes nationales** (activable) : un interrupteur « Coupes » dans l'en-tête affiche un onglet dédié à la FA Cup, la Copa del Rey, la Coppa Italia, la DFB-Pokal et la Coupe de France. Chaque coupe a sa page (`/coupes/[coupe]`) : frise des tours, prochains matchs et résultats par tour (aller-retour, tirs au but), exploits des petits poucets face aux clubs de première division, et dernière finale quand l'édition suivante n'est pas encore programmée.
- **Calendrier officiel des coupes 2026-27** : ESPN ne publie un tour qu'une fois tiré et ignore les qualifications (la FA Cup et la Coupe de France 2026-27 n'y figurent pas encore). Le calendrier des fédérations (FA, FFF, RFEF, Lega Serie A, DFB), relevé via Wikipédia et recoupé avec ESPN, OpenLigaDB et TheSportsDB, complète la frise et un tableau détaillé : dates, tirages, nombre de matchs, clubs en lice, entrées en lice, dotations de la FA Cup et stades des finales. Les jours réels des matchs publiés par ESPN remplacent les dates prévues. La page `/coupes` ajoute les prochaines échéances et le compte à rebours des finales.
- **Compte à rebours avant le coup d'envoi** : dans les 3 jours qui précèdent un match (championnat, coupe nationale ou coupe d'Europe), un compte à rebours à la seconde apparaît sur les cartes de match, dans la fiche du club (prochain match, affiche européenne comprise), dans la section « Mon club » et sur les cartes des coupes. Il passe à l'ambre dans les dernières 24 h, au rouge dans la dernière heure, puis annonce un coup d'envoi imminent jusqu'au passage en direct. Une seule horloge partagée, calée sur la seconde, en pause quand l'onglet est masqué.
- **Synchronisation avec le direct** : les scores en direct et les fiches des clubs ne passent plus par le Data Cache de Next.js (qui renvoyait encore l'ancienne version pendant sa mise à jour, soit un rafraîchissement de retard) mais par une copie en mémoire de quelques secondes et le CDN. Les matchs de la veille restent suivis après minuit, et un match resté « à venir » est interrogé jusqu'à ce qu'ESPN le lance. Une page servie depuis le cache recharge ses données dès qu'elle a plus de 90 s. Les coupes nationales ont leurs scores en direct, et la fiche du club comme « Mon club » affichent le match en cours avec son score, relu toutes les 30 s.
- **Calendrier stocké dans le site, direct ESPN** : l'organisation du site (quels matchs, dates, stades, tours des coupes) vient de `src/data/calendrier/`, relevé chaque nuit chez ESPN par `scripts/sync-calendar.mts` (GitHub Action `calendrier.yml`, un commit par fichier modifié). Les pages s'affichent donc même si ESPN ne répond pas ; ESPN n'apporte que l'état des matchs : score, minute, buts, cartons jaunes et rouges. Lancer le relevé à la main : `npm run calendrier`.
- **Détails du match** : bouton sur chaque carte de match, avec tout ce qu'ESPN fournit, en français — chronologie complète (buts et passeurs, penaltys marqués, manqués ou arrêtés, contre-son-camp, cartons et motifs, remplacements, VAR, arrêts de jeu, périodes), 28 statistiques comparées, compositions (schéma, titulaires, remplaçants, entrées et sorties), arbitres, stade, affluence, diffuseurs et commentaire minute par minute (en anglais). Relu toutes les 30 s pendant le match.
- **Recherche de club** : une barre de recherche dans l'en-tête (raccourci clavier `/`, insensible aux accents, navigation au clavier) mène à la page d'un club : bilan de la saison, prochain match, **palmarès complet** (nombre de titres par trophée, première et dernière année) et **déroulé de la saison en cours**, mois par mois, toutes compétitions — championnat, coupes nationales et coupes d'Europe.
- **Palmarès** : relevé sur Wikidata (chaque saison de compétition y désigne son vainqueur) par `scripts/sync-palmares.mts`, une fois par semaine (GitHub Action `palmares.yml`). Les anciens noms d'une même compétition sont regroupés (« First Division » et « Premier League » comptent ensemble) ; divisions inférieures et coupes régionales apparaissent sous « Autres trophées ». Lancer le relevé à la main : `npm run palmares`.

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
│   ├── coupes/                   Onglet Coupes nationales : /coupes et /coupes/[coupe]
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
│   ├── ClubDialogProvider.tsx    Fenêtre partagée, ouvrable depuis n'importe quel club
│   ├── HeroBadge.tsx             Badge 3D (chargement différé, version fixe de secours)
│   └── …                         Tableaux, cartes de match, logos, navigation
└── lib/
    ├── leagues.ts                Configuration des 5 championnats
    ├── cups.ts                   Configuration des 5 coupes nationales (tours et dates en français)
    ├── cup-calendar.ts           Calendrier officiel 2026-27 des coupes, fusionné avec les données ESPN
    ├── cups-tab.ts               Interrupteur de l'onglet Coupes, mémorisé dans le navigateur
    ├── calendar.ts               Calendrier stocké dans le site (matchs, dates, stades, tours)
    ├── clubs.ts                  Index des clubs des 5 championnats (barre de recherche)
    ├── palmares.ts               Palmarès des clubs relevé sur Wikidata
    ├── countdown.ts              Horloge partagée des comptes à rebours avant le coup d'envoi
    ├── team-form.ts              Fiche d'un club côté navigateur, relue toutes les 30 s pendant ses matchs
    ├── live.ts                   Règles du suivi en direct (quels matchs, quand)
    ├── favorite-club.ts          Club favori mémorisé dans le navigateur
    ├── theme.ts                  Thème clair / sombre mémorisé dans le navigateur
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

### Classement en direct

- Pendant les matchs, le classement complet de chaque championnat est **recalculé en temps réel** avec les scores en cours : points, bilan et buts provisoires, lignes qui glissent vers leur nouvelle place, pastille « score · minute » pour les équipes qui jouent et flèches de mouvement par rapport au classement officiel.
- Pas de double comptage : ESPN ne compte un match qu'une fois terminé, et le bilan V-N-D fourni avec chaque match indique s'il est déjà inclus. Un match terminé n'est ajouté que tant que le classement ESPN ne l'a pas encore pris en compte.
- En cas d'égalité, le départage provisoire se fait aux points, à la différence de buts puis aux buts marqués ; sans match en cours, l'ordre officiel d'ESPN est conservé tel quel.

### Forme d'un club

- Les 5 derniers matchs viennent du calendrier ESPN « toutes compétitions » du club. Seules les compétitions officielles sont gardées (championnats, coupes nationales, compétitions UEFA/FIFA), avec leur nom en français ; les matchs amicaux sont ignorés.
- Les matchs de **coupe d'Europe** (Ligue des champions, Ligue Europa, Ligue Conférence, tours de qualification compris) ont un affichage dédié : ligne teintée aux couleurs de la compétition avec pastille et icône, forme cerclée, et prochain match européen présenté en carte spéciale.
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
