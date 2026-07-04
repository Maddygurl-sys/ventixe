import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [foodPreference, setFoodPreference] = useState('none');
  const [submitting, setSubmitting] = useState(false);
  const [successRegistration, setSuccessRegistration] = useState(null);

  const [clashError, setClashError] = useState(null);
  const [bypassClash, setBypassClash] = useState(false);

  const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canDelete = loggedUser.name && (
    loggedUser.name.toLowerCase() === 'admin' || 
    (event && event.createdBy && event.createdBy.toLowerCase() === loggedUser.name.toLowerCase())
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const handleDeleteEvent = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEvent = async () => {
    try {
      const res = await fetch(`${API_BASE}/events/${event._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loggedUser.name
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to cancel event.');
      }

      setShowDeleteConfirm(false);
      setShowCancelSuccess(true);
    } catch (err) {
      alert(err.message || 'An error occurred while deleting the event.');
    }
  };

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/events/${id}`);
      if (!res.ok) throw new Error('Event not found');
      const data = await res.json();
      setEvent(data);
    } catch (err) {
      setError(err.message || 'Could not fetch event details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!name || !email || !phone) return;

    // Open checkout modal first if event is paid and we haven't paid yet
    if (event.isPaid && !showCheckoutModal) {
      setShowCheckoutModal(true);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const payload = {
        studentName: name,
        studentEmail: email,
        studentPhone: phone,
        foodPreference,
        bypassClash,
        quantity
      };

      if (event.isPaid) {
        payload.paymentStatus = 'paid';
        payload.upiTransactionId = upiTransactionId;
      }

      const response = await fetch(`${API_BASE}/events/${id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.status === 409 && data.clash) {
        setClashError(data);
        setSubmitting(false);
        setShowCheckoutModal(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to register.');
      }

      setSuccessRegistration(data);
      setClashError(null);
      setError('');
      setShowCheckoutModal(false);
      setUpiTransactionId('');
      setEvent(prev => prev ? { ...prev, registrationCount: prev.registrationCount + quantity } : null);
    } catch (err) {
      setError(err.message || 'An error occurred during registration.');
      setShowCheckoutModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold text-sm">Loading event details...</p>
      </div>
    );
  }

  if (error && !event && !showCancelSuccess) {
    return (
      <div className="p-8 rounded-3xl bg-pink-50 border border-pink-100 text-pink-900 text-center space-y-4 max-w-xl mx-auto">
        <span className="material-symbols-outlined text-4xl text-primary">error</span>
        <p className="font-semibold text-lg">{error}</p>
        <Link to="/" className="inline-block px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-colors shadow-lg shadow-primary/25">
          Return to Events Hub
        </Link>
      </div>
    );
  }

  const isFull = event.registrationCount >= event.capacity;
  const today = new Date();
  let dueDate;
  if (event.dueDate) {
    dueDate = new Date(event.dueDate);
    dueDate.setHours(23, 59, 59, 999);
  } else {
    const eventDate = new Date(event.date);
    dueDate = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    dueDate.setUTCHours(23, 59, 59, 999);
  }
  const isPastDeadline = today > dueDate;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-entrance">
      {/* Back button */}
      <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary font-bold text-xs transition-colors tracking-wide uppercase">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Events Hub
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Event details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 rounded-3xl bg-white border border-purple-50 shadow-sm space-y-6">
            <div>
              <span className="px-3.5 py-1.5 bg-fuchsia-50 text-primary text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
                {event.venue}
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 mt-4 leading-none">{event.title}</h2>
            </div>
            
            <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line">
              {event.description}
            </p>

            <hr className="border-purple-50/50" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-50/50 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Date</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{formatDate(event.date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-50/50 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Time Slot</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{event.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-50/50 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Venue</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{event.venue}</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-50/50 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">group</span>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Bookings status</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    {event.registrationCount} / {event.capacity} Registered
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-pink-50/50 flex items-center justify-center text-rose-500">
                  <span className="material-symbols-outlined">event_busy</span>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Registration deadline</p>
                  <p className="text-sm font-bold text-rose-600 mt-1">
                    {dueDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Coordinator Name */}
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-50/50 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Co-ordinator</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{event.coordinatorName || 'Organiser'}</p>
                </div>
              </div>

              {/* Coordinator Phone */}
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-50/50 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">call</span>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Coordinator Phone</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">{event.coordinatorPhone || 'N/A'}</p>
                </div>
              </div>

              {/* Food Menu */}
              <div className="flex items-center gap-3.5 md:col-span-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50/50 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined">restaurant</span>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Food Provided</p>
                  <p className="text-sm font-bold text-emerald-700 mt-1">
                    {event.foodMenu && event.foodMenu !== 'None' ? `${event.foodMenu}` : 'No Food Provided'}
                  </p>
                </div>
              </div>

              {/* Admission Fee (Pricing) */}
              <div className="flex items-center gap-3.5 md:col-span-2">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${event.isPaid ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Admission Fee</p>
                  <p className={`text-sm font-bold mt-1 ${event.isPaid ? 'text-amber-700' : 'text-green-700'}`}>
                    {event.isPaid ? `₹${event.entryFee} (GPay UPI Only)` : 'Free Admission'}
                  </p>
                </div>
              </div>
            </div>
            
            {canDelete && (
              <div className="pt-4 border-t border-purple-50 flex justify-end">
                <button 
                  onClick={handleDeleteEvent}
                  className="px-5 py-2.5 bg-pink-50 hover:bg-pink-100 text-primary border border-pink-100 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                  Cancel / Delete Event
                </button>
              </div>
            )}
          </div>

          {/* Seat Capacity Utilisation (Pie Chart) & Attendee Guide */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Pie Chart Card (Left Corner) */}
            <div className="p-6 rounded-3xl bg-white border border-purple-50 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">pie_chart</span>
                  Seat Allocation
                </h4>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-black">Roster Fill</span>
              </div>

              {(() => {
                const filled = event.registrationCount || 0;
                const capacity = event.capacity || 100;
                const left = Math.max(capacity - filled, 0);
                const fillPercent = capacity > 0 ? Math.round((filled / capacity) * 100) : 0;
                
                const radius = 40;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (fillPercent / 100) * circumference;

                return (
                  <div className="flex items-center justify-around gap-4 py-2">
                    <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle 
                          cx="50" 
                          cy="50" 
                          r={radius} 
                          fill="transparent" 
                          stroke="#F5F3FF" 
                          strokeWidth="8" 
                        />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r={radius} 
                          fill="transparent" 
                          stroke="#D946EF" 
                          strokeWidth="8" 
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-sm font-black text-slate-800">{fillPercent}%</span>
                        <p className="text-[7px] text-slate-400 uppercase font-black tracking-widest leading-none">Full</p>
                      </div>
                    </div>

                    <div className="text-left text-[11px] font-bold text-slate-500 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                        <span>Seats Claimed: <strong className="text-slate-800">{filled}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-100 border border-purple-50 inline-block"></span>
                        <span>Seats Available: <strong className="text-slate-800">{left}</strong></span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase border-t border-slate-50 pt-1 mt-1">Total Cap: {capacity}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Creativity Card: Live Entrance Policy Guide (Right Corner) */}
            <div className="p-6 rounded-3xl bg-white border border-purple-50 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">verified_user</span>
                  Entry Checklist
                </h4>
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Access Pass</span>
              </div>

              <ul className="text-[11px] font-bold text-slate-500 space-y-2.5">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">qr_code</span>
                  <span>QR Ticket entry pass scan verified at door.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">schedule</span>
                  <span>Arrival strictly recommended 10m prior.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">block</span>
                  <span>One validation check per registered email.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Registration or ticket */}
        <div className="lg:col-span-1">
          {successRegistration ? (() => {
            const tickets = successRegistration.registrations || [successRegistration];
            const currentTicket = tickets[activeTicketIndex] || tickets[0] || successRegistration;
            return (
              /* Ventixe Style Dash-Ticket Boarding Pass */
              <div className="rounded-3xl bg-white border border-purple-50 shadow-lg overflow-hidden animate-entrance">
                <div className="bg-gradient-to-tr from-primary to-accent p-6 text-white text-center">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-[20px] text-white">verified</span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight leading-none">Ticket Confirmed</h3>
                  <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest mt-1.5">Ventixe Entry Pass</p>
                </div>

                <div className="p-6 text-center space-y-6 relative">
                  {/* Boarding pass circular notches */}
                  <div className="absolute top-0 -left-3 w-6 h-6 bg-surface rounded-full border-r border-purple-50"></div>
                  <div className="absolute top-0 -right-3 w-6 h-6 bg-surface rounded-full border-l border-purple-50"></div>

                  {tickets.length > 1 && (
                    <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 rounded-2xl border border-purple-50/50">
                      <button
                        type="button"
                        disabled={activeTicketIndex === 0}
                        onClick={() => setActiveTicketIndex(prev => prev - 1)}
                        className="inline-flex items-center gap-0.5 text-[10px] font-black text-primary hover:underline disabled:opacity-30 disabled:no-underline"
                      >
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        Prev
                      </button>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        Ticket {activeTicketIndex + 1} of {tickets.length}
                      </span>
                      <button
                        type="button"
                        disabled={activeTicketIndex === tickets.length - 1}
                        onClick={() => setActiveTicketIndex(prev => prev + 1)}
                        className="inline-flex items-center gap-0.5 text-[10px] font-black text-primary hover:underline disabled:opacity-30 disabled:no-underline"
                      >
                        Next
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  )}

                  <div className="border-t-2 border-dashed border-purple-50/80 pt-4 flex justify-center">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-purple-50">
                      {currentTicket.qrCode && (
                        <img 
                          alt="Ticket QR Code" 
                          className="w-40 h-40 mx-auto" 
                          src={currentTicket.qrCode} 
                        />
                      )}
                    </div>
                  </div>

                  <div className="text-left bg-slate-50 p-4 rounded-2xl text-xs space-y-2 border border-purple-50 font-semibold text-slate-600">
                    <p><span className="text-slate-400">Pass ID:</span> <span className="font-mono text-[10.5px]">{currentTicket._id}</span></p>
                    <p><span className="text-slate-400">Attendee:</span> {currentTicket.studentName}</p>
                    <p><span className="text-slate-400">Email:</span> {currentTicket.studentEmail}</p>
                    <p><span className="text-slate-400">Event:</span> {event.title}</p>
                    {currentTicket.paymentStatus === 'paid' && (
                      <>
                        <p><span className="text-slate-400">Payment:</span> <span className="text-green-600 font-extrabold">Paid (₹{event.entryFee})</span></p>
                        <p><span className="text-slate-400">Transaction ID:</span> <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono">{currentTicket.upiTransactionId}</code></p>
                      </>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      setSuccessRegistration(null);
                      setActiveTicketIndex(0);
                      setName('');
                      setEmail('');
                      setPhone('');
                      setFoodPreference('none');
                      setBypassClash(false);
                      setUpiTransactionId('');
                      setQuantity(1);
                    }}
                    className="w-full py-3 bg-fuchsia-50 hover:bg-fuchsia-100 text-primary rounded-xl text-xs font-extrabold transition-colors border border-purple-100 uppercase tracking-wider"
                  >
                    Book Another Event
                  </button>
                </div>
              </div>
            );
          })() : (
            /* Registration Form */
            <div className="p-8 rounded-3xl bg-white border border-purple-50 shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Event Registration</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Book your seat now</p>
              </div>

              {isPastDeadline && (
                <div className="p-4 bg-pink-50 border border-pink-100 text-pink-900 text-xs font-semibold rounded-2xl flex items-start gap-2 animate-entrance">
                  <span className="material-symbols-outlined text-[16px] text-primary mt-0.5 animate-pulse">event_busy</span>
                  <span>Registration Closed: The deadline to book was {dueDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}.</span>
                </div>
              )}

              {error && !showCancelSuccess && (
                <div className="p-4 bg-pink-50 border border-pink-100 text-pink-900 text-xs font-semibold rounded-2xl flex items-start gap-2 animate-entrance">
                  <span className="material-symbols-outlined text-[16px] text-primary mt-0.5 animate-pulse">error</span>
                  <span>{error}</span>
                </div>
              )}

              {clashError && (
                <div className="p-4 bg-amber-50 border border-amber-100 text-amber-900 text-xs font-semibold rounded-2xl space-y-3 animate-entrance">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5">warning</span>
                    <span>{clashError.message}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2.5 border-t border-amber-150">
                    <input 
                      type="checkbox" 
                      id="bypass" 
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      checked={bypassClash}
                      onChange={(e) => setBypassClash(e.target.checked)}
                      disabled={isPastDeadline}
                    />
                    <label htmlFor="bypass" className="font-bold text-slate-700 cursor-pointer select-none">
                      Proceed despite clash
                    </label>
                  </div>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="name">Full Name</label>
                  <input 
                    id="name"
                    required
                    disabled={isFull || submitting || isPastDeadline}
                    type="text" 
                    placeholder="Alice Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="email">Email address</label>
                  <input 
                    id="email"
                    required
                    disabled={isFull || submitting || isPastDeadline}
                    type="email" 
                    placeholder="student@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="phone">Phone Number</label>
                  <input 
                    id="phone"
                    required
                    disabled={isFull || submitting || isPastDeadline}
                    type="tel" 
                    placeholder="+91 XXXXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="food-pref">Food Preference</label>
                  <select 
                    id="food-pref"
                    disabled={isFull || submitting || isPastDeadline}
                    value={foodPreference}
                    onChange={(e) => setFoodPreference(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all disabled:opacity-50"
                  >
                    <option value="none">None / I don't want food</option>
                    <option value="veg">Veg</option>
                    <option value="non-veg">Non-Veg</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="quantity">Number of Tickets</label>
                  <select 
                    id="quantity"
                    disabled={isFull || submitting || isPastDeadline}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all disabled:opacity-50"
                  >
                    <option value={1}>1 Ticket</option>
                    <option value={2}>2 Tickets</option>
                    <option value={3}>3 Tickets</option>
                    <option value={4}>4 Tickets</option>
                    <option value={5}>5 Tickets</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  disabled={isFull || submitting || isPastDeadline || (clashError && !bypassClash)}
                  className={`w-full py-3.5 rounded-2xl text-xs font-black shadow-lg transition-all uppercase tracking-widest ${
                    isFull || isPastDeadline
                      ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                      : submitting
                        ? 'bg-primary/95 text-white shadow-none cursor-wait'
                        : clashError && !bypassClash
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/10 cursor-not-allowed'
                          : 'bg-primary text-white shadow-primary/25 hover:shadow-primary/35 hover:-translate-y-0.5'
                  }`}
                >
                  {isFull 
                    ? 'SOLD OUT' 
                    : isPastDeadline
                      ? 'REGISTRATION CLOSED'
                      : submitting 
                        ? 'BOOKING...' 
                        : clashError 
                          ? 'CONFIRM ANYWAY' 
                          : 'CONFIRM BOOKING'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

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
                onClick={() => { setShowDeleteConfirm(false); }}
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
              onClick={() => { setShowCancelSuccess(false); navigate('/'); }}
              className="w-full py-3 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs font-extrabold transition-colors shadow-lg shadow-primary/20 uppercase tracking-widest"
            >
              Return to Events
            </button>
          </div>
        </div>
      )}

      {/* Google Pay / UPI secure checkout modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-purple-50 shadow-2xl space-y-6 text-center animate-entrance">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 -mx-8 -mt-8 rounded-t-3xl text-white flex flex-col items-center justify-center space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Google Pay</span>
              <h4 className="text-sm font-black tracking-tight flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                UPI Secure Checkout
              </h4>
            </div>

            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount to Pay</span>
                <h3 className="text-3xl font-black text-slate-800">₹{event.entryFee * quantity}</h3>
                <p className="text-[10.5px] font-black text-slate-650 mt-1">({quantity} Ticket{quantity > 1 ? 's' : ''} × ₹{event.entryFee})</p>
                <p className="text-[10px] font-bold text-slate-500">Host UPI: <code className="bg-slate-50 px-1.5 py-0.5 rounded text-primary font-mono">{event.upiId}</code></p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-purple-50 inline-block mx-auto">
                <img 
                  alt="UPI QR Code" 
                  className="w-40 h-40 mx-auto" 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=${event.upiId}&pn=${event.title}&am=${event.entryFee * quantity}&cu=INR`)}`} 
                />
              </div>

              <div className="text-left text-[10px] font-semibold text-slate-450 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-purple-50 space-y-1">
                <p className="text-slate-500 font-bold">Checkout Instructions:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Scan the QR code or pay to the UPI ID via Google Pay.</li>
                  <li>Copy the 12-digit Transaction ID/Ref No. from GPay.</li>
                  <li>Paste it below to complete your ticket booking.</li>
                </ol>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="checkout-utr">Transaction Ref ID / Reference ID</label>
                <input 
                  id="checkout-utr"
                  required
                  type="text" 
                  maxLength="30"
                  placeholder="e.g. TXN123456789012"
                  value={upiTransactionId}
                  onChange={(e) => setUpiTransactionId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 text-center tracking-widest focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => { setShowCheckoutModal(false); setUpiTransactionId(''); }}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-purple-50 transition-colors uppercase tracking-wider"
              >
                Cancel
              </button>
              <button 
                onClick={handleRegister}
                disabled={submitting || !upiTransactionId.trim()}
                className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 uppercase tracking-wider"
              >
                {submitting ? 'Verifying...' : 'Pay & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
