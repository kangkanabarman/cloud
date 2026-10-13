// ==============================================================================
// MediCloud Authentication & Client State Controller
// ==============================================================================

const Auth = {
  user: null,

  async checkAuth() {
    try {
      const res = await API.get('/api/auth/me');
      this.user = res.user;
      this.updateUI();
      return this.user;
    } catch (err) {
      this.user = null;
      this.updateUI();
      return null;
    }
  },

  async login(email, password) {
    try {
      const res = await API.post('/api/auth/login', { email, password });
      this.user = res.user;
      this.updateUI();
      showToast(`Welcome back, ${res.user.fullName}!`, 'success');
      return res.user;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  },

  async logout() {
    try {
      await API.post('/api/auth/logout');
    } catch (e) {
      // Continue client cleanup even if network fails
    }
    this.user = null;
    this.updateUI();
    showToast('Signed out successfully.', 'info');
    if (window.Router) {
      window.Router.navigate('login');
    }
  },

  updateUI() {
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const sidebar = document.getElementById('sidebar');

    if (this.user) {
      if (avatarEl) {
        avatarEl.textContent = this.user.fullName ? this.user.fullName.charAt(0).toUpperCase() : 'U';
      }
      if (nameEl) {
        nameEl.textContent = this.user.fullName || this.user.username;
      }
      if (roleEl) {
        roleEl.textContent = this.user.role;
        roleEl.className = `user-role-badge role-${this.user.role.toLowerCase()}`;
      }

      // Update visibility of role-restricted nav items
      const usersNav = document.getElementById('nav-item-users');
      const auditNav = document.getElementById('nav-item-audit');
      const backupNav = document.getElementById('nav-item-backup');
      const recordsLock = document.getElementById('badge-records-lock');

      if (usersNav) usersNav.style.display = this.user.role === 'ADMIN' ? 'flex' : 'none';
      if (auditNav) auditNav.style.display = this.user.role === 'ADMIN' ? 'flex' : 'none';
      if (backupNav) backupNav.style.display = this.user.role === 'ADMIN' ? 'flex' : 'none';

      if (recordsLock) {
        recordsLock.textContent = this.user.role === 'RECEPTIONIST' ? '🚫' : '🔒';
        recordsLock.title = this.user.role === 'RECEPTIONIST' ? 'Access Restricted' : 'Protected';
      }

      if (sidebar) sidebar.style.display = 'flex';
      const topbar = document.querySelector('.app-topbar');
      if (topbar) topbar.style.display = 'flex';
    } else {
      if (sidebar) sidebar.style.display = 'none';
      const topbar = document.querySelector('.app-topbar');
      if (topbar) topbar.style.display = 'none';
    }
  }
};

// Modal helpers for Role Switcher
function openRoleModal() {
  const modal = document.getElementById('role-modal');
  const container = document.getElementById('modal-role-buttons');
  if (!modal || !container) return;

  const roles = [
    {
      role: 'ADMIN',
      email: 'admin@medicloud.local',
      title: 'Administrator',
      desc: 'Full governance, users, audit, backups & clinical views',
      pass: 'AdminPassword123!'
    },
    {
      role: 'DOCTOR',
      email: 'dr.chen@medicloud.local',
      title: 'Dr. Samantha Chen (Cardiology)',
      desc: 'View & add clinical notes, assigned appointments',
      pass: 'DoctorPassword123!'
    },
    {
      role: 'DOCTOR',
      email: 'dr.patel@medicloud.local',
      title: 'Dr. Rajesh Patel (Neurology)',
      desc: 'Neurology consults & clinical diagnostic records',
      pass: 'DoctorPassword123!'
    },
    {
      role: 'RECEPTIONIST',
      email: 'receptionist@medicloud.local',
      title: 'Maria Santos (Front Desk)',
      desc: 'Register patients, book appointments (Blocked from clinical notes)',
      pass: 'ReceptionPassword123!'
    }
  ];

  container.innerHTML = roles.map(r => `
    <button class="btn-demo-pill" onclick="handleQuickRoleLogin('${r.email}', '${r.pass}')">
      <strong>${r.title}</strong>
      <span>Role: ${r.role} • ${r.desc}</span>
    </button>
  `).join('');

  modal.classList.add('active');
}

function closeRoleModal() {
  const modal = document.getElementById('role-modal');
  if (modal) modal.classList.remove('active');
}

async function handleQuickRoleLogin(email, password) {
  closeRoleModal();
  try {
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    if (emailEl) emailEl.value = email;
    if (passEl) passEl.value = password;

    await Auth.login(email, password);
    if (window.Router) {
      window.Router.navigate('dashboard');
    }
  } catch (e) {
    console.error('Quick role login error:', e);
  }
}
