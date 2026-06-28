import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { C, glassStyle } from '../components/consts';
import AppShell from '../components/AppShell';
import ScreenHeader from '../components/ScreenHeader';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import { getProjects, getInvoices, getWorkerLogs } from '../data/db.js';

const TABS = ['Overview', 'Tasks', 'Files', 'Invoices', 'Activity'];

const STATUS_COLOR = {
  Research: C.info, Planning: C.accent, Build: C.success,
  Delivered: C.muted, Paused: C.warning
};

export default function ProjectDetailScreen({ onNavigate }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [projects, allInvoices, logs] = await Promise.all([
          getProjects(),
          getInvoices().catch(() => []),
          getWorkerLogs().catch(() => [])
        ]);
        const found = (projects || []).find(p => p.id === id);
        setProject(found || null);
        setInvoices((allInvoices || []).filter(inv => inv.project_id === id));
        setActivityLogs((logs || []).filter(l => l.project_id === id || !l.project_id).slice(0, 20));
      } catch (e) {
        console.error('[ProjectDetailScreen]', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleNavigate = (screen) => {
    if (onNavigate) onNavigate(screen);
    else navigate(`/${screen}`);
  };

  if (loading) {
    return (
      <AppShell onNavigate={handleNavigate}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.muted }}>
          Loading project...
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell onNavigate={handleNavigate}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
          <span style={{ fontSize: 32 }}>⚠️</span>
          <p style={{ color: C.muted }}>Project not found.</p>
          <button onClick={() => navigate('/projects')} style={{ color: C.accent, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Back to Projects
          </button>
        </div>
      </AppShell>
    );
  }

  const progress = project.progress ?? 0;
  const statusColor = STATUS_COLOR[project.stage] || C.muted;

  return (
    <AppShell onNavigate={handleNavigate}>
      <ScreenHeader
        pageTitle={project.name || 'Project Detail'}
        breadcrumbs={[{ label: 'Projects', onClick: () => navigate('/projects') }, { label: project.name }]}
        onNavigate={handleNavigate}
      />

      <div style={{ padding: '24px 32px', maxWidth: 1100 }}>

        {/* Header Card */}
        <div style={{ ...glassStyle({ strong: true }), borderRadius: 14, padding: '20px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>{project.name}</h1>
              <Badge tone="info" label={project.stage || 'Research'} />
            </div>
            <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>
              Client: {project.client_name || '—'} · Type: {project.type || '—'} · Created: {project.created_at ? new Date(project.created_at).toLocaleDateString('en-IN') : '—'}
            </p>
          </div>

          {/* Circular Progress */}
          <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
            <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={36} cy={36} r={30} fill="none" stroke={C.glassBorder} strokeWidth={6} />
              <circle cx={36} cy={36} r={30} fill="none" stroke={statusColor} strokeWidth={6}
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - progress / 100)}`}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
            </svg>
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 13, fontWeight: 700, color: C.text }}>{progress}%</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.glassBorder}`, paddingBottom: 0 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 18px', fontSize: 13, fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? C.accent : C.muted,
              borderBottom: activeTab === tab ? `2px solid ${C.accent}` : '2px solid transparent',
              transition: 'all 0.2s'
            }}>{tab}</button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ ...glassStyle(), borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Info</h3>
              {[
                ['Name', project.name],
                ['Client', project.client_name || '—'],
                ['Type', project.type || '—'],
                ['Stage', project.stage || '—'],
                ['Health', project.health || '—'],
                ['Progress', `${progress}%`],
                ['Due Date', project.due_date || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.glassBorder}`, fontSize: 13 }}>
                  <span style={{ color: C.muted }}>{k}</span>
                  <span style={{ color: C.text, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ ...glassStyle(), borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Workers</h3>
              <p style={{ color: C.muted, fontSize: 13 }}>Worker assignment visible after tasks are created.</p>
            </div>
          </div>
        )}

        {/* Tab: Tasks */}
        {activeTab === 'Tasks' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {['To Do', 'In Progress', 'Review', 'Done'].map(col => (
                <div key={col} style={{ ...glassStyle(), borderRadius: 12, padding: 16, minHeight: 200 }}>
                  <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</p>
                  <p style={{ color: C.muted, fontSize: 12, opacity: 0.6 }}>No tasks yet.</p>
                </div>
              ))}
            </div>
            <p style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>Task management available after B12 tasks table is populated at runtime.</p>
          </div>
        )}

        {/* Tab: Files */}
        {activeTab === 'Files' && (
          <div style={{ ...glassStyle(), borderRadius: 12, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
            <p style={{ color: C.muted, fontSize: 13 }}>No files uploaded for this project yet.</p>
            <p style={{ color: C.muted, fontSize: 12, opacity: 0.6 }}>File management requires file_storage runtime population.</p>
          </div>
        )}

        {/* Tab: Invoices */}
        {activeTab === 'Invoices' && (
          <div style={{ ...glassStyle(), borderRadius: 12, padding: 20 }}>
            {invoices.length === 0
              ? <p style={{ color: C.muted, fontSize: 13 }}>No invoices for this project.</p>
              : invoices.map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.glassBorder}`, fontSize: 13 }}>
                  <span style={{ color: C.text }}>{inv.invoice_number || inv.id}</span>
                  <span style={{ color: C.muted }}>{inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : '—'}</span>
                  <span style={{ color: C.text, fontWeight: 600 }}>₹{((inv.total_amount || 0) / 100).toLocaleString('en-IN')}</span>
                  <Badge tone={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'info'} label={inv.status || 'draft'} />
                </div>
              ))
            }
          </div>
        )}

        {/* Tab: Activity */}
        {activeTab === 'Activity' && (
          <div style={{ ...glassStyle(), borderRadius: 12, padding: 20 }}>
            {activityLogs.length === 0
              ? <p style={{ color: C.muted, fontSize: 13 }}>No activity recorded yet.</p>
              : activityLogs.map((log, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.glassBorder}` }}>
                  <span style={{ color: C.accent, fontSize: 18, flexShrink: 0 }}>·</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: C.text }}>{log.worker_name} — {log.status}</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '—'}</p>
                  </div>
                </div>
              ))
            }
          </div>
        )}

      </div>
    </AppShell>
  );
}
