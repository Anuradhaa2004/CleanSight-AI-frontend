import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';
import {
  LogOut, Shield, FileText, CheckCircle2, AlertTriangle,
  MapPin, Activity, LayoutDashboard, Database, User,
  Sun, Moon
} from 'lucide-react';

const getStatusColor = (st) => {
  if (st === 'Open') return { color: '#facc15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.3)' };
  if (st === 'In Progress') return { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' };
  if (st === 'Verification Pending') return { color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)' };
  if (st === 'Resolved') return { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' };
  return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
};

const AuthorityDashboard = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('board');
  const [statusMessage, setStatusMessage] = useState('');
  const [now, setNow] = useState(new Date());
  const [mapQuery, setMapQuery] = useState(null); // No default map
  const [isDark, setIsDark] = useState(true);

  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = localStorage.getItem('userName') || 'Authority User';
  const assignedArea = localStorage.getItem('userArea') || '';

  // Theme Config (Dynamic Light / Dark)
  const T = isDark ? {
    bg: '#0a0d14',
    sidebar: 'rgba(12,16,28,0.95)',
    sidebarTxt: '#94a3b8',
    border: 'rgba(255,255,255,0.06)',
    card: 'rgba(16,22,40,0.6)',
    text: '#c9d4e8',
    textMain: '#f1f5f9',
    accent: '#3b82f6',
    header: 'rgba(10,13,20,0.8)',
    statBg: 'rgba(59,130,246,0.1)'
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
    statBg: '#eff6ff'
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // No longer auto-setting mapQuery to city view
  }, []);

  useEffect(() => {
    if (!userEmail) {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      if (!assignedArea) {
        // Need to fetch area
        try {
          const res = await axios.get(`${API_BASE}/api/auth/user?email=${encodeURIComponent(userEmail)}`);
          if (res.data.user.assignedArea) {
            localStorage.setItem('userArea', res.data.user.assignedArea);
            window.location.reload();
          } else {
            setStatusMessage('No assigned authority area found for your account. Please contact SuperAdmin.');
          }
        } catch (err) {
          setStatusMessage('Error verifying authority access.');
        }
        setLoading(false);
        return;
      }

      await fetchTickets();
    };

    loadData();
  }, [userEmail, assignedArea, navigate]);

  useEffect(() => {
    if (!userEmail || !assignedArea) return;
    fetchNotifications();
    const t = setInterval(fetchNotifications, 15000);
    return () => clearInterval(t);
  }, [userEmail, assignedArea]);

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/reports/tickets`, {
        params: { role: 'authority', area: assignedArea }
      });
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      setStatusMessage('Unable to fetch reports');
    }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    if (!userEmail) return;
    setNotificationsLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        axios.get(`${API_BASE}/api/notifications`, {
          params: { email: userEmail, role: 'authority', area: assignedArea, limit: 30 }
        }),
        axios.get(`${API_BASE}/api/notifications/unread-count`, {
          params: { email: userEmail, role: 'authority', area: assignedArea }
        })
      ]);

      setNotifications(Array.isArray(listRes.data?.notifications) ? listRes.data.notifications : []);
      setUnreadCount(Number(countRes.data?.count) || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationRead = async (notificationId) => {
    if (!notificationId) return;
    try {
      await axios.patch(`${API_BASE}/api/notifications/${notificationId}/read`, { email: userEmail });
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await axios.patch(`${API_BASE}/api/notifications/read-all`, { email: userEmail, role: 'authority', area: assignedArea });
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
    }
  };

  const handleStatusChange = async (ticketId, currentStatus, newStatus) => {
    if (currentStatus === newStatus) return;
    try {
      await axios.patch(`${API_BASE}/api/report/ticket/${ticketId}/status`, { status: newStatus });
      fetchTickets();
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update status");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  const handleProfileUpdate = async (updatedData) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/update-profile`, {
        email: userEmail,
        ...updatedData
      });
      if (res.status === 200) {
        localStorage.setItem('userName', res.data.user.name);
        localStorage.setItem('userArea', res.data.user.assignedArea);
        alert('Profile updated successfully');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'Open').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved' || t.status === 'Verification Pending').length,
  };

  if (!assignedArea && statusMessage) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, color: T.textMain }}>
        <div style={{ background: T.card, padding: 40, borderRadius: 20, border: `1px solid ${T.border}` }}>
          <h2 style={{ marginTop: 0 }}>Access Restricted</h2>
          <p>{statusMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root" style={{ height: '100vh', width: '100%', background: T.bg, fontFamily: "'Inter', sans-serif", color: T.text, overflow: 'hidden' }}>
      <style>{`
         .dashboard-root { display: flex; flex-direction: row; }
         .mobile-navbar { display: none; }
         .desktop-sidebar { z-index: 40; flex-shrink: 0; display: flex; flex-direction: column; overflow-x: hidden; border-right: 1px solid ${T.border}; }
         .top-header { height: 72px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid ${T.border}; background: ${T.header}; flex-shrink: 0; }
         .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px; }
         .incidents-table tr { transition: background 0.3s ease; }
         .incidents-table tr:hover { background: ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}; }
         .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding-top: 0 !important; }
         .scrollable-workspace { flex: 1; padding: 32px; overflow-y: auto; }
         
         @media (max-width: 768px) {
           .dashboard-root { flex-direction: column; }
           .desktop-sidebar { display: none !important; }
           .mobile-navbar { display: flex; flex-direction: column; background: ${T.sidebar}; z-index: 50; flex-shrink: 0; border-bottom: 1px solid ${T.border}; }
           .stats-grid { grid-template-columns: 1fr; }
           .top-header { padding: 0 16px; height: 60px; }
           .top-header h1 { font-size: 16px !important; }
           .scrollable-workspace { padding: 16px 16px; }
           .mobile-hide { display: none !important; }
         }
      `}</style>

      {/* Mobile Navbar */}
      <div className="mobile-navbar">
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Command Center</div>
              <div style={{ fontSize: 10, color: T.accent, fontWeight: 700 }}>{assignedArea} Auth</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{userEmail}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <LogOut size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', padding: '12px 16px', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <button onClick={() => setActiveTab('board')} style={{ flex: '0 0 auto', padding: '10px 16px', borderRadius: 10, background: activeTab === 'board' ? 'rgba(59,130,246,0.1)' : 'transparent', color: activeTab === 'board' ? '#3b82f6' : T.text, border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Database size={16} /> Incidents
          </button>
          <button onClick={() => setActiveTab('analytics')} style={{ flex: '0 0 auto', padding: '10px 16px', borderRadius: 10, background: activeTab === 'analytics' ? 'rgba(59,130,246,0.1)' : 'transparent', color: activeTab === 'analytics' ? '#3b82f6' : T.text, border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <LayoutDashboard size={16} /> Analytics
            {unreadCount > 0 && (
              <span style={{ marginLeft: 2, background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

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
                <div style={{ fontSize: 11, color: T.accent, fontWeight: 700, marginBottom: 2 }}>{assignedArea} Auth</div>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, opacity: 0.8 }}>{userEmail}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setActiveTab('board')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderRadius: 12, background: activeTab === 'board' ? 'rgba(59,130,246,0.1)' : 'transparent', color: activeTab === 'board' ? '#3b82f6' : T.text, border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>
            <Database size={20} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Incidents Board</span>}
          </button>
          <button onClick={() => setActiveTab('analytics')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderRadius: 12, background: activeTab === 'analytics' ? 'rgba(59,130,246,0.1)' : 'transparent', color: activeTab === 'analytics' ? '#3b82f6' : T.text, border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>
            <LayoutDashboard size={20} style={{ flexShrink: 0 }} />
            {sidebarOpen && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                Analytics
                {unreadCount > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>
                    {unreadCount}
                  </span>
                )}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('profile')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderRadius: 12, background: activeTab === 'profile' ? 'rgba(59,130,246,0.1)' : 'transparent', color: activeTab === 'profile' ? '#3b82f6' : T.text, border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>
            <User size={20} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Admin Profile</span>}
          </button>
        </nav>

        <div style={{ padding: '20px 16px', borderTop: `1px solid ${T.border}` }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, justifyContent: sidebarOpen ? 'flex-start' : 'center', whiteSpace: 'nowrap' }}>
            <LogOut size={20} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="mobile-hide" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'transparent', border: 'none', color: T.text, cursor: 'pointer' }}>
              <LayoutDashboard size={24} />
            </button>
            <div>
              <h1 style={{ fontWeight: 700, color: T.textMain, margin: 0 }}>{assignedArea} Operations</h1>
              <p className="mobile-hide" style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Active ticketing portal for municipal authorities</p>
            </div>
          </div>
          <div className="mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: isDark ? 'rgba(255,255,255,0.05)' : '#eff6ff',
                border: `1px solid ${T.border}`,
                color: isDark ? '#facc15' : '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button 
              onClick={() => setActiveTab('profile')}
              style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: activeTab === 'profile' ? T.accent : 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>
                <User size={18} color={activeTab === 'profile' ? '#fff' : "#3b82f6"} />
              </div>
            </button>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <div className="scrollable-workspace">

          {/* Top Metric Row */}
          <div className="stats-grid">
            {[
              { label: 'Total Logs', value: stats.total, color: '#3b82f6', icon: FileText },
              { label: 'Open Incidents', value: stats.open, color: '#facc15', icon: AlertTriangle },
              { label: 'In Progress', value: stats.inProgress, color: '#a855f7', icon: Activity },
              { label: 'Resolved', value: stats.resolved, color: '#22c55e', icon: CheckCircle2 }
            ].map(s => (
              <div key={s.label} style={{ background: T.card, padding: 24, borderRadius: 16, border: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <s.icon size={22} color={s.color} />
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: T.textMain, marginBottom: 4 }}>{loading ? '—' : s.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Geographic Coverage Map Box */}
          {activeTab === 'board' && (
            <div style={{
              background: T.card, borderRadius: 20, border: `1px solid ${T.border}`,
              overflow: 'hidden', marginBottom: 32, height: 260, position: 'relative'
            }}>
              {mapQuery ? (
                <iframe
                  title="Authority Area Map"
                  width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery.q)}&z=18&output=embed`}
                  style={{ border: 0, filter: isDark ? 'invert(100%) hue-rotate(180deg) contrast(90%)' : 'none' }}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <MapPin size={32} color={T.accent} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: T.text, opacity: 0.5, fontWeight: 600 }}>Click "View Map" to track incident</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ background: T.card, borderRadius: 20, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: 32 }}>
              <div style={{ padding: '22px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: T.textMain }}>Email Notifications</div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>New citizen complaints for {assignedArea}</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={fetchNotifications}
                    style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, color: T.textMain, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                  >
                    {notificationsLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button
                    onClick={markAllNotificationsRead}
                    disabled={unreadCount === 0}
                    style={{
                      background: unreadCount === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(34,197,94,0.12)',
                      border: `1px solid ${T.border}`,
                      color: unreadCount === 0 ? '#64748b' : '#22c55e',
                      padding: '8px 14px',
                      borderRadius: 10,
                      cursor: unreadCount === 0 ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                      fontWeight: 800
                    }}
                  >
                    Mark all read
                  </button>
                </div>
              </div>

              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 22, borderRadius: 14, border: `1px dashed ${T.border}`, color: '#64748b', fontWeight: 700 }}>
                    No notifications yet. New complaints will appear here automatically.
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.readAt;
                    const ticket = n.ticketId;
                    return (
                      <div
                        key={n._id}
                        style={{
                          padding: 16,
                          borderRadius: 14,
                          border: `1px solid ${isUnread ? 'rgba(239,68,68,0.35)' : T.border}`,
                          background: isUnread ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 14
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: T.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {n.title || 'New Complaint'}
                            </div>
                            {isUnread && (
                              <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 999 }}>
                                NEW
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 10 }}>
                            {n.message}
                          </div>
                          {ticket && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 900, padding: '4px 10px', borderRadius: 999, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                                {ticket.trackingId}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 900, padding: '4px 10px', borderRadius: 999, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                                {ticket.aiCategory}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: 'rgba(148,163,184,0.12)', color: '#94a3b8' }}>
                                {new Date(n.createdAt).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                          {ticket && (
                            <button
                              onClick={() => {
                                const q = (ticket.lat && ticket.lon) ? `${ticket.lat},${ticket.lon}` : (ticket.googleMapsUrl || ticket.location || assignedArea);
                                setMapQuery({ q, label: ticket.location || assignedArea });
                                setActiveTab('board');
                                setTimeout(() => {
                                  const el = document.querySelector('.scrollable-workspace');
                                  if (el) el.scrollTo({ top: 300, behavior: 'smooth' });
                                }, 50);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 800,
                                border: `1px solid ${T.border}`,
                                background: 'rgba(59,130,246,0.12)',
                                color: '#3b82f6',
                                cursor: 'pointer'
                              }}
                            >
                              View Map
                            </button>
                          )}
                          <button
                            onClick={() => markNotificationRead(n._id)}
                            disabled={!isUnread}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 10,
                              fontSize: 12,
                              fontWeight: 800,
                              border: `1px solid ${T.border}`,
                              background: isUnread ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)',
                              color: isUnread ? '#22c55e' : '#64748b',
                              cursor: isUnread ? 'pointer' : 'not-allowed'
                            }}
                          >
                            Mark read
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Active Incidents Board */}
          {activeTab === 'board' && (
          <div style={{ background: T.card, borderRadius: 20, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: T.textMain, fontWeight: 800 }}>Active Incidents Board</h2>
              <button onClick={fetchTickets} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, color: T.textMain, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Refresh Database</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="incidents-table" style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '16px 28px', fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tracking ID</th>
                    <th style={{ padding: '16px 28px', fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evidence</th>
                    <th style={{ padding: '16px 28px', fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category Target</th>
                    <th style={{ padding: '16px 28px', fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location Detail</th>
                    <th style={{ padding: '16px 28px', fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading database...</td></tr>
                  ) : tickets.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No incidents matched for {assignedArea}.</td></tr>
                  ) : (
                    tickets.map((t) => {
                      const stCfg = getStatusColor(t.status);
                      return (
                        <tr key={t._id} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '20px 28px', fontSize: 14, fontFamily: 'monospace', color: '#3b82f6', fontWeight: 700 }}>{t.trackingId}</td>
                          <td style={{ padding: '20px 28px' }}>
                            <div style={{ 
                              width: 60, height: 44, borderRadius: 8, 
                              overflow: 'hidden', border: `1px solid ${T.border}`,
                              background: 'rgba(0,0,0,0.2)'
                            }}>
                              <img 
                                src={`${API_BASE}${t.imageUrl}`} 
                                alt="Incident Evidence" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/60x44?text=No+Img'; }}
                              />
                            </div>
                            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{new Date(t.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td style={{ padding: '20px 28px', fontSize: 14, fontWeight: 700, color: '#c9d4e8' }}>{t.aiCategory || 'General Issue'}</td>
                          <td style={{ padding: '20px 28px', maxWidth: 220 }}>
                            <div 
                              onClick={() => {
                                const q = (t.lat && t.lon) ? `${t.lat},${t.lon}` : t.location;
                                setMapQuery({ q, label: t.location });
                                document.querySelector('.scrollable-workspace').scrollTo({ top: 300, behavior: 'smooth' });
                              }}
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ 
                                width: 28, height: 28, borderRadius: 8, 
                                background: 'rgba(59,130,246,0.1)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <MapPin size={14} color="#3b82f6" />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: T.textMain, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {t.location || 'Unknown Area'}
                                </span>
                                <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase' }}>Pinpoint Area</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '20px 28px' }}>
                            {t.status === 'Open' && (
                              <button
                                onClick={() => handleStatusChange(t._id, t.status, 'In Progress')}
                                style={{
                                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                  color: 'white', border: 'none', cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                                  width: '120px'
                                }}
                              >
                                Accept Case
                              </button>
                            )}
                            {t.status === 'In Progress' && (
                              <button
                                onClick={() => handleStatusChange(t._id, t.status, 'Resolved')}
                                style={{
                                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: 'white', border: 'none', cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                                  width: '120px'
                                }}
                              >
                                Mark Resolved
                              </button>
                            )}
                            {t.status === 'Verification Pending' && (
                              <div style={{
                                padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                width: '120px', textAlign: 'center'
                              }}>
                                Verifying... ⏳
                              </div>
                            )}
                            {t.status === 'Resolved' && (
                              <div style={{
                                padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                width: '120px', textAlign: 'center'
                              }}>
                                Completed ✅
                              </div>
                            )}
                            {t.status === 'Rejected' && (
                              <div style={{
                                padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                width: '120px', textAlign: 'center'
                              }}>
                                Rejected ❌
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Profile Management Page */}
          {activeTab === 'profile' && (
            <ProfileForm 
              initialData={{ name: userName, email: userEmail, area: assignedArea }}
              onSave={handleProfileUpdate}
              theme={T}
              isDark={isDark}
            />
          )}

        </div>
      </main>
    </div>
  );
};
// Sub-component for Profile Form
const ProfileForm = ({ initialData, onSave, theme, isDark }) => {
  const [formData, setFormData] = useState({
    name: initialData.name,
    email: initialData.email,
    password: '',
    assignedArea: initialData.area
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch full details including password
    const fetchFullDetails = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/auth/user?email=${encodeURIComponent(initialData.email)}`);
        if (res.data.user) {
          setFormData({
            name: res.data.user.name,
            email: res.data.user.email,
            password: res.data.user.password,
            assignedArea: res.data.user.assignedArea
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFullDetails();
  }, [initialData.email]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (loading) return <div style={{ color: theme.text, textAlign: 'center', padding: 50 }}>Loading profile details...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 800, margin: '0 auto' }}
    >
      <div style={{ background: theme.card, borderRadius: 24, border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '40px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(45,212,191,0.1) 100%)', borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 20px ${theme.accent}40` }}>
              <User size={40} color="white" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: theme.textMain }}>Administrator Profile</h2>
              <p style={{ margin: '4px 0 0 0', color: theme.text, fontSize: 14 }}>Manage your authority credentials and area assignment</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Official Name</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              style={{ width: '100%', padding: '14px 18px', borderRadius: 12, background: isDark ? 'rgba(0,0,0,0.2)' : '#f1f5f9', border: `1px solid ${theme.border}`, color: theme.textMain, fontSize: 15, fontWeight: 600 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Email Address</label>
            <input 
              type="email" 
              readOnly 
              value={formData.email} 
              style={{ width: '100%', padding: '14px 18px', borderRadius: 12, background: isDark ? 'rgba(0,0,0,0.4)' : '#e2e8f0', border: `1px solid ${theme.border}`, color: '#64748b', fontSize: 15, fontWeight: 600, cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Assigned Area</label>
            <select 
              value={formData.assignedArea} 
              onChange={(e) => setFormData({...formData, assignedArea: e.target.value})}
              style={{ width: '100%', padding: '14px 18px', borderRadius: 12, background: isDark ? 'rgba(0,0,0,0.2)' : '#f1f5f9', border: `1px solid ${theme.border}`, color: theme.textMain, fontSize: 15, fontWeight: 600 }}
            >
              <option value="Satna">Satna</option>
              <option value="Jabalpur">Jabalpur</option>
              <option value="Rewa">Rewa</option>
              <option value="Narsinghpur">Narsinghpur</option>
              <option value="Burhanpur">Burhanpur</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              style={{ width: '100%', padding: '14px 18px', borderRadius: 12, background: isDark ? 'rgba(0,0,0,0.2)' : '#f1f5f9', border: `1px solid ${theme.border}`, color: theme.textMain, fontSize: 15, fontWeight: 600 }}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 15, top: 38, background: 'none', border: 'none', color: theme.accent, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: 10 }}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              style={{ width: '100%', padding: '16px', borderRadius: 12, background: `linear-gradient(135deg, ${theme.accent} 0%, #1d4ed8 100%)`, color: 'white', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: `0 10px 20px ${theme.accent}30` }}
            >
              Save Profile Changes
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default AuthorityDashboard;
