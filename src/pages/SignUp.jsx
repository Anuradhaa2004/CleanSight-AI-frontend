import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, ArrowRight, User, ShieldAlert, AlertCircle, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import axios from 'axios';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { apiUrl } from '../config/api';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('citizen'); // 'citizen' or 'authority'
  const [assignedArea, setAssignedArea] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const authorityAreas = ['Satna', 'Jabalpur', 'Rewa', 'Narsinghpur', 'Burhanpur'];

  useEffect(() => {
    if (role === 'authority') {
      detectAssignedArea();
    } else {
      setAssignedArea('');
      setLocationMessage('');
      setDetectingLocation(false);
      setPermissionDenied(false);
    }
  }, [role]);

  const normalizeArea = (value) => {
    if (!value) return '';
    const normalized = value.toLowerCase();
    return authorityAreas.find((area) => normalized.includes(area.toLowerCase())) || '';
  };

  const fetchAreaByCoordinates = async (lat, lng) => {
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat,
          lon: lng,
          format: 'json',
          addressdetails: 1,
          zoom: 10
        },
        headers: {
          'Accept-Language': 'en'
        }
      });

      const address = res.data?.address || {};
      const candidates = [address.city, address.town, address.village, address.county, address.state_district, address.state, res.data?.display_name];
      for (const candidate of candidates) {
        const mapped = normalizeArea(candidate);
        if (mapped) return mapped;
      }
      return '';
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      return '';
    }
  };

  const detectAssignedArea = () => {
    if (role !== 'authority') return;
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation not supported. Please enable location services or select an area.');
      setPermissionDenied(true);
      setAssignedArea('');
      return;
    }

    setDetectingLocation(true);
    setLocationMessage('Detecting your designated jurisdiction...');
    setPermissionDenied(false);
    setAssignedArea('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detectedArea = await fetchAreaByCoordinates(position.coords.latitude, position.coords.longitude);
        if (detectedArea) {
          setAssignedArea(detectedArea);
          setLocationMessage(`Detected area: ${detectedArea}`);
          setPermissionDenied(false);
        } else {
          setLocationMessage('Location detected outside predefined zones. Please pick an area below.');
          setPermissionDenied(false);
        }
        setDetectingLocation(false);
      },
      (geoError) => {
        console.warn('Geolocation warning:', geoError.message);
        setLocationMessage('Location permission denied or timed out. Please pick an area manually.');
        setPermissionDenied(true);
        setDetectingLocation(false);
      },
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: false }
    );
  };

  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email address is already in use. Please log in instead.';
      case 'auth/invalid-email':
        return 'The email address is invalid. Please check and try again.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please enable them in Firebase Authentication Console.';
      case 'auth/weak-password':
        return 'The password is too weak. Please use at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network connection error. Please check your internet connection.';
      default:
        return 'An error occurred during registration. Please try again.';
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (role === 'authority' && !assignedArea) {
      setError('Please select or specify your assigned authority jurisdiction.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      // 2. Update user profile display name
      try {
        await updateProfile(user, { displayName: trimmedName });
      } catch (profileErr) {
        console.warn('Could not update displayName on Firebase user:', profileErr);
      }

      // 3. Save / Sync user details to backend MongoDB
      try {
        await axios.post(apiUrl('/api/auth/sync-user'), {
          email: user.email,
          name: trimmedName,
          role: role,
          assignedArea: role === 'authority' ? assignedArea : '',
          uid: user.uid
        }, { timeout: 10000 });
      } catch (syncErr) {
        console.warn('Backend MongoDB sync notice:', syncErr?.message || syncErr);
      }

      // 4. Save session to localStorage for app routing & dashboards
      const token = await user.getIdToken();
      localStorage.setItem('token', token);
      localStorage.setItem('userUid', user.uid);
      localStorage.setItem('userEmail', user.email || trimmedEmail);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userName', trimmedName);
      localStorage.setItem('userArea', role === 'authority' ? assignedArea : '');

      setSuccess('Account created successfully! Redirecting...');

      setTimeout(() => {
        if (role === 'authority') {
          navigate('/authority');
        } else {
          navigate('/report');
        }
      }, 1000);

    } catch (err) {
      console.error('Sign up error:', err);
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
        <h1 style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>Create an Account</h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Join the AI-powered civic cleanup and emergency response platform.</p>
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

        <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          
          {/* Full Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Full Name</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User className="w-5 h-5" color="#94a3b8" style={{ position: 'absolute', left: '1rem' }} />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe" 
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#0f172a', outline: 'none' }}
                required
              />
            </div>
          </div>

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
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#0f172a', outline: 'none' }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Password (min 6 chars)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock className="w-5 h-5" color="#94a3b8" style={{ position: 'absolute', left: '1rem' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#0f172a', outline: 'none' }}
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Confirm Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock className="w-5 h-5" color="#94a3b8" style={{ position: 'absolute', left: '1rem' }} />
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••" 
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#0f172a', outline: 'none' }}
                required
              />
            </div>
          </div>

          {/* Authority Area Assignment */}
          {role === 'authority' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Assigned Jurisdiction</label>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={assignedArea}
                  onChange={(e) => setAssignedArea(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.95rem', color: '#0f172a', outline: 'none', cursor: 'pointer' }}
                  required
                >
                  <option value="">Select an Authority Area</option>
                  {authorityAreas.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={detectAssignedArea}
                  title="Detect current location"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.8rem', borderRadius: '0.75rem', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', cursor: 'pointer' }}
                >
                  {detectingLocation ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <MapPin size={18} color="#1E75FF" />}
                </button>
              </div>

              {locationMessage && (
                <p style={{ color: permissionDenied ? '#dc2626' : '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                  {locationMessage}
                </p>
              )}
            </div>
          )}

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
                Creating Account...
              </>
            ) : (
              <>
                Create Account <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>

      <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#1E75FF', textDecoration: 'none', fontWeight: '700' }}>
          Log in
        </Link>
      </p>
    </div>
  );
};

export default Signup;
