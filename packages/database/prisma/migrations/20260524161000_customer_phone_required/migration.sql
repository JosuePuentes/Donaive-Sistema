UPDATE "customers" SET "phone" = '0000000000' WHERE "phone" IS NULL OR "phone" = '';
ALTER TABLE "customers" ALTER COLUMN "phone" SET NOT NULL;
