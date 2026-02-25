import { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDaysPending } from '@/services/priorityEngine';
import { BarChart3, TrendingUp, Clock, AlertTriangle, Activity, Users } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];

export default function AnalyticsPage() {
  const { queries, users, cycles } = useData();
  const { user, isAdmin } = useAuth();
  const [cycleFilter, setCycleFilter] = useState('all');

  const filteredQueries = useMemo(() => {
    let q = isAdmin ? queries : queries.filter(q => q.assignedTo === user?.username);
    if (cycleFilter !== 'all') q = q.filter(q => q.cycle === cycleFilter);
    return q;
  }, [queries, user, isAdmin, cycleFilter]);

  const activeQueries = filteredQueries.filter(q => !['Resolved', 'Spam', 'Resolved-Escalation'].includes(q.internalStatus));
  const highPriority = activeQueries.filter(q => q.priorityLevel === 'HIGH').length;
  const slaBreaches = activeQueries.filter(q => getDaysPending(q.createdDate) >= 2).length;
  const resolved = filteredQueries.filter(q => ['Resolved', 'Resolved-Escalation'].includes(q.internalStatus));
  const avgTat = resolved.length > 0 ? (resolved.reduce((sum, q) => sum + (q.tat || 0), 0) / resolved.length).toFixed(1) : '0';
  const escalated = filteredQueries.filter(q => q.escalationFlag).length;
  const escalationRate = filteredQueries.length > 0 ? ((escalated / filteredQueries.length) * 100).toFixed(1) : '0';

  // Category distribution
  const categoryData = useMemo(() => {
    const counts = {};
    activeQueries.forEach(q => {
      const cat = q.merittoCategory || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeQueries]);

  // Member workload
  const workloadData = useMemo(() => {
    const members = users.filter(u => u.role === 'AdCom Member');
    return members.map(m => ({
      name: m.name,
      open: activeQueries.filter(q => q.assignedTo === m.username).length,
      resolved: filteredQueries.filter(q => q.assignedTo === m.username && ['Resolved', 'Resolved-Escalation'].includes(q.internalStatus)).length,
    }));
  }, [users, activeQueries, filteredQueries]);

  const kpis = [
    { label: 'Active Queries', value: activeQueries.length, icon: Activity, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'High Priority', value: highPriority, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
    { label: 'SLA Breaches', value: slaBreaches, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Avg TAT (days)', value: avgTat, icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
    { label: 'Escalation Rate', value: `${escalationRate}%`, icon: AlertTriangle, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="analytics-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAdmin ? 'Organization-wide' : 'Your'} performance overview</p>
        </div>
        <Select value={cycleFilter} onValueChange={setCycleFilter}>
          <SelectTrigger className="w-48" data-testid="analytics-cycle-filter">
            <SelectValue placeholder="All Cycles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cycles</SelectItem>
            {cycles.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">{kpi.label}</p>
                  <p className={`text-xl font-bold ${kpi.color}`} data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s/g, '-')}`}>{kpi.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {categoryData.map((entry, idx) => (
                      <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Member Workload (Admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Member Workload</CardTitle>
            </CardHeader>
            <CardContent>
              {workloadData.length === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No members</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={workloadData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend iconSize={10} />
                    <Bar dataKey="open" fill="#3B82F6" name="Open" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolved" fill="#10B981" name="Resolved" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
