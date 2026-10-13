// ==============================================================================
// MediCloud Application Bootstrapper & Global Event Listeners
// ==============================================================================

// Global Modal Helpers
function openGenericModal(title, bodyHtml, footerHtml = '') {
  const modal = document.getElementById('generic-modal');
  const titleEl = document.getElementById('generic-modal-title');
  const bodyEl = document.getElementById('generic-modal-body');
  const footerEl = document.getElementById('generic-modal-footer');

  if (!modal || !bodyEl) return;

  if (titleEl) titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  if (footerEl) footerEl.innerHTML = footerHtml;

  modal.classList.add('active');
}

function closeGenericModal() {
  const modal = document.getElementById('generic-modal');
  if (modal) modal.classList.remove('active');
}

// Close modals when clicking outside
window.addEventListener('click', e => {
  const genericModal = document.getElementById('generic-modal');
  const roleModal = document.getElementById('role-modal');

  if (e.target === genericModal) closeGenericModal();
  if (e.target === roleModal) closeRoleModal();
});

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Mobile Hamburger Toggle
  const menuToggle = document.getElementById('btn-menu-toggle');
  const sidebar = document.getElementById('sidebar');

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('sidebar-open');
    });
  }

  // Sidebar Nav Item Click Handlers
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const route = item.getAttribute('data-route');
      if (route) {
        if (sidebar && sidebar.classList.contains('sidebar-open')) {
          sidebar.classList.remove('sidebar-open');
        }
        Router.navigate(route);
      }
    });
  });

  // Role Switcher Button
  const btnRoleSwitch = document.getElementById('btn-switch-role');
  if (btnRoleSwitch) {
    btnRoleSwitch.addEventListener('click', () => {
      openRoleModal();
    });
  }

  // Logout Button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      Auth.logout();
    });
  }

  // Live Health Indicator Polling (Every 30 seconds)
  async function pollHealth() {
    try {
      const res = await API.get('/api/health');
      const pillText = document.getElementById('system-status-text');
      if (pillText) {
        pillText.textContent = res.status === 'HEALTHY' ? 'System Healthy' : 'Degraded';
      }
    } catch (e) {
      const pillText = document.getElementById('system-status-text');
      if (pillText) {
        pillText.textContent = 'Service Offline';
      }
    }
  }

  setInterval(pollHealth, 30000);

  // Initialize Router
  Router.init();
});
