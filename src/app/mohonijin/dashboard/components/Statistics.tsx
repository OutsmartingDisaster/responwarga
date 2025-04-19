'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface EmergencyReport {
  id: string;
  assistance_type: string;
  status: string;
  created_at: string;
}

interface Contribution {
  id: string;
  contribution_type: string;
  created_at: string;
}

export default function Statistics() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmergencies: 0,
    totalContributions: 0,
    activeEmergencies: 0,
    resolvedEmergencies: 0,
    pendingEmergencies: 0,
    emergencyTypes: {} as Record<string, number>,
    contributionTypes: {} as Record<string, number>,
    dailyEmergencies: [] as { date: string; count: number }[],
    dailyContributions: [] as { date: string; count: number }[]
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);

      // Fetch emergency reports
      const { data: emergencies, error: emergencyError } = await supabase
      .from('emergency_reports')
        .select('id, assistance_type, status, created_at')
        .order('created_at', { ascending: true });

      if (emergencyError) throw emergencyError;

      // Fetch contributions
      const { data: contributions, error: contributionError } = await supabase
      .from('contributions')
        .select('id, contribution_type, created_at')
        .order('created_at', { ascending: true });

      if (contributionError) throw contributionError;

      // Process emergency data
      const emergencyTypes = {} as Record<string, number>;
      const emergencyStatus = {
        active: 0,
        resolved: 0,
        needs_verification: 0
      };

      (emergencies as EmergencyReport[] || []).forEach(emergency => {
        // Count by type
        emergencyTypes[emergency.assistance_type] = (emergencyTypes[emergency.assistance_type] || 0) + 1;
        
        // Count by status
        if (emergency.status === 'active') emergencyStatus.active++;
        else if (emergency.status === 'resolved') emergencyStatus.resolved++;
        else if (emergency.status === 'needs_verification') emergencyStatus.needs_verification++;
      });

      // Process contribution data
      const contributionTypes = {} as Record<string, number>;
      (contributions as Contribution[] || []).forEach(contribution => {
        contributionTypes[contribution.contribution_type] = (contributionTypes[contribution.contribution_type] || 0) + 1;
      });

      // Process daily data (last 7 days)
      const dailyEmergencies = processDaily(emergencies || []);
      const dailyContributions = processDaily(contributions || []);

    setStats({
        totalEmergencies: emergencies?.length || 0,
        totalContributions: contributions?.length || 0,
        activeEmergencies: emergencyStatus.active,
        resolvedEmergencies: emergencyStatus.resolved,
        pendingEmergencies: emergencyStatus.needs_verification,
        emergencyTypes,
        contributionTypes,
        dailyEmergencies,
        dailyContributions
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDaily = (data: any[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyCounts = last7Days.map(date => {
      const count = data.filter(item => 
        item.created_at.split('T')[0] === date
      ).length;
      return { date, count };
    });

    return dailyCounts;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-700/50 p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Total Reports</p>
              <p className="text-2xl font-bold text-white">{stats.totalEmergencies}</p>
            </div>
            <div className="text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="text-zinc-400 text-sm mt-2">Emergency reports received</p>
        </div>

        <div className="bg-zinc-700/50 p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Total Contributions</p>
              <p className="text-2xl font-bold text-white">{stats.totalContributions}</p>
            </div>
            <div className="text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
          <p className="text-zinc-400 text-sm mt-2">Community contributions</p>
      </div>

        <div className="bg-zinc-700/50 p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Active Emergencies</p>
              <p className="text-2xl font-bold text-white">{stats.activeEmergencies}</p>
            </div>
            <div className="text-yellow-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-zinc-400 text-sm mt-2">Currently active cases</p>
        </div>

        <div className="bg-zinc-700/50 p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Resolution Rate</p>
              <p className="text-2xl font-bold text-white">
                {stats.totalEmergencies ? 
                  Math.round((stats.resolvedEmergencies / stats.totalEmergencies) * 100) : 0}%
              </p>
            </div>
            <div className="text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
      </div>
          </div>
          <p className="text-zinc-400 text-sm mt-2">Cases resolved successfully</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <div className="bg-zinc-700/50 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Activity</h3>
          <Line
            data={{
              labels: stats.dailyEmergencies.map(d => d.date),
              datasets: [
                {
                  label: 'Emergency Reports',
                  data: stats.dailyEmergencies.map(d => d.count),
                  borderColor: '#ef4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  tension: 0.4,
                  fill: true
                },
                {
                  label: 'Contributions',
                  data: stats.dailyContributions.map(d => d.count),
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                  fill: true
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                  labels: { color: '#e4e4e7' }
                }
              },
              scales: {
                x: {
                  grid: { color: 'rgba(228, 228, 231, 0.1)' },
                  ticks: { color: '#e4e4e7' }
                },
                y: {
                  grid: { color: 'rgba(228, 228, 231, 0.1)' },
                  ticks: { color: '#e4e4e7' }
                }
              }
            }}
          />
        </div>

        {/* Emergency Types Distribution */}
        <div className="bg-zinc-700/50 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Emergency Types</h3>
          <div className="aspect-w-16 aspect-h-9">
            <Doughnut
              data={{
                labels: Object.keys(stats.emergencyTypes).map(type => 
                  type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
                ),
                datasets: [{
                  data: Object.values(stats.emergencyTypes),
                  backgroundColor: [
                    '#ef4444',
                    '#3b82f6',
                    '#22c55e',
                    '#f59e0b',
                    '#8b5cf6'
                  ]
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: { color: '#e4e4e7' }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Contribution Types */}
        <div className="bg-zinc-700/50 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Contribution Types</h3>
          <Bar
            data={{
              labels: Object.keys(stats.contributionTypes).map(type => 
                type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
              ),
              datasets: [{
                label: 'Number of Contributions',
                data: Object.values(stats.contributionTypes),
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                borderWidth: 1
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                  labels: { color: '#e4e4e7' }
                }
              },
              scales: {
                x: {
                  grid: { color: 'rgba(228, 228, 231, 0.1)' },
                  ticks: { color: '#e4e4e7' }
                },
                y: {
                  grid: { color: 'rgba(228, 228, 231, 0.1)' },
                  ticks: { color: '#e4e4e7' }
                }
              }
            }}
          />
      </div>

        {/* Emergency Status */}
        <div className="bg-zinc-700/50 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Emergency Status</h3>
          <Doughnut
            data={{
              labels: ['Active', 'Resolved', 'Pending Verification'],
              datasets: [{
                data: [
                  stats.activeEmergencies,
                  stats.resolvedEmergencies,
                  stats.pendingEmergencies
                ],
                backgroundColor: [
                  '#ef4444',
                  '#22c55e',
                  '#f59e0b'
                ]
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'right',
                  labels: { color: '#e4e4e7' }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}