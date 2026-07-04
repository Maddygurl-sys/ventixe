import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { API_BASE } from '../config';

export default function Layout({ children }) {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedRequestNotification, setSelectedRequestNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{"name":"Guest","email":"","role":"user"}');
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (!user || !user.name || user.name === 'Guest') return;
    
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/notifications?username=${user.name}`);
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map((noti) => ({
            id: noti._id,
            title: noti.title,
            description: noti.message,
            time: new Date(noti.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            type: noti.type,
            status: noti.status,
            sender: noti.sender,
            relatedEvent: noti.relatedEvent,
            isRead: noti.isRead
          }));
          setNotifications(formatted);
        }
      } catch (e) {
        console.warn("Failed to fetch notifications:", e);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); 
    return () => clearInterval(interval);
  }, [user?.name]);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const clearNotifications = async () => {
    try {
      await fetch(`${API_BASE}/auth/notifications/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.name })
      });
      setNotifications([]);
    } catch (e) {
      console.warn("Failed to clear notifications:", e);
    }
  };

  const handleNotificationClick = (noti) => {
    if (isAdmin && noti.type === 'EVENT_REQUEST' && noti.status === 'pending') {
      setSelectedRequestNotification(noti);
      setShowNotifications(false);
    }
  };

  const handleApproval = async (action) => {
    if (!selectedRequestNotification) return;
    try {
      const res = await fetch(`${API_BASE}/auth/notifications/${selectedRequestNotification.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        setSelectedRequestNotification(null);
        // Refresh notifications
        const notiRes = await fetch(`${API_BASE}/auth/notifications?username=${user.name}`);
        if (notiRes.ok) {
          const data = await notiRes.json();
          const formatted = data.map((noti) => ({
            id: noti._id,
            title: noti.title,
            description: noti.message,
            time: new Date(noti.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            type: noti.type,
            status: noti.status,
            sender: noti.sender,
            relatedEvent: noti.relatedEvent,
            isRead: noti.isRead
          }));
          setNotifications(formatted);
        }
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to submit response.');
      }
    } catch (e) {
      console.error(e);
      alert('Error sending response.');
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-white border-b border-purple-50">
        <div className="flex justify-between items-center px-8 h-20 w-full max-w-container-max mx-auto">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-fuchsia-50 p-1.5 border border-purple-100">
              <img src="/logo.png" alt="Ventixe Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Ventixe<span className="text-primary">.</span>
            </h1>
          </Link>
          <div className="flex items-center gap-6">
            {/* Notification Bell with Popup dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-colors ${
                  showNotifications ? 'bg-fuchsia-50 text-primary' : 'hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {notifications.length > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl border border-purple-50 shadow-2xl p-6 z-50 animate-entrance text-left space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-purple-50">
                      <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Portal Alerts</h4>
                      <button onClick={clearNotifications} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wide">Clear</button>
                    </div>
                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                      {notifications.map(n => {
                        const isPendingRequest = isAdmin && n.type === 'EVENT_REQUEST' && n.status === 'pending';
                        return (
                          <div 
                            key={n.id} 
                            onClick={() => handleNotificationClick(n)}
                            className={`text-xs border-b border-purple-50/30 pb-3 last:border-0 last:pb-0 space-y-1 ${
                              isPendingRequest ? 'cursor-pointer hover:bg-fuchsia-50/30 p-1.5 rounded-xl transition-all' : ''
                            }`}
                          >
                            <div className="flex justify-between font-bold text-slate-800">
                              <span className={`px-2 py-0.5 text-[8px] rounded uppercase font-black tracking-wider ${
                                n.type === 'EVENT_APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                                n.type === 'EVENT_DECLINED' ? 'bg-rose-50 text-rose-700' :
                                isPendingRequest ? 'bg-purple-50 text-purple-700' : 'bg-fuchsia-50 text-primary'
                              }`}>
                                {n.title}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">{n.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold leading-normal">{n.description}</p>
                            {isPendingRequest && (
                              <span className="block text-[8px] text-primary uppercase font-black tracking-wider mt-1 hover:underline">
                                Click to review request →
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {notifications.length === 0 && (
                        <div className="text-center py-8 space-y-2">
                          <span className="material-symbols-outlined text-slate-300 text-3xl">notifications_off</span>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No active notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 border-l border-slate-100 pl-6">
              <div className="w-10 h-10 rounded-full border-2 border-white ring-1 ring-primary/20 overflow-hidden shadow-sm bg-slate-50 flex items-center justify-center">
                <img 
                  alt="Profile" 
                  className="w-full h-full object-contain p-1" 
                  src="/logo.png"
                />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-800">{user.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="fixed left-0 top-0 h-full z-40 w-72 hidden lg:flex flex-col bg-white border-r border-purple-50 pt-28 pb-8">
        <div className="px-6 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 px-4">Menu</p>
            <nav className="space-y-1.5">
              {/* Dashboard Link - for everyone */}
              <Link 
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all relative ${
                  (isAdmin && location.pathname.startsWith('/organiser/dashboard')) || (!isAdmin && location.pathname.startsWith('/dashboard'))
                    ? 'bg-fuchsia-50/50 text-primary' 
                    : 'text-slate-500 hover:text-primary hover:bg-slate-50/50'
                }`} 
                to={isAdmin ? "/organiser/dashboard" : "/dashboard"}
              >
                {((isAdmin && location.pathname.startsWith('/organiser/dashboard')) || (!isAdmin && location.pathname.startsWith('/dashboard'))) && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full"></span>
                )}
                <span className={`material-symbols-outlined text-[22px] ${((isAdmin && location.pathname.startsWith('/organiser/dashboard')) || (!isAdmin && location.pathname.startsWith('/dashboard'))) ? 'text-primary' : 'text-slate-400'}`}>
                  dashboard
                </span>
                <span>Dashboard</span>
              </Link>

              {/* Book Events Link - for everyone */}
              <Link 
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all relative ${
                  isActive('/') && !location.pathname.startsWith('/organiser/dashboard') && !location.pathname.startsWith('/dashboard')
                    ? 'bg-fuchsia-50/50 text-primary' 
                    : 'text-slate-500 hover:text-primary hover:bg-slate-50/50'
                }`} 
                to={isAdmin ? "/events" : "/"}
              >
                {(isActive('/') && !location.pathname.startsWith('/organiser/dashboard') && !location.pathname.startsWith('/dashboard')) && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full"></span>
                )}
                <span className={`material-symbols-outlined text-[22px] ${(isActive('/') && !location.pathname.startsWith('/organiser/dashboard') && !location.pathname.startsWith('/dashboard')) ? 'text-primary' : 'text-slate-400'}`}>
                  calendar_month
                </span>
                <span>Book Events</span>
              </Link>
            </nav>
          </div>

          {/* Logout Button */}
          <div className="px-4">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold text-slate-500 hover:text-primary hover:bg-pink-50/50 transition-all border border-transparent hover:border-pink-100"
            >
              <span className="material-symbols-outlined text-[22px] text-slate-400 group-hover:text-primary">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
        
        <div className="px-8 mt-6">
          <div className="p-4 bg-gradient-to-br from-primary to-accent rounded-2xl text-white shadow-lg shadow-primary/20">
            <p className="text-[11px] font-bold opacity-80 tracking-widest uppercase mb-1">PRO BUNDLE</p>
            <p className="text-xs font-semibold">Ventixe Premium Hack</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="pt-28 pb-32 lg:pl-80 px-margin-mobile md:px-12 max-w-container-max mx-auto">
        {children}
      </main>

      {/* Mobile Navigation Shell */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 pb-safe bg-white border-t border-purple-50 lg:hidden shadow-xl">
        <Link 
          className={`flex flex-col items-center justify-center ${location.pathname.startsWith('/organiser/dashboard') || location.pathname.startsWith('/dashboard') ? 'text-primary' : 'text-slate-400'}`} 
          to={isAdmin ? "/organiser/dashboard" : "/dashboard"}
        >
          <span className="material-symbols-outlined text-[24px]">dashboard</span>
          <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">Dashboard</span>
        </Link>
        
        <Link 
          className={`flex flex-col items-center justify-center ${isActive('/') && !location.pathname.startsWith('/organiser/dashboard') && !location.pathname.startsWith('/dashboard') ? 'text-primary' : 'text-slate-400'}`} 
          to={isAdmin ? "/events" : "/"}
        >
          <span className="material-symbols-outlined text-[24px]">calendar_month</span>
          <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">Book</span>
        </Link>

        <button 
          onClick={handleLogout}
          className="flex flex-col items-center justify-center text-slate-400"
        >
          <span className="material-symbols-outlined text-[24px]">logout</span>
          <span className="text-[10px] font-bold mt-1 uppercase tracking-widest">Exit</span>
        </button>
      </nav>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-purple-50 hidden lg:block">
        <div className="w-full py-10 px-12 flex justify-between items-center max-w-container-max mx-auto pl-80">
          <div className="text-sm font-bold text-slate-700">Ventixe<span className="text-primary">.</span> {user.role === 'admin' ? 'Admin' : 'Student'}</div>
          <p className="text-[11px] font-semibold text-slate-400">© 2026 Ventixe Event Technologies.</p>
        </div>
      </footer>

      {/* Admin Approval Request Modal */}
      {selectedRequestNotification && selectedRequestNotification.relatedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-purple-50 shadow-2xl space-y-6 animate-entrance text-left">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
                  Host Proposal
                </span>
                <h3 className="text-xl font-extrabold text-slate-800 mt-3 leading-tight">
                  {selectedRequestNotification.relatedEvent.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedRequestNotification(null)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {selectedRequestNotification.relatedEvent.description}
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-2 border border-purple-50 font-semibold text-slate-600">
              <p><span className="text-slate-400">Proposed Host:</span> {selectedRequestNotification.sender}</p>
              <p><span className="text-slate-400">Date:</span> {new Date(selectedRequestNotification.relatedEvent.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><span className="text-slate-400">Time Slot:</span> {selectedRequestNotification.relatedEvent.time}</p>
              <p><span className="text-slate-400">Venue:</span> {selectedRequestNotification.relatedEvent.venue}</p>
              <p><span className="text-slate-400">Expected Capacity:</span> {selectedRequestNotification.relatedEvent.capacity} seats</p>
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => handleApproval('decline')}
                className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors uppercase tracking-wider"
              >
                Decline
              </button>
              <button 
                onClick={() => handleApproval('approve')}
                className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold text-center transition-all shadow-lg shadow-primary/20 uppercase tracking-wider"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
