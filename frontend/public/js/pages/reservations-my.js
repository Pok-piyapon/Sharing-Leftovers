(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // เปิดหน้านี้ = อ่านคำขอทั้งหมดแล้ว เคลียร์ badge แจ้งเตือนบน header ทันที
    window.ApiService.reservations.markAllRead().then(function () {
      const badge = document.getElementById('unread-badge');
      if (badge) badge.remove();
    }).catch(function () { /* ไม่ critical ถ้าเคลียร์ไม่สำเร็จ */ });

    document.querySelectorAll('[data-cancel-reservation]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-cancel-reservation');
        window.ConfirmDialog.show({
          title: 'ยืนยันยกเลิกคำขอนี้?',
          message: 'คุณจะไม่สามารถส่งคำขอสำหรับประกาศนี้ได้อีก',
          isDanger: true,
          confirmText: 'ยืนยันยกเลิก',
          onConfirm: async function () {
            try {
              await window.ApiService.reservations.cancel(id);
              window.Toast.show('คุณยกเลิกคำขอนี้แล้ว', 'success');
              setTimeout(function () { window.location.reload(); }, 600);
            } catch (err) {
              window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
            }
          }
        });
      });
    });
  });
})();
