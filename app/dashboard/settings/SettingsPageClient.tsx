'use client';

import { useState } from 'react';
import { useDashboardUser } from '../DashboardUserContext';
import AdminUsersPanel from './AdminUsersPanel';
import GymSettingsForm from './GymSettingsForm';

type SettingsTab = 'profile' | 'administration';

export default function SettingsPageClient() {
  const user = useDashboardUser();
  const isAdmin = user.role === 'admin';
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const tabs: { id: SettingsTab; label: string; description: string }[] = [
    { id: 'profile', label: 'Gym Profile', description: 'Identity and operating preferences' },
    ...(isAdmin ? [{ id: 'administration' as const, label: 'Administration', description: 'Admin and staff access' }] : []),
  ];

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    setActiveTab(tabs[nextIndex].id);
    document.getElementById(`settings-tab-${tabs[nextIndex].id}`)?.focus();
  }

  return (
    <div className="mx-auto min-w-0 max-w-7xl">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">System configuration</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-950 sm:text-3xl">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Manage the gym profile and authorized system users.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <nav role="tablist" aria-label="Settings sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm xl:block xl:space-y-1 xl:overflow-visible">
          {tabs.map((tab, index) => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} id={`settings-tab-${tab.id}`} type="button" role="tab" aria-selected={active} aria-controls={`settings-panel-${tab.id}`} tabIndex={active ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKeyDown(event, index)} className={`min-w-max rounded-xl px-4 py-3 text-left outline-none transition focus:ring-2 focus:ring-blue-500 xl:w-full ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className="block text-sm font-bold">{tab.label}</span>
                <span className={`mt-0.5 hidden text-xs xl:block ${active ? 'text-blue-100' : 'text-gray-500'}`}>{tab.description}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {activeTab === 'profile' && (
            <div id="settings-panel-profile" role="tabpanel" aria-labelledby="settings-tab-profile">
              <GymSettingsForm canEdit={isAdmin} />
            </div>
          )}
          {activeTab === 'administration' && isAdmin && (
            <div id="settings-panel-administration" role="tabpanel" aria-labelledby="settings-tab-administration">
              <AdminUsersPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
