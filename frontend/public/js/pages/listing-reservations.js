(function () {
  'use strict';

  function wireSimple(selector, action, successMsg) {
    document.querySelectorAll(selector).forEach(function (btn) {
      btn.addEventListener('click', async function () {
        try {
          await action(btn.dataset.id);
          window.Toast.show(successMsg, 'success');
          setTimeout(function () { window.location.reload(); }, 500);
        } catch (err) {
          window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
        }
      });
    });
  }

  function wireConfirm(selector, action, successMsg, dialogOpts) {
    document.querySelectorAll(selector).forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.ConfirmDialog.show({
          ...dialogOpts,
          onConfirm: async function () {
            try {
              await action(btn.dataset.id);
              window.Toast.show(successMsg, 'success');
              setTimeout(function () { window.location.reload(); }, 500);
            } catch (err) {
              window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
            }
          }
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireSimple('[data-approve]', (id) => window.ApiService.reservations.approve(id), 'อนุมัติคำขอแล้ว');

    wireConfirm('[data-reject]', (id) => window.ApiService.reservations.reject(id), 'ปฏิเสธคำขอแล้ว', {
      title: 'ยืนยันปฏิเสธคำขอนี้?', message: 'ผู้ขอจะได้รับแจ้งว่าคำขอไม่ได้รับการอนุมัติ', isDanger: true, confirmText: 'ปฏิเสธคำขอ'
    });

    wireConfirm('[data-complete]', (id) => window.ApiService.reservations.complete(id), 'ยืนยันส่งมอบสำเร็จ', {
      title: 'ยืนยันว่าส่งมอบของแล้ว?', message: 'ใช้เมื่อนัดรับและส่งมอบของเรียบร้อยแล้วเท่านั้น', confirmText: 'ยืนยันส่งมอบแล้ว'
    });

    // "ยกเลิกนัด" สำหรับคำขอที่ approved แล้ว ใช้ endpoint reject เดิม (คืนสต็อกให้อัตโนมัติ)
    wireConfirm('[data-cancel-appt]', (id) => window.ApiService.reservations.reject(id), 'ยกเลิกนัดแล้ว', {
      title: 'ยืนยันยกเลิกนัดนี้?', message: 'ของจะถูกคืนเข้าสต็อกให้ผู้อื่นขอรับต่อได้', isDanger: true, confirmText: 'ยืนยันยกเลิก'
    });
  });
})();
