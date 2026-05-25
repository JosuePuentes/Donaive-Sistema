/** Muestra nombre y apellido; solo usa razón social si no hay persona. */
export function customerDisplayName(customer: {
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
}): string {
  const person = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  if (person) return person;
  if (customer.businessName?.trim()) return customer.businessName.trim();
  return '—';
}
