/**
 * ==============================================================================
 * components.js — สคริปต์ควบคุมการทำงานของ UI Components หน้าบ้าน
 * ==============================================================================
 * อ้างอิง: PlanUI2.md (Phase 0) และ 2569_Projects.md (ข้อกำหนดงานข้อ 7: Comment ละเอียด)
 * 
 * หน้าที่ของไฟล์:
 * 1. จัดการเปิด/ปิด หน้าต่าง Modal พร้อม Accessibility (ปิดด้วย Esc / คลิกพื้นหลัง / Focus Trap)
 * 2. จัดการระบบแจ้งเตือน Toast Message (Success, Error, Info)
 * 3. จัดการกล่องยืนยันการทำรายการ (Confirm Dialog)
 * 4. จัดการเมนูแถบข้างบนมือถือ (Mobile Drawer Toggle)
 * 5. จำลองสลับบทบาท (Role Switcher) สำหรับการตรวจสอบงาน Phase 0
 * ==============================================================================
 */

(function () {
  'use strict';

  /**
   * ----------------------------------------------------------------------------
   * 1. ระบบจัดการหน้าต่าง Modal (Modal Controller)
   * ----------------------------------------------------------------------------
   */
  const ModalController = {
    /**
     * เปิดหน้าต่าง Modal ตาม ID
     * @param {string} modalId - ไอดีของ element modal-backdrop
     */
    open(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden'; // ป้องกันหน้าหลังเลื่อน

      // โฟกัสไปที่ปุ่มปิดหรือ input แรกเพื่อความสะดวกของผู้ใช้
      const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    },

    /**
     * ปิดหน้าต่าง Modal ตาม ID หรือปิดทั้งหมดถ้าไม่ระบุ
     * @param {string} [modalId] - ไอดีของ element modal-backdrop
     */
    close(modalId) {
      if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
        }
      } else {
        document.querySelectorAll('.modal-backdrop.active').forEach((modal) => {
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
        });
      }
      document.body.style.overflow = '';
    },

    /**
     * ผูก Event Listeners สำหรับ Modal ทั้งหมด
     */
    init() {
      // ปิดเมื่อกดปุ่มที่มี data-close-modal
      document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('[data-close-modal]');
        if (closeBtn) {
          const modalBackdrop = closeBtn.closest('.modal-backdrop');
          if (modalBackdrop) {
            ModalController.close(modalBackdrop.id);
          }
        }

        // ปิดเมื่อคลิกที่พื้นหลังนอกกล่อง Modal
        if (e.target.classList.contains('modal-backdrop')) {
          ModalController.close(e.target.id);
        }

        // เปิดเมื่อกดปุ่มที่มี data-open-modal="id"
        const openBtn = e.target.closest('[data-open-modal]');
        if (openBtn) {
          const targetId = openBtn.getAttribute('data-open-modal');
          ModalController.open(targetId);
        }
      });

      // ปิดเมื่อกดปุ่ม Escape (Esc) บนคีย์บอร์ด
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          ModalController.close();
        }
      });
    }
  };

  /**
   * ----------------------------------------------------------------------------
   * 2. ระบบแจ้งเตือนผลการทำรายการ (Toast Notification System)
   * ----------------------------------------------------------------------------
   */
  const Toast = {
    /**
     * ดึงหรือสร้าง Container สำหรับเก็บ Toast
     * @returns {HTMLElement}
     */
    getContainer() {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      return container;
    },

    /**
     * แสดงข้อความ Toast
     * @param {string} message - ข้อความที่ต้องการแจ้งเตือน
     * @param {'success'|'error'|'info'} [type='info'] - ประเภทของข้อความ
     * @param {number} [duration=4000] - ระยะเวลาแสดงผล (มิลลิวินาที)
     */
    show(message, type = 'info', duration = 4000) {
      const container = this.getContainer();
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.setAttribute('role', 'alert');

      // ไอคอนตามประเภท
      const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';

      toast.innerHTML = `
        <span style="font-size: 1.1rem;">${icon}</span>
        <span style="flex: 1;">${message}</span>
        <button type="button" style="background:none;border:none;cursor:pointer;color:var(--color-text-muted);font-size:1.1rem;padding:0 4px;" aria-label="ปิด">&times;</button>
      `;

      // ผูกปุ่มปิดกากบาท
      toast.querySelector('button').addEventListener('click', () => {
        toast.remove();
      });

      container.appendChild(toast);

      // ซ่อนอัตโนมัติตามระยะเวลา
      setTimeout(() => {
        if (toast.isConnected) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(10px)';
          toast.style.transition = 'all 200ms ease';
          setTimeout(() => toast.remove(), 200);
        }
      }, duration);
    }
  };

  /**
   * ----------------------------------------------------------------------------
   * 3. กล่องยืนยันการทำรายการสำคัญ (Confirm Dialog)
   * ----------------------------------------------------------------------------
   */
  const ConfirmDialog = {
    /**
     * แสดงหน้าต่างยืนยันการทำรายการ
     * @param {Object} options
     * @param {string} options.title - หัวข้อข้อความยืนยัน
     * @param {string} options.message - รายละเอียดข้อความ
     * @param {string} [options.confirmText='ยืนยัน'] - ข้อความบนปุ่มยืนยัน
     * @param {string} [options.cancelText='ยกเลิก'] - ข้อความบนปุ่มยกเลิก
     * @param {boolean} [options.isDanger=false] - ถ้าเป็น true จะใช้ปุ่มสีส้มอิฐ (Danger)
     * @param {Function} options.onConfirm - ฟังก์ชันที่จะทำงานเมื่อกดยืนยัน
     */
    show({ title, message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', isDanger = false, onConfirm }) {
      let dialogBackdrop = document.getElementById('global-confirm-dialog');
      if (!dialogBackdrop) {
        dialogBackdrop = document.createElement('div');
        dialogBackdrop.id = 'global-confirm-dialog';
        dialogBackdrop.className = 'modal-backdrop';
        document.body.appendChild(dialogBackdrop);
      }

      dialogBackdrop.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
          <div class="modal-header">
            <h3 id="confirm-dialog-title" class="modal-title">${title}</h3>
            <button type="button" class="modal-close-btn" data-close-modal aria-label="ปิด">&times;</button>
          </div>
          <div class="modal-body">
            <p style="color: var(--color-text-main); font-size: var(--font-size-base);">${message}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="confirm-dialog-cancel-btn">${cancelText}</button>
            <button type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" id="confirm-dialog-ok-btn">${confirmText}</button>
          </div>
        </div>
      `;

      ModalController.open('global-confirm-dialog');

      // ปุ่มยกเลิก
      dialogBackdrop.querySelector('#confirm-dialog-cancel-btn').onclick = () => {
        ModalController.close('global-confirm-dialog');
      };

      // ปุ่มยืนยัน
      dialogBackdrop.querySelector('#confirm-dialog-ok-btn').onclick = () => {
        ModalController.close('global-confirm-dialog');
        if (typeof onConfirm === 'function') {
          onConfirm();
        }
      };
    }
  };

  /**
   * ----------------------------------------------------------------------------
   * 4. จัดการเมนูแถบข้างบนมือถือ (Mobile Drawer Toggle)
   * ----------------------------------------------------------------------------
   */
  function initMobileDrawer() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const drawer = document.getElementById('mobile-drawer');

    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // ปิดเมื่อคลิกลิงก์ภายในเมนู
    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /**
   * ----------------------------------------------------------------------------
   * 5. สลับบทบาทสำหรับทดสอบ Phase 0 (Role Switcher Preview)
   * ----------------------------------------------------------------------------
   * ช่วยให้ผู้ตรวจงานสามารถคลิกสลับดู Header ของ Guest / Member / Admin ได้ทันที
   */
  function initRoleSwitcher() {
    const switcherBtns = document.querySelectorAll('[data-set-role]');
    if (!switcherBtns.length) return;

    switcherBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-set-role');
        applyRolePreview(role);

        switcherBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        Toast.show(`สลับมุมมองเป็นบทบาท: ${role.toUpperCase()}`, 'info');
      });
    });
  }

  function applyRolePreview(role) {
    const guestElements = document.querySelectorAll('.header-role-guest');
    const memberElements = document.querySelectorAll('.header-role-member');
    const adminElements = document.querySelectorAll('.header-role-admin');
    const adminBanner = document.getElementById('admin-mode-banner');

    if (role === 'guest') {
      guestElements.forEach((el) => (el.style.display = 'flex'));
      memberElements.forEach((el) => (el.style.display = 'none'));
      adminElements.forEach((el) => (el.style.display = 'none'));
      if (adminBanner) adminBanner.style.display = 'none';
    } else if (role === 'member') {
      guestElements.forEach((el) => (el.style.display = 'none'));
      memberElements.forEach((el) => (el.style.display = 'flex'));
      adminElements.forEach((el) => (el.style.display = 'none'));
      if (adminBanner) adminBanner.style.display = 'none';
    } else if (role === 'admin') {
      guestElements.forEach((el) => (el.style.display = 'none'));
      memberElements.forEach((el) => (el.style.display = 'none'));
      adminElements.forEach((el) => (el.style.display = 'flex'));
      if (adminBanner) adminBanner.style.display = 'block';
    }
  }

  // ส่งออกไปไว้ที่ window เพื่อให้เรียกใช้งานได้สะดวก
  window.ModalController = ModalController;
  window.Toast = Toast;
  window.ConfirmDialog = ConfirmDialog;

  // เริ่มต้นทำงานเมื่อ DOM โหลดเสร็จสมบูรณ์
  document.addEventListener('DOMContentLoaded', () => {
    ModalController.init();
    initMobileDrawer();
    initRoleSwitcher();
  });
})();
