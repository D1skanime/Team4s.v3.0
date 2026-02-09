import { RegisterForm } from '@/components/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registrieren - Team4s',
  description: 'Erstelle ein neues Team4s Konto',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
