import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No user account found with this email address.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/missing-email':
        return 'Please provide an email address.';
      case 'auth/too-many-requests':
        return 'Too many reset requests. Please try again in a few minutes.';
      case 'auth/network-request-failed':
        return 'Network connection error. Please check your internet.';
      default:
        return 'Unable to send password reset email. Please try again.';
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);

    try {
      // Send official Firebase password reset email
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSuccess(`A password reset link has been dispatched to ${trimmedEmail}. Please check your inbox and follow the instructions.`);
    } catch (err) {
      console.error('Firebase Password Reset Error:', err);
      const msg = getFirebaseErrorMessage(err.code) || err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '2rem 1rem' }}>
      
      {/* Brand / Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', color: '#1E75FF', fontWeight: '800', fontSize: '1.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E75FF', padding: '0.35rem', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(30,117,255,0.25)' }}>
          <KeyRound className="w-5 h-5" color="white" />
        </div>
        <span style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>Security Center</span>
      </div>

      <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 35px -10px rgba(15,23,42,0.08)', width: '100%', maxWidth: '440px', marginBottom: '1.5rem' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>Reset Password</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.4' }}>
            Enter your registered email address and we'll send you a secure Firebase link to reset your password.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', marginBottom: '1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: '500' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#15803d', marginBottom: '1.5rem', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>Reset Email Dispatched!</span>
            </div>
            <p style={{ margin: 0, color: '#166534', lineHeight: 1.4 }}>{success}</p>
          </div>
        )}

        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Account Email Address</label>
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

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              width: '100%', 
              padding: '0.9rem', 
              backgroundColor: '#1E75FF', 
              color: 'white', 
              borderRadius: '0.75rem', 
              fontSize: '0.95rem', 
              fontWeight: '700', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem', 
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
                Sending Reset Link...
              </>
            ) : (
              <>
                Send Password Reset Link <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
          <ShieldCheck size={16} color="#10b981" />
          <span>Secured via Firebase Identity Platform</span>
        </div>
      </div>

      <Link 
        to="/login" 
        style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
      >
        ← Back to Login
      </Link>
    </div>
  );
};

export default ResetPassword;
