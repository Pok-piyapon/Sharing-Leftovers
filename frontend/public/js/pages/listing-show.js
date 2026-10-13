(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const page = document.getElementById('listing-page');
    const listingId = page && page.dataset.listingId;
    if (!listingId) return;

    const claimForm = document.getElementById('claim-form');
    if (claimForm) {
      claimForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const qty = parseInt(document.getElementById('claim-qty').value, 10) || 1;
        const message = document.getElementById('claim-msg').value;
        try {
          await window.ApiService.reservations.create(listingId, qty, message);
          window.ModalController.close('claim-modal');
          window.Toast.show('ส่งคำขอรับของสำเร็จ! ติดตามสถานะได้ที่ "คำขอของฉัน"', 'success');
          const btn = document.getElementById('claim-trigger-btn');
          if (btn) {
            btn.disabled = true;
            btn.textContent = 'คุณเคยส่งคำขอสำหรับสิ่งของชิ้นนี้ไปแล้ว';
          }
        } catch (err) {
          window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
        }
      });
    }

    const reportForm = document.getElementById('report-form');
    if (reportForm) {
      reportForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const reason = document.getElementById('report-reason').value;
        const description = document.getElementById('report-desc').value;
        try {
          await window.ApiService.reports.create(listingId, reason, description);
          window.ModalController.close('report-modal');
          window.Toast.show('ส่งรายงานเรียบร้อยแล้ว ทีมงานจะตรวจสอบโดยเร็ว', 'success');
        } catch (err) {
          window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
        }
      });
    }

    const cancelBtn = document.getElementById('cancel-listing-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        window.ConfirmDialog.show({
          title: 'ยืนยันยกเลิกประกาศ?',
          message: 'คำขอที่ค้างอยู่ทั้งหมดของประกาศนี้จะถูกยกเลิกไปด้วย และไม่สามารถกู้คืนได้',
          isDanger: true,
          confirmText: 'ยืนยันยกเลิก',
          onConfirm: async function () {
            try {
              await window.ApiService.listings.cancel(listingId);
              window.Toast.show('ยกเลิกประกาศเรียบร้อยแล้ว', 'success');
              setTimeout(function () { window.location.reload(); }, 800);
            } catch (err) {
              window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
            }
          }
        });
      });
    }

    // เปิด modal ขอรับของอัตโนมัติถ้ากลับมาจาก /auth ด้วย ?action=claim
    if (new URLSearchParams(window.location.search).get('action') === 'claim') {
      const trigger = document.getElementById('claim-trigger-btn');
      if (trigger && !trigger.disabled) window.ModalController.open('claim-modal');
    }
  });
})();
