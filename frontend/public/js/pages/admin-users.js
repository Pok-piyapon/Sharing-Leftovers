(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    let targetUserId = null;

    document.querySelectorAll('[data-open-ban]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        targetUserId = btn.getAttribute('data-open-ban');
        document.getElementById('ban-reason').value = '';
      });
    });

    const banForm = document.getElementById('ban-form');
    if (banForm) {
      banForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const reason = document.getElementById('ban-reason').value.trim();
        if (!reason) {
          window.Toast.show('กรุณาระบุเหตุผลการระงับการใช้งาน', 'error');
          return;
        }
        try {
          await window.ApiService.admin.banUser(targetUserId, reason);
          window.ModalController.close('ban-modal');
          window.Toast.show('ระงับผู้ใช้เรียบร้อยแล้ว เซสชันของเขาจะถูกตัดทันที', 'success');
          setTimeout(function () { window.location.reload(); }, 600);
        } catch (err) {
          window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
        }
      });
    }

    document.querySelectorAll('[data-unban]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        try {
          await window.ApiService.admin.unbanUser(btn.getAttribute('data-unban'));
          window.Toast.show('เปิดการใช้งานผู้ใช้นี้แล้ว', 'success');
          setTimeout(function () { window.location.reload(); }, 500);
        } catch (err) {
          window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
        }
      });
    });
  });
})();
