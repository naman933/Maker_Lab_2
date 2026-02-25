import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Archive, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function EscalationRepositoryPage() {
  const { queries, cycles } = useData();
  const [search, setSearch] = useState('');
  const [cycleFilter, setCycleFilter] = useState('all');

  const resolved = useMemo(() =>
    queries.filter(q => q.internalStatus === 'Resolved-Escalation').filter(q => {
      if (cycleFilter !== 'all' && q.cycle !== cycleFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return q.ticketId?.toLowerCase().includes(s) ||
          q.candidateName?.toLowerCase().includes(s) ||
          q.escalationReason?.toLowerCase().includes(s) ||
          q.adminResolution?.toLowerCase().includes(s);
      }
      return true;
    }),
    [queries, search, cycleFilter]
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="escalation-repository-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Escalation Repository</h1>
        <p className="text-sm text-muted-foreground mt-1">Archive of resolved escalations</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by keyword..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" data-testid="escalation-search-input" />
            </div>
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="w-48" data-testid="escalation-cycle-filter">
                <SelectValue placeholder="Filter by cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cycles</SelectItem>
                {cycles.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {resolved.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Archive className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No resolved escalations</p>
              <p className="text-xs mt-1">Resolved escalations will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Ticket ID</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Name</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Category</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Escalation Reason</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Admin Resolution</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Resolved Date</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Cycle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolved.map(q => (
                  <TableRow key={q.ticketId} data-testid={`repo-row-${q.ticketId}`}>
                    <TableCell className="font-mono text-xs font-medium">{q.ticketId}</TableCell>
                    <TableCell className="text-sm">{q.candidateName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{q.merittoCategory}</TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{q.escalationReason}</TableCell>
                    <TableCell className="text-xs max-w-[220px] truncate">{q.adminResolution}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {q.closureDate ? format(new Date(q.closureDate), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{q.cycle}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
