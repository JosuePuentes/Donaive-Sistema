import { Suspense } from 'react';
import DashboardContent from './dashboard-content';

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Cargando dashboard...</p>}>
      <DashboardContent />
    </Suspense>
  );
}
