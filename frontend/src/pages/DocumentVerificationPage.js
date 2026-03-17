import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import Papa from 'papaparse';
import {
  FileSpreadsheet, FileText, Upload, CheckCircle2, AlertTriangle,
  XCircle, HelpCircle, Loader2, Download, ChevronDown, ChevronRight,
  ShieldCheck, FileWarning, Search
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';
const STORAGE_KEY = 'aqis_docverify_results';

const StatusBadge = ({ status }) => {
  const map = {
    VERIFIED: { cls: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400', icon: CheckCircle2 },
    NEEDS_REVIEW: { cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400', icon: HelpCircle },
    DISCREPANCY: { cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400', icon: XCircle },
    MISSING_DOCUMENT: { cls: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400', icon: FileWarning },
  };
  const s = map[status] || map.NEEDS_REVIEW;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={`text-[11px] gap-1 ${s.cls}`}>
      <Icon className="w-3 h-3" />{status.replace('_', ' ')}
    </Badge>
  );
};

const FieldStatus = ({ val }) => {
  if (val === 'match') return <span className="text-green-600 dark:text-green-400 text-xs font-medium">Match</span>;
  if (val === 'mismatch') return <span className="text-red-600 dark:text-red-400 text-xs font-bold">Mismatch</span>;
  if (val === 'not_in_pdf') return <span className="text-amber-600 dark:text-amber-400 text-xs">Not in PDF</span>;
  if (val === 'not_in_form') return <span className="text-blue-600 dark:text-blue-400 text-xs">Not in Form</span>;
  return <span className="text-gray-400 text-xs">-</span>;
};

export default function DocumentVerificationPage() {
  const [csvFile, setCsvFile] = useState(null);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  });
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleVerify = async () => {
    if (!csvFile) { toast.error('Upload the candidate data CSV/Excel file'); return; }
    if (pdfFiles.length === 0) { toast.error('Upload at least one PDF scorecard'); return; }

    setVerifying(true);
    try {
      const formData = new FormData();
      formData.append('formdata_file', csvFile);
      pdfFiles.forEach(f => formData.append('pdf_files', f));

      const resp = await fetch(`${API}/api/docverify/verify`, { method: 'POST', body: formData });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${resp.status}`);
      }
      const result = await resp.json();
      setData(result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      toast.success(`Verification complete: ${result.summary.total} candidates processed`);
    } catch (err) {
      toast.error('Verification failed: ' + err.message);
    }
    setVerifying(false);
  };

  const exportCSV = () => {
    if (!data?.results) return;
    const rows = data.results.map(r => ({
      'Application ID': r.application_id,
      Name: r.name,
      Status: r.status,
      'CAT Reg No': r.cat_reg_no_form,
      'PDF File': r.pdf_filename || 'Missing',
      'CAT ID': r.fields?.cat_reg_no || '-',
      'Date': r.fields?.date_of_test || '-',
      VARC: r.fields?.varc || '-',
      DILR: r.fields?.dilr || '-',
      QA: r.fields?.qa || '-',
      Overall: r.fields?.overall || '-',
      Issues: (r.issues || []).join('; '),
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'verification_report.csv';
    link.click();
    toast.success('Report exported');
  };

  const exportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'verification_report.json';
    link.click();
    toast.success('JSON exported');
  };

  const clearResults = () => {
    setData(null);
    localStorage.removeItem(STORAGE_KEY);
    setCsvFile(null);
    setPdfFiles([]);
    toast.success('Results cleared');
  };

  const filtered = data?.results?.filter(r => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return r.name?.toLowerCase().includes(s) || r.application_id?.toLowerCase().includes(s) || r.cat_reg_no_form?.toLowerCase().includes(s) || r.status?.toLowerCase().includes(s);
  }) || [];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="doc-verification-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Document Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">Bulk-verify CAT scorecards against candidate form data</p>
        </div>
        {data && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} data-testid="export-csv-btn"><Download className="w-3.5 h-3.5 mr-1.5" />CSV</Button>
            <Button variant="outline" size="sm" onClick={exportJSON} data-testid="export-json-btn"><Download className="w-3.5 h-3.5 mr-1.5" />JSON</Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/20" onClick={clearResults} data-testid="clear-results-btn">Clear</Button>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CSV Upload */}
        <Card className={!csvFile ? 'ring-1 ring-blue-500/30' : 'ring-1 ring-green-500/30'}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</div>
              <CardTitle className="text-sm font-semibold">Candidate Data (Form A)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <label className="upload-zone block cursor-pointer" data-testid="csv-upload-zone">
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { setCsvFile(e.target.files[0]); setData(null); }} data-testid="csv-file-input" />
              <div className="flex flex-col items-center gap-2 py-2">
                {csvFile ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{csvFile.name}</p>
                    <p className="text-[11px] text-muted-foreground">{(csvFile.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Upload CSV or Excel file</p>
                    <p className="text-[11px] text-muted-foreground">Columns: Name, CAT Reg No, Percentiles</p>
                  </>
                )}
              </div>
            </label>
          </CardContent>
        </Card>

        {/* PDF Upload */}
        <Card className={pdfFiles.length === 0 ? 'ring-1 ring-blue-500/30' : 'ring-1 ring-green-500/30'}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</div>
              <CardTitle className="text-sm font-semibold">CAT Scorecard PDFs</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <label className="upload-zone block cursor-pointer" data-testid="pdf-upload-zone">
              <input type="file" accept=".pdf" multiple className="hidden" onChange={(e) => { setPdfFiles(Array.from(e.target.files)); setData(null); }} data-testid="pdf-file-input" />
              <div className="flex flex-col items-center gap-2 py-2">
                {pdfFiles.length > 0 ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{pdfFiles.length} PDF{pdfFiles.length > 1 ? 's' : ''} selected</p>
                    <p className="text-[11px] text-muted-foreground">{pdfFiles.map(f => f.name).slice(0, 3).join(', ')}{pdfFiles.length > 3 ? ` +${pdfFiles.length - 3} more` : ''}</p>
                  </>
                ) : (
                  <>
                    <FileText className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Upload PDF scorecards</p>
                    <p className="text-[11px] text-muted-foreground">Select multiple files at once</p>
                  </>
                )}
              </div>
            </label>
          </CardContent>
        </Card>
      </div>

      {/* Verify Button */}
      <div className="flex justify-center">
        <Button onClick={handleVerify} disabled={verifying || !csvFile || pdfFiles.length === 0}
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 h-11" data-testid="run-verification-btn">
          {verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing {pdfFiles.length} documents...</> : <><ShieldCheck className="w-4 h-4 mr-2" />Run Verification</>}
        </Button>
      </div>

      {/* Results */}
      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="verification-summary">
            {[
              { label: 'Total', val: data.summary.total, icon: FileText, color: 'text-foreground', bg: 'bg-muted' },
              { label: 'Verified', val: data.summary.verified, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
              { label: 'Needs Review', val: data.summary.needs_review, icon: HelpCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
              { label: 'Discrepancy', val: data.summary.discrepancy, icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
              { label: 'Missing Doc', val: data.summary.missing_document, icon: FileWarning, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-500/10' },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center`}>
                    <k.icon className={`w-4 h-4 ${k.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{k.label}</p>
                    <p className={`text-xl font-bold ${k.color}`} data-testid={`summary-${k.label.toLowerCase().replace(/\s/g, '-')}`}>{k.val}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input className="w-full pl-9 h-9 text-sm rounded-md border bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Search by name, application ID, CAT reg no, or status..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="verification-search" />
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold w-8"></TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">App ID</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">Name</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">CAT Reg No</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">PDF</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">CAT ID</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">Date</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">VARC</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">DILR</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">QA</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">Overall</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <>
                      <TableRow
                        key={`row-${i}`}
                        className={`cursor-pointer ${r.status === 'DISCREPANCY' ? 'sla-breach-row' : r.status === 'MISSING_DOCUMENT' ? 'bg-gray-50/50 dark:bg-gray-500/5' : ''}`}
                        onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                        data-testid={`verify-row-${i}`}
                      >
                        <TableCell className="w-8 p-2">
                          {expandedRow === i ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{r.application_id || '-'}</TableCell>
                        <TableCell className="text-sm font-medium max-w-[140px] truncate">{r.name || '-'}</TableCell>
                        <TableCell className="text-xs font-mono">{r.cat_reg_no_form || '-'}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-[11px] text-muted-foreground max-w-[100px] truncate">{r.pdf_filename || '-'}</TableCell>
                        <TableCell><FieldStatus val={r.fields?.cat_reg_no} /></TableCell>
                        <TableCell><FieldStatus val={r.fields?.date_of_test} /></TableCell>
                        <TableCell><FieldStatus val={r.fields?.varc} /></TableCell>
                        <TableCell><FieldStatus val={r.fields?.dilr} /></TableCell>
                        <TableCell><FieldStatus val={r.fields?.qa} /></TableCell>
                        <TableCell><FieldStatus val={r.fields?.overall} /></TableCell>
                      </TableRow>
                      {expandedRow === i && (
                        <TableRow key={`detail-${i}`}>
                          <TableCell colSpan={12} className="bg-muted/20 p-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-muted-foreground">Match Method:</span>
                                <Badge variant="outline" className="text-[10px]">{r.match_method || 'None'}</Badge>
                                <span className="font-semibold text-muted-foreground ml-3">PDF Confidence:</span>
                                <Badge variant="outline" className={`text-[10px] ${r.pdf_confidence === 'high' ? 'text-green-600' : r.pdf_confidence === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>{r.pdf_confidence || '-'}</Badge>
                              </div>
                              {r.issues && r.issues.length > 0 && (
                                <div>
                                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">Issues:</span>
                                  <ul className="list-disc list-inside text-xs text-muted-foreground mt-1 space-y-0.5">
                                    {r.issues.map((issue, j) => <li key={j}>{issue}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
