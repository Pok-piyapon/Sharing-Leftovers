(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const provinceSelect = document.getElementById('p-province');
    if (provinceSelect && window.ThaiGeoSelect) {
      window.ThaiGeoSelect.init({
        provinceSelect: provinceSelect,
        districtSelect: document.getElementById('p-district'),
        subdistrictSelect: document.getElementById('p-subdistrict'),
        initial: {
          province: provinceSelect.value || '',
          district: document.getElementById('p-district').value || '',
          subdistrict: document.getElementById('p-subdistrict').value || ''
        }
      });
    }

    const form = document.getElementById('profile-form');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const payload = {
          name: document.getElementById('p-name').value.trim(),
          phone: document.getElementById('p-phone').value.trim(),
          avatarUrl: document.getElementById('p-avatar').value.trim() || undefined,
          address: {
            province: document.getElementById('p-province').value.trim(),
            district: document.getElementById('p-district').value.trim(),
            subdistrict: document.getElementById('p-subdistrict').value.trim()
          }
        };
        try {
          await window.ApiService.users.updateMe(payload);
          window.Toast.show('บันทึกโปรไฟล์เรียบร้อยแล้ว', 'success');
        } catch (err) {
          window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
        }
      });
    }

    const useLocationBtn = document.getElementById('use-location-btn');
    if (useLocationBtn) {
      useLocationBtn.addEventListener('click', function () {
        if (!navigator.geolocation) {
          window.Toast.show('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง', 'error');
          return;
        }
        navigator.geolocation.getCurrentPosition(async function (pos) {
          try {
            await window.ApiService.users.updateMe({
              location: { type: 'Point', coordinates: [pos.coords.longitude, pos.coords.latitude] }
            });
            window.Toast.show('อัปเดตตำแหน่งเรียบร้อยแล้ว', 'success');
          } catch (err) {
            window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
          }
        }, function () {
          window.Toast.show('ไม่สามารถเข้าถึงตำแหน่งของคุณได้', 'error');
        });
      });
    }

    const closeAccountBtn = document.getElementById('close-account-btn');
    if (closeAccountBtn) {
      closeAccountBtn.addEventListener('click', function () {
        window.ConfirmDialog.show({
          title: 'ยืนยันปิดการใช้งานบัญชี?',
          message: 'บัญชีของคุณจะถูกปิดการใช้งาน และคุณจะออกจากระบบทันที',
          isDanger: true,
          confirmText: 'ยืนยันปิดบัญชี',
          onConfirm: async function () {
            try {
              await window.ApiService.users.deleteMe();
              window.location.href = '/';
            } catch (err) {
              window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
            }
          }
        });
      });
    }
  });
})();
