-- CreateTable
CREATE TABLE "user_equipe_metadata" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "equipe_id" INTEGER NOT NULL,
    "ville" VARCHAR(255),
    "region" VARCHAR(50),
    "departement" VARCHAR(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_equipe_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_equipe_metadata_user_id_idx" ON "user_equipe_metadata"("user_id");

-- CreateIndex
CREATE INDEX "user_equipe_metadata_equipe_id_idx" ON "user_equipe_metadata"("equipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_equipe_metadata_user_id_equipe_id_key" ON "user_equipe_metadata"("user_id", "equipe_id");

-- AddForeignKey
ALTER TABLE "user_equipe_metadata" ADD CONSTRAINT "user_equipe_metadata_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_equipe_metadata" ADD CONSTRAINT "user_equipe_metadata_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
