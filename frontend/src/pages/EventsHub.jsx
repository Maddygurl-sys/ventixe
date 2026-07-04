import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';

export default function EventsHub() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState(null);
  const [activeMonthTab, setActiveMonthTab] = useState(0);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/events`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
      setError('');
    } catch (err) {
      setError('Could not load events. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch = 
      event.title.toLowerCase().includes(search.toLowerCase()) || 
      event.description.toLowerCase().includes(search.toLowerCase()) ||
      event.venue.toLowerCase().includes(search.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter) {
      const eventDateStr = new Date(event.date).toISOString().split('T')[0];
      matchesDate = eventDateStr === dateFilter;
    }

    return matchesSearch && matchesDate;
  });

  // Ventixe color scheme tags mapping
  const getThemeClasses = (index) => {
    const themes = [
      { bg: 'bg-pink/40', border: 'border-pink-100', text: 'text-card-pinkText', headerBg: 'from-pink-500 to-fuchsia-600', icon: 'theater_comedy', badgeBg: 'bg-card-pink' },
      { bg: 'bg-purple/40', border: 'border-purple-100', text: 'text-card-purpleText', headerBg: 'from-purple-500 to-indigo-600', icon: 'celebration', badgeBg: 'bg-card-purple' },
      { bg: 'bg-blue/40', border: 'border-blue-100', text: 'text-card-blueText', headerBg: 'from-blue-500 to-sky-600', icon: 'code', badgeBg: 'bg-card-blue' },
      { bg: 'bg-green/40', border: 'border-emerald-100', text: 'text-card-greenText', headerBg: 'from-emerald-500 to-teal-600', icon: 'mic', badgeBg: 'bg-card-green' }
    ];
    return themes[index % themes.length];
  };

  return (
    <div className="space-y-8 animate-entrance">
      {/* Top Banner section */}
      <section className="bg-white p-8 rounded-3xl border border-purple-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">Book Upcoming Events</h2>
          <p className="text-slate-500 mt-1.5 text-sm max-w-xl leading-relaxed">
            Reserve tickets for culture festivals, freshman parties, hackathons, and stand-ups. Easy QR ticket delivery and clash detection check.
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="md:col-span-2 relative bg-white border border-slate-100 focus-within:border-primary rounded-2xl p-1 shadow-sm flex items-center transition-all">
          <span className="material-symbols-outlined absolute left-5 text-slate-400">search</span>
          <input 
            className="w-full h-12 pl-12 pr-4 bg-transparent border-none focus:outline-none text-sm font-medium placeholder:text-slate-400 text-slate-700" 
            placeholder="Search events, topics, venues..." 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Date Filter */}
        <div className="relative bg-white border border-slate-100 focus-within:border-primary rounded-2xl p-1 shadow-sm flex items-center transition-all">
          <span className="material-symbols-outlined absolute left-5 text-slate-400">calendar_today</span>
          <input 
            className="w-full h-12 pl-12 pr-4 bg-transparent border-none focus:outline-none text-sm font-semibold text-slate-600" 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          {dateFilter && (
            <button 
              onClick={() => setDateFilter('')}
              className="absolute right-4 text-slate-400 hover:text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </section>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 font-semibold text-sm">Fetching upcoming schedules...</p>
        </div>
      )}

      {error && (
        <div className="p-8 rounded-3xl bg-pink-50 border border-pink-100 text-pink-900 text-center space-y-4 max-w-xl mx-auto">
          <span className="material-symbols-outlined text-4xl text-primary">error</span>
          <p className="font-semibold text-lg">{error}</p>
          <button 
            onClick={fetchEvents}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Events Grid */}
      {!loading && !error && (
        <>
          {filteredEvents.length === 0 ? (
            <div className="p-16 rounded-3xl text-center bg-white border border-purple-50 space-y-4 shadow-sm">
              <span className="material-symbols-outlined text-5xl text-slate-300">calendar_today</span>
              <p className="text-slate-500 font-semibold text-lg">No events found matching your search</p>
              <button 
                onClick={() => { setSearch(''); setDateFilter(''); }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event, idx) => {
                const isFull = event.registrationCount >= event.capacity;
                const theme = getThemeClasses(idx);
                return (
                  <div key={event._id} className="premium-card rounded-3xl overflow-hidden flex flex-col group h-full">
                    {/* Header Banner with Ventixe gradients */}
                    <div className={`h-36 bg-gradient-to-tr ${theme.headerBg} relative p-6 flex flex-col justify-between text-white flex-shrink-0`}>
                      <div className="flex justify-between items-start">
                        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <span className="material-symbols-outlined text-[20px] text-white">
                            {theme.icon}
                          </span>
                        </div>
                        <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-white">
                          {event.venue}
                        </span>
                      </div>
                      <h3 className="text-xl font-black tracking-tight leading-none group-hover:translate-x-1 transition-transform duration-300">
                        {event.title}
                      </h3>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                          {event.description}
                        </p>
                        
                        <div className="space-y-2 text-xs font-bold text-slate-500">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-slate-400">schedule</span>
                            <span>{formatDate(event.date)} @ {event.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-slate-400">group</span>
                            <span>
                              {event.registrationCount} / {event.capacity} Booked
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-rose-600">
                            <span className="material-symbols-outlined text-[18px] text-rose-400">event_busy</span>
                            <span>
                              Due: {(() => {
                                const eventDate = new Date(event.date);
                                const dueDate = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
                                return dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Register Button in Fuchsia */}
                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        {isFull ? (
                          <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                            Sold Out
                          </span>
                        ) : (
                          <span className={`px-3 py-1 ${theme.badgeBg} ${theme.text} text-[10px] font-bold rounded-lg uppercase tracking-wide`}>
                            Available
                          </span>
                        )}
                        <Link 
                          to={`/events/${event._id}`}
                          className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md ${
                            isFull 
                              ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                              : 'bg-primary text-white hover:bg-primary/95 shadow-primary/10 hover:shadow-primary/20'
                          }`}
                        >
                          {isFull ? 'VIEW DETAILS' : 'BOOK NOW'}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Bottom Panel: Calendar & Pie Chart */}
      {!loading && !error && events.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-purple-50">
          {/* Left Corner: Calendar view */}
          <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm space-y-4">
            {/* Rolling 3 Months Tab Switcher */}
            {(() => {
              const today = new Date();
              const monthsList = [];
              for (let i = 0; i < 3; i++) {
                const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
                monthsList.push({
                  year: d.getFullYear(),
                  monthIndex: d.getMonth(),
                  name: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
                  fullName: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                });
              }

              const targetMonth = monthsList[activeMonthTab] || monthsList[0];
              const totalDays = new Date(targetMonth.year, targetMonth.monthIndex + 1, 0).getDate();
              const startOffset = new Date(targetMonth.year, targetMonth.monthIndex, 1).getDay();

              return (
                <>
                  <div className="flex flex-col space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
                        {targetMonth.fullName} Schedule
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ventixe Calendar</span>
                    </div>

                    {/* Month selector tabs */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 border border-purple-50/50 rounded-2xl">
                      {monthsList.map((m, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveMonthTab(idx)}
                          className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                            activeMonthTab === idx
                              ? 'bg-white text-primary border border-purple-100 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Dynamic Calendar Grid */}
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-slate-600">
                      {/* Blank offset cells */}
                      {Array.from({ length: startOffset }).map((_, i) => (
                        <div key={`offset-${i}`} className="p-2"></div>
                      ))}
                      
                      {/* Render days of selected month */}
                      {Array.from({ length: totalDays }).map((_, i) => {
                        const day = i + 1;
                        const actualEvent = events.find(e => {
                          if (!e.date) return false;
                          const d = new Date(e.date);
                          return d.getUTCDate() === day && 
                                 d.getUTCMonth() === targetMonth.monthIndex && 
                                 d.getUTCFullYear() === targetMonth.year;
                        });
                        
                        return (
                          <div 
                            key={`day-${day}`}
                            onClick={() => actualEvent && setSelectedCalendarEvent(actualEvent)}
                            title={actualEvent ? `${actualEvent.title} (${actualEvent.time})` : undefined}
                            className={`p-2 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                              actualEvent 
                                ? 'bg-fuchsia-50 text-primary border border-primary/20 cursor-pointer font-bold hover:bg-primary hover:text-white' 
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <span>{day}</span>
                            {actualEvent && (
                              <span className="w-1 h-1 rounded-full bg-primary absolute bottom-1"></span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Right Corner: Pie/Doughnut Chart of overall booked capacity */}
          <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-slate-800 tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">pie_chart</span>
                Total Booked Capacity
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Analytics</span>
            </div>

            {/* SVG Doughnut Chart */}
            {(() => {
              const totalBooked = events.reduce((sum, e) => sum + (e.registrationCount || 0), 0);
              const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
              const percentage = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;
              
              const radius = 50;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (percentage / 100) * circumference;
              
              return (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 flex-1 py-4">
                  {/* Circular Graph */}
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      <circle 
                        cx="60" 
                        cy="60" 
                        r={radius} 
                        fill="transparent" 
                        stroke="#F5F3FF" 
                        strokeWidth="10" 
                      />
                      <circle 
                        cx="60" 
                        cy="60" 
                        r={radius} 
                        fill="transparent" 
                        stroke="#D946EF" 
                        strokeWidth="10" 
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-slate-800">{totalBooked}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tickets</span>
                    </div>
                  </div>

                  {/* Details legend */}
                  <div className="text-xs space-y-3 font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary inline-block"></span>
                      <span>Total Booked: <strong className="text-slate-800">{totalBooked}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-100 inline-block"></span>
                      <span>Total Seats Left: <strong className="text-slate-800">{totalCapacity - totalBooked}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-purple-50 text-[10px] uppercase font-bold text-slate-400">
                      <span>Total Capacity: {totalCapacity}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* Calendar Event Pop-up Modal */}
      {selectedCalendarEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-purple-50 shadow-2xl space-y-6 animate-entrance">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-3 py-1 bg-fuchsia-50 text-primary text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
                  {selectedCalendarEvent.venue}
                </span>
                <h3 className="text-xl font-extrabold text-slate-800 mt-3 leading-tight">
                  {selectedCalendarEvent.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCalendarEvent(null)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {selectedCalendarEvent.description}
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-2 border border-purple-50 font-semibold text-slate-600">
              <p><span className="text-slate-400">Date:</span> {formatDate(selectedCalendarEvent.date)}</p>
              <p><span className="text-slate-400">Time:</span> {selectedCalendarEvent.time}</p>
              <p><span className="text-slate-400">Venue:</span> {selectedCalendarEvent.venue}</p>
              <p>
                <span className="text-slate-400">Registration Deadline:</span>{' '}
                <strong className="text-rose-600">
                  {(() => {
                    const eventDate = new Date(selectedCalendarEvent.date);
                    const dueDate = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
                    return dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                  })()}
                </strong>
              </p>
              <p><span className="text-slate-400">Seats Available:</span> {selectedCalendarEvent.capacity - selectedCalendarEvent.registrationCount} / {selectedCalendarEvent.capacity}</p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setSelectedCalendarEvent(null)}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-purple-50 transition-colors uppercase tracking-wider"
              >
                Close
              </button>
              <Link 
                to={`/events/${selectedCalendarEvent._id}`}
                onClick={() => setSelectedCalendarEvent(null)}
                className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold text-center transition-all shadow-lg shadow-primary/20 uppercase tracking-wider"
              >
                Book Seat
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
