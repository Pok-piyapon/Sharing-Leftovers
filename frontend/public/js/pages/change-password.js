(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('password-form');
    if (!form) return;

    const strengthEl = document.getElementById('password-strength');
    const newPasswordInput = document.getElementById('pw-new');

    function updateStrength() {
      if (!strengthEl) return;
      const val = newPasswordInput.value;
      let label = 'อ่อน';
      let color = 'var(--color-danger)';
      if (val.length >= 12 && /[A-Z]/.test(val) && /[0-9]/.test(val)) { label = 'แข็งแรงมาก'; color = 'var(--color-success)'; }
      else if (val.length >= 8) { label = 'พอใช้'; color = 'var(--color-warning)'; }
      strengthEl.textContent = val ? `ความแข็งแรงของรหัสผ่าน: ${label}` : '';
      strengthEl.style.color = color;
    }
    if (newPasswordInput) newPasswordInput.addEventListener('input', updateStrength);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const currentPassword = document.getElementById('pw-current').value;
      const newPassword = newPasswordInput.value;
      const confirmPassword = document.getElementById('pw-confirm').value;

      if (newPassword.length < 8) {
        window.Toast.show('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        window.Toast.show('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', 'error');
        return;
      }

      try {
        await window.ApiService.auth.changePassword(currentPassword, newPassword);
        window.Toast.show('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
        form.reset();
      } catch (err) {
        window.Toast.show((err && err.message) || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', 'error');
      }
    });
  });
})();
