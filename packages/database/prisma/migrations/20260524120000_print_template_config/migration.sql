-- CreateEnum
CREATE TYPE "PaperType" AS ENUM ('TICKET_80MM', 'TICKET_58MM', 'CARTA');

-- CreateTable
CREATE TABLE "print_template_configs" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "tipo_papel" "PaperType" NOT NULL DEFAULT 'TICKET_80MM',
    "nombre_empresa" TEXT NOT NULL DEFAULT 'Donaive',
    "rif" TEXT NOT NULL DEFAULT '',
    "direccion" TEXT NOT NULL DEFAULT '',
    "telefono" TEXT NOT NULL DEFAULT '',
    "mensaje_personalizado" TEXT,
    "mostrar_tasa_bcv" BOOLEAN NOT NULL DEFAULT true,
    "mostrar_precios_bs" BOOLEAN NOT NULL DEFAULT true,
    "mostrar_cajero" BOOLEAN NOT NULL DEFAULT true,
    "mostrar_logo" BOOLEAN NOT NULL DEFAULT true,
    "pie_pagina" TEXT DEFAULT 'Gracias por su compra',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_template_configs_pkey" PRIMARY KEY ("id")
);
