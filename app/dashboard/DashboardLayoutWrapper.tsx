'use client';

import { useState } from 'react';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import { DashboardUserProvider, type DashboardUser } from './DashboardUserContext';

interface DashboardLayoutWrapperProps {
  user: DashboardUser;
  children: React.ReactNode;
}

export default function DashboardLayoutWrapper({
  user,
  children,
}: DashboardLayoutWrapperProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <DashboardUserProvider user={user}>
      <div className="min-h-screen bg-gray-50">
        <DashboardSidebar isOpen={isMenuOpen} onClose={closeMenu} />
        <div className="min-w-0 lg:ml-64">
          <DashboardHeader
            user={user}
            onMenuToggle={toggleMenu}
            isMenuOpen={isMenuOpen}
          />
          <main className="min-w-0 overflow-x-hidden p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </DashboardUserProvider>
  );
}
