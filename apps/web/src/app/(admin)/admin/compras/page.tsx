import { Suspense } from 'react';
import ComprasListContent from './compras-list-content';

export default function ComprasListPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Cargando compras...</p>}>
      <ComprasListContent />
    </Suspense>
  );
}
