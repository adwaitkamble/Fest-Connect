import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  MemoryRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  useParams,
  useInRouterContext,
} from 'react-router-dom';
import './App.css';
import { EventList } from './components/EventList.js';
import { TeamList } from './components/TeamList.js';
import { EventDetailScreen } from './components/EventDetailScreen.js';
import { CoordinatorDashboard } from './components/CoordinatorDashboard.js';
import { ParticipantDashboard } from './components/ParticipantDashboard.js';
import { AuthScreen } from './components/AuthScreen.js';
import { PassScreen } from './components/PassScreen.js';
import { AuthUser } from './types/event.types.js';
import { fetchCurrentUser, login, logout } from './api/auth.api.js';
import { isDemoMode } from './utils/env.utils.js';

interface SubsystemsStatus {
  api: string;
  database: string;
  cache: string;
}

interface HealthResponse {
  status: string;
  liveness: string;
  readiness: string;
  uptime: number;
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  subsystems: SubsystemsStatus;
}

export type AppTab = 'Overview' | 'Events' | 'Teams' | 'Registrations' | 'Coordinator';

export interface AppProps {
  initialTab?: AppTab;
  initialPath?: string;
  useMemoryRouter?: boolean;
}

// Route Helper for Event Detail
const EventDetailRoute: React.FC<{
  currentUser: AuthUser | null;
  onNavigateLogin: () => void;
}> = ({ currentUser, onNavigateLogin }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = parseInt(id || '0', 10);

  return (
    <EventDetailScreen
      eventId={eventId}
      currentUser={currentUser}
      onBack={() => navigate('/events')}
      onNavigateLogin={onNavigateLogin}
    />
  );
};

// Route Helper for Pass Detail
const PassRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const passId = parseInt(id || '0', 10);

  return <PassScreen passId={passId} onBack={() => navigate('/registrations')} />;
};

// 404 Not Found Component
const NotFoundScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="card"
      style={{
        maxWidth: '520px',
        margin: '3rem auto',
        textAlign: 'center',
        padding: '2.5rem',
        borderRadius: 'var(--fc-radius-xl, 16px)',
        border: '1px solid var(--fc-border)',
        boxShadow: 'var(--fc-shadow-md)',
        background: 'var(--fc-surface, #ffffff)',
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🧭</div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        404 &mdash; Screen Not Found
      </h2>
      <p style={{ color: 'var(--fc-ink-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        The requested URL is not part of the FestConnect academic demonstration application.
      </p>
      <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>
        &larr; Return to Overview
      </button>
    </div>
  );
};

// Main App Content inside Router Context
const AppContent: React.FC<AppProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        setLoading(true);
        const res = await fetch('/api/health');
        if (!res.ok) {
          throw new Error(`API returned HTTP ${res.status}`);
        }
        const data: HealthResponse = await res.json();
        if (isMounted) {
          setHealthData(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to connect to API server');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    async function checkAuth() {
      try {
        const user = await fetchCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
        }
      } catch {
        // Silently treat as unauthenticated
      }
    }

    checkHealth();
    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync initialTab prop if provided
  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'Overview') navigate('/');
      else if (initialTab === 'Events') navigate('/events');
      else if (initialTab === 'Teams') navigate('/teams');
      else if (initialTab === 'Registrations') navigate('/registrations');
      else if (initialTab === 'Coordinator') navigate('/coordinator');
    }
  }, [initialTab]);

  const handleDemoLogin = async (email: string) => {
    setAuthLoading(true);
    try {
      const user = await login(email, 'demo1234');
      setCurrentUser(user);
    } catch (err: any) {
      alert(`Login failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await logout();
      setCurrentUser(null);
      navigate('/');
    } catch (err: any) {
      alert(`Logout error: ${err?.message || 'Unknown error'}`);
    } finally {
      setAuthLoading(false);
    }
  };

  // Determine active tab from URL path
  const getActiveTab = (): AppTab => {
    const path = location.pathname;
    if (path.startsWith('/events')) return 'Events';
    if (path.startsWith('/teams')) return 'Teams';
    if (path.startsWith('/registrations') || path.startsWith('/dashboard')) return 'Registrations';
    if (path.startsWith('/coordinator')) return 'Coordinator';
    return 'Overview';
  };

  const activeTab = getActiveTab();

  return (
    <div className="app-container" id="festconnect-app">
      {/* Skip to Main Content Link for Keyboard Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Screen Reader Live Region */}
      <div
        id="live-region"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />

      {/* Header with Brand & Navigation */}
      <header className="app-header">
        <div className="header-content">
          <div
            className="brand-wrapper"
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/');
              }
            }}
          >
            <div className="brand-icon">FC</div>
            <div>
              <div className="brand-title">FestConnect</div>
              <div className="brand-subtitle">Technical Fest & Event Registration</div>
            </div>
          </div>

          <nav aria-label="Main Navigation">
            <ul className="nav-links">
              <li
                className={`nav-item ${activeTab === 'Overview' && location.pathname === '/' ? 'active' : ''}`}
                onClick={() => navigate('/')}
                role="button"
                tabIndex={0}
                aria-current={activeTab === 'Overview' && location.pathname === '/' ? 'page' : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/');
                  }
                }}
              >
                Overview
              </li>
              <li
                className={`nav-item ${activeTab === 'Events' ? 'active' : ''}`}
                onClick={() => navigate('/events')}
                role="button"
                tabIndex={0}
                aria-current={activeTab === 'Events' ? 'page' : undefined}
                title="Event Discovery & Details"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/events');
                  }
                }}
              >
                Events
              </li>
              <li
                className={`nav-item ${activeTab === 'Teams' ? 'active' : ''}`}
                onClick={() => navigate('/teams')}
                role="button"
                tabIndex={0}
                aria-current={activeTab === 'Teams' ? 'page' : undefined}
                title="Team Creation & Member Roster Management"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/teams');
                  }
                }}
              >
                Teams
              </li>
              <li
                className={`nav-item ${activeTab === 'Registrations' ? 'active' : ''}`}
                onClick={() => navigate('/registrations')}
                role="button"
                tabIndex={0}
                aria-current={activeTab === 'Registrations' ? 'page' : undefined}
                title="Participant Dashboard & Event Registrations"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/registrations');
                  }
                }}
              >
                Registrations
              </li>
              <li
                className={`nav-item ${activeTab === 'Coordinator' ? 'active' : ''}`}
                onClick={() => navigate('/coordinator')}
                role="button"
                tabIndex={0}
                aria-current={activeTab === 'Coordinator' ? 'page' : undefined}
                title="Coordinator Control Console & Gate Pass Verifier"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/coordinator');
                  }
                }}
              >
                Coordinator
                {currentUser && (currentUser.role === 'COORDINATOR' || currentUser.role === 'ADMIN') && (
                  <span
                    style={{
                      background: 'var(--fc-primary)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '9999px',
                      fontWeight: 700,
                    }}
                  >
                    PRO
                  </span>
                )}
              </li>
            </ul>
          </nav>

          {/* User Account Bar & Quick Demo Switcher */}
          <div className="header-user-actions">
            {currentUser ? (
              <div className="user-badge" title={currentUser.email}>
                <span style={{ fontWeight: 600 }}>{currentUser.first_name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--fc-ink-muted)' }}>({currentUser.email})</span>
                <span className={`role-tag ${currentUser.role.toLowerCase()}`}>
                  {currentUser.role}
                </span>
                <button
                  className="btn btn-outline btn-xs"
                  onClick={handleLogout}
                  disabled={authLoading}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="filter-group">
                {isDemoMode && (
                  <>
                    <span style={{ fontSize: '0.8rem', color: 'var(--fc-ink-muted)' }}>Demo Role:</span>
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => handleDemoLogin('coordinator@festconnect.edu')}
                      disabled={authLoading}
                      title="Login as Prof. Shalu Mahajan (Coordinator)"
                    >
                      Coordinator
                    </button>
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => handleDemoLogin('admin@festconnect.edu')}
                      disabled={authLoading}
                      title="Login as System Administrator"
                    >
                      Admin
                    </button>
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => handleDemoLogin('adwait@festconnect.edu')}
                      disabled={authLoading}
                      title="Login as Student Participant"
                    >
                      Student
                    </button>
                  </>
                )}
                <button
                  className="btn btn-primary btn-xs"
                  onClick={() => navigate('/login')}
                  style={{ marginLeft: isDemoMode ? '0.25rem' : '0' }}
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area Landmark */}
      <main className="main-content" id="main-content">
        <Routes>
          {/* 1. Overview / Home */}
          <Route
            path="/"
            element={
              <>
                {/* Festival Hero Section */}
                <section className="landing-hero" aria-label="FestConnect Welcome">
                  <span className="hero-tag">✨ Campus TechFest 2026 &bull; Registrations Open</span>
                  <h1 className="hero-title">Empowering Campus Innovators &amp; Tech Competitors</h1>
                  <p className="hero-subtitle">
                    The centralized university portal for hackathons, robotics challenges, coding sprints, and hands-on workshops. Assemble your squad, register in seconds, and secure your cryptographic digital gate pass.
                  </p>
                  <div className="hero-actions">
                    <button className="btn btn-coral btn-lg" onClick={() => navigate('/events')}>
                      Explore Fest Events &rarr;
                    </button>
                    <button className="btn btn-secondary btn-lg" onClick={() => navigate('/teams')}>
                      Manage Teams &rarr;
                    </button>
                    <button
                      className="btn btn-outline btn-lg"
                      onClick={() => navigate('/registrations')}
                      style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.4)' }}
                    >
                      My Registrations &rarr;
                    </button>
                    <button
                      className="btn btn-outline btn-lg"
                      onClick={() => navigate('/coordinator')}
                      style={{ color: '#c4b5fd', borderColor: '#8b5cf6' }}
                    >
                      Coordinator Console &rarr;
                    </button>
                  </div>
                </section>

                {/* 3-Step Journey Strip */}
                <section className="journey-strip" aria-label="Registration Journey Steps">
                  <div className="journey-step">
                    <div className="journey-num">1</div>
                    <div className="journey-content">
                      <h4>Discover Events</h4>
                      <p>Browse hackathons, robotics challenges, and workshops with verified rules and schedules.</p>
                    </div>
                  </div>
                  <div className="journey-step">
                    <div className="journey-num">2</div>
                    <div className="journey-content">
                      <h4>Assemble Squad</h4>
                      <p>Create a team, invite peers by email, and verify participation requirements together.</p>
                    </div>
                  </div>
                  <div className="journey-step">
                    <div className="journey-num">3</div>
                    <div className="journey-content">
                      <h4>Get Digital Pass</h4>
                      <p>Complete payment confirmation and receive your verified QR code ticket ready for entry.</p>
                    </div>
                  </div>
                </section>

                {/* Feature Highlights Grid */}
                <div className="features-grid">
                  <div className="feature-card">
                    <div className="feature-icon-wrapper" style={{ background: '#EDE9FE', color: '#6D28D9' }}>
                      🏆
                    </div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Flagship Competitions</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--fc-ink-muted)', lineHeight: 1.5 }}>
                      Comprehensive tracks spanning 24h Hackathons, Autonomous Robotics, Web3, Game Development, and hands-on masterclasses.
                    </p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon-wrapper" style={{ background: '#FEF3C7', color: '#D97706' }}>
                      ⚡
                    </div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Real-Time Schedule Sync</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--fc-ink-muted)', lineHeight: 1.5 }}>
                      Observer pattern powered instant notifications. When event venues or timelines shift, all registered teams receive instant alerts.
                    </p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon-wrapper" style={{ background: '#D1FAE5', color: '#059669' }}>
                      🛡️
                    </div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Cryptographic Gate Security</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--fc-ink-muted)', lineHeight: 1.5 }}>
                      Every issued ticket contains a tamper-proof HMAC-SHA256 signature, validated in real-time by coordinators at the entrance scanner.
                    </p>
                  </div>
                </div>

                {/* Academic Context & System Health (Preserved for tests & academic verification) */}
                <section className="scaffold-banner" id="academic-system-status" aria-label="System Notice">
                  <span className="banner-badge">Verified Academic Monorepo Baseline</span>
                  <div className="banner-text">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      FestConnect Monorepo Scaffold Initialized
                    </h2>
                    <p>
                      This workspace provides the approved full-stack foundation for{' '}
                      <strong>Object Oriented Modelling and System Design (BCER27PC02)</strong>.
                      Layered architecture with Express API backend, React + Vite SPA frontend, MySQL 8.4 persistence, Redis cache-aside, and Docker orchestration.
                    </p>
                  </div>

                  <div className="cards-grid" style={{ marginTop: '1.5rem' }}>
                    {/* Card 1: API Status */}
                    <div className="card" id="api-status">
                      <h2>API Connection Status</h2>
                      {loading && <p className="status-loading">Pinging API health probe...</p>}
                      {error && (
                        <div className="error-card">
                          <strong>Connection Failed:</strong> {error}
                          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                            Ensure the backend Express server is running on port 4000.
                          </p>
                        </div>
                      )}
                      {healthData && (
                        <div>
                          <div className="status-badge-container">
                            <span className="status-pill status-healthy">Live & Responsive</span>
                            <span className="uptime-pill">Uptime: {Math.round(healthData.uptime)}s</span>
                          </div>

                          <table className="status-detail-table">
                            <tbody>
                              <tr>
                                <td>Service</td>
                                <td>{healthData.service}</td>
                              </tr>
                              <tr>
                                <td>Version</td>
                                <td>{healthData.version}</td>
                              </tr>
                              <tr>
                                <td>Environment</td>
                                <td>{healthData.environment}</td>
                              </tr>
                              <tr>
                                <td>Timestamp</td>
                                <td>{new Date(healthData.timestamp).toLocaleTimeString()}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Card 2: Architecture & Specs */}
                    <div className="card" id="architecture-specs">
                      <h2>Architecture & Specs</h2>
                      <table className="status-detail-table">
                        <tbody>
                          <tr>
                            <td>Monorepo</td>
                            <td>npm Workspaces (apps/web, apps/api)</td>
                          </tr>
                          <tr>
                            <td>Frontend</td>
                            <td>React 18 + TypeScript + Vite + Router</td>
                          </tr>
                          <tr>
                            <td>Backend</td>
                            <td>Node.js LTS + Express + TypeScript</td>
                          </tr>
                          <tr>
                            <td>Database</td>
                            <td>MySQL 8 (Containerized / 3306)</td>
                          </tr>
                          <tr>
                            <td>Validation</td>
                            <td>Zod Schemas</td>
                          </tr>
                          <tr>
                            <td>Auth Strategy</td>
                            <td>HttpOnly JWT + CSRF Double-Submit</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Card 3: Design Patterns */}
                    <div className="card" id="design-patterns">
                      <h2>Design Patterns</h2>
                      <table className="status-detail-table">
                        <tbody>
                          <tr>
                            <td>Factory</td>
                            <td>Payment Gateway Factory (Mock &amp; Razorpay)</td>
                          </tr>
                          <tr>
                            <td>Adapter</td>
                            <td>Payment Adapters &amp; Email Adapters</td>
                          </tr>
                          <tr>
                            <td>Observer</td>
                            <td>Schedule Change Notification Observers</td>
                          </tr>
                          <tr>
                            <td>Cache-Aside</td>
                            <td>Redis Public Catalog Caching (60s TTL)</td>
                          </tr>
                          <tr>
                            <td>Row Locking</td>
                            <td>Pessimistic MySQL Transactions</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </>
            }
          />

          {/* 2. Events Discovery */}
          <Route
            path="/events"
            element={
              <EventList
                currentUser={currentUser}
                onSelectEvent={(eventId) => navigate(`/events/${eventId}`)}
              />
            }
          />

          {/* 3. Event Detail Screen */}
          <Route
            path="/events/:id"
            element={
              <EventDetailRoute
                currentUser={currentUser}
                onNavigateLogin={() => navigate('/login')}
              />
            }
          />

          {/* 4. Teams Management */}
          <Route path="/teams" element={<TeamList currentUser={currentUser} />} />

          {/* 5. Participant Registrations & Dashboard */}
          <Route
            path="/registrations"
            element={
              <ParticipantDashboard
                currentUser={currentUser}
                onNavigateTab={(tab) => {
                  if (tab === 'Events') navigate('/events');
                  else if (tab === 'Teams') navigate('/teams');
                  else navigate('/');
                }}
                onNavigateLogin={() => navigate('/login')}
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <ParticipantDashboard
                currentUser={currentUser}
                onNavigateTab={(tab) => {
                  if (tab === 'Events') navigate('/events');
                  else if (tab === 'Teams') navigate('/teams');
                  else navigate('/');
                }}
                onNavigateLogin={() => navigate('/login')}
              />
            }
          />

          {/* 6. Coordinator Dashboard (Gated with 403 guard) */}
          <Route
            path="/coordinator"
            element={
              <CoordinatorDashboard
                currentUser={currentUser}
                onSwitchDemoRole={(email) => handleDemoLogin(email)}
                onSelectEvent={(eventId) => navigate(`/events/${eventId}`)}
              />
            }
          />

          {/* 7. Dedicated Auth Screens (Login & Register) */}
          <Route
            path="/login"
            element={
              <AuthScreen
                initialMode="login"
                onSuccess={(user) => {
                  setCurrentUser(user);
                  if (user.role === 'COORDINATOR' || user.role === 'ADMIN') {
                    navigate('/coordinator');
                  } else {
                    navigate('/registrations');
                  }
                }}
                onCancel={() => navigate('/')}
              />
            }
          />
          <Route
            path="/register"
            element={
              <AuthScreen
                initialMode="register"
                onSuccess={(user) => {
                  setCurrentUser(user);
                  navigate('/registrations');
                }}
                onCancel={() => navigate('/')}
              />
            }
          />

          {/* 8. Pass Screen */}
          <Route path="/pass/:id" element={<PassRoute />} />

          {/* 9. 404 Catch-All */}
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </main>

      {/* Modern Academic & Professional Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div>
            <div className="footer-brand">
              <span className="brand-icon" style={{ width: '28px', height: '28px', fontSize: '0.85rem' }}>FC</span>
              <span>FestConnect &mdash; Centralized Technical Fest &amp; Event Registration</span>
            </div>
            <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--fc-ink-muted)' }}>
              Course Code: BCER27PC02 &bull; Faculty Guide: Prof. Shalu Mahajan
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--fc-ink-muted)' }}>
            <div>Project Team: Adwait Kamble (123B1D002) &bull; Shivam Kasodekar (123B1D024) &bull; Nikhil Puppalwar (123B1D040)</div>
            <div style={{ marginTop: '0.2rem' }}>Pimpri Chinchwad College of Engineering (PCCoE)</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Root App with router wrapper
export const App: React.FC<AppProps> = (props) => {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <AppContent {...props} />;
  }

  if (props.useMemoryRouter || props.initialPath) {
    return (
      <MemoryRouter initialEntries={[props.initialPath || '/']}>
        <AppContent {...props} />
      </MemoryRouter>
    );
  }

  return (
    <BrowserRouter>
      <AppContent {...props} />
    </BrowserRouter>
  );
};

export default App;
