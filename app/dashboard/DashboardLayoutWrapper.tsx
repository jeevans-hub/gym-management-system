'use client';

import { useState } from 'react';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DashboardLayoutWrapperProps {
  user: User;
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
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar isOpen={isMenuOpen} onClose={closeMenu} />
      <div className="lg:ml-64">
        <DashboardHeader 
          user={user} 
          onMenuToggle={toggleMenu} 
          isMenuOpen={isMenuOpen} 
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
