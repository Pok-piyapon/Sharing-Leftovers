(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-admin-cancel-listing]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-admin-cancel-listing');
        window.ConfirmDialog.show({
          title: 'ยืนยันยกเลิกประกาศนี้? (Admin)',
          message: 'คำขอที่ค้างอยู่ทั้งหมด (รอพิจารณา/อนุมัติแล้ว) จะถูกยกเลิกไปด้วยทันที และไม่สามารถกู้คืนได้',
          isDanger: true,
          confirmText: 'ยืนยันยกเลิก',
          onConfirm: async function () {
            try {
              await window.ApiService.listings.cancel(id);
              window.Toast.show('ยกเลิกประกาศเรียบร้อยแล้ว', 'success');
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
