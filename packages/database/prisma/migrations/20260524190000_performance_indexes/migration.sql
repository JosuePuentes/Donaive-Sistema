-- Índices para consultas frecuentes (ventas, reportes, CXP, detalle)
CREATE INDEX IF NOT EXISTS "invoices_status_document_type_confirmed_at_idx"
  ON "invoices"("status", "document_type", "confirmed_at" DESC);

CREATE INDEX IF NOT EXISTS "invoices_cash_register_session_id_idx"
  ON "invoices"("cash_register_session_id");

CREATE INDEX IF NOT EXISTS "invoice_details_invoice_id_idx"
  ON "invoice_details"("invoice_id");

CREATE INDEX IF NOT EXISTS "invoice_details_product_id_idx"
  ON "invoice_details"("product_id");

CREATE INDEX IF NOT EXISTS "document_payments_invoice_id_idx"
  ON "document_payments"("invoice_id");

CREATE INDEX IF NOT EXISTS "document_payments_purchase_id_idx"
  ON "document_payments"("purchase_id");

CREATE INDEX IF NOT EXISTS "purchase_details_purchase_id_idx"
  ON "purchase_details"("purchase_id");

CREATE INDEX IF NOT EXISTS "purchase_details_product_id_idx"
  ON "purchase_details"("product_id");

CREATE INDEX IF NOT EXISTS "products_category_id_idx"
  ON "products"("category_id");

CREATE INDEX IF NOT EXISTS "accounts_payable_supplier_id_status_idx"
  ON "accounts_payable"("supplier_id", "status");
