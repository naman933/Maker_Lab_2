import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getDaysPending } from '@/services/priorityEngine';
import QueryDetailDrawer from '@/components/QueryDetailDrawer';
import { Search, UserCheck } from 'lucide-react';

const PriorityBadge = ({ level }) => {
  const cls = level === 'HIGH' ? 'priority-high' : level === 'MEDIUM' ? 'priority-medium' : 'priority-low';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{level}</span>;
};

const StatusBadge = ({ status }) => {
  const colors = {
    'New': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400',
    'Open': 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400',
    'Resolved': 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400',
    'Spam': 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400',
    'Resolved-Escalation': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400',
  };
  return <Badge variant="outline" className={`text-[11px] ${colors[status] || ''}`}>{status}</Badge>;
};

export default function MyQueriesPage() {
  const { queries } = useData();
  const { user } = useAuth();
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const myQueries = useMemo(() => {
    return queries.filter(q => {
      if (q.assignedTo !== user?.username) return false;
      if (statusFilter !== 'all' && q.internalStatus !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return q.ticketId?.toLowerCase().includes(s) || q.candidateName?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [queries, user, search, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="my-queries-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Assigned Queries</h1>
        <p className="text-sm text-muted-foreground mt-1">{myQueries.length} queries assigned to you</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Ticket ID or Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
                data-testid="my-query-search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="my-query-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {myQueries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <UserCheck className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No queries assigned to you</p>
              <p className="text-xs mt-1">Queries will appear here when assigned</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Ticket ID</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Candidate</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Category</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Priority</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Days</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myQueries.map(q => {
                  const days = getDaysPending(q.createdDate);
                  const slaBreach = days >= 2 && !['Resolved', 'Spam', 'Resolved-Escalation'].includes(q.internalStatus);
                  return (
                    <TableRow
                      key={q.ticketId}
                      className={`cursor-pointer ${slaBreach ? (days >= 3 ? 'sla-critical-row' : 'sla-breach-row') : ''}`}
                      onClick={() => setSelectedQuery(q)}
                      data-testid={`my-query-row-${q.ticketId}`}
                    >
                      <TableCell className="font-mono text-xs font-medium">{q.ticketId}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{q.candidateName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{q.merittoCategory}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${q.priorityLevel === 'HIGH' ? 'priority-high' : q.priorityLevel === 'MEDIUM' ? 'priority-medium' : 'priority-low'}`}>
                          {q.priorityLevel}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{days}</TableCell>
                      <TableCell><StatusBadge status={q.internalStatus} /></TableCell>
                      <TableCell>
                        {slaBreach ? <Badge variant="destructive" className="text-[10px]">Breach</Badge> : <span className="text-[11px] text-green-600 dark:text-green-400">OK</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedQuery && <QueryDetailDrawer query={selectedQuery} onClose={() => setSelectedQuery(null)} />}
    </div>
  );
}
