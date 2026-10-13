(function () {
  'use strict';

  async function setStatus(id, status, successMsg) {
    try {
      await window.ApiService.reports.updateStatus(id, status);
      window.Toast.show(successMsg, 'success');
      setTimeout(function () { window.location.reload(); }, 500);
    } catch (err) {
      window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-report-reviewing]').forEach(function (btn) {
      btn.addEventListener('click', () => setStatus(btn.dataset.reportReviewing, 'reviewing', 'ตั้งสถานะกำลังตรวจสอบแล้ว'));
    });
    document.querySelectorAll('[data-report-resolved]').forEach(function (btn) {
      btn.addEventListener('click', () => setStatus(btn.dataset.reportResolved, 'resolved', 'ปิดเคสเรียบร้อยแล้ว'));
    });
    document.querySelectorAll('[data-report-rejected]').forEach(function (btn) {
      btn.addEventListener('click', () => setStatus(btn.dataset.reportRejected, 'rejected', 'ปฏิเสธรายงานแล้ว (ไม่กระทบประกาศ)'));
    });

    document.querySelectorAll('[data-report-cancel-listing]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const listingId = btn.getAttribute('data-listing-id');
        const reportId = btn.getAttribute('data-report-cancel-listing');
        window.ConfirmDialog.show({
          title: 'ยืนยันยกเลิกประกาศของรายงานนี้?',
          message: 'คำขอที่ค้างอยู่ทั้งหมดจะถูกยกเลิกไปด้วย และรายงานนี้จะถูกปิดเป็น resolved',
          isDanger: true,
          confirmText: 'ยืนยันยกเลิกประกาศ',
          onConfirm: async function () {
            try {
              await window.ApiService.listings.cancel(listingId);
              await window.ApiService.reports.updateStatus(reportId, 'resolved');
              window.Toast.show('ยกเลิกประกาศและปิดเคสแล้ว', 'success');
              setTimeout(function () { window.location.reload(); }, 600);
            } catch (err) {
              window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
            }
          }
        });
      });
    });

    document.querySelectorAll('[data-report-ban-author]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const userId = btn.getAttribute('data-report-ban-author');
        const reason = window.prompt('ระบุเหตุผลการระงับผู้ใช้นี้ (จำเป็น):');
        if (!reason || !reason.trim()) return;
        window.ApiService.admin.banUser(userId, reason.trim())
          .then(function () {
            window.Toast.show('ระงับผู้ใช้เรียบร้อยแล้ว เซสชันของเขาจะถูกตัดทันที', 'success');
            setTimeout(function () { window.location.reload(); }, 600);
          })
          .catch(function (err) {
            window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
          });
      });
    });
  });
})();
