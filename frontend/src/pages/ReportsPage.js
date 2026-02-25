import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getDaysPending } from '@/services/priorityEngine';
import { FileText, Download, List, CheckCircle2, Clock, Users, AlertTriangle, BarChart3 } from 'lucide-react';
import Papa from 'papaparse';

export default function ReportsPage() {
  const { queries, users } = useData();

  const download = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const reports = [
    {
      label: 'Open Queries',
      desc: 'All currently open/in-progress queries',
      icon: List,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      action: () => {
        const data = queries.filter(q => !['Resolved', 'Spam', 'Resolved-Escalation'].includes(q.internalStatus))
          .map(q => ({ TicketID: q.ticketId, Candidate: q.candidateName, Category: q.merittoCategory, Priority: q.priorityLevel, DaysPending: getDaysPending(q.createdDate), AssignedTo: q.assignedTo, Status: q.internalStatus, Cycle: q.cycle }));
        download(data, 'open_queries.csv');
      },
    },
    {
      label: 'Closed Queries',
      desc: 'All resolved queries with TAT',
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-500/10',
      action: () => {
        const data = queries.filter(q => ['Resolved', 'Resolved-Escalation'].includes(q.internalStatus))
          .map(q => ({ TicketID: q.ticketId, Candidate: q.candidateName, Category: q.merittoCategory, TAT: q.tat, ClosureDate: q.closureDate, AssignedTo: q.assignedTo, Status: q.internalStatus, Cycle: q.cycle }));
        download(data, 'closed_queries.csv');
      },
    },
    {
      label: 'SLA Breach List',
      desc: 'Queries exceeding 2-day SLA',
      icon: Clock,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-500/10',
      action: () => {
        const data = queries.filter(q => !['Resolved', 'Spam', 'Resolved-Escalation'].includes(q.internalStatus) && getDaysPending(q.createdDate) >= 2)
          .map(q => ({ TicketID: q.ticketId, Candidate: q.candidateName, Category: q.merittoCategory, Priority: q.priorityLevel, DaysPending: getDaysPending(q.createdDate), AssignedTo: q.assignedTo, Status: q.internalStatus }));
        download(data, 'sla_breach_list.csv');
      },
    },
    {
      label: 'Member Performance',
      desc: 'Performance metrics per team member',
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      action: () => {
        const members = users.filter(u => u.role === 'AdCom Member');
        const data = members.map(m => {
          const assigned = queries.filter(q => q.assignedTo === m.username);
          const resolved = assigned.filter(q => ['Resolved', 'Resolved-Escalation'].includes(q.internalStatus));
          const avgTat = resolved.length > 0 ? (resolved.reduce((s, q) => s + (q.tat || 0), 0) / resolved.length).toFixed(1) : '0';
          return { Member: m.name, TotalAssigned: assigned.length, Resolved: resolved.length, AvgTAT: avgTat, SLABreaches: assigned.filter(q => !['Resolved', 'Spam', 'Resolved-Escalation'].includes(q.internalStatus) && getDaysPending(q.createdDate) >= 2).length };
        });
        download(data, 'member_performance.csv');
      },
    },
    {
      label: 'Escalation List',
      desc: 'All escalated queries and resolutions',
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      action: () => {
        const data = queries.filter(q => q.escalationFlag)
          .map(q => ({ TicketID: q.ticketId, Candidate: q.candidateName, Category: q.merittoCategory, EscalationReason: q.escalationReason, AdminResolution: q.adminResolution || 'Pending', Status: q.internalStatus, Cycle: q.cycle }));
        download(data, 'escalation_list.csv');
      },
    },
    {
      label: 'Full Cycle Summary',
      desc: 'Complete summary of all cycle data',
      icon: BarChart3,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-500/10',
      action: () => {
        const data = queries.map(q => ({
          TicketID: q.ticketId, Candidate: q.candidateName, Category: q.merittoCategory, AICategory: q.aiCategory, Priority: q.priorityLevel,
          DaysPending: getDaysPending(q.createdDate), AssignedTo: q.assignedTo, Status: q.internalStatus, TAT: q.tat || '', ClosureDate: q.closureDate || '',
          Escalated: q.escalationFlag ? 'Yes' : 'No', Cycle: q.cycle,
        }));
        download(data, 'full_cycle_summary.csv');
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reports-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Export data as CSV reports</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <Card key={r.label} className="hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer" onClick={r.action}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg ${r.bg} flex items-center justify-center flex-shrink-0`}>
                  <r.icon className={`w-5 h-5 ${r.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">{r.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
