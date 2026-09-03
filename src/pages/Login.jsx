import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, LogIn, User, ShieldAlert, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import axios from 'axios';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { apiUrl } from '../config/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('citizen'); // 'citizen' or 'authority'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Track session state using onAuthStateChanged
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && localStorage.getItem('token')) {
        // User already has an active session
        console.log('Active session detected for:', currentUser.email);
      }
    });

    return () => unsubscribe();
  }, []);

  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please verify your credentials.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please reach out to support.';
      case 'auth/too-many-requests':
        return 'Access temporarily locked due to many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      default:
        return 'Login failed. Please verify your email and password.';
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      // 1. Sign in user with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      // 2. Fetch or sync user details from backend MongoDB
      let userData = {
        role: role,
        assignedArea: '',
        name: user.displayName || trimmedEmail.split('@')[0]
      };

      try {
        const res = await axios.post(apiUrl('/api/auth/sync-user'), {
          email: user.email,
          role: role,
          uid: user.uid
        }, { timeout: 10000 });

        if (res.data?.user) {
          userData = res.data.user;
        }
      } catch (syncErr) {
        console.warn('Backend MongoDB sync notice:', syncErr?.message || syncErr);
      }

      // 3. Save session info in localStorage for route guards & dashboards
      const token = await user.getIdToken();
      const effectiveRole = userData.role || role;
      localStorage.setItem('token', token);
      localStorage.setItem('userUid', user.uid);
      localStorage.setItem('userEmail', user.email || trimmedEmail);
      localStorage.setItem('userRole', effectiveRole);
      localStorage.setItem('userName', userData.name || user.displayName || trimmedEmail.split('@')[0]);
      localStorage.setItem('userArea', userData.assignedArea || '');

      setSuccess('Logged in successfully! Redirecting...');

      // 4. Clean navigation based on role
      setTimeout(() => {
        if (effectiveRole === 'authority') {
          navigate('/authority');
        } else {
          navigate('/report');
        }
      }, 1000);

    } catch (err) {
      console.error('Firebase Login Error:', err);
      const msg = getFirebaseErrorMessage(err.code) || err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '2rem 1rem' }}>
      
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', color: '#1E75FF', fontWeight: '800', fontSize: '1.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E75FF', padding: '0.35rem', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(30,117,255,0.25)' }}>
          <Leaf className="w-5 h-5" color="white" />
        </div>
        <span style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>CleanSight AI</span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem', maxWidth: '440px' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>Welcome Back</h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Log in to access your civic dashboard and real-time alerts.</p>
      </div>

      <div style={{ backgroundColor: 'white', padding: '2.25rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 35px -10px rgba(15,23,42,0.08)', width: '100%', maxWidth: '440px', marginBottom: '1.5rem' }}>
        
        {/* Role Selector */}
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '0.35rem', borderRadius: '1rem', marginBottom: '1.75rem', gap: '0.35rem' }}>
          <button 
            type="button"
            onClick={() => setRole('citizen')}
            style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem', 
              padding: '0.75rem', 
              borderRadius: '0.75rem', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.85rem',
              backgroundColor: role === 'citizen' ? 'white' : 'transparent',
              color: role === 'citizen' ? '#1E75FF' : '#64748b',
              boxShadow: role === 'citizen' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <User size={18} /> Citizen
          </button>
          <button 
            type="button"
            onClick={() => setRole('authority')}
            style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem', 
              padding: '0.75rem', 
              borderRadius: '0.75rem', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.85rem',
              backgroundColor: role === 'authority' ? 'white' : 'transparent',
              color: role === 'authority' ? '#1E75FF' : '#64748b',
              boxShadow: role === 'authority' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <ShieldAlert size={18} /> Authority
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', marginBottom: '1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: '500' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', marginBottom: '1.25rem', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: '600' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Email Address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail className="w-5 h-5" color="#94a3b8" style={{ position: 'absolute', left: '1rem' }} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com" 
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 3rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#0f172a', outline: 'none' }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Password</label>
              <Link
                to="/reset-password"
                style={{ fontSize: '0.75rem', color: '#1E75FF', fontWeight: '700', textDecoration: 'none' }}
              >
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock className="w-5 h-5" color="#94a3b8" style={{ position: 'absolute', left: '1rem' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 3rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#0f172a', outline: 'none' }}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              width: '100%', 
              padding: '0.9rem', 
              backgroundColor: '#1E75FF', 
              color: 'white', 
              borderRadius: '0.75rem', 
              fontSize: '1rem', 
              fontWeight: '700', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem', 
              marginTop: '0.5rem', 
              border: 'none', 
              cursor: 'pointer', 
              opacity: loading ? 0.75 : 1,
              boxShadow: '0 4px 14px rgba(30, 117, 255, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Signing In...
              </>
            ) : (
              <>
                Log In <LogIn className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>

      <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ color: '#1E75FF', textDecoration: 'none', fontWeight: '700' }}>
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default Login;
