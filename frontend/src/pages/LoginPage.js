import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const result = login(username, password);
      if (result.success) {
        navigate('/upload');
      } else {
        setError(result.error);
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-6">
              <img src="/spjimr-logo.png" alt="SPJIMR" className="h-12 w-auto object-contain" data-testid="login-spjimr-logo" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to AQIS - Admissions Query Intelligence System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-medium">Username</Label>
              <Input
                id="username"
                data-testid="login-username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="h-10"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="h-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="toggle-password-btn"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" data-testid="login-error">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white"
              disabled={loading || !username || !password}
              data-testid="login-submit-btn"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="pt-4 border-t">
            <p className="text-[11px] text-muted-foreground text-center">
              Demo accounts: <span className="font-mono text-xs">admin/admin123</span> or <span className="font-mono text-xs">member1/member123</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right - Visual */}
      <div
        className="hidden lg:flex flex-1 items-center justify-center relative"
        style={{ backgroundColor: '#1E2A4A' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-slate-900/80" />
        <div className="relative z-10 text-center space-y-4 px-12">
          <img src="/spjimr-logo.png" alt="SPJIMR" className="h-20 w-auto object-contain mx-auto mb-6 drop-shadow-lg" />
          <h2 className="text-3xl font-bold text-white tracking-tight">Admissions Query<br/>Intelligence System</h2>
          <p className="text-sm text-blue-200/70 max-w-md">
            Streamline admissions query management with AI-powered analysis, automated prioritization, and real-time SLA monitoring.
          </p>
          <div className="flex items-center justify-center gap-6 pt-6">
            {['AI Analysis', 'SLA Tracking', 'Smart Routing'].map(f => (
              <div key={f} className="text-xs text-blue-300/60 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
