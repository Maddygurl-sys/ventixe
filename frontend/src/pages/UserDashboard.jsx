import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';

export default function UserDashboard() {
  const [myEvents, setMyEvents] = useState([]);
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
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [entryFee, setEntryFee] = useState('');
  const [upiId, setUpiId] = useState('');
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' or 'hosting'
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);

  // Success Modal State (Green Tick Popup)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{"name":"Guest","email":"","role":"user"}');

  useEffect(() => {
    fetchMyBookings();
    fetchMyEvents(false);
    
    // Live updates polling every 5 seconds
    const interval = setInterval(() => {
      fetchMyBookings();
      fetchMyEvents(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchMyBookings = async () => {
    try {
      setLoadingBookings(true);
      const res = await fetch(`${API_BASE}/my-bookings/list?studentName=${user.name}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setMyBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchMyEvents = async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const res = await fetch(`${API_BASE}/events/my-events?username=${user.name}`);
      if (!res.ok) throw new Error('Failed to fetch your events');
      const data = await res.json();
      setMyEvents(data);
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
          createdBy: user.name,
          foodMenu,
          coordinatorName: coordinatorName || user.name,
          coordinatorPhone,
          isPaid,
          entryFee: isPaid ? parseFloat(entryFee) : 0,
          upiId: isPaid ? upiId.trim() : ''
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create event.');
      }

      // Clear form
      setTitle('');
      setDescription('');
      setDate('');
      setStartTime('10:00');
      setEndTime('12:00');
      setVenue('');
      setCapacity('');
      setFoodMenu('None');
      setCoordinatorName('');
      setCoordinatorPhone('');
      setIsPaid(false);
      setEntryFee('');
      setUpiId('');
      setShowModal(false);
      
      // Show green tick success popup
      setSuccessMsg(`Your event proposal for "${data.title}" was submitted successfully. Waiting for admin approval.`);
      setShowSuccessPopup(true);
      
      fetchMyEvents(false);
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
          username: user.name
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to cancel event.');
      }

      setShowDeleteConfirm(false);
      setDeletingEventId(null);
      setShowCancelSuccess(true);
      fetchMyEvents(false);
    } catch (err) {
      alert(err.message || 'An error occurred while deleting the event.');
    }
  };

  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  // Only consider approved events for analytics/graphs
  const approvedEvents = myEvents.filter(e => e.status === 'approved');
  
  const totalRegistrationsCount = approvedEvents.reduce((sum, e) => sum + (e.registrationCount || 0), 0);
  const totalCapacityCount = approvedEvents.reduce((sum, e) => sum + (e.capacity || 0), 0);

  const getRowTheme = (index) => {
    const themes = [
      { text: 'text-card-pinkText', bg: 'bg-card-pink', icon: 'theater_comedy' },
      { text: 'text-card-purpleText', bg: 'bg-card-purple', icon: 'celebration' },
      { text: 'text-card-blueText', bg: 'bg-card-blue', icon: 'code' },
      { text: 'text-card-greenText', bg: 'bg-card-green', icon: 'mic' }
    ];
    return themes[index % themes.length];
  };

  return (
    <div className="space-y-8 animate-entrance">
      {/* Title section with Create button */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">My Portal Dashboard</h2>
          <p className="text-slate-500 mt-1.5 text-sm">View your booked tickets, host your own events, and track analytics.</p>
        </div>
        <button 
          onClick={() => {
            setActiveTab('hosting');
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Host New Event
        </button>
      </section>

      {/* Tab Switcher */}
      <div className="flex gap-6 border-b border-purple-50 pb-px">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'bookings' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          My Booked Tickets ({myBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('hosting')}
          className={`pb-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'hosting' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          My Hosted Events ({myEvents.length})
        </button>
      </div>

      {/* Loading & Error */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 font-semibold text-sm">Loading your host workspace...</p>
        </div>
      )}

      {error && (
        <div className="p-8 rounded-3xl bg-pink-50 border border-pink-100 text-pink-900 text-center space-y-4">
          <span className="material-symbols-outlined text-4xl text-primary">error</span>
          <p className="font-semibold text-lg">{error}</p>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && (
        <>
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              {loadingBookings && myBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-semibold text-xs">Loading tickets...</p>
                </div>
              ) : myBookings.length === 0 ? (
                <div className="p-16 rounded-3xl text-center bg-white border border-purple-50 space-y-6 shadow-sm max-w-2xl mx-auto animate-entrance">
                  <div className="w-20 h-20 bg-fuchsia-50 rounded-full flex items-center justify-center mx-auto text-primary">
                    <span className="material-symbols-outlined text-4xl">local_activity</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold text-slate-800">No Tickets Booked Yet</h3>
                    <p className="text-slate-500 text-xs font-medium max-w-md mx-auto leading-relaxed">
                      You haven't registered for any events yet. Head over to the Book Events hub, find events that interest you, and book your tickets!
                    </p>
                  </div>
                  <Link
                    to="/events"
                    className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    Explore Events Hub
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-entrance">
                  {myBookings.map((reg) => {
                    const event = reg.eventId;
                    if (!event) return null;
                    const isPast = new Date(event.date) < new Date();
                    
                    return (
                      <div key={reg._id} className="bg-white rounded-3xl border border-purple-50 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
                        <div className="p-6 space-y-4">
                          <div className="flex justify-between items-start">
                            <span className="px-2.5 py-1 bg-fuchsia-50 text-primary text-[9px] font-black rounded-lg uppercase tracking-wider">
                              {event.venue}
                            </span>
                            {isPast ? (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-bold rounded uppercase">Ended</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[8px] font-bold rounded uppercase">Upcoming</span>
                            )}
                          </div>
                          
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-base leading-snug">{event.title}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} | {event.time}</p>
                          </div>

                          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 bg-slate-50 p-3 rounded-2xl border border-purple-50/50">
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">restaurant</span>
                              <span className="capitalize">{reg.foodPreference || 'None'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">payments</span>
                              <span className="capitalize text-emerald-600">{reg.paymentStatus === 'paid' ? `Paid (₹${event.entryFee})` : 'Free'}</span>
                            </div>
                            {reg.checkedIn && (
                              <div className="flex items-center gap-1 text-emerald-600 ml-auto">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                <span>Admitted</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-purple-50/50">
                          <button
                            onClick={() => setSelectedPass(reg)}
                            className="w-full py-2.5 bg-white border border-purple-50 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[16px]">qr_code</span>
                            View Ticket QR
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'hosting' && (
            <>
          {approvedEvents.length === 0 ? (
            /* Empty state when no approved events */
            <div className="p-16 rounded-3xl text-center bg-white border border-purple-50 space-y-6 shadow-sm max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-fuchsia-50 rounded-full flex items-center justify-center mx-auto text-primary">
                <span className="material-symbols-outlined text-4xl">dashboard_customize</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-800">Your Dashboard is Empty</h3>
                <p className="text-slate-500 text-xs font-medium max-w-md mx-auto leading-relaxed">
                  You haven't hosted any approved events yet. Submit an event proposal, and once the admin approves it, you will see real-time check-in and booking analytics right here!
                </p>
              </div>
              
              {/* Show proposed events list if any are pending/declined */}
              {myEvents.length > 0 && (
                <div className="border-t border-purple-50 pt-6 text-left space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proposal Status Log</h4>
                  <div className="space-y-2.5">
                    {myEvents.map(e => (
                      <div key={e._id} className="flex justify-between items-center bg-slate-50 p-4.5 rounded-2xl border border-purple-50/50">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{e.title}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{e.venue} | {formatDate(e.date)}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-[8px] font-black rounded-lg uppercase tracking-wider ${
                          e.status === 'pending' ? 'bg-purple-50 text-purple-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {e.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Host Your First Event
              </button>
            </div>
          ) : (
            /* Active host dashboard */
            <>
              {/* Metric cards */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm relative overflow-hidden group">
                  <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-20 h-20 rounded-full bg-fuchsia-50 opacity-50 group-hover:scale-110 transition-transform"></div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">My Active Events</p>
                  <h3 className="text-4xl font-black text-slate-800 mt-3 relative z-10">{approvedEvents.length}</h3>
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

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* SVG Bar Chart */}
                <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <h4 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
                      Bookings per Event
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Roster Size</span>
                  </div>
                  
                  <div className="h-48 w-full flex items-end justify-between px-2 pt-4">
                    {approvedEvents.map((e, idx) => {
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
                  </div>
                </div>

                {/* SVG Allocation Pie Chart */}
                <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm space-y-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <h4 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">pie_chart</span>
                      Global Seat Distribution
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Capacities</span>
                  </div>

                  {(() => {
                    const percentage = totalCapacityCount > 0 ? (totalRegistrationsCount / totalCapacityCount) * 100 : 0;
                    const radius = 40;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (percentage / 100) * circumference;
                    
                    return (
                      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 flex-1 py-4">
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#F5F3FF" strokeWidth="8" />
                            <circle 
                              cx="50" 
                              cy="50" 
                              r={radius} 
                              fill="transparent" 
                              stroke="#D946EF" 
                              strokeWidth="8" 
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-lg font-black text-slate-800">{totalRegistrationsCount}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Seats</span>
                          </div>
                        </div>

                        <div className="text-xs space-y-2.5 font-semibold text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                            <span>Claimed Seats: <strong className="text-slate-800">{totalRegistrationsCount}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-100 inline-block"></span>
                            <span>Seats Available: <strong className="text-slate-800">{totalCapacityCount - totalRegistrationsCount}</strong></span>
                          </div>
                          <p className="text-[9px] uppercase font-bold text-slate-400 pt-2 border-t border-purple-50">
                            Combined Limit: {totalCapacityCount}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Event Ledger Table */}
              <div className="bg-white rounded-3xl overflow-hidden border border-purple-50 shadow-sm">
                <div className="p-6 border-b border-purple-50 bg-slate-50/50">
                  <h3 className="font-bold text-base text-slate-800">My Hosted Event Ledger</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-purple-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                        <th className="py-4.5 px-6">Event</th>
                        <th className="py-4.5 px-6">Event Day</th>
                        <th className="py-4.5 px-6">Venue</th>
                        <th className="py-4.5 px-6 text-center">Registrations</th>
                        <th className="py-4.5 px-6 text-center">Status</th>
                        <th className="py-4.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50/50">
                      {myEvents.map((event, idx) => {
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
                                    className="h-full rounded-full bg-primary" 
                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4.5 px-6 text-center">
                              <span className={`px-2.5 py-1 text-[9px] font-extrabold rounded-md uppercase tracking-wider ${
                                event.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                                event.status === 'pending' ? 'bg-purple-50 text-purple-700' : 'bg-red-50 text-red-600'
                              }`}>
                                {event.status}
                              </span>
                            </td>
                            <td className="py-4.5 px-6 text-right space-x-2">
                              {event.status === 'approved' && (
                                <>
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
                                </>
                              )}
                              {event.status === 'pending' && (
                                <span className="text-slate-400 text-[10px] font-bold italic uppercase mr-2 tracking-wide">Pending Approval</span>
                              )}
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
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
      </>
      )}

      {/* Creation Modal (Host New Event Form) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-purple-50 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-entrance text-left">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Host New Event</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Submit your program request for approval</p>
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
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="host-modal-title">Event Title</label>
                <input 
                  id="host-modal-title"
                  required
                  type="text" 
                  placeholder="e.g. Mic Drop"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="host-modal-desc">Description</label>
                <textarea 
                  id="host-modal-desc"
                  required
                  rows="3"
                  placeholder="Describe your event content and rules..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="host-modal-date">Date</label>
                  <input 
                    id="host-modal-date"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="host-modal-venue">Venue</label>
                  <input 
                    id="host-modal-venue"
                    required
                    type="text"
                    placeholder="College Lawn"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="host-modal-cap">Capacity</label>
                  <input 
                    id="host-modal-cap"
                    required
                    type="number"
                    min="1"
                    placeholder="e.g. 80"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="host-modal-food">Food Menu (Provided for Lunch/Dinner)</label>
                <input 
                  id="host-modal-food"
                  type="text" 
                  placeholder="e.g. Veg Biryani, Paneer Curry (Or 'None')"
                  value={foodMenu}
                  onChange={(e) => setFoodMenu(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="host-modal-coord-name">Co-ordinator Name</label>
                  <input 
                    id="host-modal-coord-name"
                    required
                    type="text" 
                    placeholder="Coordinator Name"
                    value={coordinatorName}
                    onChange={(e) => setCoordinatorName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/25"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="host-modal-coord-phone">Co-ordinator Phone</label>
                  <input 
                    id="host-modal-coord-phone"
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
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="host-modal-is-paid">Pricing Model</label>
                  <select 
                    id="host-modal-is-paid"
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
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="host-modal-fee">Entry Fee (₹)</label>
                      <input 
                        id="host-modal-fee"
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
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="host-modal-upi">GPay UPI ID</label>
                      <input 
                        id="host-modal-upi"
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
                  {createSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Popup with Green Tick */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-purple-50 shadow-2xl space-y-6 text-center animate-entrance">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-4xl font-extrabold">check</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-800 leading-none">Proposal Submitted</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                {successMsg}
              </p>
            </div>

            <button 
              onClick={() => setShowSuccessPopup(false)}
              className="w-full py-3 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs font-extrabold transition-colors shadow-lg shadow-primary/20 uppercase tracking-widest"
            >
              Close
            </button>
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
                Your event has been successfully cancelled and deleted. Enrolled participants and Admin have been notified.
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
      {/* Boarding Pass Modal */}
      {selectedPass && selectedPass.eventId && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-0 max-w-sm w-full border border-purple-50 shadow-2xl overflow-hidden animate-entrance relative">
            <div className="bg-gradient-to-tr from-primary to-accent p-6 text-white text-center">
              <button 
                onClick={() => setSelectedPass(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-[20px] text-white">local_activity</span>
              </div>
              <h3 className="text-lg font-black tracking-tight leading-none">Ventixe Ticket Pass</h3>
              <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest mt-1.5">{selectedPass.eventId.venue}</p>
            </div>

            <div className="p-6 text-center space-y-6 relative bg-white">
              {/* Boarding pass circular notches */}
              <div className="absolute top-0 -left-3 w-6 h-6 bg-surface rounded-full border-r border-purple-50"></div>
              <div className="absolute top-0 -right-3 w-6 h-6 bg-surface rounded-full border-l border-purple-50"></div>

              <div className="border-t border-dashed border-purple-50/80 pt-4 flex justify-center">
                <div className="bg-slate-50 p-3 rounded-2xl border border-purple-50">
                  <img 
                    alt="Ticket QR Code" 
                    className="w-40 h-40 mx-auto" 
                    src={selectedPass.qrCode} 
                  />
                </div>
              </div>

              <div className="text-left bg-slate-50 p-4 rounded-2xl text-xs space-y-2 border border-purple-50 font-semibold text-slate-600">
                <p><span className="text-slate-400">Pass ID:</span> <span className="font-mono text-[10px]">{selectedPass._id}</span></p>
                <p><span className="text-slate-400">Attendee:</span> {selectedPass.studentName}</p>
                <p><span className="text-slate-400">Email:</span> {selectedPass.studentEmail}</p>
                <p><span className="text-slate-400">Event:</span> {selectedPass.eventId.title}</p>
                <p><span className="text-slate-400">Date/Time:</span> {new Date(selectedPass.eventId.date).toLocaleDateString()} | {selectedPass.eventId.time}</p>
                <p><span className="text-slate-400">Food Choice:</span> <span className="capitalize">{selectedPass.foodPreference}</span></p>
                <p>
                  <span className="text-slate-400">Payment:</span>{' '}
                  {selectedPass.paymentStatus === 'paid' ? (
                    <span className="text-green-600 font-extrabold">Paid (₹{selectedPass.eventId.entryFee})</span>
                  ) : (
                    <span className="text-slate-500 font-bold">Free</span>
                  )}
                </p>
                {selectedPass.upiTransactionId && (
                  <p><span className="text-slate-400">TXN Ref:</span> <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono">{selectedPass.upiTransactionId}</code></p>
                )}
              </div>

              <button 
                onClick={() => setSelectedPass(null)}
                className="w-full py-3 bg-fuchsia-50 hover:bg-fuchsia-100 text-primary rounded-xl text-xs font-extrabold transition-colors border border-purple-100 uppercase tracking-wider"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
