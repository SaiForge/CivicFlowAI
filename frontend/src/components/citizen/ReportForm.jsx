import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { complaintsApi, voiceApi } from '../../services/api';
import MapPinPickerModal from './MapPinPickerModal';
import {
  X,
  Upload,
  Loader2,
  Image,
  AlertCircle,
  MapPin,
  Navigation,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Mic,
  MicOff,
  Square,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

const MAX_FILE_SIZE_MB = 20;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];

const QUICK_PRESETS = [
  {
    label: '🚗 Pothole on Road',
    category: 'Road',
    desc: 'Severe deep pothole on Main Road near market junction causing dangerous traffic blockage and two-wheeler skids.',
  },
  {
    label: '🗑️ Garbage Overflow',
    category: 'Waste',
    desc: 'Public waste dumpster overflowing across the pedestrian sidewalk for past 3 days with intense foul odor.',
  },
  {
    label: '💡 Dark Streetlight',
    category: 'Streetlight',
    desc: 'Streetlight pole broken and completely dark at night near public school, compromising pedestrian safety.',
  },
  {
    label: '🚰 Water Pipe Burst',
    category: 'Water',
    desc: 'Underground drinking water supply pipeline ruptured and flooding the road with clean water wastage.',
  },
];

const ReportForm = () => {
  const { setReportFormOpen, setProcessingSubmission } = useApp();
  const [form, setForm] = useState({
    category: '',
    description: '',
    location: '',
    details: '',
    lat: null,
    lng: null,
  });
  const [files, setFiles] = useState([]);
  const [isSensitive, setIsSensitive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  // ── Voice Dictation & Audio State ──
  const [isListening, setIsListening] = useState(false);
  const [isListeningLoc, setIsListeningLoc] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionSuccess, setTranscriptionSuccess] = useState(null);
  const [voiceTimer, setVoiceTimer] = useState(0);
  const [voiceError, setVoiceError] = useState(null);
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [interimText, setInterimText] = useState('');
  const [voiceDetectedCat, setVoiceDetectedCat] = useState(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const activeTargetFieldRef = useRef('description');

  const fileRef = useRef();

  const categories = ['Road', 'Waste', 'Water', 'Drainage', 'Streetlight', 'Infrastructure', 'Other'];

  const isPhysicalIssue = form.category === 'Road' || 
    form.category === 'Infrastructure' || 
    form.category === 'Waste' || 
    /\b(pothole|road damage|damaged road|broken road|crater|asphalt|caved in|pavement)\b/i.test(form.description);

  const photoIsMandatory = isPhysicalIssue && !isSensitive;

  const validateDescription = (desc) => {
    const clean = (desc || '').trim();
    if (clean.length < 10) {
      return 'Please provide a meaningful description (at least 10 characters) explaining the issue.';
    }
    const alphaChars = clean.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (alphaChars.length < 6) {
      return 'Description must contain meaningful explanatory text, not just numbers or symbols.';
    }
    const uniqueChars = new Set(alphaChars);
    if (uniqueChars.size < 4) {
      return 'Description appears to be random or repetitive characters. Please describe the issue in real words.';
    }
    const vowels = alphaChars.match(/[aeiou]/g) || [];
    const vowelRatio = vowels.length / alphaChars.length;
    if (vowelRatio < 0.12 || vowelRatio > 0.85) {
      return 'Description appears to be random keyboard text. Please explain the civic problem clearly.';
    }
    const smashes = ['asdfgh', 'qwerty', 'zxcvbn', 'lkjhgf', 'poiuyt', 'mnbvcx', '123456', 'asdsad'];
    for (const smash of smashes) {
      if (alphaChars.includes(smash)) {
        return `Description contains keyboard smash patterns ("${smash}"). Please describe the actual civic issue.`;
      }
    }
    return null;
  };

  const handleFileChange = (e) => {
    setError(null);
    const incoming = Array.from(e.target.files || []);
    const valid = [];
    const now = Date.now();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;

    for (const f of incoming) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setError(`File "${f.name}" has an unsupported format. Please upload JPG, PNG, or WebP.`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File "${f.name}" exceeds the 20MB limit.`);
        continue;
      }
      if (f.lastModified && (now - f.lastModified) > fifteenDaysMs) {
        const daysOld = Math.floor((now - f.lastModified) / (24 * 60 * 60 * 1000));
        setError(`File "${f.name}" was captured/modified over ${daysOld} days ago. Images must be taken within the last 15 days to reflect current civic conditions.`);
        continue;
      }
      valid.push(f);
    }
    setFiles((prev) => [...prev, ...valid].slice(0, 5)); // max 5 files
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  // ── Quick Live GPS Button ──────────────────────────────────────────────────
  const handleQuickGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingGps(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocatingGps(false);

        // Reverse geocode via OpenStreetMap Nominatim
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            const a = data.address || {};
            const road = a.road || a.pedestrian || a.suburb || '';
            const city = a.city || a.town || a.county || '';
            const full = [road, city].filter(Boolean).join(', ') || data.display_name;
            setForm((f) => ({ ...f, location: full, lat, lng }));
          } else {
            setForm((f) => ({ ...f, location: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng }));
          }
        } catch {
          setForm((f) => ({ ...f, location: `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng }));
        }
      },
      (err) => {
        setLocatingGps(false);
        setError('Could not access current GPS position. You can use "Pin on Map" to select.');
        console.warn('GPS error:', err);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Pin on Map Confirmation ────────────────────────────────────────────────
  const handleMapConfirm = ({ address, lat, lng }) => {
    setForm((f) => ({
      ...f,
      location: address,
      lat,
      lng,
    }));
  };

  // ── Cleanup Speech & Audio on Unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
    };
  }, []);

  // ── Text-to-Speech (Speaker Read Aloud) ────────────────────────────────────
  const handleSpeakText = (textToRead) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceError('Speech synthesis is not supported in this browser.');
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = (textToRead || '').trim() ||
      'Please enter or dictate a description of your civic problem using the voice input button.';

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = voiceLang || 'en-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.warn('Speech synthesis error:', e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Could not speak text:', err);
      setIsSpeaking(false);
    }
  };

  // ── Quick Preset Click Handler ─────────────────────────────────────────────
  const applyPreset = (preset) => {
    setVoiceError(null);
    setTranscriptionSuccess(null);
    setForm((prev) => ({
      ...prev,
      category: preset.category,
      description: preset.desc,
    }));
    setVoiceDetectedCat(preset.category);
  };

  // ── Smart Text & Category Applicator ───────────────────────────────────────
  const applyTranscribedText = (cleanText, targetField = 'description') => {
    if (!cleanText) return;
    const clean = cleanText.trim();

    if (targetField === 'description') {
      setForm((prev) => {
        const prevText = prev.description ? prev.description.trim() + ' ' : '';
        const newDesc = prevText + clean;

        // Auto-detect civic category from keywords
        let autoCat = prev.category;
        if (!autoCat) {
          const low = newDesc.toLowerCase();
          if (/pothole|road|asphalt|crater|pavement|tar/i.test(low)) autoCat = 'Road';
          else if (/garbage|trash|waste|dump|debris|litter|rubbish/i.test(low)) autoCat = 'Waste';
          else if (/water|pipe|leak|pipeline|tap/i.test(low)) autoCat = 'Water';
          else if (/streetlight|street light|light|lamp|pole/i.test(low)) autoCat = 'Streetlight';
          else if (/drain|drainage|sewage|gutter|overflow|manhole/i.test(low)) autoCat = 'Drainage';
          else if (/bridge|footpath|sidewalk|park|infrastructure/i.test(low)) autoCat = 'Infrastructure';
          if (autoCat && autoCat !== prev.category) {
            setVoiceDetectedCat(autoCat);
          }
        }

        return {
          ...prev,
          description: newDesc,
          category: autoCat || prev.category,
        };
      });
    } else if (targetField === 'location') {
      setForm((prev) => ({
        ...prev,
        location: (prev.location ? prev.location.trim() + ', ' : '') + clean,
      }));
    }
  };

  // ── Dual Voice Engine: Live Dictation + Audio Recorder Fallback ───────────
  const startVoiceRecognition = async (targetField = 'description') => {
    setVoiceError(null);
    setVoiceDetectedCat(null);
    setTranscriptionSuccess(null);
    activeTargetFieldRef.current = targetField;

    // Stop active speaker read-aloud
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    // Stop previous instance if still running
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    // 1. Initialize Audio Recorder (captures microphone audio for AI fallback)
    audioChunksRef.current = [];
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        mediaRecorderRef.current = recorder;
        recorder.start();
      } catch (micErr) {
        console.warn('Microphone stream access error:', micErr);
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
          setVoiceError('Microphone permission blocked. Please allow microphone access in browser settings, or click a quick sample below.');
          return;
        }
      }
    }

    if (targetField === 'description') {
      setIsListening(true);
    } else {
      setIsListeningLoc(true);
    }

    setVoiceTimer(0);
    setInterimText('');
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setVoiceTimer((s) => s + 1);
    }, 1000);

    // 2. Start Web Speech Recognition if available in browser
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      // Browser does not support Web Speech API; MediaRecorder will handle transcription on Stop
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceLang;

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        setInterimText(interim);

        if (final) {
          applyTranscribedText(final, targetField);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition warning:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission denied in browser.');
        } else if (event.error === 'network') {
          // Google Web Speech API server unreachable (common in Brave, non-HTTPS, or strict firewalls)
          // Don't kill the recording — audio recorder is capturing microphone audio!
          setVoiceError('Google Speech server unavailable on current network/browser. Audio is actively recording — click "Stop" when done to transcribe via AI!');
        }
      };

      recognition.onend = () => {
        // Recognition ended; if audio recording is still active, keep timer until user stops
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition initialization note:', err);
    }
  };

  const stopVoiceRecognition = () => {
    const targetField = activeTargetFieldRef.current || 'description';

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    setIsListening(false);
    setIsListeningLoc(false);
    setInterimText('');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Process recorded audio through AI Backend Transcription
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const recorder = mediaRecorderRef.current;
      recorder.onstop = async () => {
        // Stop audio tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Send to backend if audio has content
        if (audioBlob && audioBlob.size > 250) {
          try {
            setIsTranscribing(true);
            const res = await voiceApi.transcribe(audioBlob, voiceLang);
            if (res && res.text && res.text.trim()) {
              applyTranscribedText(res.text.trim(), targetField);
              setTranscriptionSuccess(`Transcribed via ${res.provider || 'AI Voice'}`);
              setVoiceError(null);
            } else if (res && res.message && !res.text) {
              if (res.status === 'unsupported') {
                setVoiceError(res.message);
              }
            }
          } catch (sttErr) {
            console.warn('AI audio transcription service message:', sttErr);
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      try {
        recorder.stop();
      } catch {}
    }
  };

  const toggleVoiceRecognition = () => {
    if (isListening) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition('description');
    }
  };

  const toggleVoiceLocation = () => {
    if (isListeningLoc) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition('location');
    }
  };

  // ── Submit & Launch AI Processing Screen ───────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) {
      setError('Please select an issue category.');
      return;
    }
    const descError = validateDescription(form.description);
    if (descError) {
      setError(descError);
      return;
    }
    if (!form.location.trim() || form.location.trim().length < 3) {
      setError('Please enter or pinpoint the exact location of the issue.');
      return;
    }
    if (photoIsMandatory && files.length === 0) {
      setError(
        'Submission Failed: Photographic evidence is mandatory for Road Damage reports so authorities can verify damage and dispatch equipment. If this is a sensitive safety issue where photos cannot be captured safely, please enable "Sensitive / Confidential Issue".'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build multipart form data
      const fd = new FormData();
      fd.append('category', form.category);
      fd.append('description', form.description);
      fd.append('location', form.location);
      fd.append('details', form.details || '');
      fd.append('is_sensitive', isSensitive ? 'true' : 'false');
      if (form.lat) fd.append('lat', form.lat);
      if (form.lng) fd.append('lng', form.lng);
      files.forEach((f) => fd.append('images', f));

      // Initiate submission promise
      const submitPromise = complaintsApi.submit(fd);

      // Close the form drawer immediately and transition to AI Processing Screen
      setReportFormOpen(false);

      // Launch the AI Processing Screen with live state & promise
      setProcessingSubmission({
        promise: submitPromise,
        category: form.category,
        location: form.location,
        description: form.description,
        lat: form.lat,
        lng: form.lng,
        imagesCount: files.length,
        isSensitive: isSensitive,
      });

    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="detail-backdrop" onClick={() => setReportFormOpen(false)} />
      <div className="detail-drawer">
        <div className="detail-header">
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-dark)' }}>Report a Civic Issue</div>
            <div className="card-sub" style={{ marginTop: '0.25rem' }}>Help improve your community with AI-assisted resolution</div>
          </div>
          <button className="btn-icon" onClick={() => setReportFormOpen(false)} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form className="detail-body" onSubmit={handleSubmit}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#dc2626', padding: '0.6rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* ── Category Selection ── */}
          <div className="detail-section">
            <label className="detail-field-label">Issue Category *</label>
            <div className="report-cat-grid">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`report-cat-btn ${form.category === cat ? 'report-cat-active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, category: cat }))}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* ── Sensitive Issue Exemption Toggle ── */}
            <div className={`report-sensitive-card ${isSensitive ? 'sensitive-active' : ''}`}>
              <label className="report-sensitive-label">
                <input
                  type="checkbox"
                  checked={isSensitive}
                  onChange={(e) => setIsSensitive(e.target.checked)}
                  className="report-sensitive-checkbox"
                />
                <div className="report-sensitive-info">
                  <div className="report-sensitive-title-row">
                    <ShieldAlert size={14} style={{ color: isSensitive ? '#d97706' : '#64748b' }} />
                    <span>Sensitive / Confidential Issue</span>
                    <span className="report-sensitive-pill">Photo Exempt</span>
                  </div>
                  <p className="report-sensitive-desc">
                    Enable if photo evidence cannot be safely captured or shared (e.g. personal safety threat, harassment, corruption, privacy concerns, or risk of retaliation).
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* ── Issue Description with Voice Dictation & Speaker Read-Aloud ── */}
          <div className="detail-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label className="detail-field-label" style={{ marginBottom: 0 }}>
                Describe the Issue / Problem *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {/* Speaker Button: Text-to-Speech Read Aloud */}
                <button
                  type="button"
                  className={`report-speaker-btn ${isSpeaking ? 'speaker-active' : ''}`}
                  onClick={() => handleSpeakText(form.description)}
                  title={isSpeaking ? 'Stop speaking audio' : 'Listen aloud with speaker'}
                >
                  {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                </button>

                {/* Voice Input Button: Real-time dictation & AI audio recording */}
                <button
                  type="button"
                  className={`report-voice-btn ${isListening ? 'voice-listening-active' : ''}`}
                  onClick={toggleVoiceRecognition}
                  disabled={isTranscribing}
                  title={isListening ? 'Stop Voice Input' : 'Dictate Issue via Voice / Microphone'}
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 size={11} className="spin-animate" />
                      <span>Transcribing AI…</span>
                    </>
                  ) : isListening ? (
                    <>
                      <span className="voice-pulse-dot" />
                      <Square size={11} fill="currentColor" />
                      <span>Stop ({voiceTimer}s)</span>
                    </>
                  ) : (
                    <>
                      <Mic size={12} />
                      <span>Voice Input</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Voice Error Alert with Quick Civic Templates Fallback */}
            {voiceError && (
              <div className="voice-error-banner">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>Voice Service Notice</div>
                    <div>{voiceError}</div>
                  </div>
                </div>
                <div className="voice-error-actions">
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                    Quick sample templates (1-click fill):
                  </span>
                  <div className="voice-presets-row">
                    {QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        className="voice-preset-pill"
                        onClick={() => applyPreset(preset)}
                        title={preset.desc}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Transcription Success Badge */}
            {transcriptionSuccess && (
              <div className="voice-success-pill">
                <CheckCircle2 size={12} color="#16a34a" />
                <span>{transcriptionSuccess}</span>
              </div>
            )}

            {/* Live Voice Recording Waveform Panel */}
            {isListening && (
              <div className="report-voice-panel">
                <div className="voice-panel-left">
                  <div className="voice-waveform">
                    <span className="voice-bar bar-1" />
                    <span className="voice-bar bar-2" />
                    <span className="voice-bar bar-3" />
                    <span className="voice-bar bar-4" />
                    <span className="voice-bar bar-5" />
                  </div>
                  <span className="voice-status-text">
                    {interimText ? `“${interimText}”` : "Listening / Recording... Speak clearly"}
                  </span>
                </div>
                <div className="voice-panel-right">
                  <select
                    className="voice-lang-select"
                    value={voiceLang}
                    onChange={(e) => setVoiceLang(e.target.value)}
                    title="Select Voice Language / Accent"
                  >
                    <option value="en-IN">English (India)</option>
                    <option value="en-US">English (US)</option>
                    <option value="hi-IN">हिन्दी (Hindi)</option>
                    <option value="mr-IN">मराठी (Marathi)</option>
                  </select>
                  <button
                    type="button"
                    className="voice-stop-pill"
                    onClick={stopVoiceRecognition}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            <textarea
              className="detail-textarea"
              rows={4}
              placeholder="Describe what you see or use the 'Voice Input' button to speak your grievance (min 10 characters)…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
            />

            {/* Auto-detected Category Tag */}
            {voiceDetectedCat && (
              <div className="voice-suggest-pill">
                <Sparkles size={11} color="#2563eb" />
                <span>AI detected category: <strong>{voiceDetectedCat}</strong></span>
              </div>
            )}
          </div>

          {/* ── Location with GPS, Map Pinpoint & Voice ── */}
          <div className="detail-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label className="detail-field-label" style={{ marginBottom: 0 }}>
                Location & Coordinates *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <button
                  type="button"
                  className={`report-loc-action-btn ${isListeningLoc ? 'voice-listening-active' : ''}`}
                  onClick={toggleVoiceLocation}
                  title="Speak location address"
                >
                  {isListeningLoc ? (
                    <>
                      <span className="voice-pulse-dot" />
                      <span>Listening…</span>
                    </>
                  ) : (
                    <>
                      <Mic size={12} />
                      <span>Speak</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="report-loc-action-btn"
                  onClick={handleQuickGps}
                  disabled={locatingGps}
                  title="Use Live Browser GPS"
                >
                  {locatingGps ? (
                    <Loader2 size={12} className="spin-animate" />
                  ) : (
                    <Navigation size={12} />
                  )}
                  <span>{locatingGps ? 'GPS…' : 'Live GPS'}</span>
                </button>

                <button
                  type="button"
                  className="report-loc-action-btn report-loc-map-btn"
                  onClick={() => setMapPickerOpen(true)}
                  title="Open Interactive Map to Pin Location"
                >
                  <MapPin size={12} />
                  <span>Pin on Map</span>
                </button>
              </div>
            </div>

            <input
              className="detail-input"
              type="text"
              placeholder="e.g. Near Main Bus Stand, MG Road, Sector 5 (or speak above)"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              required
            />

            {/* Coordinates Badge when location is pinned */}
            {form.lat && form.lng && (
              <div className="report-locked-coords-badge">
                <CheckCircle2 size={12} color="#16a34a" />
                <span>
                  GIS Locked: {parseFloat(form.lat).toFixed(4)}° N, {parseFloat(form.lng).toFixed(4)}° E
                </span>
              </div>
            )}
          </div>

          {/* ── File Upload ── */}
          <div className="detail-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label className="detail-field-label" style={{ marginBottom: 0 }}>
                Upload Photo / Video {photoIsMandatory ? (
                  <span style={{ color: '#dc2626', fontWeight: 800 }}>* (Mandatory for Road Damage)</span>
                ) : isSensitive ? (
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>(Optional — Waived for Sensitive Issue)</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                )}
              </label>
            </div>

            {isSensitive ? (
              <div className="report-sensitive-exemption-badge">
                <ShieldCheck size={14} color="#16a34a" />
                <span>
                  <strong>Citizen Safety Protected:</strong> Photographic evidence is waived for this report. Your complaint will be accepted and processed securely without images.
                </span>
              </div>
            ) : photoIsMandatory && files.length === 0 ? (
              <div className="report-mandatory-photo-badge">
                <AlertCircle size={13} color="#dc2626" />
                <span>Photographic evidence is required to assess and repair road damage.</span>
              </div>
            ) : null}

            <div
              className={`detail-upload-zone ${photoIsMandatory && files.length === 0 ? 'upload-zone-mandatory' : ''}`}
              onClick={() => fileRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              <Upload size={20} strokeWidth={1.75} color={photoIsMandatory && files.length === 0 ? '#dc2626' : 'var(--text-muted)'} />
              <span style={{ fontWeight: photoIsMandatory && files.length === 0 ? 700 : 500, color: photoIsMandatory && files.length === 0 ? '#b91c1c' : 'inherit' }}>
                {photoIsMandatory && files.length === 0 ? 'Click to attach required photo evidence *' : 'Click to add photos or video evidence'}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                JPG, PNG, WebP — max 20MB · must be captured within last 15 days
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Preview Thumbnails */}
            {files.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.625rem' }}>
                {files.map((f, i) => (
                  <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                    {f.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(f)}
                        alt={f.name}
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '0.375rem', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <div style={{ width: 72, height: 72, background: 'var(--dark-card)', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image size={20} color="var(--text-muted)" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      style={{ position: 'absolute', top: -6, right: -6, background: '#dc2626', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 11, lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Additional Details ── */}
          <div className="detail-section">
            <label className="detail-field-label">Additional Details (optional)</label>
            <textarea
              className="detail-textarea"
              rows={2}
              placeholder="Any additional landmark or context for field crews…"
              value={form.details}
              onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
            />
          </div>

          {/* ── Submit Buttons ── */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button type="submit" className="civic-btn civic-btn-primary civic-btn-lg" disabled={loading}>
              {loading ? (
                <><Loader2 size={15} className="spin-animate" /> Submitting…</>
              ) : (
                'Submit Issue & Ingest'
              )}
            </button>
            <button type="button" className="civic-btn civic-btn-ghost" onClick={() => setReportFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* ── Interactive Map Pin Picker Modal ── */}
      <MapPinPickerModal
        isOpen={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onConfirm={handleMapConfirm}
        initialLat={form.lat}
        initialLng={form.lng}
        initialAddress={form.location}
      />
    </>
  );
};

export default ReportForm;
