-- CreateTable
CREATE TABLE "public"."users" (
    "user_id" BIGSERIAL NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."brands" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."models" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."years" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "model_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."files" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "year_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."descriptions" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "file_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscription_prices" (
    "id" SERIAL NOT NULL,
    "period_months" INTEGER NOT NULL,
    "price_kopecks" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."file_access_stats" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "file_id" INTEGER,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_access_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bot_settings" (
    "id" SERIAL NOT NULL,
    "setting_key" TEXT NOT NULL,
    "setting_value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."premium_users" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "sub_end" TIMESTAMP(3) NOT NULL,
    "period_months" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "premium_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_users" (
    "id" SERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "username" TEXT,
    "added_by" BIGINT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "public"."brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "models_brand_id_name_key" ON "public"."models"("brand_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "years_model_id_value_key" ON "public"."years"("model_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_prices_period_months_key" ON "public"."subscription_prices"("period_months");

-- CreateIndex
CREATE INDEX "idx_file_access_stats_brand_model" ON "public"."file_access_stats"("brand", "model");

-- CreateIndex
CREATE INDEX "idx_file_access_stats_accessed_at" ON "public"."file_access_stats"("accessed_at");

-- CreateIndex
CREATE UNIQUE INDEX "bot_settings_setting_key_key" ON "public"."bot_settings"("setting_key");

-- CreateIndex
CREATE UNIQUE INDEX "premium_users_user_id_key" ON "public"."premium_users"("user_id");

-- CreateIndex
CREATE INDEX "idx_premium_users_sub_end" ON "public"."premium_users"("sub_end");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_user_id_key" ON "public"."admin_users"("user_id");

-- AddForeignKey
ALTER TABLE "public"."models" ADD CONSTRAINT "models_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."years" ADD CONSTRAINT "years_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."files" ADD CONSTRAINT "files_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."descriptions" ADD CONSTRAINT "descriptions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_access_stats" ADD CONSTRAINT "file_access_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_access_stats" ADD CONSTRAINT "file_access_stats_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."premium_users" ADD CONSTRAINT "premium_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admin_users" ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
