'use client';

import React from 'react';

type DashboardHeaderProps = {
  userEmail: string | undefined;
  onSignOut: () => void;
};

export default function DashboardHeader({ userEmail, onSignOut }: DashboardHeaderProps) {
  return (
    <header className="bg-zinc-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-heading font-bold">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-zinc-400">{userEmail}</span>
          <button
            onClick={onSignOut}
            className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}