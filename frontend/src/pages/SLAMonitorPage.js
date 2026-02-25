import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getDaysPending } from '@/services/priorityEngine';
import { Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function SLAMonitorPage() {
  const { queries } = useData();

  const breached = useMemo(() =>
    queries.filter(q => {
      if (['Resolved', 'Spam', 'Resolved-Escalation'].includes(q.internalStatus)) return false;
      return getDaysPending(q.createdDate) >= 2;
    }).sort((a, b) => getDaysPending(b.createdDate) - getDaysPending(a.createdDate)),
    [queries]
  );

  const critical = breached.filter(q => getDaysPending(q.createdDate) >= 3).length;
  const atRisk = breached.filter(q => getDaysPending(q.createdDate) === 2).length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sla-monitor-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SLA Monitor</h1>
        <p className="text-sm text-muted-foreground mt-1">Queries exceeding SLA thresholds</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-200 dark:border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Total Breaches</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="total-breaches">{breached.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-300 dark:border-red-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-700 dark:text-red-300" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Critical (3+ days)</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300" data-testid="critical-breaches">{critical}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">At Risk (2 days)</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="at-risk-breaches">{atRisk}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {breached.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Clock className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No SLA breaches</p>
              <p className="text-xs mt-1">All queries are within SLA thresholds</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Ticket ID</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Candidate</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Category</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Priority</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Days Pending</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Assigned To</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breached.map(q => {
                  const days = getDaysPending(q.createdDate);
                  const isCritical = days >= 3;
                  return (
                    <TableRow key={q.ticketId} className={isCritical ? 'sla-critical-row' : 'sla-breach-row'} data-testid={`sla-row-${q.ticketId}`}>
                      <TableCell className="font-mono text-xs font-medium">{q.ticketId}</TableCell>
                      <TableCell className="text-sm">{q.candidateName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{q.merittoCategory}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${q.priorityLevel === 'HIGH' ? 'priority-high' : q.priorityLevel === 'MEDIUM' ? 'priority-medium' : 'priority-low'}`}>
                          {q.priorityLevel}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-bold">{days}</TableCell>
                      <TableCell className="text-xs">{q.assignedTo || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{q.internalStatus}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="destructive" className={`text-[10px] ${isCritical ? 'bg-red-700' : 'bg-amber-600'}`}>
                          {isCritical ? 'Critical' : 'At Risk'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
