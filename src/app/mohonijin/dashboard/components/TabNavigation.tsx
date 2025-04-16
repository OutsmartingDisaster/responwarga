'use client';

import React from 'react';

type TabNavigationProps = {
  activeTab: 'dashboard' | 'emergency' | 'contribution' | 'users' | 'content' | 'banner' | 'spreadsheet' | 'about' | 'policy' | 'organizations';
  onTabChange: (tab: 'dashboard' | 'emergency' | 'contribution' | 'users' | 'content' | 'banner' | 'spreadsheet' | 'about' | 'policy' | 'organizations') => void;
};

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="mb-6 border-b border-zinc-700 overflow-x-auto">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onTabChange('emergency')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'emergency' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'}`}
        >
          Emergency Reports
        </button>
        <button
          onClick={() => onTabChange('contribution')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'contribution' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'}`}
        >
          Contributions
        </button>
        <button
          onClick={() => onTabChange('spreadsheet')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'spreadsheet' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'}`}
        >
          Spreadsheet
        </button>
        <button
          onClick={() => onTabChange('users')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'users' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'}`}
        >
          Users
        </button>
        <button
          onClick={() => onTabChange('content')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'content' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'}`}
        >
          Content
        </button>
        <button
          onClick={() => onTabChange('banner')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'banner' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'}`}
        >
          Banner
        </button>
        <button
          onClick={() => onTabChange('about')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'about' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'}`}
        >
          About
        </button>
        <button
          onClick={() => onTabChange('policy')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'policy' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'}`}
        >
          User Policy
        </button>
        <button
          onClick={() => onTabChange('organizations')}
          className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'organizations' ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-300'}`}
        >
          Organizations
        </button>
      </nav>
    </div>
  );
}
