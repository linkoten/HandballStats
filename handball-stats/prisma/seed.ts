import { PrismaClient, SubscriptionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Seed SubscriptionLimit
  const subscriptionLimits = [
    {
      subscriptionType: SubscriptionType.GRATUIT,
      maxTokens: 0,
      maxClubs: 0,
      maxEquipes: 0,
      maxCompetitions: 0,
      advancedStats: false,
    },
    {
      subscriptionType: SubscriptionType.STARTER,
      maxTokens: 3,
      maxClubs: 1,
      maxEquipes: 2,
      maxCompetitions: 3,
      advancedStats: false,
    },
    {
      subscriptionType: SubscriptionType.PRO,
      maxTokens: 10,
      maxClubs: 2,
      maxEquipes: 5,
      maxCompetitions: 10,
      advancedStats: true,
    },
    {
      subscriptionType: SubscriptionType.CLUB,
      maxTokens: 25,
      maxClubs: 1,
      maxEquipes: 15,
      maxCompetitions: 25,
      advancedStats: true,
    },
    {
      subscriptionType: SubscriptionType.PREMIUM,
      maxTokens: 999999, // Illimité en pratique
      maxClubs: 999,
      maxEquipes: 999,
      maxCompetitions: 999,
      advancedStats: true,
    },
  ];

  for (const limit of subscriptionLimits) {
    await prisma.subscriptionLimit.upsert({
      where: { subscriptionType: limit.subscriptionType },
      update: limit,
      create: limit,
    });
    console.log(
      `✅ Created/Updated subscription limit for ${limit.subscriptionType}`,
    );
  }

  console.log("✨ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
