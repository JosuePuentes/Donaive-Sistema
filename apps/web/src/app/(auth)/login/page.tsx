import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<p className="text-zinc-500">Cargando...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
