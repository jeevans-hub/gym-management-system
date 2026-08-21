import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  // Authentication is handled by the dashboard layout
  return <DashboardClient />;
}
