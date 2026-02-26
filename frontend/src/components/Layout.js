import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTheme } from 'next-themes';
import { Badge } from '@/components/ui/badge';
import {
  Upload, History, List, UserCheck, AlertTriangle, Archive,
  Clock, BarChart3, FileText, Users, Settings, ChevronDown,
  ChevronRight, LogOut, Sun, Moon, FileSpreadsheet, Menu, X,
  ShieldCheck, CalendarDays, Folder, Briefcase
} from 'lucide-react';

const navSections = [
  {
    label: 'Query Management',
    collapsible: true,
    items: [
      { path: '/upload', label: 'Upload Data', icon: Upload },
      { path: '/upload-history', label: 'Upload History', icon: History },
      { path: '/all-queries', label: 'All Queries', icon: List, adminOnly: true },
      { path: '/my-queries', label: 'My Assigned Queries', icon: UserCheck },
      { path: '/escalation-queue', label: 'Escalation Queue', icon: AlertTriangle },
      { path: '/escalation-repository', label: 'Escalation Repository', icon: Archive },
      { path: '/sla-monitor', label: 'SLA Monitor', icon: Clock },
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/reports', label: 'Reports', icon: FileText, adminOnly: true },
    ],
  },
  { label: 'Document Verification', icon: FileSpreadsheet, disabled: true },
  { label: 'Interview Logistics', icon: Briefcase, disabled: true },
];

const adminItems = [
  { path: '/cycle-management', label: 'Cycle Management', icon: CalendarDays },
  { path: '/user-management', label: 'User Management', icon: Users },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { activeCycle } = useData();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSection = (label) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const renderSidebar = () => (
    <div className="flex flex-col h-full" data-testid="sidebar">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <img src="/spjimr-logo.png" alt="SPJIMR" className="h-9 w-auto object-contain brightness-0 invert opacity-90" data-testid="sidebar-spjimr-logo" />
          <div className="border-l border-white/20 pl-2.5">
            <h1 className="text-sm font-bold text-white tracking-tight">AQIS</h1>
            <p className="text-[9px] uppercase tracking-wider text-slate-400">Admissions Intel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1">
        {navSections.map((section) => {
          if (section.disabled) {
            return (
              <div key={section.label} className="sidebar-nav-item disabled mx-2 mt-1" data-testid={`nav-${section.label.toLowerCase().replace(/\s/g, '-')}`}>
                <section.icon className="w-4 h-4" />
                <span className="text-xs">{section.label}</span>
                <span className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded">Soon</span>
              </div>
            );
          }

          if (section.collapsible) {
            const isOpen = !collapsed[section.label];
            return (
              <div key={section.label}>
                <button
                  onClick={() => toggleSection(section.label)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-wider font-bold text-slate-400 hover:text-slate-300"
                  data-testid={`nav-section-${section.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {section.label}
                </button>
                {isOpen && section.items.map((item) => {
                  if (item.adminOnly && !isAdmin) return null;
                  const active = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNav(item.path)}
                      className={`sidebar-nav-item w-full text-left ${active ? 'active' : ''}`}
                      data-testid={`nav-${item.path.slice(1)}`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          }
          return null;
        })}

        {isAdmin && (
          <>
            <div className="px-4 pt-4 pb-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Admin</span>
            </div>
            {adminItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`sidebar-nav-item w-full text-left ${active ? 'active' : ''}`}
                  data-testid={`nav-${item.path.slice(1)}`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs truncate">{item.label}</span>
                </button>
              );
            })}
          </>
        )}
      </nav>

      {/* User info at bottom */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-semibold">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.role}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="text-slate-400 hover:text-red-400 transition-colors"
            data-testid="logout-btn"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col" style={{ backgroundColor: '#1E2A4A' }}>
        {renderSidebar()}
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-60 z-50" style={{ backgroundColor: '#1E2A4A' }}>
            {renderSidebar()}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b bg-card flex items-center px-4 gap-4 flex-shrink-0" data-testid="header">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(true)}
            data-testid="mobile-menu-btn"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/spjimr-logo.png" alt="SPJIMR" className="h-8 w-auto object-contain hidden sm:block" data-testid="header-spjimr-logo" />
              <span className="text-sm font-semibold tracking-tight text-foreground hidden sm:block">AQIS</span>
            </div>

            <div className="flex items-center gap-3">
              {activeCycle && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" data-testid="active-cycle-badge">
                  <CalendarDays className="w-3 h-3 mr-1" />
                  {activeCycle.name}
                </Badge>
              )}

              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                data-testid="theme-toggle-btn"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <div className="flex items-center gap-2 pl-3 border-l">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-semibold">
                  {user?.name?.[0] || 'U'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
