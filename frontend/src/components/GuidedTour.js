import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload, List, UserCheck, AlertTriangle, Archive, Clock,
  BarChart3, FileText, Users, Brain, CheckCircle2, Ban,
  CalendarDays, FileSpreadsheet, ChevronRight, ChevronLeft,
  Rocket, ShieldCheck, Zap, Target, ArrowRight
} from 'lucide-react';

const TOUR_KEY = 'aqis_tour_completed';

const adminSteps = [
  {
    icon: Rocket,
    color: 'bg-blue-500',
    title: 'Welcome to AQIS',
    subtitle: 'Your Admissions Query Intelligence System',
    description: 'AQIS helps you manage admissions queries with AI-powered analysis, automated prioritization, and real-time SLA monitoring. This guide walks you through the complete workflow.',
    tips: [
      'The left sidebar is your main navigation',
      'All data is stored in your browser (localStorage)',
      'Dark/light theme toggle is in the top-right header',
    ],
    highlight: null,
  },
  {
    icon: CalendarDays,
    color: 'bg-indigo-500',
    title: 'Step 1: Create an Admission Cycle',
    subtitle: 'Upload Data page',
    description: 'Every query is tagged to an admission cycle. Before uploading any data, you need to create a cycle and set it as active.',
    tips: [
      'Go to Upload Data tab',
      'Click "+ New Cycle" to create a cycle (e.g., MBA 2025-26)',
      'Click the cycle chip to set it as Active',
      'The "Required" badge disappears once a cycle is active',
    ],
    highlight: '/upload',
  },
  {
    icon: Upload,
    color: 'bg-emerald-500',
    title: 'Step 2: Upload Query Data',
    subtitle: 'Upload Data page',
    description: 'Upload your Excel (.xlsx) file exported from Meritto. The system parses the data, skips duplicates, auto-assigns queries to team members, and calculates priority scores.',
    tips: [
      'Drag & drop or click to browse for the .xlsx file',
      'Queries are auto-assigned to the member with the fewest open queries',
      'Priority is calculated based on category weight + days pending',
      'Use "Clear Queries" to reset data and re-upload',
    ],
    highlight: '/upload',
  },
  {
    icon: List,
    color: 'bg-blue-500',
    title: 'Step 3: Review All Queries',
    subtitle: 'All Queries page (Admin only)',
    description: 'View the complete query table with powerful filters. Each row shows ticket ID, candidate name, category, priority badge, days pending, assigned member, status, and SLA status.',
    tips: [
      'Filter by Cycle, Member, Category, Priority, or Status',
      'Search by Ticket ID, Name, or Description',
      'RED rows indicate SLA breaches (2+ days pending)',
      'Click any row to open the Query Detail Drawer',
    ],
    highlight: '/all-queries',
  },
  {
    icon: Brain,
    color: 'bg-violet-500',
    title: 'Step 4: AI-Powered Analysis',
    subtitle: 'Query Detail Drawer',
    description: 'When you open a query, the AI automatically analyzes the candidate\'s message. It generates a summary, detects intent & urgency, and drafts a response you can copy and use.',
    tips: [
      'AI Summary: 2-3 sentence plain English summary',
      'Intent Detection: categorizes the query type (Payment, Eligibility, etc.)',
      'Urgency Assessment: High / Medium / Low with reasoning',
      'Draft Response: editable template you can copy to reply on Meritto',
    ],
    highlight: '/all-queries',
  },
  {
    icon: CheckCircle2,
    color: 'bg-green-500',
    title: 'Step 5: Take Action on Queries',
    subtitle: 'Query Detail Drawer',
    description: 'From the detail drawer, you can take three actions on each query. Choose the appropriate action based on the query content and AI analysis.',
    tips: [
      'Mark Resolved: closes the query and records TAT',
      'Flag to Admin: escalates with a reason to the Escalation Queue',
      'Mark Spam: excludes from SLA tracking and analytics',
      'All actions show toast confirmations',
    ],
    highlight: null,
  },
  {
    icon: AlertTriangle,
    color: 'bg-amber-500',
    title: 'Step 6: Handle Escalations',
    subtitle: 'Escalation Queue + Repository',
    description: 'When members flag queries, they appear in the Escalation Queue. As an admin, you review them, write a resolution, and close them. Resolved escalations are archived in the Repository.',
    tips: [
      'Escalation Queue: pending escalations needing admin resolution',
      'Click "Resolve" to write your resolution and close',
      'Escalation Repository: searchable archive of all resolutions',
      'Repository helps members find answers to similar queries',
    ],
    highlight: '/escalation-queue',
  },
  {
    icon: Clock,
    color: 'bg-red-500',
    title: 'Step 7: Monitor SLA Compliance',
    subtitle: 'SLA Monitor page',
    description: 'The SLA Monitor shows all non-resolved queries pending 2 or more days. It helps you identify bottlenecks and ensure timely responses.',
    tips: [
      'Summary cards: Total Breaches, Critical (3+ days), At Risk (2 days)',
      'Critical queries get a deeper red highlight',
      'Focus on resolving critical queries first',
      'Resolved and Spam queries are excluded from SLA tracking',
    ],
    highlight: '/sla-monitor',
  },
  {
    icon: BarChart3,
    color: 'bg-cyan-500',
    title: 'Step 8: Analytics & Reports',
    subtitle: 'Analytics + Reports pages',
    description: 'Track performance with KPI cards, category distribution charts, and member workload visualization. Export data as CSV reports for offline analysis.',
    tips: [
      'Analytics: Active queries, High priority count, SLA breaches, Avg TAT, Escalation rate',
      'Charts: Category donut chart + Member workload bar chart',
      'Reports: 6 export options (Open, Closed, SLA, Performance, Escalations, Full Summary)',
      'Filter analytics by cycle for period-specific insights',
    ],
    highlight: '/analytics',
  },
  {
    icon: Users,
    color: 'bg-pink-500',
    title: 'Step 9: Manage Your Team',
    subtitle: 'User Management page (Admin only)',
    description: 'Add new team members, control admin access, and reset passwords. AdCom Members can be granted temporary admin access via the toggle.',
    tips: [
      'Add User: create new accounts with name, email, username, and role',
      'Admin Access toggle: grant/revoke admin privileges for AdCom Members',
      'Reset Password: update passwords for any team member',
      'Two roles: Admin (full access) and AdCom Member (assigned queries only)',
    ],
    highlight: '/user-management',
  },
];

const memberSteps = [
  {
    icon: Rocket,
    color: 'bg-blue-500',
    title: 'Welcome to AQIS',
    subtitle: 'Your Query Management Dashboard',
    description: 'AQIS helps you manage your assigned admissions queries efficiently with AI-powered analysis. This guide walks you through your workflow.',
    tips: [
      'The left sidebar is your main navigation',
      'Your admin has uploaded query data and assigned queries to you',
      'Dark/light theme toggle is in the top-right header',
    ],
    highlight: null,
  },
  {
    icon: UserCheck,
    color: 'bg-blue-500',
    title: 'Step 1: View Your Queries',
    subtitle: 'My Assigned Queries page',
    description: 'This is your primary workspace. It shows all queries assigned to you with their priority, status, days pending, and SLA status.',
    tips: [
      'Filter by status to focus on New or Open queries first',
      'Search by Ticket ID or candidate name',
      'RED rows indicate SLA breaches - prioritize these',
      'Click any row to open the detail drawer',
    ],
    highlight: '/my-queries',
  },
  {
    icon: Brain,
    color: 'bg-violet-500',
    title: 'Step 2: Use AI Analysis',
    subtitle: 'Query Detail Drawer',
    description: 'When you open a query, the AI automatically analyzes the candidate\'s message. Use the AI insights to understand the query faster and draft your response.',
    tips: [
      'AI Summary: quick overview of what the candidate needs',
      'Intent & Urgency: helps you prioritize your response',
      'Draft Response: pre-written reply you can edit and copy',
      'Click "Copy" to copy the draft, then reply on Meritto',
    ],
    highlight: '/my-queries',
  },
  {
    icon: Target,
    color: 'bg-green-500',
    title: 'Step 3: Take Action',
    subtitle: 'Query Detail Drawer',
    description: 'After reviewing the query and AI analysis, take the appropriate action.',
    tips: [
      'Mark Resolved: when you have responded to the candidate',
      'Flag to Admin: for complex queries needing admin intervention',
      'Mark Spam: for irrelevant or junk queries',
      'Provide a clear reason when escalating to admin',
    ],
    highlight: null,
  },
  {
    icon: Clock,
    color: 'bg-amber-500',
    title: 'Step 4: Stay on Top of SLA',
    subtitle: 'SLA Monitor page',
    description: 'Check the SLA Monitor regularly to ensure no query breaches the 2-day threshold. Critical queries (3+ days) need immediate attention.',
    tips: [
      'Review SLA Monitor daily to catch at-risk queries',
      'Aim to resolve queries within 1 day to stay well within SLA',
      'Escalate quickly if you cannot resolve within the timeline',
    ],
    highlight: '/sla-monitor',
  },
  {
    icon: BarChart3,
    color: 'bg-cyan-500',
    title: 'Step 5: Track Your Performance',
    subtitle: 'Analytics page',
    description: 'The Analytics page shows your personal KPIs: active queries, high priority count, SLA breaches, average TAT, and escalation rate.',
    tips: [
      'Aim for low Avg TAT (turnaround time)',
      'Monitor your SLA breach count - keep it at zero',
      'Check the Escalation Repository for solutions to similar past queries',
    ],
    highlight: '/analytics',
  },
];

export default function GuidedTour({ open, onClose }) {
  const { isAdmin } = useAuth();
  const [step, setStep] = useState(0);
  const steps = isAdmin ? adminSteps : memberSteps;
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const handleFinish = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => handleFinish()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0" data-testid="guided-tour-dialog">
        {/* Header gradient */}
        <div className={`${current.color} px-6 py-8 text-white relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -right-2 top-8 w-20 h-20 rounded-full bg-white/5" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <current.icon className="w-5 h-5 text-white" />
              </div>
              {!isFirst && (
                <span className="text-xs font-semibold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  {step} of {steps.length - 1}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight">{current.title}</h2>
            {current.subtitle && (
              <p className="text-sm text-white/70 mt-1 flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3" /> {current.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm leading-relaxed text-foreground/90">{current.description}</p>

          {current.tips && current.tips.length > 0 && (
            <div className="space-y-2">
              {current.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{i + 1}</span>
                  </div>
                  <span className="text-muted-foreground leading-snug">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? 'bg-blue-500 w-5' : i < step ? 'bg-blue-300 dark:bg-blue-700' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                data-testid={`tour-dot-${i}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {isFirst ? (
              <Button variant="ghost" size="sm" onClick={handleFinish} className="text-xs text-muted-foreground" data-testid="tour-skip-btn">
                Skip Tour
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="text-xs" data-testid="tour-prev-btn">
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={handleFinish} className="bg-blue-500 hover:bg-blue-600 text-white text-xs" data-testid="tour-finish-btn">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Got it!
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(s => s + 1)} className="bg-blue-500 hover:bg-blue-600 text-white text-xs" data-testid="tour-next-btn">
                {isFirst ? 'Start Tour' : 'Next'} <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { TOUR_KEY };
