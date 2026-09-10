import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Leaf, 
  Mail, 
  Lock, 
  ArrowRight, 
  User, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  MapPin, 
  KeyRound, 
  ShieldCheck, 
  RefreshCw, 
  ArrowLeft 
} from 'lucide-react';
import axios from 'axios';
import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from 'firebase/auth';
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
  
  // OTP Verification state
  const [step, setStep] = useState('form'); // 'form' or 'otp'
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

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

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (step === 'otp' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

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
        return 'This email address is already registered. Please log in instead.';
      case 'auth/invalid-email':
        return 'The email address is invalid. Please check and try again.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled in Firebase Console.';
      case 'auth/weak-password':
        return 'The password is too weak. Please use at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network connection error. Please check your internet connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  // -------------------------------------------------------------
  // Step 1: Request OTP from Backend via EmailJS
  // -------------------------------------------------------------
  const handleRequestOTP = async (e) => {
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
      const response = await axios.post(apiUrl('/api/auth/request-otp'), {
        email: trimmedEmail,
        name: trimmedName,
        password: password,
        role: role,
        assignedArea: role === 'authority' ? assignedArea : ''
      }, { timeout: 15000 });

      setSuccess(response.data?.message || 'Verification code sent to your email!');
      setStep('otp');
      setResendCooldown(60);
      setCanResend(false);
    } catch (err) {
      console.error('Request OTP error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP. Please check your details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Step 2: Resend OTP
  // -------------------------------------------------------------
  const handleResendOTP = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setError('');

    try {
      await axios.post(apiUrl('/api/auth/request-otp'), {
        email: email.trim(),
        name: name.trim(),
        password: password,
        role: role,
        assignedArea: role === 'authority' ? assignedArea : ''
      }, { timeout: 15000 });

      setSuccess('A new verification code has been sent to your email.');
      setResendCooldown(60);
      setCanResend(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // -------------------------------------------------------------
  // Step 3: Verify OTP & Complete Account Setup
  // -------------------------------------------------------------
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length < 4) {
      setError('Please enter the verification code sent to your email.');
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedName = name.trim();

      // 1. Verify OTP with Backend (MongoDB)
      const verifyRes = await axios.post(apiUrl('/api/auth/verify-otp'), {
        email: trimmedEmail,
        otp: trimmedOtp
      }, { timeout: 15000 });

      // 2. Create / Sync user with Firebase Authentication
      let firebaseUser = null;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        firebaseUser = userCredential.user;
        await updateProfile(firebaseUser, { displayName: trimmedName });
      } catch (fbErr) {
        if (fbErr.code === 'auth/email-already-in-use') {
          // If already in Firebase, sign in
          try {
            const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
            firebaseUser = userCredential.user;
          } catch (_) {}
        } else {
          console.warn('Firebase registration notice:', fbErr.message);
        }
      }

      // 3. Sync User in MongoDB
      try {
        await axios.post(apiUrl('/api/auth/sync-user'), {
          email: trimmedEmail,
          name: trimmedName,
          role: role,
          assignedArea: role === 'authority' ? assignedArea : '',
          uid: firebaseUser?.uid || verifyRes.data?.user?.id || 'verified-user'
        }, { timeout: 10000 });
      } catch (syncErr) {
        console.warn('MongoDB sync notice:', syncErr.message);
      }

      // 4. Save Session to localStorage
      const token = firebaseUser ? await firebaseUser.getIdToken() : (verifyRes.data?.token || 'session-active');
      localStorage.setItem('token', token);
      localStorage.setItem('userUid', firebaseUser?.uid || verifyRes.data?.user?.id || 'uid');
      localStorage.setItem('userEmail', trimmedEmail);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userName', trimmedName);
      localStorage.setItem('userArea', role === 'authority' ? assignedArea : '');

      setSuccess('Account verified & created successfully! Redirecting...');

      setTimeout(() => {
        if (role === 'authority') {
          navigate('/authority-dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 1000);

    } catch (err) {
      console.error('Verify OTP error:', err);
      const msg = err.response?.data?.message || err.message || 'Invalid or expired OTP. Please try again.';
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

      <div style={{ textAlign: 'center', marginBottom: '1.75rem', maxWidth: '440px' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
          {step === 'form' ? 'Create an Account' : 'Verify Your Email'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          {step === 'form' 
            ? 'Join the AI-powered civic cleanup and emergency response platform.' 
            : `We sent a 6-digit verification code to ${email}`}
        </p>
      </div>

      <div style={{ backgroundColor: 'white', padding: '2.25rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 35px -10px rgba(15,23,42,0.08)', width: '100%', maxWidth: '440px', marginBottom: '1.5rem' }}>
        
        {/* Step 1: Role Selector (only in form step) */}
        {step === 'form' && (
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
        )}

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

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: REGISTRATION FORM                                     */}
        {/* ------------------------------------------------------------- */}
        {step === 'form' ? (
          <form onSubmit={handleRequestOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            
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
                  Sending Verification Code...
                </>
              ) : (
                <>
                  Continue with Verification <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* ------------------------------------------------------------- */
          /* VIEW 2: OTP VERIFICATION STEP                                 */
          /* ------------------------------------------------------------- */
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1E75FF', marginBottom: '1rem' }}>
                <KeyRound size={28} />
              </div>
              <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>
                Enter the 6-digit OTP sent to:
              </p>
              <p style={{ color: '#0f172a', fontWeight: '700', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                {email}
              </p>
            </div>

            {/* OTP Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center' }}>
                6-Digit Security Code
              </label>
              <input 
                type="text" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456" 
                autoFocus
                style={{ 
                  width: '100%', 
                  padding: '0.9rem 1rem', 
                  borderRadius: '0.75rem', 
                  border: '2px solid #1E75FF', 
                  backgroundColor: '#f8fafc', 
                  fontSize: '1.6rem', 
                  fontWeight: '800', 
                  letterSpacing: '0.4em', 
                  textAlign: 'center', 
                  color: '#0f172a', 
                  outline: 'none' 
                }}
                required
              />
            </div>

            {/* Verify Button */}
            <button 
              type="submit" 
              disabled={loading || otp.length < 6} 
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
                cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer', 
                opacity: (loading || otp.length < 6) ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(30, 117, 255, 0.25)',
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Verifying OTP...
                </>
              ) : (
                <>
                  <ShieldCheck size={20} /> Verify & Complete Registration
                </>
              )}
            </button>

            {/* Resend Code & Back Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem' }}>
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError('');
                  setSuccess('');
                }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600', padding: 0 }}
              >
                <ArrowLeft size={16} /> Edit details
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={!canResend || resending}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: canResend ? '#1E75FF' : '#94a3b8', 
                  cursor: canResend ? 'pointer' : 'default', 
                  fontWeight: '700', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.35rem', 
                  padding: 0 
                }}
              >
                {resending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                {canResend ? 'Resend Code' : `Resend in ${resendCooldown}s`}
              </button>
            </div>

          </form>
        )}
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
