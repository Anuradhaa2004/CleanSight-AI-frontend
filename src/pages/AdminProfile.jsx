import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';
import {
  LogOut, Shield, LayoutDashboard, Database, User,
  Sun, Moon, Camera, Mail, Lock, MapPin, Info
} from 'lucide-react';

const AdminProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [now, setNow] = useState(new Date());
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    assignedArea: '',
    about: '',
    profilePic: ''
  });

  const originalEmail = localStorage.getItem('userEmail') || '';

  // Theme Config
  const T = isDark ? {
    bg: '#0a0d14',
    sidebar: 'rgba(12,16,28,0.95)',
    sidebarTxt: '#94a3b8',
    border: 'rgba(255,255,255,0.06)',
    card: 'rgba(16,22,40,0.6)',
    text: '#94a3b8',
    textMain: '#f1f5f9',
    accent: '#3b82f6',
    header: 'rgba(10,13,20,0.8)',
    input: 'rgba(0,0,0,0.2)'
  } : {
    bg: '#f8fafc',
    sidebar: '#ffffff',
    sidebarTxt: '#64748b',
    border: '#e2e8f0',
    card: '#ffffff',
    text: '#64748b',
    textMain: '#0f172a',
    accent: '#2563eb',
    header: 'rgba(255,255,255,0.8)',
    input: '#f1f5f9'
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!originalEmail) {
      navigate('/login');
      return;
    }

    const fetchFullDetails = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/auth/user?email=${encodeURIComponent(originalEmail)}`);
        if (res.data.user) {
          setFormData({
            name: res.data.user.name,
            email: res.data.user.email,
            password: res.data.user.password,
            assignedArea: res.data.user.assignedArea,
            about: res.data.user.about || '',
            profilePic: res.data.user.profilePic || ''
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFullDetails();
  }, [originalEmail, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profilePic: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/api/auth/update-profile`, {
        originalEmail,
        ...formData
      });
      if (res.status === 200) {
        localStorage.setItem('userName', res.data.user.name);
        localStorage.setItem('userEmail', res.data.user.email);
        localStorage.setItem('userArea', res.data.user.assignedArea);
        alert('Profile updated successfully');
        navigate('/authority');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update profile');
    }
  };

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, color: T.textMain }}>Loading...</div>;

  return (
    <div className="dashboard-root" style={{ height: '100vh', width: '100%', background: T.bg, fontFamily: "'Inter', sans-serif", color: T.text, overflow: 'hidden' }}>
      <style>{`
         .dashboard-root { display: flex; flex-direction: row; }
         .desktop-sidebar { z-index: 40; flex-shrink: 0; display: flex; flex-direction: column; overflow-x: hidden; border-right: 1px solid ${T.border}; }
         .top-header { height: 72px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid ${T.border}; background: ${T.header}; flex-shrink: 0; }
         .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
         .scrollable-workspace { flex: 1; padding: 32px; overflow-y: auto; }
         .form-input { width: 100%; padding: 14px 18px; border-radius: 12px; background: ${T.input}; border: 1px solid ${T.border}; color: ${T.textMain}; font-size: 15px; font-weight: 600; outline: none; transition: border-color 0.2s; }
         .form-input:focus { border-color: ${T.accent}; }
         .section-label { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: ${T.accent}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
      `}</style>

      {/* Desktop Sidebar */}
      <motion.aside
        className="desktop-sidebar"
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        style={{ background: T.sidebar, backdropFilter: 'blur(20px)' }}
      >
        <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={20} color="white" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.textMain }}>Command Center</div>
                <div style={{ fontSize: 11, color: T.accent, fontWeight: 700 }}>{formData.assignedArea} Auth</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => navigate('/authority')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderRadius: 12, background: 'transparent', color: T.text, border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>
            <Database size={20} />
            {sidebarOpen && <span>Dashboard</span>}
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderRadius: 12, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>
            <User size={20} />
            {sidebarOpen && <span>Admin Profile</span>}
          </button>
        </nav>

        <div style={{ padding: '20px 16px', borderTop: `1px solid ${T.border}` }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
            <LogOut size={20} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
           <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'transparent', border: 'none', color: T.text, cursor: 'pointer' }}>
                <LayoutDashboard size={24} />
             </button>
             <h1 style={{ fontWeight: 700, color: T.textMain, margin: 0 }}>Edit Profile</h1>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <button onClick={() => setIsDark(!isDark)} style={{ width: 36, height: 36, borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.05)' : '#eff6ff', border: `1px solid ${T.border}`, color: isDark ? '#facc15' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
               {isDark ? <Sun size={18} /> : <Moon size={18} />}
             </button>
             <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
               {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
           </div>
        </header>

        <div className="scrollable-workspace">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             style={{ maxWidth: 850, margin: '0 auto' }}
           >
             <div style={{ background: T.card, borderRadius: 24, border: `1px solid ${T.border}`, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
               
               {/* Banner & Profile Pic Section */}
               <div style={{ height: 120, background: 'linear-gradient(90deg, #3b82f6 0%, #2dd4bf 100%)', position: 'relative' }}>
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    style={{ 
                      position: 'absolute', bottom: -50, left: 40, 
                      width: 110, height: 110, borderRadius: '50%', 
                      border: `4px solid ${isDark ? '#0a0d14' : '#fff'}`,
                      background: '#1e293b', overflow: 'hidden', cursor: 'pointer'
                    }}
                  >
                    {formData.profilePic ? (
                      <img src={formData.profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={50} color="#64748b" />
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                       <Camera size={24} color="white" />
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
               </div>

               <div style={{ padding: '70px 40px 40px 40px' }}>
                  <div style={{ marginBottom: 32 }}>
                     <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.textMain }}>{formData.name || 'Set Name'}</h2>
                     <p style={{ margin: '4px 0 0 0', color: T.accent, fontSize: 13, fontWeight: 700 }}>{formData.email}</p>
                  </div>

                  <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    
                    {/* Basic Info Section */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <div className="section-label"><User size={14} /> Full Legal Name</div>
                      <input 
                        type="text" 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="form-input"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <div className="section-label"><Mail size={14} /> Email Address</div>
                      <input 
                        type="email" 
                        value={formData.email} 
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="form-input"
                        placeholder="admin@cleansight.ai"
                      />
                    </div>

                    <div>
                      <div className="section-label"><MapPin size={14} /> Authority Area</div>
                      <select 
                        value={formData.assignedArea} 
                        onChange={(e) => setFormData({...formData, assignedArea: e.target.value})}
                        className="form-input"
                      >
                        <option value="Satna">Satna</option>
                        <option value="Jabalpur">Jabalpur</option>
                        <option value="Rewa">Rewa</option>
                        <option value="Narsinghpur">Narsinghpur</option>
                        <option value="Burhanpur">Burhanpur</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                       <div className="section-label"><Info size={14} /> About Me</div>
                       <textarea 
                         value={formData.about} 
                         onChange={(e) => setFormData({...formData, about: e.target.value})}
                         className="form-input"
                         placeholder="Tell us about your role or professional background..."
                         style={{ height: 100, resize: 'none', padding: '14px 18px' }}
                       />
                    </div>

                    <div style={{ gridColumn: 'span 2', position: 'relative' }}>
                      <div className="section-label"><Lock size={14} /> Edit Password</div>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={formData.password} 
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="form-input"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: 15, top: 38, background: 'none', border: 'none', color: T.accent, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
                      >
                        {showPassword ? "HIDE" : "SHOW"}
                      </button>
                    </div>

                    <div style={{ gridColumn: 'span 2', marginTop: 10 }}>
                      <motion.button 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="submit"
                        style={{ width: '100%', padding: '16px', borderRadius: 14, background: `linear-gradient(135deg, ${T.accent} 0%, #1d4ed8 100%)`, color: 'white', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}
                      >
                        Update Profiles Details
                      </motion.button>
                    </div>
                  </form>
               </div>
             </div>
           </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AdminProfile;
