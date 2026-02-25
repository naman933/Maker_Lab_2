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
import { Search, List, Filter } from 'lucide-react';

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

export default function AllQueriesPage() {
  const { queries, cycles, users } = useData();
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ cycle: 'all', member: 'all', category: 'all', priority: 'all', status: 'all' });

  const categories = useMemo(() => [...new Set(queries.map(q => q.merittoCategory).filter(Boolean))], [queries]);
  const members = useMemo(() => users.filter(u => u.role === 'AdCom Member'), [users]);
  const statuses = ['New', 'Open', 'In Progress', 'Resolved', 'Spam', 'Resolved-Escalation'];

  const filtered = useMemo(() => {
    return queries.filter(q => {
      if (filters.cycle !== 'all' && q.cycle !== filters.cycle) return false;
      if (filters.member !== 'all' && q.assignedTo !== filters.member) return false;
      if (filters.category !== 'all' && q.merittoCategory !== filters.category) return false;
      if (filters.priority !== 'all' && q.priorityLevel !== filters.priority) return false;
      if (filters.status !== 'all' && q.internalStatus !== filters.status) return false;
      if (search) {
        const s = search.toLowerCase();
        return q.ticketId?.toLowerCase().includes(s) || q.candidateName?.toLowerCase().includes(s) || q.description?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [queries, filters, search]);

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-6 animate-fade-in" data-testid="all-queries-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">All Queries</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} queries found</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Ticket ID, Name, or Description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
                data-testid="query-search-input"
              />
            </div>
            <Select value={filters.cycle} onValueChange={(v) => setFilter('cycle', v)}>
              <SelectTrigger className="w-36" data-testid="filter-cycle"><SelectValue placeholder="Cycle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                {cycles.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.member} onValueChange={(v) => setFilter('member', v)}>
              <SelectTrigger className="w-36" data-testid="filter-member"><SelectValue placeholder="Member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {members.map(m => <SelectItem key={m.username} value={m.username}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={(v) => setFilter('category', v)}>
              <SelectTrigger className="w-36" data-testid="filter-category"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.priority} onValueChange={(v) => setFilter('priority', v)}>
              <SelectTrigger className="w-32" data-testid="filter-priority"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilter('status', v)}>
              <SelectTrigger className="w-36" data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <List className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No queries found</p>
              <p className="text-xs mt-1">Upload data or adjust filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Ticket ID</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Candidate</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Category</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">AI Category</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Priority</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Days</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Assigned To</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Status</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(q => {
                  const days = getDaysPending(q.createdDate);
                  const slaBreach = days >= 2 && q.internalStatus !== 'Resolved' && q.internalStatus !== 'Spam' && q.internalStatus !== 'Resolved-Escalation';
                  const critical = days >= 3;
                  return (
                    <TableRow
                      key={q.ticketId}
                      className={`cursor-pointer ${critical && slaBreach ? 'sla-critical-row' : slaBreach ? 'sla-breach-row' : ''}`}
                      onClick={() => setSelectedQuery(q)}
                      data-testid={`query-row-${q.ticketId}`}
                    >
                      <TableCell className="font-mono text-xs font-medium">{q.ticketId}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{q.candidateName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{q.merittoCategory}</TableCell>
                      <TableCell className="text-xs">{q.aiCategory || '-'}</TableCell>
                      <TableCell><PriorityBadge level={q.priorityLevel} /></TableCell>
                      <TableCell className="text-sm font-medium">{days}</TableCell>
                      <TableCell className="text-xs">{q.assignedTo || '-'}</TableCell>
                      <TableCell><StatusBadge status={q.internalStatus} /></TableCell>
                      <TableCell>
                        {slaBreach ? (
                          <Badge variant="destructive" className="text-[10px]">Breach</Badge>
                        ) : (
                          <span className="text-[11px] text-green-600 dark:text-green-400">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedQuery && (
        <QueryDetailDrawer
          query={selectedQuery}
          onClose={() => setSelectedQuery(null)}
        />
      )}
    </div>
  );
}
