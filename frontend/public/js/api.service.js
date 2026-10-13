/**
 * ==============================================================================
 * api.service.js — ตัวเชื่อมต่อ API ฝั่งหน้าบ้าน (Client-side API Service Layer)
 * ==============================================================================
 * อ้างอิง: PlanUI2.md (Phase 0) และ 2569_Projects.md (ข้อกำหนดงานข้อ 7: Comment ละเอียด)
 * 
 * หน้าที่ของไฟล์:
 * รวบรวมฟังก์ชันการเรียกใช้งาน RESTful API (/api/v1/*) ที่เซิร์ฟเวอร์ Express มีอยู่แล้ว
 * จัดการ Session Cookie อัตโนมัติ (credentials: 'include') 
 * และแปลงข้อผิดพลาดให้อยู่ในรูปแบบที่เข้าใจง่าย ป้องกันหน้าเว็บพังเมื่อเกิด Network Error
 * ==============================================================================
 */

const ApiService = (function () {
  'use strict';

  // Base URL ของ API ฝั่งเซิร์ฟเวอร์
  const BASE_URL = '/api/v1';

  /**
   * ฟังก์ชันหลักสำหรับยิง HTTP Request ผ่าน Fetch API
   * @param {string} endpoint - Path ของ API เช่น '/auth/me' หรือ '/listings'
   * @param {Object} [options={}] - ออปชันเพิ่มเติม เช่น method, body, headers
   * @returns {Promise<Object>} ข้อมูล JSON ที่ได้จากเซิร์ฟเวอร์
   */
  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      // ส่ง Session Cookie ไปด้วยเสมอข้าม Request
      credentials: 'include',
      ...options
    };

    // แปลง body เป็น JSON string ถ้าเป็น Object
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // จัดการข้อผิดพลาดที่ส่งกลับมาจาก ApiError ของเซิร์ฟเวอร์
        const error = new Error(data.message || `HTTP Error ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[ApiService Error] ${config.method} ${url}:`, err);
      throw err;
    }
  }

  return {
    /**
     * --------------------------------------------------------------------------
     * 1. โมดูลระบบยืนยันตัวตน (Authentication API)
     * --------------------------------------------------------------------------
     */
    auth: {
      /**
       * ดึงข้อมูลผู้ใช้งานที่กำลังเข้าสู่ระบบอยู่จาก Session
       * @returns {Promise<Object>} ข้อมูลผู้ใช้ { success: true, data: user }
       */
      async getMe() {
        return request('/auth/me');
      },

      /**
       * เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
       * @param {string} email
       * @param {string} password
       * @returns {Promise<Object>}
       */
      async login(email, password) {
        return request('/auth/login', {
          method: 'POST',
          body: { email, password }
        });
      },

      /**
       * สมัครสมาชิกใหม่ (ส่งชื่อ อีเมล รหัสผ่าน และเบอร์โทร)
       * @param {Object} userData
       * @returns {Promise<Object>}
       */
      async register(userData) {
        return request('/auth/register', {
          method: 'POST',
          body: userData
        });
      },

      /**
       * ออกจากระบบและทำลาย Session
       * @returns {Promise<Object>}
       */
      async logout() {
        return request('/auth/logout', {
          method: 'POST'
        });
      },

      /**
       * เปลี่ยนรหัสผ่านใหม่
       * @param {string} currentPassword
       * @param {string} newPassword
       * @returns {Promise<Object>}
       */
      async changePassword(currentPassword, newPassword) {
        return request('/auth/password', {
          method: 'PATCH',
          body: { currentPassword, newPassword }
        });
      }
    },

    /**
     * --------------------------------------------------------------------------
     * 2. โมดูลหมวดหมู่สิ่งของ (Categories API)
     * --------------------------------------------------------------------------
     */
    categories: {
      /**
       * ดึงรายการหมวดหมู่ทั้งหมด
       * @param {boolean} [activeOnly=true] - ดึงเฉพาะหมวดหมู่ที่เปิดใช้งาน
       * @returns {Promise<Object>}
       */
      async getAll(activeOnly = true) {
        const query = activeOnly ? '?isActive=true' : '';
        return request(`/categories${query}`);
      },

      /**
       * ดึงรายละเอียดหมวดหมู่ตาม ID
       * @param {string} id
       * @returns {Promise<Object>}
       */
      async getById(id) {
        return request(`/categories/${id}`);
      }
    },

    /**
     * --------------------------------------------------------------------------
     * 3. โมดูลประกาศแบ่งปันสิ่งของ (Listings API)
     * --------------------------------------------------------------------------
     */
    listings: {
      /**
       * ค้นหาและกรองรายการประกาศ
       * @param {Object} [params={}] - ตัวกรอง เช่น search, category, status, sort, lat, lng, radius
       * @returns {Promise<Object>}
       */
      async getAll(params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            query.append(key, val);
          }
        });
        const queryString = query.toString() ? `?${query.toString()}` : '';
        return request(`/listings${queryString}`);
      },

      /**
       * ดึงรายละเอียดประกาศรายชิ้น (พร้อม Privacy Masking)
       * @param {string} id
       * @returns {Promise<Object>}
       */
      async getById(id) {
        return request(`/listings/${id}`);
      },

      /**
       * สร้างประกาศแบ่งปันใหม่
       * @param {Object} listingData
       * @returns {Promise<Object>}
       */
      async create(listingData) {
        return request('/listings', {
          method: 'POST',
          body: listingData
        });
      },

      /**
       * แก้ไขประกาศ (ได้เฉพาะเมื่อยังไม่มีคำขอแรกเกิดขึ้น)
       * @param {string} id
       * @param {Object} updateData
       * @returns {Promise<Object>}
       */
      async update(id, updateData) {
        return request(`/listings/${id}`, {
          method: 'PATCH',
          body: updateData
        });
      },

      /**
       * ยกเลิกประกาศ (Cascade Cancellation)
       * @param {string} id
       * @returns {Promise<Object>}
       */
      async cancel(id) {
        return request(`/listings/${id}`, {
          method: 'DELETE'
        });
      }
    },

    /**
     * --------------------------------------------------------------------------
     * 4. โมดูลคำขอรับของ (Reservations API)
     * --------------------------------------------------------------------------
     */
    reservations: {
      /**
       * ส่งคำขอรับของ (Single Lifetime Reservation)
       * @param {string} listingId
       * @param {number} quantity
       * @param {string} message
       * @returns {Promise<Object>}
       */
      async create(listingId, quantity, message) {
        return request(`/listings/${listingId}/reservations`, {
          method: 'POST',
          body: { quantity, message }
        });
      },

      /**
       * ดึงประวัติคำขอรับของของตนเอง
       * @param {string} [status] - ตัวกรองสถานะ เช่น pending, approved
       * @returns {Promise<Object>}
       */
      async getMy(status) {
        const query = status ? `?status=${status}` : '';
        return request(`/reservations/my${query}`);
      },

      /**
       * อนุมัติคำขอ (เจ้าของประกาศเท่านั้น)
       * @param {string} id
       * @returns {Promise<Object>}
       */
      async approve(id) {
        return request(`/reservations/${id}/approve`, {
          method: 'PATCH'
        });
      },

      /**
       * ปฏิเสธคำขอ (เจ้าของประกาศเท่านั้น)
       * @param {string} id
       * @returns {Promise<Object>}
       */
      async reject(id) {
        return request(`/reservations/${id}/reject`, {
          method: 'PATCH'
        });
      },

      /**
       * ผู้ขอยกเลิกคำขอของตนเอง
       * @param {string} id
       * @returns {Promise<Object>}
       */
      async cancel(id) {
        return request(`/reservations/${id}/cancel`, {
          method: 'PATCH'
        });
      },

      /**
       * ยืนยันการส่งมอบเสร็จสิ้น (One-Party Completion โดยเจ้าของ)
       * @param {string} id
       * @returns {Promise<Object>}
       */
      async complete(id) {
        return request(`/reservations/${id}/complete`, {
          method: 'PATCH'
        });
      }
    },

    /**
     * --------------------------------------------------------------------------
     * 5. โมดูลรายงานปัญหา (Reports API)
     * --------------------------------------------------------------------------
     */
    reports: {
      /**
       * แจ้งรายงานประกาศที่ไม่เหมาะสม
       * @param {string} listingId
       * @param {string} reason
       * @param {string} description
       * @returns {Promise<Object>}
       */
      async create(listingId, reason, description) {
        return request(`/listings/${listingId}/reports`, {
          method: 'POST',
          body: { reason, description }
        });
      }
    }
  };
})();

// ส่งออกให้สคริปต์หน้าบ้านเรียกใช้ได้ผ่าน window.ApiService
window.ApiService = ApiService;
