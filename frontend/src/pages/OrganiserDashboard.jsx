import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';

export default function OrganiserDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Event Creation Modal Form State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [venue, setVenue] = useState('');
  const [capacity, setCapacity] = useState('');
  const [foodMenu, setFoodMenu] = useState('None');
  const [coordinatorName, setCoordinatorName] = useState('Organiser');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [entryFee, setEntryFee] = useState('');
  const [upiId, setUpiId] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    fetchEvents(false);

    // Live updates polling every 5 seconds
    const interval = setInterval(() => {
      fetchEvents(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const res = await fetch(`${API_BASE}/events`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
      setError('');
    } catch (err) {
      if (!isPoll) setError('Could not load events. Make sure the backend server is running.');
      console.error(err);
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title || !description || !date || !startTime || !endTime || !venue || !capacity) {
      setCreateError('All fields are required.');
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError('');
      
      // Check 3-month window limit
      const proposedDate = new Date(date);
      const today = new Date();
      const limitDate = new Date(today.getFullYear(), today.getMonth() + 3, 0, 23, 59, 59, 999);
      if (proposedDate > limitDate) {
        throw new Error('Event date must be within the next 3 months.');
      }

      if (dueDate) {
        const parsedDueDate = new Date(dueDate);
        if (parsedDueDate > proposedDate) {
          throw new Error('Registration deadline cannot be after the event date.');
        }
      }

      const normalizedVenue = venue.trim().replace(/\s+/g, ' ');
      const timeRange = `${startTime} - ${endTime}`;

      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          date,
          time: timeRange,
          venue: normalizedVenue,
          capacity: parseInt(capacity, 10),
          createdBy: 'Organiser',
          foodMenu,
          coordinatorName,
          coordinatorPhone,
          isPaid,
          entryFee: isPaid ? parseFloat(entryFee) : 0,
          upiId: isPaid ? upiId.trim() : '',
          dueDate: dueDate || undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create event.');
      }

      setTitle('');
      setDescription('');
      setDate('');
      setDueDate('');
      setStartTime('10:00');
      setEndTime('12:00');
      setVenue('');
      setCapacity('');
      setFoodMenu('None');
      setCoordinatorName('Organiser');
      setCoordinatorPhone('');
      setIsPaid(false);
      setEntryFee('');
      setUpiId('');
      setShowModal(false);
      fetchEvents(false);
    } catch (err) {
      setCreateError(err.message || 'An error occurred.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDeleteEvent = (eventId) => {
    setDeletingEventId(eventId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEvent = async () => {
    if (!deletingEventId) return;
    try {
      const res = await fetch(`${API_BASE}/events/${deletingEventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin'
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to cancel event.');
      }

      setShowDeleteConfirm(false);
      setDeletingEventId(null);
      setShowCancelSuccess(true);
      fetchEvents(false);
    } catch (err) {
      alert(err.message || 'An error occurred while deleting the event.');
    }
  };

  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  // Analytics helper metrics
  const totalRegistrationsCount = events.reduce((sum, e) => sum + (e.registrationCount || 0), 0);
  const totalCapacityCount = events.reduce((sum, e) => sum + (e.capacity || 0), 0);

  // Helper for row colors and icons to match Ventixe / Hubilo tables
  const getRowTheme = (index) => {
    const themes = [
      { text: 'text-card-pinkText', bg: 'bg-card-pink', icon: 'theater_comedy', label: 'IN PROGRESS', badge: 'bg-pink-50 text-pink-700' },
      { text: 'text-card-purpleText', bg: 'bg-card-purple', icon: 'celebration', label: 'OPEN', badge: 'bg-purple-50 text-purple-700' },
      { text: 'text-card-blueText', bg: 'bg-card-blue', icon: 'code', label: 'ACTIVE', badge: 'bg-blue-50 text-blue-700' },
      { text: 'text-card-greenText', bg: 'bg-card-green', icon: 'mic', label: 'OPEN', badge: 'bg-emerald-50 text-emerald-700' }
    ];
    return themes[index % themes.length];
  };

  return (
    <div className="space-y-8 animate-entrance">
      {/* Title section with Create button */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">Event Overview</h2>
          <p className="text-slate-500 mt-1.5 text-sm">Manage student registration metrics and check-ins in real-time.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create New Event
        </button>
      </section>

      {/* Ventixe style simple metric cards */}
      {!loading && !error && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-20 h-20 rounded-full bg-fuchsia-50 opacity-50 group-hover:scale-110 transition-transform"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">Total Active Events</p>
            <h3 className="text-4xl font-black text-slate-800 mt-3 relative z-10">{events.length}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-20 h-20 rounded-full bg-purple-50 opacity-50 group-hover:scale-110 transition-transform"></div>
            <div className="flex justify-between items-center relative z-10">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Bookings</p>
              <span className="px-2.5 py-0.5 bg-fuchsia-50 text-primary text-[8px] font-black rounded-full uppercase tracking-wider">Live</span>
            </div>
            <h3 className="text-4xl font-black text-slate-800 mt-3 relative z-10">{totalRegistrationsCount}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-20 h-20 rounded-full bg-emerald-50 opacity-50 group-hover:scale-110 transition-transform"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">Capacity Utilization</p>
            <h3 className="text-4xl font-black text-emerald-600 mt-3 relative z-10">
              {totalCapacityCount > 0 ? Math.round((totalRegistrationsCount / totalCapacityCount) * 100) : 0}%
            </h3>
          </div>
        </section>
      )}

      {/* Loading & Error */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 font-semibold text-sm">Loading admin dashboard...</p>
        </div>
      )}

      {error && (
        <div className="p-8 rounded-3xl bg-pink-50 border border-pink-100 text-pink-900 text-center space-y-4">
          <span className="material-symbols-outlined text-4xl text-primary">error</span>
          <p className="font-semibold text-lg">{error}</p>
        </div>
      )}

      {/* Clean Table Layout matching HUBILO/VENTIXE */}
      {!loading && !error && (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Chart 1: Bar Chart of Bookings */}
            <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
                  Bookings per Event
                </h4>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Roster Size</span>
              </div>
              
              <div className="h-48 w-full flex items-end justify-between px-2 pt-4">
                {events.map((e, idx) => {
                  const percent = e.capacity > 0 ? (e.registrationCount / e.capacity) * 100 : 0;
                  const barHeight = Math.max(Math.min(percent, 100), 5); // min 5% for visual visibility
                  const barGradients = [
                    'from-pink-500 to-fuchsia-600',
                    'from-purple-500 to-indigo-600',
                    'from-blue-500 to-sky-600',
                    'from-emerald-500 to-teal-600',
                    'from-orange-500 to-amber-600',
                    'from-rose-500 to-pink-600'
                  ];
                  const gradient = barGradients[idx % barGradients.length];
                  
                  return (
                    <div key={e._id} className="flex flex-col items-center flex-1 group">
                      <div className="w-6 sm:w-8 bg-slate-50 rounded-t-lg h-36 flex items-end relative overflow-hidden">
                        <div 
                          className={`w-full bg-gradient-to-t ${gradient} rounded-t-lg transition-all duration-1000 ease-out`}
                          style={{ height: `${barHeight}%` }}
                        ></div>
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 text-white text-[8px] font-bold py-1 px-1.5 rounded -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 pointer-events-none">
                          {e.registrationCount} Booked
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 mt-2 truncate w-12 sm:w-16 text-center" title={e.title}>
                        {e.title}
                      </span>
                    </div>
                  );
                })}
                {events.length === 0 && (
                  <div className="w-full text-center text-xs text-slate-400 py-12">
                    No event data available
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Daily Registrations Trend */}
            <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
                  7-Day Registration Trend
                </h4>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Signups</span>
              </div>
              
              <div className="relative h-48 w-full pt-4">
                <svg className="w-full h-full" viewBox="0 0 400 160">
                  <defs>
                    <linearGradient id="gradient-trend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D946EF" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#D946EF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line x1="30" y1="30" x2="370" y2="30" stroke="#F5F3FF" strokeWidth="1" />
                  <line x1="30" y1="75" x2="370" y2="75" stroke="#F5F3FF" strokeWidth="1" />
                  <line x1="30" y1="120" x2="370" y2="120" stroke="#F5F3FF" strokeWidth="1" />
                  
                  <path 
                    d="M 30 130 C 80 110, 130 140, 180 80 C 230 70, 280 110, 330 50 L 370 40" 
                    fill="none" 
                    stroke="#D946EF" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                  />
                  <path 
                    d="M 30 130 C 80 110, 130 140, 180 80 C 230 70, 280 110, 330 50 L 370 40 L 370 140 L 30 140 Z" 
                    fill="url(#gradient-trend)" 
                  />
                  <circle cx="30" cy="130" r="4" fill="#D946EF" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="180" cy="80" r="4" fill="#D946EF" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="330" cy="50" r="4" fill="#D946EF" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="370" cy="40" r="5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="2" />
                </svg>
                
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl overflow-hidden border border-purple-50 shadow-sm">
            <div className="p-6 border-b border-purple-50 bg-slate-50/50">
              <h3 className="font-bold text-base text-slate-800">Recent Event Ledger</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-purple-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                    <th className="py-4.5 px-6">Recent Event</th>
                    <th className="py-4.5 px-6">Event Day</th>
                    <th className="py-4.5 px-6">Venue</th>
                    <th className="py-4.5 px-6 text-center">Stats / Bookings</th>
                    <th className="py-4.5 px-6 text-center">Status</th>
                    <th className="py-4.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50/50">
                  {events.map((event, idx) => {
                    const percent = Math.round((event.registrationCount / event.capacity) * 100);
                    const isFull = event.registrationCount >= event.capacity;
                    const rowTheme = getRowTheme(idx);
                    return (
                      <tr key={event._id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl ${rowTheme.bg} ${rowTheme.text} flex items-center justify-center`}>
                              <span className="material-symbols-outlined text-[18px]">{rowTheme.icon}</span>
                            </div>
                            <span className="font-bold text-sm text-slate-800">{event.title}</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-6 text-xs text-slate-500 font-semibold">
                          {formatDate(event.date)}
                          <span className="block text-[10px] text-slate-400 font-medium">{event.time}</span>
                        </td>
                        <td className="py-4.5 px-6 text-xs text-slate-500 font-bold">{event.venue}</td>
                        <td className="py-4.5 px-6">
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs font-bold text-slate-700">
                              {event.registrationCount} <span className="text-slate-400 font-medium">/ {event.capacity}</span>
                            </span>
                            <div className="w-20 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full bg-primary`} 
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4.5 px-6 text-center">
                          <span className={`px-2.5 py-1 text-[9px] font-extrabold rounded-md uppercase tracking-wider ${isFull ? 'bg-red-50 text-red-600' : rowTheme.badge}`}>
                            {isFull ? 'CLOSED' : rowTheme.label}
                          </span>
                        </td>
                        <td className="py-4.5 px-6 text-right space-x-2">
                          <Link 
                            to={`/organiser/events/${event._id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-extrabold px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all border border-purple-50 uppercase tracking-wider"
                          >
                            Registrations
                          </Link>
                          <Link 
                            to={`/checkin/${event._id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-extrabold px-3 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl transition-all shadow-md shadow-primary/10 uppercase tracking-wider"
                          >
                            Scan
                          </Link>
                          <button 
                            onClick={() => handleDeleteEvent(event._id)}
                            className="inline-flex items-center gap-1 text-[10px] font-extrabold px-3 py-2 bg-pink-50 hover:bg-pink-100 text-primary border border-pink-100 rounded-xl transition-all uppercase tracking-wider"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400 text-xs font-bold">
                        No campus events registered. Click "Create New Event" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-purple-50 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-entrance">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Create Campus Event</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Initialize a new event schedule</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {createError && (
              <div className="p-4 bg-pink-50 border border-pink-100 text-pink-900 text-xs font-semibold rounded-2xl flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">error</span>
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-title">Event Title</label>
                <input 
                  id="modal-title"
                  required
                  type="text" 
                  placeholder="e.g. Code Red"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-desc">Description</label>
                <textarea 
                  id="modal-desc"
                  required
                  rows="3"
                  placeholder="Describe details, times, and capacity requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-date">Date</label>
                  <input 
                    id="modal-date"
                    required
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Timing</label>
                  <div className="flex gap-2">
                    <input 
                      required
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-1/2 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                    />
                    <input 
                      required
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-1/2 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-due">Registration Deadline (Due Date)</label>
                <input 
                  id="modal-due"
                  type="date"
                  placeholder="Optional (defaults to 1 day prior)"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-venue">Venue</label>
                  <input 
                    id="modal-venue"
                    required
                    type="text"
                    placeholder="Seminar Hall"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-cap">Capacity</label>
                  <input 
                    id="modal-cap"
                    required
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-food">Food Menu (Provided for Lunch/Dinner)</label>
                <input 
                  id="modal-food"
                  type="text" 
                  placeholder="e.g. Veg Biryani, Paneer Curry (Or 'None')"
                  value={foodMenu}
                  onChange={(e) => setFoodMenu(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-coord-name">Co-ordinator Name</label>
                  <input 
                    id="modal-coord-name"
                    required
                    type="text" 
                    placeholder="Coordinator Name"
                    value={coordinatorName}
                    onChange={(e) => setCoordinatorName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-coord-phone">Co-ordinator Phone</label>
                  <input 
                    id="modal-coord-phone"
                    required
                    type="text" 
                    placeholder="Phone number"
                    value={coordinatorPhone}
                    onChange={(e) => setCoordinatorPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-purple-50 pt-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-is-paid">Pricing Model</label>
                  <select 
                    id="modal-is-paid"
                    value={isPaid ? "paid" : "free"}
                    onChange={(e) => setIsPaid(e.target.value === "paid")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                  >
                    <option value="free">Free Admission</option>
                    <option value="paid">Paid Ticket</option>
                  </select>
                </div>

                {isPaid && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-fee">Entry Fee (₹)</label>
                      <input 
                        id="modal-fee"
                        required
                        type="number"
                        min="1"
                        placeholder="e.g. 150"
                        value={entryFee}
                        onChange={(e) => setEntryFee(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="modal-upi">GPay UPI ID</label>
                      <input 
                        id="modal-upi"
                        required
                        type="text"
                        placeholder="e.g. host@okaxis"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-purple-50 transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createSubmitting}
                  className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 uppercase tracking-wider"
                >
                  {createSubmitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled cancellation confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-purple-50 shadow-2xl space-y-6 text-center animate-entrance">
            <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center text-primary mx-auto">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Cancel Event?</h3>
              <p className="text-xs font-bold text-slate-400">
                Are you sure you want to cancel and delete this event? This will notify all registered participants. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => { setShowDeleteConfirm(false); setDeletingEventId(null); }}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-purple-50 transition-colors uppercase tracking-wider"
              >
                Keep Event
              </button>
              <button 
                onClick={confirmDeleteEvent}
                className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 uppercase tracking-wider"
              >
                Cancel Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* cancellation success modal */}
      {showCancelSuccess && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-purple-50 shadow-2xl space-y-6 text-center animate-entrance">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-4xl font-extrabold">check</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-800 leading-none">Event Cancelled</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                The event has been successfully cancelled and deleted. Enrolled participants have been notified.
              </p>
            </div>
            <button 
              onClick={() => setShowCancelSuccess(false)}
              className="w-full py-3 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs font-extrabold transition-colors shadow-lg shadow-primary/20 uppercase tracking-widest"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
