(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    let editingId = null;

    function openForCreate() {
      editingId = null;
      document.getElementById('category-modal-title').textContent = 'เพิ่มหมวดหมู่ใหม่';
      document.getElementById('cat-name').value = '';
      document.getElementById('cat-slug').value = '';
      document.getElementById('cat-description').value = '';
      document.getElementById('cat-icon').value = '';
    }

    function openForEdit(btn) {
      editingId = btn.getAttribute('data-edit-category');
      document.getElementById('category-modal-title').textContent = 'แก้ไขหมวดหมู่';
      document.getElementById('cat-name').value = btn.getAttribute('data-name') || '';
      document.getElementById('cat-slug').value = btn.getAttribute('data-slug') || '';
      document.getElementById('cat-description').value = btn.getAttribute('data-description') || '';
      document.getElementById('cat-icon').value = btn.getAttribute('data-icon') || '';
      window.Toast.show('การเปลี่ยนชื่อจะมีผลกับทุกประกาศที่ใช้หมวดหมู่นี้ทันที', 'info');
    }

    document.getElementById('add-category-btn').addEventListener('click', openForCreate);
    document.querySelectorAll('[data-edit-category]').forEach(function (btn) {
      btn.addEventListener('click', function () { openForEdit(btn); });
    });

    document.getElementById('category-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const payload = {
        name: document.getElementById('cat-name').value.trim(),
        slug: document.getElementById('cat-slug').value.trim(),
        description: document.getElementById('cat-description').value.trim(),
        icon: document.getElementById('cat-icon').value.trim()
      };
      try {
        if (editingId) {
          await window.ApiService.categories.update(editingId, payload);
          window.Toast.show('บันทึกการแก้ไขแล้ว', 'success');
        } else {
          await window.ApiService.categories.create(payload);
          window.Toast.show('เพิ่มหมวดหมู่แล้ว', 'success');
        }
        window.ModalController.close('category-modal');
        setTimeout(function () { window.location.reload(); }, 500);
      } catch (err) {
        window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
      }
    });

    document.querySelectorAll('[data-toggle-category]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const id = btn.getAttribute('data-toggle-category');
        const nextActive = btn.getAttribute('data-next-active') === 'true';
        try {
          await window.ApiService.categories.update(id, { isActive: nextActive });
          window.Toast.show(nextActive ? 'เปิดใช้งานหมวดหมู่แล้ว' : 'ปิดใช้งานหมวดหมู่แล้ว', 'success');
          setTimeout(function () { window.location.reload(); }, 500);
        } catch (err) {
          window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
        }
      });
    });

    document.querySelectorAll('[data-delete-category]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-delete-category');
        const usageCount = parseInt(btn.getAttribute('data-usage-count'), 10) || 0;
        window.ConfirmDialog.show({
          title: 'ยืนยันลบหมวดหมู่นี้?',
          message: usageCount > 0
            ? `มีประกาศ ${usageCount} รายการใช้หมวดหมู่นี้อยู่ ระบบจะปิดใช้งานแทนการลบ (soft-disable)`
            : 'หมวดหมู่นี้ยังไม่มีประกาศใดใช้งาน จะถูกลบออกจริง',
          isDanger: true,
          confirmText: 'ยืนยันลบ',
          onConfirm: async function () {
            try {
              const result = await window.ApiService.categories.delete(id);
              window.Toast.show(result.message || 'ดำเนินการเรียบร้อยแล้ว', 'success');
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
