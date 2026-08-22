'use client';

import { createContext, useContext } from 'react';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const DashboardUserContext = createContext<DashboardUser | null>(null);

export function DashboardUserProvider({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  return (
    <DashboardUserContext.Provider value={user}>
      {children}
    </DashboardUserContext.Provider>
  );
}

export function useDashboardUser(): DashboardUser {
  const user = useContext(DashboardUserContext);
  if (!user) throw new Error('Dashboard user context is unavailable');
  return user;
}
