import { LoginForm } from '@/components/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Anmelden - Team4s',
  description: 'Melde dich bei Team4s an',
};

export default function LoginPage() {
  return <LoginForm />;
}
