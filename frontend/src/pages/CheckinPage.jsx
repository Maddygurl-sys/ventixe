import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { API_BASE } from '../config';

// Globally intercept and capture all browser MediaStreams to guarantee track shutdown
const activeStreams = [];

if (typeof window !== 'undefined' && navigator.mediaDevices && !navigator.mediaDevices._isIntercepted) {
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  
  navigator.mediaDevices.getUserMedia = async function (constraints) {
    const stream = await originalGetUserMedia(constraints);
    activeStreams.push(stream);
    return stream;
  };
  
  navigator.mediaDevices._isIntercepted = true;
}

// Function to immediately terminate all active camera streams
const stopAllCameraStreams = () => {
  activeStreams.forEach(stream => {
    try {
      stream.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
    } catch (err) {
      console.warn("Failed to stop intercepted track:", err);
    }
  });
  activeStreams.length = 0;
};

let globalScannerInstance = null;

export default function CheckinPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState(null); 
  const [triggerScanner, setTriggerScanner] = useState(0);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}`);
      if (!res.ok) throw new Error('Event not found');
      const data = await res.json();
      setEvent(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading || !event || scanResult) return;

    let isDestroyed = false;

    const startScanner = async () => {
      try {
        // 1. Terminate any previous camera streams
        stopAllCameraStreams();
        if (globalScannerInstance) {
          try {
            if (globalScannerInstance.isScanning) {
              await globalScannerInstance.stop();
            }
          } catch (stopErr) {
            console.warn("Stopped prior instance:", stopErr);
          }
          globalScannerInstance = null;
        }

        // 2. Fetch DOM container
        const container = document.getElementById('reader');
        if (!container) return;
        container.innerHTML = '';

        const scannerDiv = document.createElement('div');
        scannerDiv.id = 'scanner-video-feed';
        scannerDiv.className = 'w-full h-full min-h-[300px]';
        container.appendChild(scannerDiv);

        if (isDestroyed) {
          // If unmounted during setup, turn off camera tracks immediately
          stopAllCameraStreams();
          return;
        }

        const html5QrCode = new Html5Qrcode("scanner-video-feed");
        globalScannerInstance = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          async (decodedText) => {
            // SUCCESS SCAN
            try {
              if (html5QrCode.isScanning) {
                await html5QrCode.stop();
              }
            } catch (err) {
              console.warn("Failed to stop scanner in success callback:", err);
            }
            
            // Shut down all camera streams immediately
            stopAllCameraStreams();

            if (globalScannerInstance === html5QrCode) {
              globalScannerInstance = null;
            }
            
            handleCheckinResponse(decodedText);
          },
          (errorMessage) => {
            // Quietly consume frames
          }
        );

        // Safety check if component unmounted while starting camera
        if (isDestroyed) {
          stopAllCameraStreams();
          try {
            if (html5QrCode.isScanning) {
              await html5QrCode.stop();
            }
          } catch (e) {}
        }

      } catch (err) {
        console.error("Scanner startup error:", err);
        // Clean tracks in case of error
        stopAllCameraStreams();
      }
    };

    startScanner();

    // REACT CLEANUP
    return () => {
      isDestroyed = true;
      
      // Stop all intercepted browser camera streams synchronously
      stopAllCameraStreams();

      const cleanup = async () => {
        if (globalScannerInstance) {
          try {
            if (globalScannerInstance.isScanning) {
              await globalScannerInstance.stop();
            }
          } catch (err) {
            console.error("Cleanup error stopping camera:", err);
          }
          globalScannerInstance = null;
        }
        const container = document.getElementById('reader');
        if (container) container.innerHTML = '';
      };
      cleanup();
    };
  }, [loading, event, scanResult, triggerScanner]);

  const handleCheckinResponse = async (decodedText) => {
    try {
      let parsed;
      try {
        parsed = JSON.parse(decodedText);
      } catch (e) {
        parsed = { registrationId: decodedText, eventId: eventId };
      }
      
      if (parsed.eventId && parsed.eventId !== eventId) {
        setScanResult({
          success: false,
          message: 'Wrong Event: This ticket is registered for a different event.'
        });
        return;
      }

      const regId = parsed.registrationId || decodedText;

      const checkinRes = await fetch(`${API_BASE}/checkin/${regId}`, {
        method: 'POST'
      });

      const data = await checkinRes.json();

      if (!checkinRes.ok) {
        setScanResult({
          success: false,
          message: data.message || 'Check-in failed.'
        });
        return;
      }

      setScanResult({
        success: true,
        message: data.message,
        registration: data.registration
      });

    } catch (err) {
      console.error(err);
      setScanResult({
        success: false,
        message: 'Scan Error: Failed to complete check-in.'
      });
    }
  };

  const handleScanNext = () => {
    setScanResult(null);
    setTriggerScanner(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        <p className="text-slate-500 font-semibold text-sm">Configuring check-in terminal...</p>
      </div>
    );
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const isCreator = event && user.name && event.createdBy.toLowerCase() === user.name.toLowerCase();

  if (!event) {
    return (
      <div className="p-8 rounded-3xl bg-pink-50 border border-pink-100 text-pink-900 text-center space-y-4 max-w-xl mx-auto animate-entrance">
        <span className="material-symbols-outlined text-4xl text-primary">error</span>
        <p className="font-semibold text-lg">Event not found in system.</p>
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
        <p className="font-semibold text-lg">Access Denied: You are not authorized to check-in students for this event.</p>
        <Link to="/" className="inline-block px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-entrance">
      {/* Back button */}
      <div className="flex justify-between items-center">
        <Link to={`/organiser/events/${eventId}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-primary font-bold text-xs transition-colors tracking-wide uppercase">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Event Ledger
        </Link>
      </div>

      <div className="p-8 rounded-3xl bg-white border border-purple-50 shadow-lg space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">{event.title}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Terminal check-in</p>
        </div>

        {/* SCANNING STATES DISPLAY */}
        {scanResult ? (
          <div className="space-y-6 text-center animate-entrance">
            {scanResult.success ? (
              <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl font-bold">verified</span>
                </div>
                <h3 className="text-xl font-bold text-emerald-900 leading-none">Access Granted</h3>
                <p className="text-xs font-bold text-emerald-800">{scanResult.message}</p>
                {scanResult.registration && (
                  <div className="bg-white/90 p-4 rounded-xl text-left text-xs space-y-1 text-slate-700 font-bold max-w-sm mx-auto border border-emerald-100">
                    <p>Student: {scanResult.registration.studentName}</p>
                    <p>Email: {scanResult.registration.studentEmail}</p>
                    <p>Checked In: Just Now</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-pink-50 border border-pink-100 space-y-4">
                <div className="w-16 h-16 bg-pink-100 text-primary rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl font-bold">block</span>
                </div>
                <h3 className="text-xl font-bold text-primary leading-none">Access Denied</h3>
                <p className="text-xs font-bold text-pink-800">{scanResult.message}</p>
              </div>
            )}

            <button 
              onClick={handleScanNext}
              className="w-full py-4 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-colors uppercase tracking-widest"
            >
              Scan Next Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border-2 border-slate-100 bg-slate-50 relative min-h-[300px] flex items-center justify-center">
              <div id="reader" style={{ width: '100%', minHeight: '300px' }}></div>
            </div>
            
            <div className="text-center text-[10px] text-slate-400 p-2 flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px] text-primary animate-pulse">videocam</span>
              Align ticket QR code with camera scanner frame
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
