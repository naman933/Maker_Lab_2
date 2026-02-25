import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getDaysPending } from '@/services/priorityEngine';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function EscalationQueuePage() {
  const { queries, updateQuery } = useData();
  const { isAdmin } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolution, setResolution] = useState('');
  const [showResolve, setShowResolve] = useState(false);

  const escalated = useMemo(() =>
    queries.filter(q => q.escalationFlag && q.internalStatus !== 'Resolved-Escalation'),
    [queries]
  );

  const handleResolveEscalation = () => {
    if (!resolution.trim()) { toast.error('Please enter a resolution'); return; }
    updateQuery(selectedTicket.ticketId, {
      adminResolution: resolution.trim(),
      internalStatus: 'Resolved-Escalation',
      closureDate: new Date().toISOString(),
      tat: getDaysPending(selectedTicket.createdDate),
    });
    toast.success('Escalation resolved');
    setShowResolve(false);
    setSelectedTicket(null);
    setResolution('');
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="escalation-queue-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Escalation Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">{escalated.length} escalated queries pending resolution</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {escalated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No escalated queries</p>
              <p className="text-xs mt-1">Escalations will appear here when flagged</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Ticket ID</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Name</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Category</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Priority</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Escalation Reason</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Assigned</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Days</TableHead>
                  {isAdmin && <TableHead className="text-[11px] uppercase tracking-wider font-bold">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalated.map(q => (
                  <TableRow key={q.ticketId} data-testid={`escalation-row-${q.ticketId}`}>
                    <TableCell className="font-mono text-xs font-medium">{q.ticketId}</TableCell>
                    <TableCell className="text-sm">{q.candidateName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{q.merittoCategory}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${q.priorityLevel === 'HIGH' ? 'priority-high' : q.priorityLevel === 'MEDIUM' ? 'priority-medium' : 'priority-low'}`}>
                        {q.priorityLevel}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{q.escalationReason}</TableCell>
                    <TableCell className="text-xs">{q.assignedTo}</TableCell>
                    <TableCell className="text-sm font-medium">{getDaysPending(q.createdDate)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => { setSelectedTicket(q); setShowResolve(true); }}
                          data-testid={`resolve-escalation-btn-${q.ticketId}`}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />Resolve
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showResolve} onOpenChange={setShowResolve}>
        <AlertDialogContent data-testid="resolve-escalation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve Escalation</AlertDialogTitle>
            <AlertDialogDescription>
              Ticket #{selectedTicket?.ticketId} - {selectedTicket?.candidateName}
              <br />Reason: {selectedTicket?.escalationReason}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Enter admin resolution..."
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="min-h-[100px]"
            data-testid="admin-resolution-input"
          />
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="resolve-escalation-cancel-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolveEscalation} className="bg-green-600 hover:bg-green-700" data-testid="resolve-escalation-confirm-btn">
              Resolve Escalation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
