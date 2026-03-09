-- CreateTable
CREATE TABLE "joueur_objectifs" (
    "id" SERIAL NOT NULL,
    "id_joueur" INTEGER NOT NULL,
    "saison" VARCHAR(10) NOT NULL,
    "type_objectif" VARCHAR(50) NOT NULL,
    "valeur_cible" DOUBLE PRECISION NOT NULL,
    "fixe_par" VARCHAR(20) NOT NULL DEFAULT 'joueur',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "joueur_objectifs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "joueur_objectifs_id_joueur_idx" ON "joueur_objectifs"("id_joueur");

-- CreateIndex
CREATE INDEX "joueur_objectifs_saison_idx" ON "joueur_objectifs"("saison");

-- CreateIndex
CREATE UNIQUE INDEX "joueur_objectifs_id_joueur_saison_type_objectif_key" ON "joueur_objectifs"("id_joueur", "saison", "type_objectif");

-- AddForeignKey
ALTER TABLE "joueur_objectifs" ADD CONSTRAINT "joueur_objectifs_id_joueur_fkey" FOREIGN KEY ("id_joueur") REFERENCES "joueurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
