'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function DashboardClient() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Welcome Back!</h3>
        {user && (
          <div className="space-y-2">
            <p className="text-gray-700">
              <span className="font-medium">Name:</span> {user.name}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Email:</span> {user.email}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Role:</span> {user.role}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Member Since:</span>{' '}
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Overview</h3>
        <p className="text-gray-600">
          Welcome to the Gym Management System dashboard. This is the foundation for your gym management
          operations. Additional modules will be added in future milestones.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900">Members</h4>
            <p className="text-sm text-blue-700">Coming soon</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900">Attendance</h4>
            <p className="text-sm text-green-700">Coming soon</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-900">Memberships</h4>
            <p className="text-sm text-purple-700">Coming soon</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900">Payments</h4>
            <p className="text-sm text-yellow-700">Coming soon</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900">Trainers</h4>
            <p className="text-sm text-red-700">Coming soon</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900">Reports</h4>
            <p className="text-sm text-gray-700">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
