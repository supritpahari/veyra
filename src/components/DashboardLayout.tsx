import { NavLink, Outlet, Link } from 'react-router-dom';
import { useVeyra } from '../context/VeyraContext';

const DASHBOARD_NAV_ITEMS = [
  {
    path: '/dashboard/analyzer',
    label: 'Read Your Report',
    sub: 'Tests, values, healthy ranges',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    path: '/dashboard/patterns',
    label: 'See Connections',
    sub: 'How findings relate to each other',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    path: '/dashboard/quality',
    label: 'Quality Check',
    sub: 'What happens before results are shown',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    path: '/dashboard/lab',
    label: 'AI Lab',
    sub: 'How the model learns (synthetic data)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 2v7.31L4.2 18.5A2 2 0 0 0 5.86 21.5h12.28a2 2 0 0 0 1.66-3L14 9.31V2" />
        <path d="M8.5 2h7" />
        <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
      </svg>
    ),
  },
  {
    path: '/dashboard/evaluation',
    label: 'How Well It Works',
    sub: 'Accuracy & honest limits',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
];

export function DashboardLayout() {
  const { reportId, setReportId, report, availableReports, isBackendConnected } = useVeyra();

  return (
    <div className="vh-dashboard-shell">
      {/* Sidebar Navigation */}
      <aside className="vh-sidebar">
        <div className="vh-sidebar__top">
          <div className="vh-sidebar__header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="vh-sidebar__badge">DEMO WORKSPACE</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 10,
                  fontFamily: 'var(--f-mono)',
                  color: isBackendConnected ? 'var(--ok)' : 'var(--amber)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isBackendConnected ? 'var(--ok)' : 'var(--amber)',
                  }}
                />
                {isBackendConnected ? 'LIVE API' : 'OFFLINE'}
              </span>
            </div>
            <h2 className="vh-sidebar__title">Dashboard</h2>
          </div>

          {/* Active Case Selector Card */}
          <div className="vh-sidebar__case">
            <div className="vh-sidebar__case-label">SAMPLE REPORTS</div>
            <div className="vh-sidebar__case-selector">
              {availableReports.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  className={`vh-case-btn ${r.id === reportId ? 'active' : ''}`}
                  onClick={() => setReportId(r.id)}
                  title={r.title}
                >
                  <span className="mono">Sample {String.fromCharCode(65 + i)}</span>
                </button>
              ))}
            </div>
            <div className="vh-sidebar__case-info">
              <div className="vh-sidebar__case-name">{report.title}</div>
              <div className="vh-sidebar__case-sub">
                {report.measurements.length} tests · {report.source}
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Sections Nav Links */}
        <nav className="vh-sidebar__nav" aria-label="Dashboard sections">
          <div className="vh-sidebar__sect-label">SECTIONS</div>
          {DASHBOARD_NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `vh-sidebar__link ${isActive ? 'active' : ''}`
              }
            >
              <span className="vh-sidebar__icon">{item.icon}</span>
              <div className="vh-sidebar__text">
                <span className="vh-sidebar__label">{item.label}</span>
                <span className="vh-sidebar__sub">{item.sub}</span>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Footer info in sidebar */}
        <div className="vh-sidebar__foot">
          <div className="vh-sidebar__engine">
            <span className="vh-sidebar__dot" />
            <span>Fixed rules · fully reviewable</span>
          </div>
          <Link to="/" className="vh-sidebar__home-link">
            ← Back to the introduction
          </Link>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="vh-dashboard-main">
        <Outlet />
      </div>
    </div>
  );
}
