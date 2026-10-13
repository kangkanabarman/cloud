// ==============================================================================
// MediCloud Client-Side Router
// Handles view switching, navigation active states, and login page rendering
// ==============================================================================

const Router = {
  currentRoute: null,

  routes: {
    dashboard: { title: 'Hospital Management Dashboard', view: DashboardView },
    patients: { title: 'Patient Directory & Demographics', view: PatientsView },
    doctors: { title: 'Physician Staff & Specializations', view: DoctorsView },
    appointments: { title: 'Outpatient Appointments & Scheduling', view: AppointmentsView },
    'medical-records': { title: 'Protected Clinical Records & Observations', view: MedicalRecordsView },
    users: { title: 'Identity Governance & Role Management', view: UsersView },
    'audit-logs': { title: 'Security Audit & Compliance Trail', view: AuditView },
    backup: { title: 'Database Backup & Disaster Recovery Catalog', view: BackupView },
    'cloud-arch': { title: 'AWS Cloud Architecture & Engineering Blueprint', view: CloudArchView },
    monitoring: { title: 'Runtime Telemetry & CloudWatch Blueprint', view: MonitoringView },
    evaluation: { title: 'Technical Evaluation & Benchmark Lab', view: EvaluationView }
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  navigate(route) {
    const targetHash = `#${route}`;
    if (window.location.hash === targetHash) {
      this.handleRoute();
    } else {
      window.location.hash = route;
    }
  },

  async handleRoute() {
    const rawHash = window.location.hash.replace(/^#/, '').trim();
    const route = rawHash || 'dashboard';
    this.currentRoute = route;

    // First check user authentication
    if (!Auth.user && route !== 'login') {
      const user = await Auth.checkAuth();
      if (!user) {
        this.renderLogin();
        return;
      }
    }

    if (route === 'login') {
      this.renderLogin();
      return;
    }

    // Restore topbar and sidebar when transitioning out of login view
    const sidebar = document.getElementById('sidebar');
    const topbar = document.querySelector('.app-topbar');
    if (sidebar) sidebar.style.display = '';
    if (topbar) topbar.style.display = '';
    if (Auth.user) {
      Auth.updateUI();
    }

    const routeConfig = this.routes[route] || this.routes.dashboard;
    this.currentRoute = route in this.routes ? route : 'dashboard';

    // Update Topbar Title
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
      titleEl.textContent = routeConfig.title;
    }

    // Update Sidebar Active Class
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      if (el.getAttribute('data-route') === this.currentRoute) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Render View
    const contentContainer = document.getElementById('app-content');
    if (contentContainer) {
      window.scrollTo(0, 0);
      routeConfig.view.render(contentContainer);
    }
  },

  renderLogin() {
    this.currentRoute = 'login';
    const sidebar = document.getElementById('sidebar');
    const topbar = document.querySelector('.app-topbar');
    if (sidebar) sidebar.style.display = 'none';
    if (topbar) topbar.style.display = 'none';

    const container = document.getElementById('app-content');
    if (!container) return;

    container.innerHTML = `
      <div class="login-view-wrapper">
        <div class="login-card">
          <div class="login-header-banner">
            <h2>🏥 MediCloud</h2>
            <p>Cloud-Based Hospital Management System (FT-III Case Study)</p>
          </div>

          <div class="login-body">
            <!-- Academic Demo Role Selector -->
            <div class="demo-account-pills">
              <h4>⚡ Rapid Demo Role Switcher (1-Click Login)</h4>
              <div class="role-quick-btn-grid">
                <button type="button" class="btn-demo-pill" onclick="handleQuickRoleLogin('admin@medicloud.local', 'AdminPassword123!')">
                  <strong>Administrator</strong>
                  <span>Full governance, users & audit</span>
                </button>
                <button type="button" class="btn-demo-pill" onclick="handleQuickRoleLogin('dr.chen@medicloud.local', 'DoctorPassword123!')">
                  <strong>Dr. Samantha Chen</strong>
                  <span>Cardiologist (Clinical access)</span>
                </button>
                <button type="button" class="btn-demo-pill" onclick="handleQuickRoleLogin('dr.patel@medicloud.local', 'DoctorPassword123!')">
                  <strong>Dr. Rajesh Patel</strong>
                  <span>Neurologist (Clinical access)</span>
                </button>
                <button type="button" class="btn-demo-pill" onclick="handleQuickRoleLogin('receptionist@medicloud.local', 'ReceptionPassword123!')">
                  <strong>Front-Desk Receptionist</strong>
                  <span>Patients & appointments (No notes)</span>
                </button>
              </div>
            </div>

            <!-- Standard Login Form -->
            <form id="login-form" onsubmit="event.preventDefault(); Router.handleLoginForm(event); return false;">
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input
                  type="email"
                  id="login-email"
                  class="form-control"
                  required
                  placeholder="admin@medicloud.local"
                  value="admin@medicloud.local"
                  autocomplete="username"
                >
              </div>

              <div class="form-group">
                <label class="form-label">Password</label>
                <input
                  type="password"
                  id="login-password"
                  class="form-control"
                  required
                  placeholder="••••••••"
                  value="AdminPassword123!"
                  autocomplete="current-password"
                >
              </div>

              <div style="margin-bottom: 20px;">
                <button type="button" id="btn-login-submit" class="btn btn-primary" style="width: 100%;" onclick="Router.handleLoginForm(event);">
                  Sign In to MediCloud
                </button>
              </div>
            </form>

            <div style="font-size: 0.75rem; color: var(--color-text-muted); text-align: center; line-height: 1.4;">
              🔒 Protected by Bcrypt 12 Salt Rounds, HttpOnly Sessions & Rate Limiting.<br>
              <strong>Academic prototype — All patient identities are fictional.</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async handleLoginForm(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) {
      showToast('Please enter both email and password.', 'warning');
      return false;
    }

    const btn = document.getElementById('btn-login-submit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Signing in...';
    }

    try {
      await Auth.login(email, password);
      this.navigate('dashboard');
    } catch (e) {
      // Toast already shown
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Sign In to MediCloud';
      }
    }
    return false;
  }
};
