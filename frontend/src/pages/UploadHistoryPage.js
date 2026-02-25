import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';

export default function UploadHistoryPage() {
  const { uploads, cycles } = useData();
  const [cycleFilter, setCycleFilter] = useState('all');

  const filtered = cycleFilter === 'all' ? uploads : uploads.filter(u => u.cycle === cycleFilter);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="upload-history-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload History</h1>
          <p className="text-sm text-muted-foreground mt-1">Record of all data uploads</p>
        </div>
        <Select value={cycleFilter} onValueChange={setCycleFilter}>
          <SelectTrigger className="w-48" data-testid="cycle-filter-select">
            <SelectValue placeholder="Filter by cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cycles</SelectItem>
            {cycles.map(c => (
              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <History className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No upload history found</p>
              <p className="text-xs mt-1">Upload data to see history here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">File Name</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Uploaded By</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Date & Time</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Records</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-bold">Cycle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(u => (
                  <TableRow key={u.id} data-testid={`upload-row-${u.id}`}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        {u.fileName}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.uploadedBy}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.dateTime ? format(new Date(u.dateTime), 'MMM d, yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{u.recordsImported}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{u.cycle}</Badge>
                    </TableCell>
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
