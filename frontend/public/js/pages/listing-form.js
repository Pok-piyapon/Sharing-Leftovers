(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('listing-form');
    if (!form) return;

    const mode = form.dataset.mode; // 'create' | 'edit'
    const listingId = form.dataset.listingId;
    const initialImages = (form.dataset.initialImages || '').split('|').filter(Boolean);

    window.ImageUrlRepeater.init('image-url-list', 'add-image-btn', initialImages);

    window.ThaiGeoSelect.init({
      provinceSelect: document.getElementById('f-province'),
      districtSelect: document.getElementById('f-district'),
      subdistrictSelect: document.getElementById('f-subdistrict'),
      initial: {
        province: form.dataset.initialProvince || '',
        district: form.dataset.initialDistrict || '',
        subdistrict: form.dataset.initialSubdistrict || ''
      }
    });

    if (form.dataset.locked === 'true') return; // ฟอร์มถูกล็อก ไม่ผูก submit handler

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const images = window.ImageUrlRepeater.getValues('image-url-list');
      if (images.length < 1 || images.length > 5) {
        window.Toast.show('กรุณาระบุรูปภาพ 1-5 รูป', 'error');
        return;
      }

      const payload = {
        title: document.getElementById('f-title').value.trim(),
        description: document.getElementById('f-description').value.trim(),
        category: document.getElementById('f-category').value,
        condition: document.getElementById('f-condition').value,
        quantity: parseInt(document.getElementById('f-quantity').value, 10) || 1,
        images: images,
        pickup: {
          method: 'pickup',
          address: document.getElementById('f-address').value.trim(),
          area: {
            province: document.getElementById('f-province').value.trim(),
            district: document.getElementById('f-district').value.trim(),
            subdistrict: document.getElementById('f-subdistrict').value.trim()
          }
        },
        expiresAt: document.getElementById('f-expires').value || undefined
      };

      try {
        let result;
        if (mode === 'edit') {
          result = await window.ApiService.listings.update(listingId, payload);
        } else {
          result = await window.ApiService.listings.create(payload);
        }
        window.Toast.show(mode === 'edit' ? 'บันทึกการแก้ไขเรียบร้อยแล้ว' : 'ลงประกาศสำเร็จแล้ว', 'success');
        const newId = result.data.listing._id;
        setTimeout(function () { window.location.href = '/listings/' + newId; }, 600);
      } catch (err) {
        window.Toast.show((err && err.message) || 'เกิดข้อผิดพลาด', 'error');
      }
    });
  });
})();
