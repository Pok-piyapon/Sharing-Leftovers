/**
 * ==============================================================================
 * thai-geo-select.js — Dropdown จังหวัด/อำเภอ/ตำบล แบบ cascading
 * ==============================================================================
 * โหลดข้อมูลจาก /assets/data/thailand-geo/{provinces,districts,subdistricts}.json
 * (ข้อมูลจาก thailand-geography-data/thailand-geography-json เก็บไว้ในโปรเจกต์เอง
 * ไม่พึ่งพา GitHub ตอน runtime) แล้วผูก select 3 ตัวให้กรองกันเป็นลำดับขั้น
 * ค่า option ใช้ชื่อภาษาไทยตรงๆ เพื่อให้เข้ากับฟิลด์ pickup.area ที่เก็บเป็น string เดิม
 * ==============================================================================
 */
window.ThaiGeoSelect = (function () {
  'use strict';

  let dataPromise = null;

  function loadData() {
    if (!dataPromise) {
      dataPromise = Promise.all([
        fetch('/assets/data/thailand-geo/provinces.json').then((r) => r.json()),
        fetch('/assets/data/thailand-geo/districts.json').then((r) => r.json()),
        fetch('/assets/data/thailand-geo/subdistricts.json').then((r) => r.json())
      ]).then(([provinces, districts, subdistricts]) => ({ provinces, districts, subdistricts }));
    }
    return dataPromise;
  }

  function fillOptions(select, items, placeholder) {
    select.innerHTML = '';
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = placeholder;
    select.appendChild(emptyOpt);
    items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.name;
      opt.textContent = item.name;
      opt.dataset.code = item.code;
      select.appendChild(opt);
    });
  }

  /**
   * ผูก select 3 ตัวให้ cascading กัน (เลือกจังหวัด -> กรองอำเภอ -> กรองตำบล)
   * @param {Object} opts
   * @param {HTMLSelectElement} opts.provinceSelect
   * @param {HTMLSelectElement} opts.districtSelect
   * @param {HTMLSelectElement} opts.subdistrictSelect
   * @param {{province?:string, district?:string, subdistrict?:string}} [opts.initial] - ค่าที่มีอยู่แล้ว (ตอนแก้ไขประกาศ)
   */
  async function init(opts) {
    const { provinceSelect, districtSelect, subdistrictSelect, initial } = opts;

    provinceSelect.innerHTML = '<option value="">กำลังโหลด...</option>';
    const { provinces, districts, subdistricts } = await loadData();

    fillOptions(provinceSelect, provinces, '— เลือกจังหวัด —');
    districtSelect.innerHTML = '<option value="">— เลือกอำเภอ/เขต —</option>';
    districtSelect.disabled = true;
    subdistrictSelect.innerHTML = '<option value="">— เลือกตำบล/แขวง —</option>';
    subdistrictSelect.disabled = true;

    provinceSelect.addEventListener('change', () => {
      const selected = provinceSelect.selectedOptions[0];
      const code = selected && selected.dataset.code ? Number(selected.dataset.code) : null;
      const filtered = code ? districts.filter((d) => d.provinceCode === code) : [];
      fillOptions(districtSelect, filtered, '— เลือกอำเภอ/เขต —');
      districtSelect.disabled = filtered.length === 0;
      subdistrictSelect.innerHTML = '<option value="">— เลือกตำบล/แขวง —</option>';
      subdistrictSelect.disabled = true;
    });

    districtSelect.addEventListener('change', () => {
      const selected = districtSelect.selectedOptions[0];
      const code = selected && selected.dataset.code ? Number(selected.dataset.code) : null;
      const filtered = code ? subdistricts.filter((s) => s.districtCode === code) : [];
      fillOptions(subdistrictSelect, filtered, '— เลือกตำบล/แขวง —');
      subdistrictSelect.disabled = filtered.length === 0;
    });

    // ตั้งค่าเดิมที่มีอยู่แล้ว (ตอนแก้ไขประกาศ) โดยจับคู่จากชื่อไทยที่เก็บไว้
    if (initial && initial.province) {
      provinceSelect.value = initial.province;
      provinceSelect.dispatchEvent(new Event('change'));
      if (initial.district) {
        districtSelect.value = initial.district;
        districtSelect.dispatchEvent(new Event('change'));
        if (initial.subdistrict) {
          subdistrictSelect.value = initial.subdistrict;
        }
      }
    }
  }

  return { init };
})();
