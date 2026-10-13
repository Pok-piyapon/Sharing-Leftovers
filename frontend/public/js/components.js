/**
 * ==============================================================================
 * components.js — ตัวช่วยเรียกใช้ UI Components ของ Semantic UI แบบเดียวกันทุกหน้า
 * ==============================================================================
 * ใช้ jQuery + Semantic UI JS modules (modal) เป็น UI library เดียวของระบบ
 * ส่วน Toast ไม่มีใน Semantic UI core จึงประกอบจาก class "ui message" ของ Semantic เอง
 * ==============================================================================
 */
(function () {
  'use strict';

  const ModalController = {
    open(modalId) {
      $('#' + modalId).modal({ closable: true }).modal('show');
    },
    close(modalId) {
      if (modalId) {
        $('#' + modalId).modal('hide');
      } else {
        $('.ui.modal').modal('hide');
      }
    },
    init() {
      document.addEventListener('click', (e) => {
        const openBtn = e.target.closest('[data-open-modal]');
        if (openBtn) {
          ModalController.open(openBtn.getAttribute('data-open-modal'));
        }
        const closeBtn = e.target.closest('[data-close-modal]');
        if (closeBtn) {
          const modal = closeBtn.closest('.ui.modal');
          if (modal) $(modal).modal('hide');
        }
      });
    }
  };

  const Toast = {
    getContainer() {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed; top:1em; right:1em; z-index:9999; display:flex; flex-direction:column; gap:0.5em; max-width:360px;';
        document.body.appendChild(container);
      }
      return container;
    },

    show(message, type = 'info', duration = 4000) {
      const container = this.getContainer();
      const colorClass = type === 'success' ? 'positive' : type === 'error' ? 'negative' : 'info';
      const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info';

      const toast = document.createElement('div');
      toast.className = `ui ${colorClass} message`;
      toast.setAttribute('role', 'alert');
      toast.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
      toast.innerHTML = `
        <i class="close icon"></i>
        <div class="header" style="display:flex; align-items:center; gap:8px; font-weight:400;">
          <i class="fa-solid ${icon}"></i><span>${message}</span>
        </div>
      `;
      toast.querySelector('.close.icon').addEventListener('click', () => toast.remove());
      container.appendChild(toast);

      setTimeout(() => {
        if (toast.isConnected) toast.remove();
      }, duration);
    }
  };

  const ConfirmDialog = {
    /**
     * @param {Object} options
     * @param {string} options.title
     * @param {string} options.message
     * @param {string} [options.confirmText='ยืนยัน']
     * @param {string} [options.cancelText='ยกเลิก']
     * @param {boolean} [options.isDanger=false]
     * @param {Function} options.onConfirm
     */
    show({ title, message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', isDanger = false, onConfirm }) {
      let modal = document.getElementById('global-confirm-dialog');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'global-confirm-dialog';
        modal.className = 'ui small modal';
        document.body.appendChild(modal);
      }
      modal.innerHTML = `
        <div class="header">${title}</div>
        <div class="content">${message}</div>
        <div class="actions">
          <div class="ui button deny">${cancelText}</div>
          <div class="ui ${isDanger ? 'red' : 'primary'} button approve">${confirmText}</div>
        </div>
      `;
      $(modal).modal({
        closable: true,
        onApprove() {
          if (typeof onConfirm === 'function') onConfirm();
        }
      }).modal('show');
    }
  };

  // ส่งออกไปไว้ที่ window เพื่อให้เรียกใช้งานได้สะดวก
  window.ModalController = ModalController;
  window.Toast = Toast;
  window.ConfirmDialog = ConfirmDialog;

  document.addEventListener('DOMContentLoaded', () => {
    ModalController.init();
    // Accordion ของ Semantic UI (ใช้ในหน้า FAQ)
    if (window.$ && $('.ui.accordion').length) {
      $('.ui.accordion').accordion();
    }
    // Dropdown ของ Semantic UI (ครอบ select ทั่วไปที่ไม่ได้ถูกแก้ options ด้วย JS เอง เช่น select จังหวัด/อำเภอ/ตำบลที่ cascading แบบไดนามิก จะไม่ใส่ class ui.dropdown ไว้ตั้งแต่ต้น)
    if (window.$ && $('select.ui.dropdown').length) {
      $('select.ui.dropdown').dropdown();
    }
  });
})();
