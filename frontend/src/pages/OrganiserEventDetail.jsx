import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from '../config';

export default function OrganiserEventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEventAndRegistrations();
  }, [id]);

  const fetchEventAndRegistrations = async () => {
    try {
      setLoading(true);
      const eventRes = await fetch(`${API_BASE}/events/${id}`);
      if (!eventRes.ok) throw new Error('Event not found');
      const eventData = await eventRes.json();
      setEvent(eventData);

      const regRes = await fetch(`${API_BASE}/events/${id}/registrations`);
      if (!regRes.ok) throw new Error('Failed to fetch registrations');
      const regData = await regRes.json();
      setRegistrations(regData);
      
      setError('');
    } catch (err) {
      setError(err.message || 'Could not retrieve data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold text-sm">Loading event ledger...</p>
      </div>
    );
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const isCreator = event && user.name && event.createdBy.toLowerCase() === user.name.toLowerCase();

  if (error || !event) {
    return (
      <div className="p-8 rounded-3xl bg-pink-50 border border-pink-100 text-pink-900 text-center space-y-4 max-w-xl mx-auto">
        <span className="material-symbols-outlined text-4xl text-primary">error</span>
        <p className="font-semibold text-lg">{error}</p>
        <Link to={isAdmin ? "/organiser/dashboard" : "/dashboard"} className="inline-block px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!isAdmin && !isCreator) {
    return (
      <div className="p-8 rounded-3xl bg-pink-50 border border-pink-100 text-pink-900 text-center space-y-4 max-w-xl mx-auto animate-entrance">
        <span className="material-symbols-outlined text-4xl text-primary">block</span>
        <p className="font-semibold text-lg">Access Denied: You are not authorized to view this event's registrations.</p>
        <Link to="/" className="inline-block px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold">
          Return Home
        </Link>
      </div>
    );
  }

  const checkinsCount = registrations.filter(r => r.checkedIn).length;

  return (
    <div className="space-y-8 animate-entrance">
      {/* Back link */}
      <Link to={isAdmin ? "/organiser/dashboard" : "/dashboard"} className="inline-flex items-center gap-2 text-slate-500 hover:text-primary font-bold text-xs transition-colors tracking-wide uppercase">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Dashboard
      </Link>

      {/* Roster Header block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 rounded-3xl bg-white border border-purple-50 shadow-sm">
        <div>
          <span className="px-3.5 py-1.5 bg-fuchsia-50 text-primary text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
            Ledger
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 mt-4 leading-none">{event.title}</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1.5">{event.venue} | {event.time}</p>
        </div>

        {/* Scan Entry Button */}
        <Link 
          to={`/checkin/${event._id}`}
          className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
          Open Scanner Terminal
        </Link>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Registrations</p>
          <h3 className="text-2xl font-black mt-2 text-slate-800">{registrations.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Successful Check-ins</p>
          <h3 className="text-2xl font-black mt-2 text-emerald-600">{checkinsCount}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Attendance Rate</p>
          <h3 className="text-2xl font-black mt-2 text-slate-800">
            {registrations.length > 0 ? Math.round((checkinsCount / registrations.length) * 100) : 0}%
          </h3>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl overflow-hidden border border-purple-50 shadow-sm">
        <div className="p-6 border-b border-purple-50 bg-slate-50/50">
          <h3 className="font-bold text-base text-slate-800">Roster Registry</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-purple-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                <th className="py-4.5 px-6">Student Name</th>
                <th className="py-4.5 px-6">Email Address</th>
                <th className="py-4.5 px-6">Phone Number</th>
                <th className="py-4.5 px-6">Food Choice</th>
                <th className="py-4.5 px-6">Payment</th>
                <th className="py-4.5 px-6">Registered At</th>
                <th className="py-4.5 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50/50">
              {registrations.map((reg) => (
                <tr key={reg._id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-700 text-sm">{reg.studentName}</td>
                  <td className="py-4 px-6 text-xs font-semibold text-slate-500">{reg.studentEmail}</td>
                  <td className="py-4 px-6 text-xs font-semibold text-slate-500">{reg.studentPhone || 'N/A'}</td>
                  <td className="py-4 px-6 text-xs">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      reg.foodPreference === 'veg' ? 'bg-green-50 text-green-700' :
                      reg.foodPreference === 'non-veg' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500'
                    }`}>
                      {reg.foodPreference || 'none'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs">
                    {reg.paymentStatus === 'paid' ? (
                      <div className="flex flex-col">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-50 text-green-700 w-max">
                          Paid
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono mt-0.5">{reg.upiTransactionId}</span>
                      </div>
                    ) : reg.paymentStatus === 'pending' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700">
                        Pending
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-50 text-slate-500">
                        Free
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-400 font-semibold">{formatDate(reg.registeredAt)}</td>
                  <td className="py-4 px-6 text-center">
                    {reg.checkedIn ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-lg uppercase tracking-wide">
                        <span className="material-symbols-outlined text-[12px] font-bold">check_circle</span>
                        Checked In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-lg uppercase tracking-wide">
                        <span className="material-symbols-outlined text-[12px]">pending</span>
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {registrations.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 text-xs font-bold">
                    No students registered for this event.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
