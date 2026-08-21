'use client';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', active: true },
  { name: 'Members', path: '/dashboard/members', active: false },
  { name: 'Attendance', path: '/dashboard/attendance', active: false },
  { name: 'Memberships', path: '/dashboard/memberships', active: false },
  { name: 'Payments', path: '/dashboard/payments', active: false },
  { name: 'Trainers', path: '/dashboard/trainers', active: false },
  { name: 'Reports', path: '/dashboard/reports', active: false },
  { name: 'Settings', path: '/dashboard/settings', active: false },
];

export default function DashboardSidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Gym Management</h1>
        <p className="text-sm text-gray-400">System</p>
      </div>
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <a
            key={item.name}
            href={item.path}
            className={`block px-4 py-2 rounded-md transition-colors ${
              item.active
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            } ${!item.active ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={(e) => {
              if (!item.active) {
                e.preventDefault();
              }
            }}
          >
            {item.name}
          </a>
        ))}
      </nav>
    </aside>
  );
}
