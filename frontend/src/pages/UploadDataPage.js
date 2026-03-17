import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle2, CalendarDays, User, Hash, Trash2, Plus, Settings2, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';

export default function UploadDataPage() {
  const { user } = useAuth();
  const { activeCycle, importQueries, uploads, queries, users, clearUploadedData, clearAllData, cycles, addCycle, setActiveCycle } = useData();
  const { isAdmin } = useAuth();
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastUpload, setLastUpload] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearType, setClearType] = useState('queries');
  const [showCreateCycle, setShowCreateCycle] = useState(false);
  const [newCycle, setNewCycle] = useState({ name: '', startDate: '', endDate: '' });
  const [showPoolConfig, setShowPoolConfig] = useState(false);

  // Assignment pool: members selected for query assignment
  const adcomMembers = users.filter(u => u.role === 'AdCom Member');
  const [poolOverrides, setPoolOverrides] = useState(null); // null = use defaults

  const getAssignmentPool = () => {
    if (poolOverrides) {
      return adcomMembers.filter(m => poolOverrides.includes(m.username));
    }
    return adcomMembers.filter(m => m.isAvailable !== false);
  };

  const assignmentPool = getAssignmentPool();

  const latestUpload = uploads.length > 0 ? uploads[uploads.length - 1] : null;

  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array', cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

          const mapped = rows.map(row => ({
            ticketId: String(row['Ticket Id'] || '').trim(),
            referenceTicketId: String(row['Reference Ticket Id'] || '').trim(),
            candidateName: String(row['Name'] || '').trim(),
            merittoCategory: String(row['Category'] || '').trim(),
            createdDate: row['Created Date'] instanceof Date
              ? row['Created Date'].toISOString()
              : String(row['Created Date'] || ''),
            merittoStatus: String(row['Status'] || '').trim(),
            description: String(row['Description'] || '').trim(),
            originalAssignedTo: String(row['Assigned To'] || '').trim(),
            updatedDate: row['Updated Date'] instanceof Date
              ? row['Updated Date'].toISOString()
              : String(row['Updated Date'] || ''),
            firstClosureDate: row['First Closure Date'] instanceof Date
              ? row['First Closure Date'].toISOString()
              : String(row['First Closure Date'] || ''),
            lastReplyBy: String(row['Last Reply By'] || '').trim(),
            leadId: String(row['Lead Id'] || '').trim(),
            feedbackScore: String(row['Feedback/Sentiment Score'] || '').trim(),
          })).filter(r => r.ticketId);

          resolve(mapped);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.xlsx')) {
      toast.error('Please upload an .xlsx file');
      return;
    }
    if (!activeCycle) {
      toast.error('No active admission cycle. Please set an active cycle first.');
      return;
    }

    setUploading(true);
    try {
      const records = await parseExcel(file);
      if (records.length === 0) {
        toast.error('No valid records found in file');
        setUploading(false);
        return;
      }
      const imported = importQueries(records, file.name, user.username, assignmentPool);
      setLastUpload({ fileName: file.name, imported, dateTime: new Date().toISOString() });
      toast.success(`Successfully imported ${imported} records`);
    } catch (err) {
      toast.error('Error parsing file: ' + err.message);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleClear = () => {
    if (clearType === 'all') {
      clearAllData();
      toast.success('All data cleared (queries, uploads, and cycles)');
    } else {
      clearUploadedData();
      toast.success('Queries and upload history cleared');
    }
    setLastUpload(null);
    setShowClearConfirm(false);
  };

  const handleCreateCycle = () => {
    if (!newCycle.name || !newCycle.startDate || !newCycle.endDate) {
      toast.error('Please fill all cycle fields');
      return;
    }
    addCycle(newCycle);
    toast.success('Cycle created successfully');
    setShowCreateCycle(false);
    setNewCycle({ name: '', startDate: '', endDate: '' });
  };

  const handleSetActiveCycle = (id) => {
    setActiveCycle(id);
    toast.success('Active cycle updated');
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="upload-data-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload Data</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage cycles and import query data</p>
        </div>
        <div className="flex items-center gap-2">
          {queries.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/10"
                onClick={() => { setClearType('queries'); setShowClearConfirm(true); }}
                data-testid="clear-queries-btn"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />Clear Queries ({queries.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/10"
                onClick={() => { setClearType('all'); setShowClearConfirm(true); }}
                data-testid="clear-all-data-btn"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />Clear All Data
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Step 1: Cycle Management */}
      <Card className={!activeCycle ? 'ring-2 ring-blue-500/50' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</div>
              <CardTitle className="text-sm font-semibold tracking-tight">Admission Cycle</CardTitle>
              {!activeCycle && <Badge variant="destructive" className="text-[10px] ml-2">Required</Badge>}
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowCreateCycle(true)} data-testid="inline-create-cycle-btn">
                <Plus className="w-3 h-3 mr-1" />New Cycle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {cycles.length === 0 ? (
            <div className="text-center py-4">
              <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No cycles yet. Create one to start uploading data.</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {cycles.map(c => (
                <button
                  key={c.id}
                  onClick={() => !c.isActive && isAdmin && handleSetActiveCycle(c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    c.isActive
                      ? 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300 ring-1 ring-blue-400/30'
                      : 'bg-card border-border text-muted-foreground hover:border-blue-200 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 cursor-pointer'
                  }`}
                  data-testid={`cycle-chip-${c.id}`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span className="font-medium text-xs">{c.name}</span>
                  {c.isActive && <Badge className="text-[9px] bg-blue-500 text-white h-4 px-1.5">Active</Badge>}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Info cards */}
      <div className="flex items-center gap-2 -mb-3">
        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</div>
        <span className="text-sm font-semibold tracking-tight">Upload & Status</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Active Cycle</p>
              <p className="text-sm font-semibold" data-testid="active-cycle-display">{activeCycle?.name || 'None set'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Last File</p>
              <p className="text-sm font-semibold truncate max-w-[140px]" data-testid="last-file-display">
                {lastUpload?.fileName || latestUpload?.fileName || 'No uploads yet'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Uploaded By</p>
              <p className="text-sm font-semibold" data-testid="uploaded-by-display">
                {lastUpload ? user?.username : (latestUpload?.uploadedBy || '-')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
              <Hash className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Records Imported</p>
              <p className="text-sm font-semibold" data-testid="records-imported-display">
                {lastUpload?.imported ?? latestUpload?.recordsImported ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 3: Assignment Pool */}
      {isAdmin && adcomMembers.length > 0 && (
        <Card data-testid="assignment-pool-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</div>
                <CardTitle className="text-sm font-semibold tracking-tight">Assignment Pool</CardTitle>
                <Badge variant="secondary" className="text-[10px] ml-1">{assignmentPool.length} of {adcomMembers.length} active</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  if (!poolOverrides) {
                    setPoolOverrides(adcomMembers.filter(m => m.isAvailable !== false).map(m => m.username));
                  }
                  setShowPoolConfig(!showPoolConfig);
                }}
                data-testid="configure-pool-btn"
              >
                <Settings2 className="w-3 h-3 mr-1" />{showPoolConfig ? 'Close' : 'Override'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Default pool display */}
            <div className="flex flex-wrap gap-2">
              {assignmentPool.map(m => (
                <div key={m.username} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20" data-testid={`pool-member-${m.username}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-xs font-medium">{m.name}</span>
                </div>
              ))}
              {adcomMembers.filter(m => !assignmentPool.find(p => p.username === m.username)).map(m => (
                <div key={m.username} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border opacity-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                  <span className="text-xs font-medium">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground">(excluded)</span>
                </div>
              ))}
            </div>

            {/* Override selector */}
            {showPoolConfig && poolOverrides && (
              <div className="mt-3 p-3 rounded-lg border border-dashed border-blue-300 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5 space-y-2" data-testid="pool-override-panel">
                <p className="text-xs text-muted-foreground font-medium">Override for this upload (does not change permanent availability):</p>
                {adcomMembers.map(m => (
                  <label key={m.username} className="flex items-center gap-2 cursor-pointer" data-testid={`pool-checkbox-${m.username}`}>
                    <Checkbox
                      checked={poolOverrides.includes(m.username)}
                      onCheckedChange={(checked) => {
                        setPoolOverrides(prev =>
                          checked ? [...prev, m.username] : prev.filter(u => u !== m.username)
                        );
                      }}
                    />
                    <span className="text-sm">{m.name}</span>
                    <span className="text-xs text-muted-foreground">({m.username})</span>
                    {m.isAvailable === false && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Normally unavailable</Badge>
                    )}
                  </label>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px]"
                    onClick={() => setPoolOverrides(adcomMembers.map(m => m.username))}
                    data-testid="select-all-pool"
                  >Select All</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px]"
                    onClick={() => { setPoolOverrides(null); setShowPoolConfig(false); }}
                    data-testid="reset-pool-btn"
                  >Reset to Default</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload zone */}
      <Card>
        <CardContent className="p-8">
          <div
            className={`upload-zone ${dragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            data-testid="upload-dropzone"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
              data-testid="upload-file-input"
            />
            <div className="flex flex-col items-center gap-3">
              {uploading ? (
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center animate-pulse">
                  <Upload className="w-6 h-6 text-blue-500" />
                </div>
              ) : lastUpload ? (
                <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="text-center">
                <p className="text-sm font-medium">
                  {uploading ? 'Processing...' : 'Drop your .xlsx file here or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Accepts Excel files with standard query columns
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear data confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent data-testid="clear-data-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {clearType === 'all' ? 'Clear All Data?' : 'Clear Uploaded Queries?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {clearType === 'all'
                ? 'This will permanently delete all queries, upload history, and cycles. You will need to recreate your admission cycles and re-upload data.'
                : 'This will permanently delete all queries and upload history. Your cycles and user data will be preserved. You can re-upload your data afterward.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="clear-data-cancel-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="clear-data-confirm-btn"
            >
              {clearType === 'all' ? 'Clear Everything' : 'Clear Queries'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Cycle Dialog */}
      <Dialog open={showCreateCycle} onOpenChange={setShowCreateCycle}>
        <DialogContent data-testid="inline-create-cycle-dialog">
          <DialogHeader>
            <DialogTitle>Create New Admission Cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Cycle Name *</Label>
              <Input value={newCycle.name} onChange={(e) => setNewCycle(p => ({ ...p, name: e.target.value }))} placeholder="e.g., MBA 2025-26 Batch 1" data-testid="inline-cycle-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Start Date *</Label>
                <Input type="date" value={newCycle.startDate} onChange={(e) => setNewCycle(p => ({ ...p, startDate: e.target.value }))} data-testid="inline-cycle-start-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">End Date *</Label>
                <Input type="date" value={newCycle.endDate} onChange={(e) => setNewCycle(p => ({ ...p, endDate: e.target.value }))} data-testid="inline-cycle-end-input" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCycle(false)} data-testid="inline-cycle-cancel-btn">Cancel</Button>
            <Button onClick={handleCreateCycle} className="bg-blue-500 hover:bg-blue-600 text-white" data-testid="inline-cycle-submit-btn">Create Cycle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
