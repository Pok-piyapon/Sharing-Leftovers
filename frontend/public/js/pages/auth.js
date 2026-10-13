(function () {
  'use strict';

  // Open Redirect protection: ตรวจซ้ำฝั่ง client ก่อน redirect จริง (server ก็ validate ไว้แล้วตอน render)
  function isSafeReturnTo(value) {
    if (typeof value !== 'string' || !value) return false;
    if (!value.startsWith('/') || value.startsWith('//')) return false;
    if (value.includes('://')) return false;
    return true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    const tabButtons = document.querySelectorAll('[data-auth-tab]');
    const panels = document.querySelectorAll('.auth-tab-panel');

    function showTab(tab) {
      panels.forEach((p) => { p.style.display = p.dataset.tabPanel === tab ? 'block' : 'none'; });
      tabButtons.forEach((b) => b.classList.toggle('active', b.getAttribute('data-auth-tab') === tab));
    }

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => showTab(btn.getAttribute('data-auth-tab')));
    });

    const returnToField = document.getElementById('return-to');
    const returnTo = (returnToField && isSafeReturnTo(returnToField.value)) ? returnToField.value : '/';

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
          await window.ApiService.auth.login(email, password);
          window.location.href = returnTo;
        } catch (err) {
          window.Toast.show((err && err.message) || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
        }
      });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;
        if (password.length < 8) {
          window.Toast.show('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร', 'error');
          return;
        }
        try {
          await window.ApiService.auth.register({ name, email, phone, password });
          // สมัครสำเร็จ = auto-login แล้วจาก server (session ถูกตั้งตอน register)
          window.location.href = returnTo;
        } catch (err) {
          window.Toast.show((err && err.message) || 'สมัครสมาชิกไม่สำเร็จ', 'error');
        }
      });
    }

    document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.getAttribute('data-toggle-password'));
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    });
  });
})();
