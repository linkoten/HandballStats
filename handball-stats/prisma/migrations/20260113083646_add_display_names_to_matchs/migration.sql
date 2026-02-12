-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('GRATUIT', 'STARTER', 'PRO', 'CLUB', 'PREMIUM');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('UTILISATEUR', 'ENTRAINEUR', 'ADMIN_CLUB', 'ADMIN_GENERAL');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "subscription" "SubscriptionType" NOT NULL DEFAULT 'GRATUIT',
    "role" "UserRole" NOT NULL DEFAULT 'UTILISATEUR',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subscription_status" TEXT,
    "subscription_end_date" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "tokens_available" INTEGER NOT NULL DEFAULT 0,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "invited_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_clubs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "club_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "equipe_id" INTEGER NOT NULL,
    "saison" TEXT NOT NULL,
    "competition_name" TEXT,
    "status" "TokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "competition_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "club_id" INTEGER NOT NULL,
    "equipe_ids" INTEGER[],
    "role" "UserRole" NOT NULL,
    "used_by" TEXT,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipes" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(255) NOT NULL DEFAULT 'AS Default',
    "ville" VARCHAR(255) DEFAULT 'Rennes',
    "club" VARCHAR(100),
    "region" VARCHAR(50),
    "departement" VARCHAR(3),
    "is_club_principal" BOOLEAN DEFAULT false,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "joueurs" (
    "id" SERIAL NOT NULL,
    "nom_prenom" VARCHAR(255) NOT NULL,
    "num_maillot" INTEGER,
    "id_equipe" INTEGER,
    "poste_principal" VARCHAR(50),
    "postes_secondaires" VARCHAR(50)[],

    CONSTRAINT "joueurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchs" (
    "id" SERIAL NOT NULL,
    "match_url" TEXT NOT NULL,
    "pdf_url" TEXT,
    "competition_name" VARCHAR(255),
    "recevant_nom_display" VARCHAR(255),
    "exterieur_nom_display" VARCHAR(255),
    "equipe_recevant_id" INTEGER,
    "equipe_exterieur_id" INTEGER,
    "score_final" VARCHAR(10),
    "date_match" TIMESTAMP(6) DEFAULT '2025-11-17 00:00:00'::timestamp without time zone,
    "arbitre_1" VARCHAR(255) DEFAULT 'Aucun/non défini',
    "arbitre_2" VARCHAR(255) DEFAULT 'Aucun/non défini',
    "cartons_jaunes_adversaire" INTEGER DEFAULT 0,
    "exclusions_2min_adversaire" INTEGER DEFAULT 0,
    "cartons_rouges_adversaire" INTEGER DEFAULT 0,
    "sept_metres_adversaire" INTEGER DEFAULT 0,
    "classement_equipe_recevant" INTEGER,
    "partie_tableau_equipe_recevant" VARCHAR(20),
    "classement_equipe_exterieur" INTEGER,
    "partie_tableau_equipe_exterieur" VARCHAR(20),

    CONSTRAINT "matchs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistiques_joueur" (
    "id" SERIAL NOT NULL,
    "id_match" INTEGER,
    "id_joueur" INTEGER,
    "buts" INTEGER DEFAULT 0,
    "sept_metres" INTEGER DEFAULT 0,
    "tirs" INTEGER DEFAULT 0,
    "arrets" INTEGER DEFAULT 0,
    "avertissements" INTEGER DEFAULT 0,
    "exclusions_2min" INTEGER DEFAULT 0,
    "discipline" INTEGER DEFAULT 0,
    "id_equipe_adverse" INTEGER,

    CONSTRAINT "statistiques_joueur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "users_clerk_id_idx" ON "users"("clerk_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_stripe_customer_id_idx" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "user_clubs_user_id_idx" ON "user_clubs"("user_id");

-- CreateIndex
CREATE INDEX "user_clubs_club_id_idx" ON "user_clubs"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_clubs_user_id_club_id_key" ON "user_clubs"("user_id", "club_id");

-- CreateIndex
CREATE INDEX "competition_tokens_user_id_status_idx" ON "competition_tokens"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "competition_tokens_user_id_equipe_id_saison_key" ON "competition_tokens"("user_id", "equipe_id", "saison");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_codes_code_key" ON "invitation_codes"("code");

-- CreateIndex
CREATE INDEX "invitation_codes_code_idx" ON "invitation_codes"("code");

-- CreateIndex
CREATE INDEX "invitation_codes_created_by_idx" ON "invitation_codes"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "equipes_nom_key" ON "equipes"("nom");

-- CreateIndex
CREATE INDEX "idx_equipes_departement" ON "equipes"("departement");

-- CreateIndex
CREATE INDEX "idx_equipes_is_club_principal" ON "equipes"("is_club_principal");

-- CreateIndex
CREATE INDEX "idx_equipes_region" ON "equipes"("region");

-- CreateIndex
CREATE INDEX "idx_joueurs_poste_principal" ON "joueurs"("poste_principal");

-- CreateIndex
CREATE INDEX "idx_joueurs_postes_secondaires" ON "joueurs" USING GIN ("postes_secondaires");

-- CreateIndex
CREATE UNIQUE INDEX "joueurs_nom_prenom_id_equipe_key" ON "joueurs"("nom_prenom", "id_equipe");

-- CreateIndex
CREATE UNIQUE INDEX "matchs_match_url_key" ON "matchs"("match_url");

-- CreateIndex
CREATE INDEX "idx_matchs_cartons_jaunes_adv" ON "matchs"("cartons_jaunes_adversaire");

-- CreateIndex
CREATE INDEX "idx_matchs_cartons_rouges_adv" ON "matchs"("cartons_rouges_adversaire");

-- CreateIndex
CREATE INDEX "idx_matchs_classement_exterieur" ON "matchs"("classement_equipe_exterieur");

-- CreateIndex
CREATE INDEX "idx_matchs_classement_recevant" ON "matchs"("classement_equipe_recevant");

-- CreateIndex
CREATE INDEX "idx_matchs_exclusions_2min_adv" ON "matchs"("exclusions_2min_adversaire");

-- CreateIndex
CREATE INDEX "idx_matchs_partie_tableau_exterieur" ON "matchs"("partie_tableau_equipe_exterieur");

-- CreateIndex
CREATE INDEX "idx_matchs_partie_tableau_recevant" ON "matchs"("partie_tableau_equipe_recevant");

-- CreateIndex
CREATE INDEX "idx_matchs_sept_metres_adv" ON "matchs"("sept_metres_adversaire");

-- CreateIndex
CREATE INDEX "idx_stats_equipe_adverse" ON "statistiques_joueur"("id_equipe_adverse");

-- CreateIndex
CREATE UNIQUE INDEX "statistiques_joueur_id_match_id_joueur_key" ON "statistiques_joueur"("id_match", "id_joueur");

-- AddForeignKey
ALTER TABLE "user_clubs" ADD CONSTRAINT "user_clubs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_clubs" ADD CONSTRAINT "user_clubs_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_tokens" ADD CONSTRAINT "competition_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_codes" ADD CONSTRAINT "invitation_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "joueurs" ADD CONSTRAINT "joueurs_id_equipe_fkey" FOREIGN KEY ("id_equipe") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matchs" ADD CONSTRAINT "matchs_equipe_exterieur_id_fkey" FOREIGN KEY ("equipe_exterieur_id") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matchs" ADD CONSTRAINT "matchs_equipe_recevant_id_fkey" FOREIGN KEY ("equipe_recevant_id") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "statistiques_joueur" ADD CONSTRAINT "fk_stats_equipe_adverse" FOREIGN KEY ("id_equipe_adverse") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "statistiques_joueur" ADD CONSTRAINT "statistiques_joueur_id_joueur_fkey" FOREIGN KEY ("id_joueur") REFERENCES "joueurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "statistiques_joueur" ADD CONSTRAINT "statistiques_joueur_id_match_fkey" FOREIGN KEY ("id_match") REFERENCES "matchs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
