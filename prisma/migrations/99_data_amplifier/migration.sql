-- CreateTable
CREATE TABLE "data_amplifier_config" (
    "id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "amplify_multiplier" DECIMAL(10, 2) NOT NULL DEFAULT 10.0,
    "generate_fake_visits" BOOLEAN NOT NULL DEFAULT false,
    "fake_visits_per_hour" INTEGER NOT NULL DEFAULT 50,
    "amplify_pageviews" BOOLEAN NOT NULL DEFAULT true,
    "amplify_events" BOOLEAN NOT NULL DEFAULT true,
    "amplify_active_users" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "data_amplifier_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_amplifier_config_website_id_key" ON "data_amplifier_config"("website_id");

-- CreateIndex
CREATE INDEX "data_amplifier_config_website_id_idx" ON "data_amplifier_config"("website_id");

-- CreateIndex
CREATE INDEX "data_amplifier_config_enabled_idx" ON "data_amplifier_config"("enabled");
