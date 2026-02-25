import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle2, CalendarDays, User, Hash, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function UploadDataPage() {
  const { user } = useAuth();
  const { activeCycle, importQueries, uploads, queries, clearUploadedData, clearAllData } = useData();
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastUpload, setLastUpload] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearType, setClearType] = useState('queries'); // 'queries' or 'all'

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
      const imported = importQueries(records, file.name, user.username);
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

  return (
    <div className="space-y-6 animate-fade-in" data-testid="upload-data-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload Data</h1>
          <p className="text-sm text-muted-foreground mt-1">Import query data from Excel files</p>
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

      {/* Info cards */}
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
    </div>
  );
}
