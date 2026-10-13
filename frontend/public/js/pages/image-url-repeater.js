/**
 * ตัวจัดการช่องกรอกรูปภาพแบบเพิ่ม/ลบได้ (1-5 รูป) — ใช้ร่วมกันทั้งหน้า new.ejs และ edit.ejs
 * แต่ละแถวใส่รูปได้ 2 ทาง: พิมพ์ URL ตรงๆ หรือกดอัปโหลดไฟล์จากเครื่อง (จะได้ URL ภายใน /assets/uploads/... กลับมาเติมให้อัตโนมัติ)
 * markup ที่ต้องมี: #image-url-list (container), ปุ่ม #add-image-btn
 */
window.ImageUrlRepeater = (function () {
  'use strict';

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB ตรงกับ limit ฝั่ง server

  function updatePreview(row, url) {
    const preview = row.querySelector('.image-url-preview');
    if (!preview) return;
    if (url) {
      preview.src = url;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  }

  function createRow(value) {
    const row = document.createElement('div');
    row.className = 'image-url-row';
    row.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
    row.innerHTML = `
      <img class="image-url-preview" alt="" style="width:48px; height:48px; object-fit:cover; border-radius:4px; flex-shrink:0; display:none;">
      <input type="text" class="image-url-input" placeholder="https://... หรือกดอัปโหลดไฟล์" value="${value ? value.replace(/"/g, '&quot;') : ''}" style="flex:1;">
      <label class="ui basic button" style="cursor:pointer; margin-bottom:0; white-space:nowrap;">
        <span class="upload-label-text"><i class="fa-solid fa-upload"></i> อัปโหลด</span>
        <input type="file" class="image-upload-input" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;">
      </label>
      <button type="button" class="ui basic icon button" data-remove-image><i class="fa-solid fa-trash"></i></button>
    `;

    const urlInput = row.querySelector('.image-url-input');
    const fileInput = row.querySelector('.image-upload-input');
    const uploadLabelText = row.querySelector('.upload-label-text');

    if (value) updatePreview(row, value);

    urlInput.addEventListener('input', function () {
      updatePreview(row, urlInput.value.trim());
    });

    fileInput.addEventListener('change', async function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
        window.Toast.show('ไฟล์มีขนาดใหญ่เกิน 5MB', 'error');
        fileInput.value = '';
        return;
      }

      uploadLabelText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลด...';
      fileInput.disabled = true;

      try {
        const result = await window.ApiService.uploads.uploadImage(file);
        urlInput.value = result.data.url;
        updatePreview(row, result.data.url);
        window.Toast.show('อัปโหลดรูปภาพสำเร็จ', 'success');
      } catch (err) {
        window.Toast.show((err && err.message) || 'อัปโหลดไม่สำเร็จ', 'error');
      } finally {
        uploadLabelText.innerHTML = '<i class="fa-solid fa-upload"></i> อัปโหลด';
        fileInput.disabled = false;
        fileInput.value = ''; // เคลียร์ไฟล์ที่เลือกไว้ เพื่อให้เลือกไฟล์เดิมซ้ำได้อีกถ้าต้องการ
      }
    });

    row.querySelector('[data-remove-image]').addEventListener('click', function () {
      const list = document.getElementById('image-url-list');
      if (list.children.length > 1) row.remove();
    });

    return row;
  }

  function init(containerId, addBtnId, initialUrls) {
    const list = document.getElementById(containerId);
    if (!list) return;

    // แสดงรูปเดิมเสมอแม้ไม่มีปุ่ม "+ เพิ่มรูป" (เช่น หน้าแก้ไขที่ถูกล็อก ซึ่งซ่อนปุ่มเพิ่มรูปไว้โดยตั้งใจ)
    (initialUrls && initialUrls.length ? initialUrls : ['']).forEach((url) => list.appendChild(createRow(url)));

    const addBtn = document.getElementById(addBtnId);
    if (!addBtn) return;

    addBtn.addEventListener('click', function () {
      if (list.children.length >= 5) {
        window.Toast.show('เพิ่มได้สูงสุด 5 รูป', 'error');
        return;
      }
      list.appendChild(createRow(''));
    });
  }

  function getValues(containerId) {
    const list = document.getElementById(containerId);
    if (!list) return [];
    return Array.from(list.querySelectorAll('.image-url-input'))
      .map((input) => input.value.trim())
      .filter((v) => v.length > 0);
  }

  return { init, getValues };
})();
