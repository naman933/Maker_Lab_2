import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDaysPending } from '@/services/priorityEngine';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  CheckCircle2, AlertTriangle, Ban, Copy, RefreshCw, Loader2,
  Brain, Tag, Zap, MessageSquare, CalendarDays, Clock
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function QueryDetailDrawer({ query, onClose }) {
  const { updateQuery, queries } = useData();
  const { isAdmin } = useAuth();
  const [currentQuery, setCurrentQuery] = useState(query);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [draftResponse, setDraftResponse] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [showSpamConfirm, setShowSpamConfirm] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);

  // Sync with latest query data
  useEffect(() => {
    const fresh = queries.find(q => q.ticketId === query.ticketId);
    if (fresh) {
      setCurrentQuery(fresh);
      if (fresh.aiDraftResponse) setDraftResponse(fresh.aiDraftResponse);
    }
  }, [queries, query.ticketId]);

  // Auto-trigger AI analysis
  useEffect(() => {
    if (!currentQuery.aiSummary && currentQuery.description) {
      fetchAI();
    } else if (currentQuery.aiDraftResponse) {
      setDraftResponse(currentQuery.aiDraftResponse);
    }
  }, [currentQuery.ticketId]);

  const fetchAI = async () => {
    setAiLoading(true);
    setAiError(false);
    try {
      const resp = await fetch(`${API}/api/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: currentQuery.description }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      const updates = {
        aiSummary: data.summary || '',
        aiCategory: data.intent || '',
        aiIntentTags: data.intent || '',
        aiUrgencyTag: data.urgency || '',
        aiDraftResponse: data.draftResponse || '',
      };

      // Bump priority if AI urgency is High and current is LOW
      if (data.urgency === 'High' && currentQuery.priorityLevel === 'LOW') {
        updates.priorityLevel = 'MEDIUM';
        updates.priorityScore = (currentQuery.priorityScore || 0) + 2;
      }

      updateQuery(currentQuery.ticketId, updates);
      setDraftResponse(data.draftResponse || '');
      setCurrentQuery(prev => ({ ...prev, ...updates }));
    } catch (err) {
      setAiError(true);
    }
    setAiLoading(false);
  };

  const handleResolve = () => {
    const now = new Date().toISOString();
    const created = new Date(currentQuery.createdDate);
    const tat = Math.max(0, Math.floor((new Date(now) - created) / (1000 * 60 * 60 * 24)));
    updateQuery(currentQuery.ticketId, { internalStatus: 'Resolved', closureDate: now, tat });
    toast.success('Query marked as resolved');
    onClose();
  };

  const handleSpam = () => {
    updateQuery(currentQuery.ticketId, { internalStatus: 'Spam' });
    toast.success('Query marked as spam');
    setShowSpamConfirm(false);
    onClose();
  };

  const handleEscalate = () => {
    if (!escalationReason.trim()) { toast.error('Please enter an escalation reason'); return; }
    updateQuery(currentQuery.ticketId, { escalationFlag: true, escalationReason: escalationReason.trim(), internalStatus: 'In Progress' });
    toast.success('Query flagged to admin');
    setShowEscalateDialog(false);
    onClose();
  };

  const copyDraft = () => {
    navigator.clipboard.writeText(draftResponse);
    toast.success('Draft copied to clipboard');
  };

  // Similarity suggestions
  const suggestions = useMemo(() => {
    if (!currentQuery.description) return { escalation: [], resolved: [] };
    const keywords = currentQuery.description.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const escalation = queries.filter(q =>
      q.ticketId !== currentQuery.ticketId && q.internalStatus === 'Resolved-Escalation' && q.adminResolution
    ).filter(q => keywords.some(k => q.description?.toLowerCase().includes(k) || q.adminResolution?.toLowerCase().includes(k))).slice(0, 3);
    const resolved = queries.filter(q =>
      q.ticketId !== currentQuery.ticketId && q.internalStatus === 'Resolved'
    ).filter(q => keywords.some(k => q.description?.toLowerCase().includes(k))).slice(0, 3);
    return { escalation, resolved };
  }, [currentQuery, queries]);

  const days = getDaysPending(currentQuery.createdDate);
  const isResolved = ['Resolved', 'Spam', 'Resolved-Escalation'].includes(currentQuery.internalStatus);

  return (
    <>
      <Sheet open={true} onOpenChange={() => onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col" data-testid="query-detail-drawer">
          <SheetHeader className="p-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg font-semibold tracking-tight" data-testid="drawer-ticket-id">
                  Ticket #{currentQuery.ticketId}
                </SheetTitle>
                <SheetDescription className="text-sm mt-1">{currentQuery.candidateName}</SheetDescription>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${currentQuery.priorityLevel === 'HIGH' ? 'priority-high' : currentQuery.priorityLevel === 'MEDIUM' ? 'priority-medium' : 'priority-low'}`}>
                {currentQuery.priorityLevel}
              </span>
            </div>
            {/* Meta row */}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{currentQuery.merittoCategory || 'Uncategorized'}</span>
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{currentQuery.createdDate ? new Date(currentQuery.createdDate).toLocaleDateString() : '-'}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{days} days pending</span>
              <Badge variant="outline" className="text-[10px]">{currentQuery.internalStatus}</Badge>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Description</h3>
                <p className="text-sm leading-relaxed bg-muted/30 p-4 rounded-lg" data-testid="query-description">{currentQuery.description || 'No description available'}</p>
              </div>

              <Separator />

              {/* AI Panel */}
              <div className="space-y-4">
                <h3 className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5" /> AI Analysis
                </h3>

                {aiLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground" data-testid="ai-loading">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm">Analyzing query...</span>
                  </div>
                ) : aiError ? (
                  <div className="text-center py-6" data-testid="ai-error">
                    <p className="text-sm text-muted-foreground mb-3">AI analysis unavailable.</p>
                    <Button variant="outline" size="sm" onClick={fetchAI} data-testid="ai-retry-btn">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Card 1 - AI Summary */}
                    <div className="ai-card rounded-lg p-4" data-testid="ai-summary-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">AI-Generated Summary</span>
                        {currentQuery.aiIntentTags && (
                          <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" data-testid="ai-intent-badge">
                            {currentQuery.aiIntentTags}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed" data-testid="ai-summary-text">{currentQuery.aiSummary || 'No AI summary yet'}</p>
                    </div>

                    {/* Card 2 - Intent & Urgency */}
                    <div className="ai-card rounded-lg p-4" data-testid="ai-intent-urgency-card">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Detected Intent & Urgency</span>
                      <div className="flex items-center gap-2 mt-2">
                        {currentQuery.aiIntentTags && (
                          <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-500/30 dark:text-blue-400" data-testid="ai-intent-tag">
                            <Zap className="w-3 h-3 mr-1" />{currentQuery.aiIntentTags}
                          </Badge>
                        )}
                        {currentQuery.aiUrgencyTag && (
                          <Badge className={`text-xs ${currentQuery.aiUrgencyTag === 'High' ? 'priority-high' : currentQuery.aiUrgencyTag === 'Medium' ? 'priority-medium' : 'priority-low'}`} data-testid="ai-urgency-tag">
                            {currentQuery.aiUrgencyTag}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Card 3 - Draft Response */}
                    <div className="ai-card rounded-lg p-4" data-testid="ai-draft-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">AI-Suggested Response Draft</span>
                        <Button variant="ghost" size="sm" onClick={copyDraft} className="h-7 text-xs" data-testid="copy-draft-btn">
                          <Copy className="w-3 h-3 mr-1" />Copy
                        </Button>
                      </div>
                      <Textarea
                        value={draftResponse}
                        onChange={(e) => setDraftResponse(e.target.value)}
                        className="min-h-[80px] text-sm bg-white/50 dark:bg-white/5"
                        data-testid="ai-draft-textarea"
                      />
                      <p className="text-[11px] text-muted-foreground mt-2">Edit before using. Copy Ticket ID and reply on Meritto.</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Similarity Suggestions */}
              {(suggestions.escalation.length > 0 || suggestions.resolved.length > 0) && (
                <div className="space-y-3">
                  <h3 className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Similar Queries</h3>
                  {suggestions.escalation.map(s => (
                    <div key={s.ticketId} className="bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 rounded-lg p-3" data-testid={`similar-escalation-${s.ticketId}`}>
                      <p className="text-xs font-medium text-purple-700 dark:text-purple-400">Escalation #{s.ticketId}</p>
                      <p className="text-xs text-muted-foreground mt-1">Resolution: {s.adminResolution}</p>
                    </div>
                  ))}
                  {suggestions.resolved.map(s => (
                    <div key={s.ticketId} className="bg-muted/30 border rounded-lg p-3" data-testid={`similar-resolved-${s.ticketId}`}>
                      <p className="text-xs font-medium">Resolved #{s.ticketId}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{s.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {!isResolved && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleResolve} className="bg-green-600 hover:bg-green-700 text-white" data-testid="resolve-query-btn">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />Mark Resolved
                  </Button>
                  <Button variant="outline" onClick={() => setShowEscalateDialog(true)} className="text-amber-700 border-amber-200 hover:bg-amber-50" data-testid="escalate-query-btn">
                    <AlertTriangle className="w-4 h-4 mr-1.5" />Flag to Admin
                  </Button>
                  <Button variant="outline" onClick={() => setShowSpamConfirm(true)} className="text-gray-500 border-gray-200 hover:bg-gray-50" data-testid="spam-query-btn">
                    <Ban className="w-4 h-4 mr-1.5" />Mark Spam
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Spam confirmation */}
      <AlertDialog open={showSpamConfirm} onOpenChange={setShowSpamConfirm}>
        <AlertDialogContent data-testid="spam-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Spam?</AlertDialogTitle>
            <AlertDialogDescription>This query will be excluded from SLA tracking and analytics.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="spam-cancel-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSpam} className="bg-red-600 hover:bg-red-700" data-testid="spam-confirm-btn">Confirm Spam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Escalation dialog */}
      <AlertDialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
        <AlertDialogContent data-testid="escalate-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Flag to Admin</AlertDialogTitle>
            <AlertDialogDescription>Provide a reason for escalation.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Enter escalation reason..."
            value={escalationReason}
            onChange={(e) => setEscalationReason(e.target.value)}
            className="min-h-[80px]"
            data-testid="escalation-reason-input"
          />
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="escalate-cancel-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEscalate} className="bg-amber-600 hover:bg-amber-700" data-testid="escalate-confirm-btn">Submit Escalation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
