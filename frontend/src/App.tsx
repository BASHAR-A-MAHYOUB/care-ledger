import { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  Activity,
  FileText,
  Users,
  LockKeyhole,
  ClipboardList,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Key,
  ShieldAlert,
  ArrowRight,
  Download,
  Filter,
  Check,
  Copy,
  ExternalLink,
  X,
  AlertTriangle,
  Shield,
  Sun,
  Moon,
  Database,
  Cpu,
  Layers,
  Sparkles,
  Terminal,
  FileCode,
  Clock,
  ArrowUpRight,
  Zap
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type Page = 'overview' | 'records' | 'access' | 'audit';
type Theme = 'dark' | 'light';

type RecordItem = {
  record_ref: string;
  patient_ref: string;
  clinician: string;
  record_type: string;
  content_digest: string;
  created_at: string;
  status: string;
  content?: string;
};

type PermissionItem = {
  record_ref: string;
  doctor_id: string;
  granted_by: string;
  purpose: string;
  granted_at: string;
  active: boolean;
};

type AuditItem = {
  event_id: string;
  action: string;
  actor: string;
  record_ref: string;
  detail: string;
  timestamp: string;
};

type Toast = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
};

type MoodColor = 'mint' | 'sunset' | 'azure' | 'lavender';

export default function App() {
  // Theme & Good Mood Color State (defaults to uplifting Light Mode with Mint Serenity)
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('care_ledger_theme') as Theme) || 'light';
  });

  const [mood, setMood] = useState<MoodColor>(() => {
    return (localStorage.getItem('care_ledger_mood') as MoodColor) || 'mint';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('care_ledger_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-mood', mood);
    localStorage.setItem('care_ledger_mood', mood);
  }, [mood]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Page Navigation State
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const hash = window.location.hash.replace('#', '') as Page;
    if (['overview', 'records', 'access', 'audit'].includes(hash)) {
      return hash;
    }
    return 'overview';
  });

  // Global Ledger Data
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [blockHeight, setBlockHeight] = useState(148);

  // View modes
  const [recordViewMode, setRecordViewMode] = useState<'grid' | 'table'>('grid');

  // Medical Record Form State
  const [newPatient, setNewPatient] = useState('PAT-88219');
  const [newClinician, setNewClinician] = useState('Dr. Sarah Sharma (Cardiology)');
  const [newType, setNewType] = useState('Lab result');
  const [newContent, setNewContent] = useState('Comprehensive Lipid Panel: Total Cholesterol: 185 mg/dL, HDL: 54 mg/dL, LDL: 108 mg/dL, Triglycerides: 112 mg/dL.');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [liveDigest, setLiveDigest] = useState('');

  // Record Inspector Modal State
  const [inspectRecord, setInspectRecord] = useState<RecordItem | null>(null);
  const [inspectDoctor, setInspectDoctor] = useState('Dr. Example');
  const [decryptedRecord, setDecryptedRecord] = useState<RecordItem | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [inspectTab, setInspectTab] = useState<'decrypt' | 'integrity' | 'consents'>('decrypt');
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; digest: string } | null>(null);

  // Raw Event Inspector Modal State
  const [inspectEvent, setInspectEvent] = useState<AuditItem | null>(null);

  // Access Control Tab State
  const [grantRecordRef, setGrantRecordRef] = useState('');
  const [grantDoctorId, setGrantDoctorId] = useState('Dr. Example');
  const [grantGrantedBy, setGrantGrantedBy] = useState('PAT-88219');
  const [grantPurpose, setGrantPurpose] = useState('Cardiology consultation and surgical pre-op clearance');

  const [checkRecordRef, setCheckRecordRef] = useState('');
  const [checkDoctorId, setCheckDoctorId] = useState('Dr. Example');
  const [checkResult, setCheckResult] = useState<{ allowed: boolean; doctor: string; record: string } | null>(null);
  const [permFilterStatus, setPermFilterStatus] = useState<'ALL' | 'ACTIVE' | 'REVOKED'>('ALL');

  // Filters & Search
  const [recordSearch, setRecordSearch] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // Sync hash navigation with browser history
  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as Page;
      if (['overview', 'records', 'access', 'audit'].includes(hash)) {
        setCurrentPage(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Compute live SHA-256 digest preview using Web Crypto API
  useEffect(() => {
    if (!newContent) {
      setLiveDigest('');
      return;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(newContent);
    crypto.subtle.digest('SHA-256', data).then((buffer) => {
      const hashArray = Array.from(new Uint8Array(buffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      setLiveDigest(hashHex);
    }).catch(() => {
      setLiveDigest('');
    });
  }, [newContent]);

  // Toast Helper
  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // API helper
  async function apiRequest(path: string, method = 'GET', body?: any) {
    const response = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || `Request failed (${response.status})`);
    }
    return data;
  }

  // Refresh all ledger state
  async function refreshData() {
    try {
      setBusy(true);
      const [recData, permData, auditData] = await Promise.all([
        apiRequest('/api/records'),
        apiRequest('/api/permissions'),
        apiRequest('/api/audit')
      ]);
      setRecords(recData);
      setPermissions(permData);
      setAudit(auditData);

      if (recData.length > 0) {
        if (!grantRecordRef) setGrantRecordRef(recData[0].record_ref);
        if (!checkRecordRef) setCheckRecordRef(recData[0].record_ref);
      }
    } catch (err: any) {
      addToast('Connection Error', err.message || 'Failed to reach mock ledger API', 'warning');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    addToast('Copied to Clipboard', text.length > 32 ? text.slice(0, 24) + '…' : text, 'info');
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Register New Record
  async function handleCreateRecord(e: React.FormEvent) {
    e.preventDefault();
    try {
      setBusy(true);
      const res = await apiRequest('/api/records', 'POST', {
        patient_ref: newPatient,
        clinician: newClinician,
        record_type: newType,
        content: newContent
      });
      setBlockHeight((h) => h + 1);
      addToast(
        'Record Anchored to Ledger',
        `Reference ${res.record_ref} committed with SHA-256 digest ${res.content_digest.slice(0, 16)}…`,
        'success'
      );
      setShowCreateModal(false);
      setNewContent('');
      await refreshData();
      navigateTo('records');
    } catch (err: any) {
      addToast('Registration Failed', err.message || 'Could not anchor record', 'warning');
    } finally {
      setBusy(false);
    }
  }

  // Grant Access
  async function handleGrantAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!grantRecordRef) {
      addToast('Missing Selection', 'Select a target medical record first', 'warning');
      return;
    }
    try {
      setBusy(true);
      await apiRequest(`/api/records/${grantRecordRef}/grant`, 'POST', {
        doctor_id: grantDoctorId,
        granted_by: grantGrantedBy,
        purpose: grantPurpose
      });
      setBlockHeight((h) => h + 1);
      addToast(
        'Consent Grant Anchored',
        `Access authorized for ${grantDoctorId} on record ${grantRecordRef}.`,
        'success'
      );
      await refreshData();
    } catch (err: any) {
      addToast('Grant Error', err.message || 'Failed to grant access', 'warning');
    } finally {
      setBusy(false);
    }
  }

  // Check Access Gate
  async function handleCheckAccess() {
    if (!checkRecordRef) {
      addToast('Missing Selection', 'Select a target medical record first', 'warning');
      return;
    }
    try {
      setBusy(true);
      const res = await apiRequest(`/api/records/${checkRecordRef}/check-access`, 'POST', {
        doctor_id: checkDoctorId
      });
      setCheckResult({
        allowed: res.allowed,
        doctor: checkDoctorId,
        record: checkRecordRef
      });
      addToast(
        res.allowed ? 'Access Authorized' : 'Access Denied',
        res.allowed
          ? `Active consent grant confirmed for ${checkDoctorId}.`
          : `No active consent grant found for ${checkDoctorId}.`,
        res.allowed ? 'success' : 'warning'
      );
      await refreshData();
    } catch (err: any) {
      addToast('Check Failed', err.message || 'Authorization check failed', 'warning');
    } finally {
      setBusy(false);
    }
  }

  // Revoke Access
  async function handleRevokeAccess(recordRef: string, doctorId: string) {
    try {
      setBusy(true);
      await apiRequest(`/api/records/${recordRef}/revoke`, 'POST', {
        doctor_id: doctorId
      });
      setBlockHeight((h) => h + 1);
      addToast(
        'Consent Revoked',
        `Access revoked for ${doctorId} on record ${recordRef}. Revocation committed to ledger.`,
        'success'
      );
      await refreshData();
    } catch (err: any) {
      addToast('Revocation Error', err.message || 'Failed to revoke access', 'warning');
    } finally {
      setBusy(false);
    }
  }

  // Verify Record Cryptographic Integrity
  async function handleVerifyIntegrity(recordRef: string) {
    try {
      setVerifyingIntegrity(true);
      setVerifyResult(null);
      const res = await apiRequest(`/api/records/${recordRef}/verify`);
      setVerifyResult({
        ok: res.integrity_ok,
        digest: res.current_digest
      });
      if (res.integrity_ok) {
        addToast(
          'Cryptographic Integrity Confirmed',
          `SHA-256 digest (${res.stored_digest.slice(0, 16)}…) matches recalculation. Off-chain document is authentic & tamper-free.`,
          'success'
        );
      } else {
        addToast(
          'Integrity Verification Failed',
          'Off-chain document hash does not match ledger anchor! Data alteration detected.',
          'warning'
        );
      }
      await refreshData();
    } catch (err: any) {
      addToast('Verification Error', err.message || 'Integrity check failed', 'warning');
    } finally {
      setVerifyingIntegrity(false);
    }
  }

  // Simulate Decrypted Off-Chain Record View
  async function handleSimulateDecryptedRetrieval() {
    if (!inspectRecord) return;
    try {
      setBusy(true);
      setDecryptError(null);
      setDecryptedRecord(null);
      const res = await apiRequest(`/api/records/${inspectRecord.record_ref}?doctor_id=${encodeURIComponent(inspectDoctor)}`);
      setDecryptedRecord(res);
      addToast(
        'Decryption Gate Passed',
        `Ledger validated clinician "${inspectDoctor}". Off-chain document released and decrypted.`,
        'success'
      );
      await refreshData();
    } catch (err: any) {
      setDecryptError(err.message || 'Access gate rejected authorization');
      addToast('Decryption Gate Blocked', err.message, 'warning');
      await refreshData();
    } finally {
      setBusy(false);
    }
  }

  // Export Audit Log to JSON
  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(audit, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `care_ledger_audit_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Export Complete', 'Audit ledger exported as JSON.', 'info');
  };

  // Export Audit Log to CSV
  const handleExportCSV = () => {
    if (!audit.length) return;
    const headers = ['Event ID', 'Action', 'Actor', 'Record Reference', 'Detail', 'Timestamp'];
    const rows = audit.map((e) => [
      e.event_id,
      e.action,
      `"${e.actor.replace(/"/g, '""')}"`,
      e.record_ref,
      `"${e.detail.replace(/"/g, '""')}"`,
      e.timestamp
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `care_ledger_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Export Complete', 'Audit ledger exported as CSV.', 'info');
  };

  // Run Guided Walkthrough Scenarios
  const runScenarioA = async () => {
    // Authorized read: Dr. Example on rec_cardio_981a
    const cardio = records.find((r) => r.record_ref === 'rec_cardio_981a') || records[0];
    if (cardio) {
      setInspectRecord(cardio);
      setInspectDoctor('Dr. Example');
      setInspectTab('decrypt');
      navigateTo('records');
      setTimeout(() => {
        handleSimulateDecryptedRetrieval();
      }, 400);
    }
  };

  const runScenarioB = async () => {
    // Unauthorized check: Dr. Example on rec_img_7721
    const img = records.find((r) => r.record_ref === 'rec_img_7721') || records[1] || records[0];
    if (img) {
      setCheckRecordRef(img.record_ref);
      setCheckDoctorId('Dr. Example');
      navigateTo('access');
      setTimeout(() => {
        handleCheckAccess();
      }, 400);
    }
  };

  const runScenarioC = async () => {
    // Hash verification
    const rec = records[0];
    if (rec) {
      navigateTo('records');
      setInspectRecord(rec);
      setInspectTab('integrity');
      setTimeout(() => {
        handleVerifyIntegrity(rec.record_ref);
      }, 400);
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.record_ref.toLowerCase().includes(recordSearch.toLowerCase()) ||
        r.patient_ref.toLowerCase().includes(recordSearch.toLowerCase()) ||
        r.clinician.toLowerCase().includes(recordSearch.toLowerCase());
      const matchesType = recordTypeFilter === 'ALL' || r.record_type === recordTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [records, recordSearch, recordTypeFilter]);

  // Filtered Permissions
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      if (permFilterStatus === 'ACTIVE') return p.active;
      if (permFilterStatus === 'REVOKED') return !p.active;
      return true;
    });
  }, [permissions, permFilterStatus]);

  // Filtered Audit Events
  const filteredAudit = useMemo(() => {
    return audit.filter((ev) => {
      const matchesSearch =
        ev.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
        ev.record_ref.toLowerCase().includes(auditSearch.toLowerCase()) ||
        ev.detail.toLowerCase().includes(auditSearch.toLowerCase()) ||
        ev.event_id.toLowerCase().includes(auditSearch.toLowerCase());
      const matchesAction = auditActionFilter === 'ALL' || ev.action === auditActionFilter;
      return matchesSearch && matchesAction;
    });
  }, [audit, auditSearch, auditActionFilter]);

  // Counts
  const activeGrantsCount = permissions.filter((p) => p.active).length;

  return (
    <div className="layout">
      {/* Floating Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="toast-body">
              {t.type === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
              {t.type === 'warning' && <AlertTriangle size={18} color="var(--danger)" />}
              {t.type === 'info' && <ShieldCheck size={18} color="var(--primary)" />}
              <div>
                <strong style={{ display: 'block', fontSize: '13px' }}>{t.title}</strong>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{t.message}</span>
              </div>
            </div>
            <button className="toast-close" onClick={() => removeToast(t.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <aside>
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
            <span className="brand-title">CARE LEDGER</span>
            <div className="brand-subtitle">
              <span className="brand-status-dot"></span>
              <span>Hyperledger Consortium</span>
            </div>
          </div>
        </div>

        <p className="navhead">Workspace Navigation</p>
        <nav className="nav-group">
          <button
            className={`nav-btn ${currentPage === 'overview' ? 'active' : ''}`}
            onClick={() => navigateTo('overview')}
          >
            <Activity />
            <span>Overview &amp; Telemetry</span>
          </button>

          <button
            className={`nav-btn ${currentPage === 'records' ? 'active' : ''}`}
            onClick={() => navigateTo('records')}
          >
            <FileText />
            <span>Medical Records</span>
            {records.length > 0 && <span className="nav-badge">{records.length}</span>}
          </button>

          <button
            className={`nav-btn ${currentPage === 'access' ? 'active' : ''}`}
            onClick={() => navigateTo('access')}
          >
            <Users />
            <span>Access &amp; Consent</span>
            {activeGrantsCount > 0 && <span className="nav-badge">{activeGrantsCount}</span>}
          </button>

          <button
            className={`nav-btn ${currentPage === 'audit' ? 'active' : ''}`}
            onClick={() => navigateTo('audit')}
          >
            <ClipboardList />
            <span>Audit Trail Ledger</span>
            {audit.length > 0 && <span className="nav-badge">{audit.length}</span>}
          </button>
        </nav>

        {/* Live Network Telemetry Widget */}
        <div className="sidebar-network-box">
          <div className="network-box-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Cpu size={13} />
              Peer Node Telemetry
            </span>
            <span style={{ color: '#10b981', fontSize: '10px' }}>● Online</span>
          </div>
          <div className="network-meta-row">
            <span>Channel</span>
            <span>care-channel-01</span>
          </div>
          <div className="network-meta-row">
            <span>Peer MSP</span>
            <span>HospitalOrg1MSP</span>
          </div>
          <div className="network-meta-row">
            <span>Block Height</span>
            <span style={{ color: '#38bdf8' }}>#{blockHeight}</span>
          </div>
          <div className="network-meta-row">
            <span>Consensus</span>
            <span>Raft (CFT)</span>
          </div>
          <div className="network-meta-row">
            <span>Avg Latency</span>
            <span>38 ms</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="privacy-badge">
            <LockKeyhole />
            <div>
              <b>HIPAA Privacy Standard</b>
              <small>No plaintext medical data on public ledgers. Stored off-chain with SHA-256 anchors.</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main>
        {/* Dynamic Header */}
        <header>
          <div>
            <div className="eyebrow">
              <Shield size={12} />
              <span>Permissioned Healthcare Workspace</span>
              <span>/</span>
              <span style={{ textTransform: 'capitalize' }}>{currentPage}</span>
            </div>
            <h1>
              {currentPage === 'overview' && 'Healthcare Data Governance Dashboard'}
              {currentPage === 'records' && 'Off-Chain Encrypted Medical Records'}
              {currentPage === 'access' && 'Patient Consent & Role-Based Access Control'}
              {currentPage === 'audit' && 'Immutable Transaction Audit Trail'}
            </h1>
            <p className="subtitle">
              {currentPage === 'overview' && 'Real-time telemetry, tamper-evident cryptographic digests, and consent gates.'}
              {currentPage === 'records' && 'Manage medical references, verify cryptographic integrity, or simulate authorized clinical access.'}
              {currentPage === 'access' && 'Grant, verify, or revoke doctor authorizations with immediate cryptographic audit enforcement.'}
              {currentPage === 'audit' && 'Verifiable, immutable audit trail of all medical record access and consent lifecycle transactions.'}
            </p>
          </div>

          <div className="header-actions">
            {/* Mood Color Palette Selector */}
            <div className="mood-picker" title="Choose your good mood color palette">
              <span className="mood-label">
                <Sparkles size={13} color="var(--primary)" />
                <span>Mood:</span>
              </span>
              <button
                type="button"
                className={`mood-swatch mint ${mood === 'mint' ? 'active' : ''}`}
                onClick={() => {
                  setMood('mint');
                  addToast('Mood Palette', '🌿 Mint Serenity active (Refreshing, healing, serene)', 'info');
                }}
                title="🌿 Mint Serenity (Refreshing, healing, serene)"
              />
              <button
                type="button"
                className={`mood-swatch sunset ${mood === 'sunset' ? 'active' : ''}`}
                onClick={() => {
                  setMood('sunset');
                  addToast('Mood Palette', '☀️ Sunrise Coral active (Warm, cheerful, optimistic)', 'info');
                }}
                title="☀️ Sunrise Coral (Warm, cheerful, optimistic)"
              />
              <button
                type="button"
                className={`mood-swatch azure ${mood === 'azure' ? 'active' : ''}`}
                onClick={() => {
                  setMood('azure');
                  addToast('Mood Palette', '🌊 Azure Breeze active (Crisp, oceanic, trustworthy)', 'info');
                }}
                title="🌊 Azure Breeze (Crisp oceanic sky)"
              />
              <button
                type="button"
                className={`mood-swatch lavender ${mood === 'lavender' ? 'active' : ''}`}
                onClick={() => {
                  setMood('lavender');
                  addToast('Mood Palette', '🌸 Lavender Dream active (Calming, gentle, soothing)', 'info');
                }}
                title="🌸 Lavender Dream (Gentle & soothing orchid)"
              />
            </div>

            {/* Theme Toggle */}
            <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Dark/Light Mode">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <div className="status-pill">
              <span className="status-pulse-dot"></span>
              <span>Mock Ledger Active</span>
            </div>

            <button
              className="btn btn-secondary"
              onClick={refreshData}
              disabled={busy}
              title="Refresh ledger state from backend"
            >
              <RefreshCw size={14} className={busy ? 'spin' : ''} />
              <span>Sync</span>
            </button>

            {currentPage === 'records' && (
              <button className="btn" onClick={() => setShowCreateModal(true)}>
                <Plus size={14} />
                <span>Register Record</span>
              </button>
            )}

            {currentPage === 'audit' && (
              <div className="btn-group">
                <button className="btn btn-secondary" onClick={handleExportJSON}>
                  <Download size={14} />
                  <span>JSON</span>
                </button>
                <button className="btn btn-secondary" onClick={handleExportCSV}>
                  <Download size={14} />
                  <span>CSV</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Guided Walkthrough Scenarios Banner */}
        <div className="demo-scenarios-banner">
          <div className="demo-scenarios-header">
            <div className="demo-scenarios-title">
              <Sparkles size={16} />
              <span>Interactive Demonstration Sandbox</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Click any scenario to simulate live blockchain flows:
            </span>
          </div>

          <div className="scenario-buttons">
            <button className="scenario-btn" onClick={runScenarioA}>
              <CheckCircle2 size={14} color="#10b981" />
              <span>Scenario 1: Authorized Decryption (Dr. Example)</span>
            </button>
            <button className="scenario-btn" onClick={runScenarioB}>
              <ShieldAlert size={14} color="#ef4444" />
              <span>Scenario 2: Unauthorized Gate Check (Denial)</span>
            </button>
            <button className="scenario-btn" onClick={runScenarioC}>
              <ShieldCheck size={14} color="#0ea5e9" />
              <span>Scenario 3: Verify SHA-256 Digest Integrity</span>
            </button>
            <button className="scenario-btn" onClick={() => { setShowCreateModal(true); navigateTo('records'); }}>
              <Plus size={14} color="#8b5cf6" />
              <span>Scenario 4: Register New Medical Reference</span>
            </button>
          </div>
        </div>

        {/* Top KPI Stat Cards (Clickable) */}
        <section className="stats">
          <div className="stat-card" onClick={() => navigateTo('records')}>
            <div className="stat-card-header">
              <span className="stat-title">Record References</span>
              <div className="stat-icon">
                <FileText size={18} />
              </div>
            </div>
            <div className="stat-value">{records.length}</div>
            <div className="stat-desc">
              <span>Anchored in ledger</span>
              <ArrowRight size={12} />
            </div>
          </div>

          <div className="stat-card stat-green" onClick={() => navigateTo('access')}>
            <div className="stat-card-header">
              <span className="stat-title">Active Consents</span>
              <div className="stat-icon">
                <Key size={18} />
              </div>
            </div>
            <div className="stat-value">{activeGrantsCount}</div>
            <div className="stat-desc">
              <span>Authorized doctor grants</span>
              <ArrowRight size={12} />
            </div>
          </div>

          <div className="stat-card stat-purple" onClick={() => navigateTo('audit')}>
            <div className="stat-card-header">
              <span className="stat-title">Audit Ledger Events</span>
              <div className="stat-icon">
                <ClipboardList size={18} />
              </div>
            </div>
            <div className="stat-value">{audit.length}</div>
            <div className="stat-desc">
              <span>Immutable event blocks</span>
              <ArrowRight size={12} />
            </div>
          </div>

          <div className="stat-card stat-amber">
            <div className="stat-card-header">
              <span className="stat-title">Security State</span>
              <div className="stat-icon">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="stat-value">100%</div>
            <div className="stat-desc">AES-256 off-chain simulated</div>
          </div>
        </section>

        {/* ========================================================
            PAGE 1: OVERVIEW & TELEMETRY
        ======================================================== */}
        {currentPage === 'overview' && (
          <div className="page-view">
            {/* Architecture Explainer Card */}
            <div className="arch-card">
              <div className="arch-header">
                <h3>
                  <Layers size={19} color="#38bdf8" />
                  Hyperledger Fabric Privacy-Preserving Architecture
                </h3>
                <span className="badge badge-blue">Zero-Knowledge Off-Chain Pattern</span>
              </div>
              <div className="arch-steps">
                <div className="arch-step">
                  <span className="arch-step-num">Step 1</span>
                  <div className="arch-step-title">Off-Chain Storage</div>
                  <p className="arch-step-desc">
                    Raw clinical records, EHR scans, and diagnoses are stored in encrypted off-chain stores (PostgreSQL / IPFS).
                  </p>
                </div>
                <div className="arch-step">
                  <span className="arch-step-num">Step 2</span>
                  <div className="arch-step-title">Cryptographic Hash Digest</div>
                  <p className="arch-step-desc">
                    A SHA-256 cryptographic digest is anchored on the permissioned ledger to provide an immutable tamper detection reference.
                  </p>
                </div>
                <div className="arch-step">
                  <span className="arch-step-num">Step 3</span>
                  <div className="arch-step-title">Chaincode Consent Policy</div>
                  <p className="arch-step-desc">
                    Smart contract evaluates patient consent, clinician identity, and clinical purpose before granting document access.
                  </p>
                </div>
                <div className="arch-step">
                  <span className="arch-step-num">Step 4</span>
                  <div className="arch-step-title">Immutable Audit Trail</div>
                  <p className="arch-step-desc">
                    Every read, grant, revoke, and check creates an indelible transaction committed across all peer nodes for regulatory compliance.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Snapshots */}
            <div className="grid-2">
              {/* Recent Records Snapshot */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <FileText size={18} />
                      Latest Medical Records
                    </h3>
                    <p className="card-desc">Most recently registered off-chain record digests</p>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => navigateTo('records')}>
                    <span>View All</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Patient</th>
                        <th>Type</th>
                        <th>Integrity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.slice(0, 4).map((r) => (
                        <tr
                          key={r.record_ref}
                          onClick={() => {
                            setInspectRecord(r);
                            navigateTo('records');
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <strong>{r.record_ref}</strong>
                          </td>
                          <td>
                            <span className="badge badge-type">{r.patient_ref}</span>
                          </td>
                          <td>
                            <span className="badge badge-blue">{r.record_type}</span>
                          </td>
                          <td>
                            <span className="digest-code">{r.content_digest.slice(0, 10)}…</span>
                          </td>
                        </tr>
                      ))}
                      {records.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                            No records registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Audit Feed Snapshot */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <ClipboardList size={18} />
                      Recent Ledger Transactions
                    </h3>
                    <p className="card-desc">Real-time ledger access and consent events</p>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => navigateTo('audit')}>
                    <span>Full Ledger</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <div className="events-list">
                  {audit.slice(0, 4).map((ev) => {
                    const isRevoked = ev.action.includes('REVOKED') || ev.action.includes('DENIED') || ev.action.includes('TAMPER');
                    const isGranted = ev.action.includes('GRANTED') || ev.action.includes('VERIFIED');
                    const isAccess = ev.action.includes('ACCESSED') || ev.action.includes('CHECKED');

                    return (
                      <div
                        className="event-row"
                        key={ev.event_id}
                        onClick={() => setInspectEvent(ev)}
                        title="Click to view raw transaction envelope"
                      >
                        <div
                          className={`event-icon-box ${
                            isRevoked ? 'red' : isGranted ? 'green' : isAccess ? 'purple' : 'blue'
                          }`}
                        >
                          {isRevoked ? (
                            <XCircle size={16} />
                          ) : isGranted ? (
                            <CheckCircle2 size={16} />
                          ) : isAccess ? (
                            <Key size={16} />
                          ) : (
                            <Shield size={16} />
                          )}
                        </div>
                        <div className="event-content">
                          <div className="event-action-line">
                            <span className="event-action">{ev.action.replace(/_/g, ' ')}</span>
                            <span className="badge badge-type">{ev.record_ref}</span>
                          </div>
                          <div className="event-meta">
                            {ev.actor} · {ev.detail}
                          </div>
                        </div>
                        <div className="event-time">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                  {audit.length === 0 && (
                    <div className="empty-state">
                      <p>No audit events recorded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            PAGE 2: MEDICAL RECORDS
        ======================================================== */}
        {currentPage === 'records' && (
          <div className="page-view">
            {/* Search and Filters Bar */}
            <div className="filter-bar">
              <div className="search-box">
                <Search />
                <input
                  type="text"
                  placeholder="Search by Record Ref, Patient Ref, or Clinician…"
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                />
              </div>

              <select
                style={{ width: 'auto', minWidth: '170px' }}
                value={recordTypeFilter}
                onChange={(e) => setRecordTypeFilter(e.target.value)}
              >
                <option value="ALL">All Record Types</option>
                <option value="Lab result">Lab result</option>
                <option value="Prescription">Prescription</option>
                <option value="Clinical note">Clinical note</option>
                <option value="Imaging reference">Imaging reference</option>
              </select>

              {/* View Mode Toggle */}
              <div className="view-mode-toggle">
                <button
                  className={`view-mode-btn ${recordViewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setRecordViewMode('grid')}
                  title="Grid Cards View"
                >
                  <Layers size={14} />
                  <span>Grid</span>
                </button>
                <button
                  className={`view-mode-btn ${recordViewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setRecordViewMode('table')}
                  title="Table Data View"
                >
                  <FileText size={14} />
                  <span>Table</span>
                </button>
              </div>

              <button className="btn" onClick={() => setShowCreateModal(true)}>
                <Plus size={15} />
                <span>Register Record</span>
              </button>
            </div>

            {/* Grid View Mode */}
            {recordViewMode === 'grid' && (
              <div className="records-grid">
                {filteredRecords.map((r) => (
                  <div className="record-card" key={r.record_ref}>
                    <div className="record-card-top">
                      <span className="badge badge-blue">{r.record_type}</span>
                      <span className="badge badge-type">{r.patient_ref}</span>
                    </div>

                    <h4 className="record-card-title">{r.record_ref}</h4>
                    <div className="record-card-doctor">
                      <Shield size={14} color="var(--primary)" />
                      <span>{r.clinician}</span>
                    </div>

                    <div>
                      <small style={{ color: 'var(--text-dim)', display: 'block', marginBottom: '4px', fontSize: '10px' }}>
                        SHA-256 LEDGER ANCHOR:
                      </small>
                      <div
                        className="digest-code"
                        style={{ width: '100%', cursor: 'pointer', justifyContent: 'space-between' }}
                        title="Click to copy SHA-256 digest"
                        onClick={() => copyToClipboard(r.content_digest)}
                      >
                        <span>{r.content_digest.slice(0, 18)}…</span>
                        {copiedText === r.content_digest ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>Registered: {new Date(r.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="record-card-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setInspectRecord(r);
                          setDecryptedRecord(null);
                          setDecryptError(null);
                          setInspectTab('decrypt');
                        }}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>

                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setInspectRecord(r);
                          setInspectTab('integrity');
                          handleVerifyIntegrity(r.record_ref);
                        }}
                        title="Verify cryptographic integrity"
                      >
                        <ShieldCheck size={13} />
                        <span>Verify</span>
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setGrantRecordRef(r.record_ref);
                          setCheckRecordRef(r.record_ref);
                          navigateTo('access');
                        }}
                        title="Manage consent permissions"
                      >
                        <Key size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {filteredRecords.length === 0 && (
                  <div style={{ gridColumn: '1 / -1' }} className="card">
                    <div className="empty-state">
                      <FileText />
                      <h4>No matching records found</h4>
                      <p>Try clearing your search query or register a new dummy medical record.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Table View Mode */}
            {recordViewMode === 'table' && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <FileText size={18} />
                      Registered Medical Records ({filteredRecords.length})
                    </h3>
                    <p className="card-desc">
                      Raw patient records are stored off-chain. Only references and cryptographic digests are exposed.
                    </p>
                  </div>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Record Reference</th>
                        <th>Patient Reference</th>
                        <th>Clinician</th>
                        <th>Classification</th>
                        <th>SHA-256 Digest</th>
                        <th>Created Date</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((r) => (
                        <tr key={r.record_ref}>
                          <td>
                            <strong>{r.record_ref}</strong>
                          </td>
                          <td>
                            <span className="badge badge-type">{r.patient_ref}</span>
                          </td>
                          <td>{r.clinician}</td>
                          <td>
                            <span className="badge badge-blue">{r.record_type}</span>
                          </td>
                          <td>
                            <span
                              className="digest-code"
                              title="Click to copy full SHA-256 digest"
                              onClick={() => copyToClipboard(r.content_digest)}
                              style={{ cursor: 'pointer' }}
                            >
                              {r.content_digest.slice(0, 14)}…
                              {copiedText === r.content_digest ? <Check size={11} color="green" /> : <Copy size={11} />}
                            </span>
                          </td>
                          <td>{new Date(r.created_at).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setInspectRecord(r);
                                  setDecryptedRecord(null);
                                  setDecryptError(null);
                                  setInspectTab('decrypt');
                                }}
                              >
                                <Eye size={13} />
                                <span>Inspect</span>
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleVerifyIntegrity(r.record_ref)}
                                disabled={busy}
                              >
                                <ShieldCheck size={13} />
                                <span>Verify</span>
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setGrantRecordRef(r.record_ref);
                                  setCheckRecordRef(r.record_ref);
                                  navigateTo('access');
                                }}
                              >
                                <Users size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredRecords.length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            <div className="empty-state">
                              <FileText />
                              <h4>No records match filters</h4>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Registration Modal */}
            {showCreateModal && (
              <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                        Register Medical Record Reference
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Simulates off-chain encrypted ingestion with immutable on-chain digest anchoring.
                      </p>
                    </div>
                    <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateRecord}>
                    <div className="form-group">
                      <label>Patient Reference Identifier</label>
                      <input
                        type="text"
                        required
                        value={newPatient}
                        onChange={(e) => setNewPatient(e.target.value)}
                        placeholder="e.g. PAT-88219"
                      />
                      <span className="input-hint">Anonymized pseudonymous identifier. Never enter real patient names.</span>
                    </div>

                    <div className="form-group">
                      <label>Clinician Display Name &amp; Dept</label>
                      <input
                        type="text"
                        required
                        value={newClinician}
                        onChange={(e) => setNewClinician(e.target.value)}
                        placeholder="e.g. Dr. Sarah Sharma (Cardiology)"
                      />
                    </div>

                    <div className="form-group">
                      <label>Record Classification</label>
                      <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                        <option value="Lab result">Lab result</option>
                        <option value="Prescription">Prescription</option>
                        <option value="Clinical note">Clinical note</option>
                        <option value="Imaging reference">Imaging reference</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Dummy Clinical Content (Stored Off-Chain)</label>
                      <textarea
                        rows={4}
                        required
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Enter clinical observations, diagnostic lab values, or prescription data..."
                      />
                    </div>

                    {liveDigest && (
                      <div
                        className="form-group"
                        style={{
                          background: 'rgba(14, 165, 233, 0.08)',
                          padding: '14px',
                          borderRadius: '10px',
                          border: '1px solid var(--primary-border)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 700, fontSize: '12px' }}>
                          <Terminal size={14} />
                          <span>Real-Time SHA-256 Digest Preview (Anchor Payload):</span>
                        </div>
                        <div className="digest-code" style={{ marginTop: '8px', width: '100%', wordBreak: 'break-all' }}>
                          {liveDigest}
                        </div>
                      </div>
                    )}

                    <div className="btn-group" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-success" disabled={busy || !newContent}>
                        <ShieldCheck size={15} />
                        <span>Commit Record to Ledger</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Record Inspector & Decryption Gate Modal */}
            {inspectRecord && (
              <div className="modal-overlay" onClick={() => setInspectRecord(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                        Record Inspector: {inspectRecord.record_ref}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Off-chain storage reference &amp; Smart Contract gate simulator
                      </p>
                    </div>
                    <button className="modal-close-btn" onClick={() => setInspectRecord(null)}>
                      <X size={18} />
                    </button>
                  </div>

                  {/* Inspector Tabs */}
                  <div className="pill-group" style={{ marginBottom: '18px' }}>
                    <div
                      className={`pill-item ${inspectTab === 'decrypt' ? 'active' : ''}`}
                      onClick={() => setInspectTab('decrypt')}
                    >
                      <Key size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Decryption Gate Simulator
                    </div>
                    <div
                      className={`pill-item ${inspectTab === 'integrity' ? 'active' : ''}`}
                      onClick={() => {
                        setInspectTab('integrity');
                        handleVerifyIntegrity(inspectRecord.record_ref);
                      }}
                    >
                      <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Cryptographic Integrity
                    </div>
                    <div
                      className={`pill-item ${inspectTab === 'consents' ? 'active' : ''}`}
                      onClick={() => setInspectTab('consents')}
                    >
                      <Users size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Active Consents
                    </div>
                  </div>

                  {/* Record Metadata Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <small style={{ color: 'var(--text-dim)' }}>Patient ID</small>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inspectRecord.patient_ref}</div>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-dim)' }}>Record Classification</small>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inspectRecord.record_type}</div>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-dim)' }}>Originating Clinician</small>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inspectRecord.clinician}</div>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-dim)' }}>Registration Date</small>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{new Date(inspectRecord.created_at).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Tab 1: Decryption Simulator */}
                  {inspectTab === 'decrypt' && (
                    <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '16px' }}>
                      <h4 style={{ margin: '0 0 6px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LockKeyhole size={15} color="var(--primary)" />
                        Simulate Doctor Access Request
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                        The ledger smart contract verifies if this doctor identity holds an active consent grant.
                      </p>

                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input
                          type="text"
                          value={inspectDoctor}
                          onChange={(e) => setInspectDoctor(e.target.value)}
                          placeholder="Doctor identity (e.g. Dr. Example)"
                        />
                        <button className="btn" onClick={handleSimulateDecryptedRetrieval} disabled={busy || !inspectDoctor}>
                          <Key size={13} />
                          <span>Request Access</span>
                        </button>
                      </div>

                      {/* Doctor presets */}
                      <div className="pill-group" style={{ marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', alignSelf: 'center' }}>Presets:</span>
                        {['Dr. Example', 'Dr. Sarah Sharma', 'Dr. Robert Vance', 'Dr. Unauthorized'].map((doc) => (
                          <div
                            key={doc}
                            className={`pill-item ${inspectDoctor === doc ? 'active' : ''}`}
                            onClick={() => setInspectDoctor(doc)}
                          >
                            {doc}
                          </div>
                        ))}
                      </div>

                      {decryptedRecord && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--success-border)', borderRadius: '10px', padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 700, marginBottom: '6px' }}>
                            <CheckCircle2 size={18} />
                            <span>Ledger Authorized: Off-Chain Document Decrypted</span>
                          </div>
                          <div className="decrypted-box">{decryptedRecord.content}</div>
                          <small style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <ShieldCheck size={13} />
                            Cryptographic hash verified against on-chain block. Action logged to audit trail.
                          </small>
                        </div>
                      )}

                      {decryptError && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--danger-border)', borderRadius: '10px', padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 700, marginBottom: '4px' }}>
                            <ShieldAlert size={18} />
                            <span>Chaincode Access Denied (403 Forbidden)</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-main)' }}>{decryptError}</p>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ marginTop: '12px' }}
                            onClick={() => {
                              setGrantRecordRef(inspectRecord.record_ref);
                              setGrantDoctorId(inspectDoctor);
                              setInspectRecord(null);
                              navigateTo('access');
                            }}
                          >
                            <Users size={12} />
                            <span>Grant Consent for {inspectDoctor}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Cryptographic Integrity */}
                  {inspectTab === 'integrity' && (
                    <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '16px' }}>
                      <h4 style={{ margin: '0 0 6px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={16} color="var(--primary)" />
                        On-Chain Cryptographic Digest Anchor
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px' }}>
                        Compares the off-chain document's live SHA-256 hash against the immutable ledger anchor.
                      </p>

                      <div className="form-group">
                        <label>Stored Ledger Anchor (SHA-256):</label>
                        <div className="digest-code" style={{ width: '100%', wordBreak: 'break-all' }}>
                          {inspectRecord.content_digest}
                        </div>
                      </div>

                      {verifyingIntegrity && (
                        <div style={{ padding: '14px', textAlign: 'center', color: 'var(--primary)' }}>
                          <RefreshCw size={18} className="spin" style={{ display: 'inline', marginRight: '8px' }} />
                          <span>Recalculating hash and comparing with block anchor...</span>
                        </div>
                      )}

                      {verifyResult && (
                        <div
                          style={{
                            background: verifyResult.ok ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            border: `1px solid ${verifyResult.ok ? 'var(--success-border)' : 'var(--danger-border)'}`,
                            borderRadius: '10px',
                            padding: '16px',
                            marginTop: '12px'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontWeight: 700,
                              color: verifyResult.ok ? 'var(--success)' : 'var(--danger)',
                              marginBottom: '6px'
                            }}
                          >
                            {verifyResult.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                            <span>{verifyResult.ok ? 'INTEGRITY VERIFIED: TAMPER-FREE' : 'INTEGRITY MISMATCH DETECTED'}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-main)' }}>
                            {verifyResult.ok
                              ? 'Off-chain medical document matches the cryptographic ledger anchor byte-for-byte.'
                              : 'Live hash does NOT match the stored ledger anchor. Data alteration has occurred.'}
                          </p>
                        </div>
                      )}

                      <div style={{ marginTop: '16px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleVerifyIntegrity(inspectRecord.record_ref)}
                          disabled={verifyingIntegrity}
                        >
                          <RefreshCw size={13} />
                          <span>Re-run Verification Check</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Active Consents for this Record */}
                  {inspectTab === 'consents' && (
                    <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '16px' }}>
                      <h4 style={{ margin: '0 0 6px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={16} color="var(--primary)" />
                        Doctor Consents for {inspectRecord.record_ref}
                      </h4>

                      <div className="table-container" style={{ marginTop: '12px' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Doctor</th>
                              <th>Purpose</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {permissions
                              .filter((p) => p.record_ref === inspectRecord.record_ref)
                              .map((p, idx) => (
                                <tr key={idx}>
                                  <td><strong>{p.doctor_id}</strong></td>
                                  <td>{p.purpose}</td>
                                  <td>
                                    <span className={`badge ${p.active ? 'badge-active' : 'badge-revoked'}`}>
                                      {p.active ? 'Active' : 'Revoked'}
                                    </span>
                                  </td>
                                  <td>
                                    {p.active ? (
                                      <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleRevokeAccess(p.record_ref, p.doctor_id)}
                                      >
                                        Revoke
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Revoked</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            {permissions.filter((p) => p.record_ref === inspectRecord.record_ref).length === 0 && (
                              <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)' }}>
                                  No consent grants on record yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="btn-group" style={{ justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button className="btn btn-secondary" onClick={() => setInspectRecord(null)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            PAGE 3: ACCESS CONTROL & CONSENT
        ======================================================== */}
        {currentPage === 'access' && (
          <div className="page-view">
            <div className="grid-2">
              {/* Grant Access Console */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <LockKeyhole size={18} />
                      Grant Patient Consent
                    </h3>
                    <p className="card-desc">Anchor a patient-authorized access grant into the ledger.</p>
                  </div>
                </div>

                <form onSubmit={handleGrantAccess}>
                  <div className="form-group">
                    <label>Select Target Medical Record</label>
                    <select
                      value={grantRecordRef}
                      onChange={(e) => setGrantRecordRef(e.target.value)}
                      required
                    >
                      <option value="">-- Choose a Record --</option>
                      {records.map((r) => (
                        <option key={r.record_ref} value={r.record_ref}>
                          {r.record_ref} · {r.patient_ref} ({r.record_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Doctor / Clinician Identifier</label>
                    <input
                      type="text"
                      required
                      value={grantDoctorId}
                      onChange={(e) => setGrantDoctorId(e.target.value)}
                      placeholder="e.g. Dr. Example or Dr. Sarah Sharma"
                    />
                    <div className="pill-group">
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', alignSelf: 'center' }}>Quick Fill:</span>
                      {['Dr. Example', 'Dr. Sarah Sharma', 'Dr. Robert Vance', 'Dr. Emily Chen'].map((doc) => (
                        <div
                          key={doc}
                          className={`pill-item ${grantDoctorId === doc ? 'active' : ''}`}
                          onClick={() => setGrantDoctorId(doc)}
                        >
                          {doc}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Granted By (Patient Identifier)</label>
                    <input
                      type="text"
                      required
                      value={grantGrantedBy}
                      onChange={(e) => setGrantGrantedBy(e.target.value)}
                      placeholder="e.g. PAT-88219"
                    />
                  </div>

                  <div className="form-group">
                    <label>Clinical Purpose of Access</label>
                    <input
                      type="text"
                      required
                      value={grantPurpose}
                      onChange={(e) => setGrantPurpose(e.target.value)}
                      placeholder="e.g. Surgical consultation, second opinion"
                    />
                    <div className="pill-group">
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', alignSelf: 'center' }}>Presets:</span>
                      {[
                        'Treatment consultation',
                        'Cardiology second opinion',
                        'Pre-op surgical clearance',
                        'Emergency diagnostic review'
                      ].map((pur) => (
                        <div
                          key={pur}
                          className={`pill-item ${grantPurpose === pur ? 'active' : ''}`}
                          onClick={() => setGrantPurpose(pur)}
                        >
                          {pur}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="btn btn-wide" disabled={busy || !grantRecordRef}>
                    <ShieldCheck size={15} />
                    <span>Anchor Consent Grant to Ledger</span>
                  </button>
                </form>
              </div>

              {/* Check Access Simulator */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <Key size={18} />
                      Access Authorization Gate Simulator
                    </h3>
                    <p className="card-desc">Verify if a doctor has an active ledger grant for a record.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Select Medical Record</label>
                  <select
                    value={checkRecordRef}
                    onChange={(e) => {
                      setCheckRecordRef(e.target.value);
                      setCheckResult(null);
                    }}
                  >
                    <option value="">-- Choose a Record --</option>
                    {records.map((r) => (
                      <option key={r.record_ref} value={r.record_ref}>
                        {r.record_ref} · {r.patient_ref} ({r.record_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Doctor / Clinician Identifier</label>
                  <input
                    type="text"
                    value={checkDoctorId}
                    onChange={(e) => {
                      setCheckDoctorId(e.target.value);
                      setCheckResult(null);
                    }}
                    placeholder="Doctor identity"
                  />
                  <div className="pill-group">
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', alignSelf: 'center' }}>Quick Fill:</span>
                    {['Dr. Example', 'Dr. Sarah Sharma', 'Dr. Robert Vance', 'Dr. Unauthorized'].map((doc) => (
                      <div
                        key={doc}
                        className={`pill-item ${checkDoctorId === doc ? 'active' : ''}`}
                        onClick={() => {
                          setCheckDoctorId(doc);
                          setCheckResult(null);
                        }}
                      >
                        {doc}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="btn-group" style={{ marginBottom: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCheckAccess}
                    disabled={busy || !checkRecordRef || !checkDoctorId}
                  >
                    <CheckCircle2 size={14} />
                    <span>Verify Authorization</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleRevokeAccess(checkRecordRef, checkDoctorId)}
                    disabled={busy || !checkRecordRef || !checkDoctorId}
                  >
                    <XCircle size={14} />
                    <span>Revoke Access</span>
                  </button>
                </div>

                {checkResult && (
                  <div
                    style={{
                      background: checkResult.allowed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: `1px solid ${checkResult.allowed ? 'var(--success-border)' : 'var(--danger-border)'}`,
                      borderRadius: '10px',
                      padding: '16px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 700,
                        color: checkResult.allowed ? 'var(--success)' : 'var(--danger)'
                      }}
                    >
                      {checkResult.allowed ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                      <span>{checkResult.allowed ? 'LEDGER ACCESS ALLOWED' : 'LEDGER ACCESS DENIED'}</span>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                      {checkResult.allowed
                        ? `Clinician "${checkResult.doctor}" has a valid, active consent grant for record "${checkResult.record}". The smart contract permits decryption key release.`
                        : `Clinician "${checkResult.doctor}" does NOT have an active grant for record "${checkResult.record}". The smart contract blocks document retrieval (403 Forbidden).`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Active Permissions & Grants Table */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    <Users size={18} />
                    Consent Matrix &amp; Active Grants ({filteredPermissions.length})
                  </h3>
                  <p className="card-desc">All consent grants registered in the mock ledger.</p>
                </div>

                {/* Filter Status Pills */}
                <div className="pill-group">
                  <div
                    className={`pill-item ${permFilterStatus === 'ALL' ? 'active' : ''}`}
                    onClick={() => setPermFilterStatus('ALL')}
                  >
                    All ({permissions.length})
                  </div>
                  <div
                    className={`pill-item ${permFilterStatus === 'ACTIVE' ? 'active' : ''}`}
                    onClick={() => setPermFilterStatus('ACTIVE')}
                  >
                    Active ({activeGrantsCount})
                  </div>
                  <div
                    className={`pill-item ${permFilterStatus === 'REVOKED' ? 'active' : ''}`}
                    onClick={() => setPermFilterStatus('REVOKED')}
                  >
                    Revoked ({permissions.length - activeGrantsCount})
                  </div>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Record Reference</th>
                      <th>Authorized Doctor</th>
                      <th>Granted By</th>
                      <th>Purpose of Access</th>
                      <th>Grant Date</th>
                      <th>Ledger Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPermissions.map((p, idx) => (
                      <tr key={`${p.record_ref}-${p.doctor_id}-${idx}`}>
                        <td>
                          <strong>{p.record_ref}</strong>
                        </td>
                        <td>{p.doctor_id}</td>
                        <td>
                          <span className="badge badge-type">{p.granted_by}</span>
                        </td>
                        <td>{p.purpose}</td>
                        <td>{new Date(p.granted_at).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${p.active ? 'badge-active' : 'badge-revoked'}`}>
                            {p.active ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                            {p.active ? (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRevokeAccess(p.record_ref, p.doctor_id)}
                                disabled={busy}
                              >
                                <XCircle size={12} />
                                <span>Revoke</span>
                              </button>
                            ) : (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setGrantRecordRef(p.record_ref);
                                  setGrantDoctorId(p.doctor_id);
                                  setGrantGrantedBy(p.granted_by);
                                  setGrantPurpose(p.purpose);
                                }}
                              >
                                <span>Re-grant</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPermissions.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty-state">
                            <Users />
                            <h4>No permissions match criteria</h4>
                            <p>Use the grant form above to authorize a clinician.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            PAGE 4: AUDIT TRAIL LEDGER
        ======================================================== */}
        {currentPage === 'audit' && (
          <div className="page-view">
            {/* Filter & Export Bar */}
            <div className="filter-bar">
              <div className="search-box">
                <Search />
                <input
                  type="text"
                  placeholder="Filter events by Actor, Record Ref, Event ID, or Detail…"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                />
              </div>

              <select
                style={{ width: 'auto', minWidth: '190px' }}
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
              >
                <option value="ALL">All Event Types</option>
                <option value="RECORD_REGISTERED">RECORD_REGISTERED</option>
                <option value="ACCESS_GRANTED">ACCESS_GRANTED</option>
                <option value="ACCESS_REVOKED">ACCESS_REVOKED</option>
                <option value="ACCESS_CHECKED">ACCESS_CHECKED</option>
                <option value="RECORD_ACCESSED">RECORD_ACCESSED</option>
                <option value="ACCESS_DENIED">ACCESS_DENIED</option>
                <option value="INTEGRITY_VERIFIED">INTEGRITY_VERIFIED</option>
                <option value="TAMPER_DETECTED">TAMPER_DETECTED</option>
              </select>

              <div className="btn-group">
                <button className="btn btn-secondary" onClick={handleExportJSON}>
                  <Download size={14} />
                  <span>Export JSON</span>
                </button>
                <button className="btn btn-secondary" onClick={handleExportCSV}>
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Audit Trail Card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    <ClipboardList size={18} />
                    Immutable Blockchain Event Sequence ({filteredAudit.length})
                  </h3>
                  <p className="card-desc">
                    Cryptographic sequence of events in chronological order. Click any event to inspect raw transaction envelope.
                  </p>
                </div>
              </div>

              <div className="events-list">
                {filteredAudit.map((ev) => {
                  const isRevoked = ev.action.includes('REVOKED') || ev.action.includes('DENIED') || ev.action.includes('TAMPER');
                  const isGranted = ev.action.includes('GRANTED') || ev.action.includes('VERIFIED');
                  const isAccess = ev.action.includes('ACCESSED') || ev.action.includes('CHECKED');

                  return (
                    <div
                      className="event-row"
                      key={ev.event_id}
                      onClick={() => setInspectEvent(ev)}
                      title="Click to view raw ledger transaction envelope"
                    >
                      <div
                        className={`event-icon-box ${
                          isRevoked ? 'red' : isGranted ? 'green' : isAccess ? 'purple' : 'blue'
                        }`}
                      >
                        {isRevoked ? (
                          <XCircle size={18} />
                        ) : isGranted ? (
                          <CheckCircle2 size={18} />
                        ) : isAccess ? (
                          <Key size={18} />
                        ) : (
                          <Shield size={18} />
                        )}
                      </div>

                      <div className="event-content">
                        <div className="event-action-line">
                          <span className="event-action">{ev.action.replace(/_/g, ' ')}</span>
                          <span className="badge badge-type">{ev.record_ref}</span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            {ev.event_id}
                          </span>
                        </div>
                        <div className="event-meta">
                          <strong style={{ color: 'var(--text-main)' }}>{ev.actor}</strong> · {ev.detail}
                        </div>
                      </div>

                      <div className="event-time">
                        {new Date(ev.timestamp).toLocaleString()}
                      </div>
                    </div>
                  );
                })}

                {filteredAudit.length === 0 && (
                  <div className="empty-state">
                    <ClipboardList />
                    <h4>No audit events match your criteria</h4>
                    <p>Try clearing your search filters.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Raw Transaction Inspector Modal */}
            {inspectEvent && (
              <div className="modal-overlay" onClick={() => setInspectEvent(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                        Ledger Transaction Envelope: {inspectEvent.event_id}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Cryptographically signed and endorsed ledger block transaction payload.
                      </p>
                    </div>
                    <button className="modal-close-btn" onClick={() => setInspectEvent(null)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <small style={{ color: 'var(--text-dim)' }}>Action Type</small>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inspectEvent.action}</div>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-dim)' }}>Initiating Actor</small>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inspectEvent.actor}</div>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-dim)' }}>Target Record</small>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inspectEvent.record_ref}</div>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-dim)' }}>Timestamp</small>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{new Date(inspectEvent.timestamp).toISOString()}</div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Raw Block Transaction Envelope (JSON):</label>
                    <pre
                      style={{
                        background: 'var(--bg-card-solid)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '10px',
                        padding: '14px',
                        fontSize: '11.5px',
                        fontFamily: 'var(--font-mono)',
                        overflowX: 'auto',
                        color: 'var(--text-main)'
                      }}
                    >
                      {JSON.stringify(
                        {
                          channel_id: 'care-channel-01',
                          tx_id: `tx_${inspectEvent.event_id}`,
                          validation_code: 'VALID',
                          endorsers: ['peer0.hospital.org1', 'peer0.clinic.org2'],
                          payload: inspectEvent
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>

                  <div className="btn-group" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => copyToClipboard(JSON.stringify(inspectEvent, null, 2))}
                    >
                      <Copy size={13} />
                      <span>Copy JSON</span>
                    </button>
                    <button className="btn" onClick={() => setInspectEvent(null)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Footer */}
        <footer>
          Healthcare Data Management System · Permissioned Hyperledger Fabric Architecture Prototype · React + Vite + FastAPI
        </footer>
      </main>
    </div>
  );
}
