# 🎉 Migration du schéma vers Club/Competition/Token System

## ✅ Changements appliqués

### 📊 Nouveaux modèles

1. **Club** - Entité distincte du club (organisation)

   - Champs : nom, ville, région, département, codeFfhb
   - Relations : équipes, userClubs

2. **Competition** - Représentation structurée des compétitions

   - Champs : nom, saison, equipeId, baseUrl, niveau, phase
   - Suivi du scraping : scrapingStatus, lastScrapedAt, scrapingError
   - Relations : équipe, matchs, competitionAccess

3. **CompetitionAccess** - Gestion des accès utilisateurs

   - Remplace CompetitionToken
   - Contrôle granulaire : userId + competitionId
   - Tracking tokenUsed, expiresAt

4. **TokenUsageHistory** - Audit trail complet

   - Actions : SCRAPE, REFUND, PURCHASE, SUBSCRIPTION, ADMIN
   - Traçabilité : userId, competitionId, amount, reason

5. **SubscriptionLimit** - Configuration centralisée
   - Limites par type d'abonnement
   - Features : powerBiAccess, advancedStats

### 🔄 Modèles modifiés

- **User** :

  - Ajout : tokensRemaining, tokensUsed
  - Ajout : stripeSubscriptionId, stripePriceId, stripeCurrentPeriodEnd
  - Nouvelle relation : competitionAccess, tokenUsageHistory
  - Suppression : competitionTokens

- **equipes** :

  - Ajout : clubId (lien vers Club parent)
  - Suppression : club (String)
  - Nouvelle relation : club, competitions
  - Suppression : userClubs, competitionTokens

- **matchs** :

  - Ajout : competitionId (lien vers Competition)
  - Nouvelle relation : competition

- **UserClub** :
  - Modification : clubId pointe maintenant vers Club (et non équipe)

### 🗑️ Modèles supprimés

- **CompetitionToken** - Remplacé par CompetitionAccess + TokenUsageHistory

### 📈 Nouveaux enums

- **ScrapingStatus** : PENDING, IN_PROGRESS, COMPLETED, FAILED
- **TokenAction** : SCRAPE, REFUND, PURCHASE, SUBSCRIPTION, ADMIN

## 📦 Limites d'abonnement configurées

| Abonnement | Tokens | Clubs | Équipes | Compétitions | PowerBI | Stats avancées |
| ---------- | ------ | ----- | ------- | ------------ | ------- | -------------- |
| GRATUIT    | 0      | 0     | 0       | 0            | ❌      | ❌             |
| STARTER    | 3      | 1     | 2       | 3            | ✅      | ❌             |
| PRO        | 10     | 2     | 5       | 10           | ✅      | ✅             |
| CLUB       | 25     | 1     | 15      | 25           | ✅      | ✅             |
| PREMIUM    | ∞      | ∞     | ∞       | ∞            | ✅      | ✅             |

## 🔧 Actions réalisées

1. ✅ Backup du schéma original
2. ✅ Remplacement du schema.prisma
3. ✅ Création de la migration Prisma
4. ✅ Reset de la base de données (données de test effacées)
5. ✅ Application de la migration
6. ✅ Création du script de seed
7. ✅ Population des limites d'abonnement

## 🚀 Prochaines étapes recommandées

### Backend (FastAPI)

- [ ] Mettre à jour les endpoints pour utiliser Club/Competition
- [ ] Implémenter la gestion des tokens (déduction, vérification)
- [ ] Ajouter endpoints pour CompetitionAccess
- [ ] Créer service de vérification des limites d'abonnement

### Frontend (Next.js)

- [ ] Mettre à jour le flux onboarding : Club → Équipe → Compétition
- [ ] Afficher les tokens restants dans l'UI
- [ ] Créer pages de gestion des clubs/équipes/compétitions
- [ ] Implémenter guards d'accès basés sur CompetitionAccess

### Scraper

- [ ] Associer les matchs à competitionId
- [ ] Mettre à jour le statut de scraping (PENDING → IN_PROGRESS → COMPLETED/FAILED)
- [ ] Gérer les erreurs et créer TokenUsageHistory avec REFUND si échec

### Stripe

- [ ] Attribuer tokens lors de l'abonnement (webhook)
- [ ] Gérer le renouvellement des tokens
- [ ] Implémenter achat de tokens supplémentaires

## 🔑 Exemple de workflow

```typescript
// 1. Utilisateur s'abonne à STARTER
await prisma.user.update({
  where: { id: userId },
  data: {
    subscription: "STARTER",
    tokensRemaining: 3,
    tokenUsageHistory: {
      create: {
        action: "SUBSCRIPTION",
        amount: 3,
        reason: "Abonnement STARTER initial",
      },
    },
  },
});

// 2. Utilisateur ajoute un club
const club = await prisma.club.create({
  data: {
    nom: "AS Rennes Handball",
    ville: "Rennes",
    userClubs: {
      create: { userId },
    },
  },
});

// 3. Utilisateur ajoute une équipe
const equipe = await prisma.equipes.create({
  data: {
    nom: "AS Rennes Senior 1",
    clubId: club.id,
  },
});

// 4. Utilisateur ajoute une compétition
const competition = await prisma.competition.create({
  data: {
    nom: "Championnat Régional",
    saison: "2025-2026",
    equipeId: equipe.id,
    scrapingStatus: "PENDING",
  },
});

// 5. Scraping lancé → déduction token
await prisma.$transaction([
  // Déduire le token
  prisma.user.update({
    where: { id: userId },
    data: {
      tokensRemaining: { decrement: 1 },
      tokensUsed: { increment: 1 },
    },
  }),
  // Créer l'accès
  prisma.competitionAccess.create({
    data: {
      userId,
      competitionId: competition.id,
      tokenUsed: true,
    },
  }),
  // Logger l'utilisation
  prisma.tokenUsageHistory.create({
    data: {
      userId,
      competitionId: competition.id,
      action: "SCRAPE",
      amount: -1,
      reason: `Scraping de ${competition.nom}`,
    },
  }),
  // Mettre à jour le statut
  prisma.competition.update({
    where: { id: competition.id },
    data: { scrapingStatus: "IN_PROGRESS" },
  }),
]);

// 6. Vérifier l'accès
const hasAccess = await prisma.competitionAccess.findUnique({
  where: {
    userId_competitionId: { userId, competitionId: competition.id },
  },
});
```

## 📁 Fichiers créés/modifiés

- ✏️ `prisma/schema.prisma` - Nouveau schéma complet
- 📄 `prisma/schema_proposed.prisma` - Version proposée (peut être supprimée)
- 🗄️ `prisma/migrations/20260116143707_add_club_competition_and_token_system/` - Migration
- 🌱 `prisma/seed.ts` - Script de seed pour SubscriptionLimit
- 📦 `package.json` - Ajout du script prisma:seed
