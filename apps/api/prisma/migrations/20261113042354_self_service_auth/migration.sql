-- CreateEnum
CREATE TYPE "PasswordRequestStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "registration_note" TEXT,
ADD COLUMN     "self_registered" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "password_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "PasswordRequestStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "ip" TEXT,
    "handled_by_id" UUID,
    "handled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_requests_status_created_at_idx" ON "password_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "password_requests_user_id_idx" ON "password_requests"("user_id");

-- AddForeignKey
ALTER TABLE "password_requests" ADD CONSTRAINT "password_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_requests" ADD CONSTRAINT "password_requests_handled_by_id_fkey" FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
