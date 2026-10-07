(() => {
  "use strict";

  const API = "/api/v1";
  const state = { user: null, categories: [], page: 1, pages: 1, filters: {}, location: null, listingCache: new Map() };
  const byId = (id) => document.getElementById(id);
  const modalRoot = byId("modal-root");
  const panelRoot = byId("panel-root");
  const listingGrid = byId("listing-grid");
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const formatDate = (value) => value ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value)) : "ไม่ระบุ";
  const conditionNames = { new: "ใหม่", like_new: "เหมือนใหม่", good: "สภาพดี", fair: "พอใช้", poor: "มีตำหนิ" };
  const statusNames = { available: "พร้อมแบ่งปัน", reserved: "มีผู้จองแล้ว", completed: "ส่งต่อแล้ว", cancelled: "ยกเลิก", expired: "หมดเวลา", pending: "รอตอบรับ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธ", reviewing: "กำลังตรวจสอบ", resolved: "จัดการแล้ว" };
  const categoryIcons = { food: "🥗", clothing: "👕", furniture: "🪑", electronics: "🔌", books: "📚", household: "🏠", others: "📦" };
  const reasonNames = { spam: "สแปม", inappropriate: "ไม่เหมาะสม", fraud: "หลอกลวง", illegal: "ผิดกฎหมาย", wrong_information: "ข้อมูลไม่ถูกต้อง", other: "อื่น ๆ" };

  async function api(path, options = {}) {
    const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
    const response = await fetch(`${API}${path}`, { credentials: "same-origin", ...options, headers });
    let payload;
    try { payload = await response.json(); } catch { payload = {}; }
    if (!response.ok || payload.success === false) {
      const error = new Error(payload.message || `เกิดข้อผิดพลาด (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function toast(message, type = "info") {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    byId("toast-region").append(node);
    window.setTimeout(() => node.remove(), 4200);
  }

  function updateAuthUi() {
    const signedIn = Boolean(state.user);
    byId("login-open").classList.toggle("hidden", signedIn);
    byId("register-open").classList.toggle("hidden", signedIn);
    byId("logout-button").classList.toggle("hidden", !signedIn);
    byId("user-greeting").classList.toggle("hidden", !signedIn);
    byId("user-greeting").textContent = signedIn ? `สวัสดี, ${state.user.name}` : "";
    document.querySelectorAll(".admin-link").forEach((link) => link.classList.toggle("hidden", state.user?.role !== "admin"));
  }

  function imageUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value);
      if (url.hostname === "drive.google.com" || url.hostname === "www.drive.google.com") {
        const filePath = url.pathname.match(/\/file\/d\/([^/]+)/);
        const fileId = filePath?.[1] || url.searchParams.get("id");
        if (fileId) {
          const preview = new URL("https://drive.google.com/thumbnail");
          preview.searchParams.set("id", fileId);
          preview.searchParams.set("sz", "w1200");
          return preview.toString();
        }
      }
      return url.toString();
    } catch {
      return value;
    }
  }

  function imageMarkup(images, categorySlug) {
    const src = imageUrl(Array.isArray(images) && images[0] ? images[0] : "");
    return src
      ? `<img src="${escapeHtml(src)}" alt="" loading="lazy" onerror="this.remove();this.parentElement.insertAdjacentHTML('beforeend','<span class=&quot;photo-placeholder&quot;>📦</span>')">`
      : `<span class="photo-placeholder">${categoryIcons[categorySlug] || "📦"}</span>`;
  }

  function listingCard(listing) {
    const category = listing.category || {};
    const owner = listing.owner || {};
    const slug = category.slug || "";
    state.listingCache.set(listing._id, listing);
    return `<article class="listing-card" data-listing-id="${escapeHtml(listing._id)}" tabindex="0" role="button" aria-label="ดูประกาศ ${escapeHtml(listing.title)}">
      <div class="listing-photo">${imageMarkup(listing.images, slug)}<span class="category-tag">${escapeHtml(category.name || "ของแบ่งปัน")}</span><span class="condition-tag">${escapeHtml(conditionNames[listing.condition] || listing.condition || "สภาพดี")}</span></div>
      <div class="listing-info"><h3>${escapeHtml(listing.title)}</h3><div class="listing-meta"><span>เหลือ ${Number(listing.availableQuantity ?? listing.quantity ?? 1)} ชิ้น</span><span>${Number(listing.viewCount || 0)} คนดู</span></div><div class="listing-owner"><span class="owner-dot">${escapeHtml((owner.name || "ช")[0])}</span><span>${escapeHtml(owner.name || "สมาชิกชุมชน")}</span><span class="card-action">ดูรายละเอียด ↗</span></div></div>
    </article>`;
  }

  async function loadCategories() {
    const result = await api("/categories?isActive=true");
    state.categories = result.data || [];
    const options = state.categories.map((category) => `<option value="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</option>`).join("");
    document.querySelectorAll('select[name="category"]').forEach((select) => {
      const first = select.querySelector("option")?.outerHTML || '<option value="">เลือกหมวดหมู่</option>';
      select.innerHTML = `${first}${options}`;
    });
  }

  async function loadListings() {
    listingGrid.innerHTML = '<div class="loading-state">กำลังตามหาของดี ๆ ให้คุณ<span class="loading-dot">...</span></div>';
    const params = new URLSearchParams({ page: String(state.page), limit: "12", ...state.filters });
    if (state.location) {
      params.set("lat", String(state.location.lat));
      params.set("lng", String(state.location.lng));
      params.set("radius", state.location.radius);
    }
    try {
      const result = await api(`/listings?${params}`);
      const listings = result.data || [];
      state.pages = result.pagination?.totalPages || 1;
      byId("listing-count").textContent = `${result.pagination?.total ?? listings.length} ของแบ่งปัน`;
      byId("page-summary").textContent = `หน้า ${state.page} จาก ${state.pages}`;
      byId("prev-page").disabled = state.page <= 1;
      byId("next-page").disabled = state.page >= state.pages;
      listingGrid.innerHTML = listings.length ? listings.map(listingCard).join("") : '<div class="empty-state"><strong>ยังไม่พบของที่ตรงใจ</strong><p>ลองเปลี่ยนคำค้นหาหรือเป็นคนเริ่มแบ่งปันชิ้นแรกดูไหม</p><button class="button button-outline" type="button" data-open-panel="create-listing">＋ ลงประกาศ</button></div>';
    } catch (error) {
      listingGrid.innerHTML = `<div class="empty-state"><strong>โหลดประกาศไม่สำเร็จ</strong><p>${escapeHtml(error.message)}</p><button class="button button-outline" type="button" id="retry-listings">ลองอีกครั้ง</button></div>`;
      byId("listing-count").textContent = "เกิดข้อผิดพลาด";
    }
  }

  function closeModal() { modalRoot.innerHTML = ""; }
  function closePanel() { panelRoot.innerHTML = ""; }
  function openModal(content, wide = false) {
    closeModal();
    modalRoot.innerHTML = `<div class="overlay" data-overlay><section class="modal${wide ? " wide" : ""}" role="dialog" aria-modal="true">${content}<button class="modal-close" type="button" aria-label="ปิด">×</button></section></div>`;
    modalRoot.querySelector(".modal-close").addEventListener("click", closeModal);
    modalRoot.querySelector("[data-overlay]").addEventListener("click", (event) => { if (event.target.matches("[data-overlay]")) closeModal(); });
    modalRoot.querySelector("input,button,select,textarea")?.focus();
  }
  function confirmInPage({ title, message, confirmLabel, onConfirm, danger = false }) {
    openModal(`<div class="confirm-mark${danger ? " danger" : ""}" aria-hidden="true">${danger ? "!" : "♡"}</div><div class="modal-eyebrow">PLEASE CONFIRM</div><h2>${escapeHtml(title)}</h2><p class="modal-intro">${escapeHtml(message)}</p><div class="form-actions"><button class="button button-outline" type="button" data-confirm-cancel>กลับไป</button><button class="button${danger ? " button-danger" : " button-dark"}" type="button" data-confirm-submit>${escapeHtml(confirmLabel)}</button></div>`);
    modalRoot.querySelector("[data-confirm-cancel]").addEventListener("click", closeModal);
    modalRoot.querySelector("[data-confirm-submit]").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await onConfirm();
        closeModal();
      } catch (error) {
        toast(error.message, "error");
        button.disabled = false;
      }
    });
  }
  function openPanel(title, subtitle = "จัดการเรื่องราวการแบ่งปันของคุณ") {
    closePanel();
    panelRoot.innerHTML = `<div class="panel-shell" data-panel-shell><aside class="side-panel"><div class="panel-head"><div><div class="eyebrow">${escapeHtml(subtitle)}</div><h2>${escapeHtml(title)}</h2></div><button class="panel-close" type="button" aria-label="ปิด">×</button></div><div id="panel-content"><div class="loading-state">กำลังโหลด...</div></div></aside></div>`;
    panelRoot.querySelector(".panel-close").addEventListener("click", closePanel);
    panelRoot.querySelector("[data-panel-shell]").addEventListener("click", (event) => { if (event.target.matches("[data-panel-shell]")) closePanel(); });
  }
  function panelContent(html) { const target = byId("panel-content"); if (target) target.innerHTML = html; }
  function panelMessage(title, detail) { return `<div class="empty-panel"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p></div>`; }
  function safeButton(action, id, label, danger = false, disabled = false) {
    return `<button type="button" class="mini-button${danger ? " danger" : ""}" data-action="${escapeHtml(action)}" data-id="${escapeHtml(id)}"${disabled ? " disabled" : ""}>${escapeHtml(label)}</button>`;
  }
  function panelRow(title, detail, actions = "") {
    return `<div class="panel-row"><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail || "")}</small></div><div class="panel-row-actions">${actions}</div></div>`;
  }

  function openAuth(mode = "login") {
    const isRegister = mode === "register";
    openModal(`<div class="modal-eyebrow">WELCOME TO SHARING LEFTOVERS</div><h2>${isRegister ? "เริ่มต้นแบ่งปันกัน" : "ยินดีต้อนรับกลับมา"}</h2><p class="modal-intro">พื้นที่เล็ก ๆ ที่ของทุกชิ้นได้พบเจ้าของคนใหม่</p>
      <div class="modal-tabs"><button type="button" data-auth-tab="login" class="${isRegister ? "" : "active"}">เข้าสู่ระบบ</button><button type="button" data-auth-tab="register" class="${isRegister ? "active" : ""}">สมัครสมาชิก</button></div>
      <form id="auth-form" data-mode="${isRegister ? "register" : "login"}">
      ${isRegister ? '<div class="form-field"><label for="auth-name">ชื่อที่ใช้แสดง</label><input id="auth-name" name="name" required autocomplete="name" placeholder="ชื่อของคุณ"></div>' : ""}
      <div class="form-field"><label for="auth-email">อีเมล</label><input id="auth-email" name="email" type="email" required autocomplete="email" placeholder="you@example.com"></div>
      <div class="form-field"><label for="auth-password">รหัสผ่าน</label><input id="auth-password" name="password" type="password" required minlength="8" autocomplete="${isRegister ? "new-password" : "current-password"}" placeholder="อย่างน้อย 8 ตัวอักษร"></div>
      ${isRegister ? '<div class="form-field"><label for="auth-phone">เบอร์โทร (ไม่บังคับ)</label><input id="auth-phone" name="phone" autocomplete="tel" placeholder="08x-xxx-xxxx"></div>' : ""}
      <div class="form-actions"><button class="button button-dark" type="submit">${isRegister ? "สมัครและเริ่มแบ่งปัน" : "เข้าสู่ระบบ"}</button></div></form>`);
    modalRoot.querySelectorAll("[data-auth-tab]").forEach((tab) => tab.addEventListener("click", () => openAuth(tab.dataset.authTab)));
    byId("auth-form").addEventListener("submit", submitAuth);
  }

  async function submitAuth(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const endpoint = form.dataset.mode === "register" ? "/auth/register" : "/auth/login";
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await api(endpoint, { method: "POST", body: JSON.stringify(data) });
      await refreshUser();
      closeModal();
      toast(form.dataset.mode === "register" ? "ยินดีต้อนรับสู่ชุมชน Sharing Leftovers" : "เข้าสู่ระบบเรียบร้อยแล้ว");
    } catch (error) { toast(error.message, "error"); }
    finally { button.disabled = false; }
  }

  async function refreshUser() {
    try {
      const result = await api("/auth/me");
      state.user = result.data?.user || result.user || null;
    } catch (error) {
      if (error.status === 401) state.user = null;
      else throw error;
    }
    updateAuthUi();
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      state.user = null;
      updateAuthUi();
      closePanel();
      toast("ออกจากระบบเรียบร้อยแล้ว");
    } catch (error) { toast(error.message, "error"); }
  }

  function listingForm(listing = null) {
    const editing = Boolean(listing);
    openModal(`<div class="modal-eyebrow">${editing ? "UPDATE YOUR SHARING" : "MAKE SOMEONE'S DAY"}</div><h2>${editing ? "แก้ไขประกาศ" : "แบ่งปันของชิ้นใหม่"}</h2><p class="modal-intro">เล่ารายละเอียดไว้ให้คนที่สนใจตัดสินใจได้ง่ายขึ้น</p>
      <form id="listing-form" data-id="${escapeHtml(listing?._id || "")}"><div class="form-grid">
      <div class="form-field full"><label>ชื่อของที่แบ่งปัน *</label><input name="title" required maxlength="120" value="${escapeHtml(listing?.title || "")}" placeholder="เช่น หนังสือเตรียมสอบ สภาพดี"></div>
      <div class="form-field"><label>หมวดหมู่ *</label><select name="category" required><option value="">เลือกหมวดหมู่</option>${state.categories.map((cat) => `<option value="${escapeHtml(cat.slug)}"${listing?.category?.slug === cat.slug ? " selected" : ""}>${escapeHtml(cat.name)}</option>`).join("")}</select></div>
      <div class="form-field"><label>สภาพ *</label><select name="condition" required>${Object.entries(conditionNames).map(([value, label]) => `<option value="${value}"${listing?.condition === value ? " selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="form-field"><label>จำนวนชิ้น</label><input name="quantity" type="number" min="1" value="${Number(listing?.quantity || 1)}"></div>
      <div class="form-field"><label>วันหมดอายุ</label><input name="expiresAt" type="date" value="${listing?.expiresAt ? new Date(listing.expiresAt).toISOString().slice(0, 10) : ""}"></div>
      <div class="form-field full"><label>รายละเอียด</label><textarea name="description" placeholder="บอกสภาพ วิธีรับ หรือรายละเอียดเพิ่มเติม">${escapeHtml(listing?.description || "")}</textarea></div>
      <div class="form-field full"><label>ลิงก์รูปภาพ (หนึ่งลิงก์ต่อบรรทัด)</label><textarea name="images" placeholder="https://example.com/photo.jpg หรือแชร์ลิงก์ Google Drive">${escapeHtml((listing?.images || []).join("\n"))}</textarea><small>ถ้าใช้ Google Drive ให้ตั้งสิทธิ์ไฟล์เป็น “ทุกคนที่มีลิงก์” และผู้ชม</small></div>
      <div class="form-field"><label>วิธีรับของ</label><select name="pickupMethod"><option value="pickup">นัดรับ</option><option value="delivery"${listing?.pickup?.method === "delivery" ? " selected" : ""}>จัดส่ง</option></select></div>
      <div class="form-field"><label>ที่อยู่ / จุดนัดรับ</label><input name="pickupAddress" value="${escapeHtml(listing?.pickup?.address || "")}" placeholder="เช่น หน้าหอพัก"></div>
      <div class="form-field"><label>ละติจูด (ถ้าต้องการให้ค้นหาใกล้เคียง)</label><input name="lat" type="number" step="any" value="${escapeHtml(listing?.pickup?.location?.coordinates?.[1] ?? "")}" placeholder="16.4322"></div>
      <div class="form-field"><label>ลองจิจูด</label><input name="lng" type="number" step="any" value="${escapeHtml(listing?.pickup?.location?.coordinates?.[0] ?? "")}" placeholder="102.8236"></div>
      </div><div class="form-actions"><button class="button button-outline" type="button" data-cancel>ยกเลิก</button><button class="button button-dark" type="submit">${editing ? "บันทึกการแก้ไข" : "ลงประกาศ"}</button></div></form>`);
    modalRoot.querySelector("[data-cancel]").addEventListener("click", closeModal);
    byId("listing-form").addEventListener("submit", submitListing);
  }

  async function submitListing(event) {
    event.preventDefault();
    if (!state.user) { closeModal(); openAuth(); return; }
    const form = event.currentTarget;
    const fields = new FormData(form);
    const coords = [fields.get("lng"), fields.get("lat")];
    const payload = {
      title: fields.get("title"), category: fields.get("category"), condition: fields.get("condition"),
      quantity: Number(fields.get("quantity") || 1), description: fields.get("description"),
      images: String(fields.get("images") || "").split(/\r?\n/).map((url) => url.trim()).filter(Boolean),
      pickup: { method: fields.get("pickupMethod"), address: fields.get("pickupAddress") || undefined }
    };
    if (coords.every((value) => value !== "")) payload.pickup.location = { type: "Point", coordinates: coords.map(Number) };
    if (fields.get("expiresAt")) payload.expiresAt = new Date(`${fields.get("expiresAt")}T23:59:59`).toISOString();
    const isEdit = Boolean(form.dataset.id);
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await api(`/listings${isEdit ? `/${encodeURIComponent(form.dataset.id)}` : ""}`, { method: isEdit ? "PATCH" : "POST", body: JSON.stringify(payload) });
      closeModal(); closePanel(); toast(isEdit ? "แก้ไขประกาศเรียบร้อยแล้ว" : "ลงประกาศแบ่งปันเรียบร้อยแล้ว"); await loadListings();
    } catch (error) { toast(error.message, "error"); }
    finally { button.disabled = false; }
  }

  async function openListing(id) {
    openModal('<div class="loading-state">กำลังเปิดรายละเอียดประกาศ...</div>', true);
    try {
      const result = await api(`/listings/${encodeURIComponent(id)}`);
      const listing = result.data?.listing || result.data;
      state.listingCache.set(listing._id, listing);
      const owner = listing.owner || {};
      const isOwner = state.user && (String(owner._id || owner) === String(state.user._id) || String(owner._id || owner) === String(state.user.id));
      const isAdmin = state.user?.role === "admin";
      let actions = "";
      if (isOwner || isAdmin) {
        actions = `<button class="button button-outline" data-listing-action="requests" data-id="${escapeHtml(listing._id)}">ดูคำขอ</button><button class="button button-outline" data-listing-action="edit" data-id="${escapeHtml(listing._id)}">แก้ไข</button><button class="button button-outline" data-listing-action="cancel-listing" data-id="${escapeHtml(listing._id)}">ยกเลิกประกาศ</button>`;
      } else if (listing.status === "available" && state.user) {
        actions = `<button class="button button-dark" data-listing-action="reserve" data-id="${escapeHtml(listing._id)}">ขอรับของ ↗</button><button class="button button-outline" data-listing-action="report" data-id="${escapeHtml(listing._id)}">แจ้งประกาศ</button>`;
      } else if (listing.status === "available") {
        actions = '<button class="button button-dark" data-listing-action="login">เข้าสู่ระบบเพื่อขอรับ</button>';
      }
      openModal(`<div class="detail-layout"><div class="detail-image">${imageMarkup(listing.images, listing.category?.slug)}</div><div class="detail-copy"><div class="modal-eyebrow">${escapeHtml(listing.category?.name || "ของแบ่งปัน")} · ${escapeHtml(conditionNames[listing.condition] || listing.condition)}</div><h2>${escapeHtml(listing.title)}</h2><p>${escapeHtml(listing.description || "เจ้าของยังไม่ได้เพิ่มรายละเอียด")}</p><div class="detail-facts"><span>สถานะ <strong>${escapeHtml(statusNames[listing.status] || listing.status)}</strong></span><span>จำนวนที่ยังรับได้ <strong>${Number(listing.availableQuantity ?? listing.quantity ?? 1)} ชิ้น</strong></span><span>แบ่งปันโดย <strong>${escapeHtml(owner.name || "สมาชิกชุมชน")}</strong></span><span>หมดเขต <strong>${formatDate(listing.expiresAt)}</strong></span><span>วิธีรับ <strong>${escapeHtml(listing.pickup?.method === "delivery" ? "จัดส่ง" : "นัดรับ")}</strong></span><span>สถานที่ <strong>${escapeHtml(listing.pickup?.address || "ติดต่อเจ้าของประกาศ")}</strong></span></div><div class="detail-actions">${actions}</div></div></div>`, true);
    } catch (error) { openModal(`<div class="empty-state"><strong>เปิดประกาศไม่สำเร็จ</strong><p>${escapeHtml(error.message)}</p></div>`); }
  }

  async function runListingAction(action, id) {
    const listing = state.listingCache.get(id);
    if (action === "login") { closeModal(); openAuth(); return; }
    if (action === "edit") { closeModal(); listingForm(listing); return; }
    if (action === "requests") { closeModal(); await openListingRequests(id); return; }
    if (action === "report") { reportForm(id); return; }
    if (action === "reserve") {
      reservationForm(id, listing);
      return;
    }
    if (action === "cancel-listing") {
      confirmListingCancellation(id, false);
    }
  }

  function reservationForm(listingId, listing) {
    const available = Math.max(1, Number(listing?.availableQuantity ?? listing?.quantity ?? 1));
    openModal(`<div class="confirm-mark" aria-hidden="true">♡</div><div class="modal-eyebrow">REQUEST TO RECEIVE</div><h2>ขอรับของชิ้นนี้</h2><p class="modal-intro">${escapeHtml(listing?.title || "แจ้งจำนวนที่ต้องการและฝากข้อความถึงผู้แบ่งปัน")}</p><form id="reservation-form" data-listing="${escapeHtml(listingId)}"><div class="form-field"><label for="reservation-quantity">ต้องการรับกี่ชิ้น</label><input id="reservation-quantity" name="quantity" type="number" min="1" max="${available}" value="1" required><small>มีของให้รับ ${available} ชิ้น</small></div><div class="form-field"><label for="reservation-message">ข้อความถึงผู้แบ่งปัน <span class="optional-label">(ไม่บังคับ)</span></label><textarea id="reservation-message" name="message" maxlength="1000" placeholder="แนะนำตัวหรือแจ้งวันที่สะดวกไปรับ"></textarea></div><div class="form-actions"><button class="button button-outline" type="button" data-reservation-cancel>กลับ</button><button class="button button-dark" type="submit">ส่งคำขอรับของ</button></div></form>`);
    modalRoot.querySelector("[data-reservation-cancel]").addEventListener("click", () => openListing(listingId));
    byId("reservation-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      data.quantity = Number(data.quantity);
      if (!Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > available) {
        toast(`ระบุจำนวนตั้งแต่ 1 ถึง ${available} ชิ้น`, "error");
        return;
      }
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await api(`/listings/${encodeURIComponent(listingId)}/reservations`, { method: "POST", body: JSON.stringify(data) });
        closeModal();
        toast("ส่งคำขอรับของแล้ว");
        await loadListings();
      } catch (error) {
        toast(error.message, "error");
        button.disabled = false;
      }
    });
  }

  function confirmListingCancellation(listingId, fromPanel) {
    confirmInPage({
      title: "ยกเลิกประกาศนี้?",
      message: "ประกาศจะไม่แสดงเป็นของที่พร้อมแบ่งปันอีกต่อไป คุณสามารถกลับไปตรวจสอบก่อนยืนยันได้",
      confirmLabel: "ยืนยันยกเลิกประกาศ",
      danger: true,
      onConfirm: async () => {
        await api(`/listings/${encodeURIComponent(listingId)}`, { method: "DELETE" });
        toast("ยกเลิกประกาศแล้ว");
        if (fromPanel) await openMySpace("listings");
        await loadListings();
      }
    });
  }

  function reportForm(listingId) {
    openModal(`<div class="modal-eyebrow">KEEP THIS COMMUNITY KIND</div><h2>แจ้งประกาศ</h2><p class="modal-intro">ช่วยให้ทีมดูแลชุมชนตรวจสอบได้ตรงจุด</p><form id="report-form" data-listing="${escapeHtml(listingId)}"><div class="form-field"><label>เหตุผล *</label><select name="reason" required><option value="">เลือกเหตุผล</option>${Object.entries(reasonNames).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></div><div class="form-field"><label>รายละเอียดเพิ่มเติม</label><textarea name="description" placeholder="อธิบายเพิ่มเติมเพื่อช่วยในการตรวจสอบ"></textarea></div><div class="form-actions"><button type="button" class="button button-outline" data-cancel>กลับ</button><button class="button button-dark" type="submit">ส่งรายงาน</button></div></form>`);
    modalRoot.querySelector("[data-cancel]").addEventListener("click", () => openListing(listingId));
    byId("report-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      try { await api(`/listings/${encodeURIComponent(listingId)}/reports`, { method: "POST", body: JSON.stringify(data) }); closeModal(); toast("ขอบคุณที่ช่วยดูแลชุมชน"); }
      catch (error) { toast(error.message, "error"); }
    });
  }

  async function openListingRequests(listingId) {
    openPanel("คำขอรับของ", "REQUESTS FOR YOUR LISTING");
    try {
      const result = await api(`/listings/${encodeURIComponent(listingId)}/reservations`);
      const reservations = result.data || [];
      panelContent(reservations.length ? `<div class="panel-card"><h3>ผู้ที่สนใจรับของ</h3>${reservations.map((item) => {
        let actions = "";
        if (item.status === "pending") actions = `${safeButton("reservation", item._id, "อนุมัติ")} ${safeButton("reject", item._id, "ปฏิเสธ", true)}`;
        if (item.status === "approved") actions = safeButton("complete", item._id, "ยืนยันส่งมอบ");
        return panelRow(item.requester?.name || "สมาชิก", `${item.quantity} ชิ้น · ${statusNames[item.status] || item.status}${item.message ? ` · ${item.message}` : ""}`, actions);
      }).join("")}</div>` : panelMessage("ยังไม่มีคำขอ", "เมื่อมีคนสนใจรับของ คำขอจะแสดงที่นี่"));
      panelRoot.dataset.listingId = listingId;
    } catch (error) { panelContent(panelMessage("โหลดคำขอไม่สำเร็จ", error.message)); }
  }

  async function openMySpace(tab = "profile") {
    if (!state.user) { openAuth(); return; }
    openPanel("พื้นที่ของฉัน", "YOUR SHARING SPACE");
    panelContent(`<div class="panel-tabs"><button class="panel-tab${tab === "profile" ? " active" : ""}" data-my-tab="profile">โปรไฟล์</button><button class="panel-tab${tab === "listings" ? " active" : ""}" data-my-tab="listings">ประกาศของฉัน</button><button class="panel-tab${tab === "requests" ? " active" : ""}" data-my-tab="requests">คำขอของฉัน</button><button class="panel-tab${tab === "password" ? " active" : ""}" data-my-tab="password">รหัสผ่าน</button></div><div id="my-panel-body"></div>`);
    panelRoot.querySelectorAll("[data-my-tab]").forEach((button) => button.addEventListener("click", () => openMySpace(button.dataset.myTab)));
    const body = byId("my-panel-body");
    if (tab === "profile") {
      try {
        const result = await api("/users/me");
        const user = result.data?.user || result.user || state.user;
        body.innerHTML = `<div class="panel-card"><h3>ข้อมูลสมาชิก</h3><form id="profile-form"><div class="form-field"><label>ชื่อ</label><input name="name" value="${escapeHtml(user.name || "")}" required></div><div class="form-field"><label>เบอร์โทร</label><input name="phone" value="${escapeHtml(user.phone || "")}"></div><div class="form-field"><label>รูปโปรไฟล์ (URL)</label><input name="avatarUrl" value="${escapeHtml(user.avatarUrl || "")}"></div><div class="form-field"><label>จังหวัด</label><input name="province" value="${escapeHtml(user.address?.province || "")}"></div><div class="form-field"><label>อำเภอ/เขต</label><input name="district" value="${escapeHtml(user.address?.district || "")}"></div><div class="form-field"><label>ตำบล/แขวง</label><input name="subdistrict" value="${escapeHtml(user.address?.subdistrict || "")}"></div><button class="button button-dark" type="submit">บันทึกโปรไฟล์</button></form></div><div class="panel-card danger-zone"><h3>ปิดการใช้งานบัญชี</h3><p>การปิดบัญชีจะทำให้ไม่สามารถเข้าสู่ระบบได้ บัญชีและข้อมูลจะถูกเก็บไว้</p><button class="button button-outline" id="deactivate-account">ปิดบัญชีของฉัน</button></div>`;
        byId("profile-form").addEventListener("submit", saveProfile);
        byId("deactivate-account").addEventListener("click", deactivateAccount);
      } catch (error) { body.innerHTML = panelMessage("โหลดโปรไฟล์ไม่สำเร็จ", error.message); }
    } else if (tab === "listings") {
      try {
        const result = await api("/users/me/listings");
        const rows = result.data || [];
        body.innerHTML = rows.length ? `<div class="panel-card"><h3>ประกาศของฉัน</h3>${rows.map((item) => panelRow(item.title, `${statusNames[item.status] || item.status} · เหลือ ${item.availableQuantity ?? item.quantity} ชิ้น · ${formatDate(item.createdAt)}`, `${safeButton("view-listing", item._id, "ดู")} ${safeButton("edit-listing", item._id, "แก้ไข")} ${item.status !== "cancelled" ? safeButton("delete-listing", item._id, "ยกเลิก", true) : ""}`)).join("")}</div>` : panelMessage("ยังไม่มีประกาศ", "เริ่มต้นแบ่งปันของชิ้นแรกของคุณได้เลย");
        rows.forEach((row) => state.listingCache.set(row._id, row));
      } catch (error) { body.innerHTML = panelMessage("โหลดประกาศไม่สำเร็จ", error.message); }
    } else if (tab === "requests") {
      try {
        const result = await api("/reservations/my");
        const rows = result.data || [];
        body.innerHTML = rows.length ? `<div class="panel-card"><h3>คำขอรับของของฉัน</h3>${rows.map((item) => {
          const listing = item.listing || {};
          const action = ["pending", "approved"].includes(item.status) ? safeButton("cancel-reservation", item._id, "ยกเลิกคำขอ", true) : "";
          return panelRow(listing.title || "ประกาศที่ไม่พร้อมใช้งาน", `${item.quantity} ชิ้น · ${statusNames[item.status] || item.status} · ${formatDate(item.createdAt)}`, action);
        }).join("")}</div>` : panelMessage("ยังไม่มีคำขอ", "เมื่อคุณขอรับของ คำขอจะปรากฏที่นี่");
      } catch (error) { body.innerHTML = panelMessage("โหลดคำขอไม่สำเร็จ", error.message); }
    } else if (tab === "password") {
      body.innerHTML = `<div class="panel-card"><h3>เปลี่ยนรหัสผ่าน</h3><form id="password-form"><div class="form-field"><label>รหัสผ่านปัจจุบัน</label><input name="currentPassword" type="password" required autocomplete="current-password"></div><div class="form-field"><label>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label><input name="newPassword" type="password" required minlength="8" autocomplete="new-password"></div><button class="button button-dark" type="submit">เปลี่ยนรหัสผ่าน</button></form></div>`;
      byId("password-form").addEventListener("submit", changePassword);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const payload = { name: values.name, phone: values.phone, avatarUrl: values.avatarUrl };
    if (values.province || values.district || values.subdistrict) payload.address = { province: values.province, district: values.district, subdistrict: values.subdistrict };
    try {
      const result = await api("/users/me", { method: "PATCH", body: JSON.stringify(payload) });
      state.user = result.data?.user || state.user; updateAuthUi(); toast("บันทึกโปรไฟล์เรียบร้อยแล้ว");
    } catch (error) { toast(error.message, "error"); }
  }

  async function changePassword(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { await api("/auth/password", { method: "PATCH", body: JSON.stringify(data) }); event.currentTarget.reset(); toast("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว"); }
    catch (error) { toast(error.message, "error"); }
  }

  async function deactivateAccount() {
    if (!window.confirm("แน่ใจหรือไม่ว่าต้องการปิดการใช้งานบัญชี?")) return;
    try {
      await api("/users/me", { method: "DELETE" });
      state.user = null; updateAuthUi(); closePanel(); toast("ปิดการใช้งานบัญชีแล้ว");
    } catch (error) { toast(error.message, "error"); }
  }

  async function openAdminSpace(tab = "users") {
    if (state.user?.role !== "admin") { toast("ส่วนนี้สำหรับผู้ดูแลระบบเท่านั้น", "error"); return; }
    openPanel("จัดการระบบ", "COMMUNITY ADMIN");
    panelContent(`<div class="panel-tabs"><button class="panel-tab${tab === "users" ? " active" : ""}" data-admin-tab="users">สมาชิก</button><button class="panel-tab${tab === "categories" ? " active" : ""}" data-admin-tab="categories">หมวดหมู่</button><button class="panel-tab${tab === "reports" ? " active" : ""}" data-admin-tab="reports">รายงาน</button></div><div id="admin-panel-body"><div class="loading-state">กำลังโหลด...</div></div>`);
    panelRoot.querySelectorAll("[data-admin-tab]").forEach((button) => button.addEventListener("click", () => openAdminSpace(button.dataset.adminTab)));
    const body = byId("admin-panel-body");
    try {
      if (tab === "users") {
        const result = await api("/users?limit=100");
        const users = result.data || [];
        body.innerHTML = `<div class="panel-card"><h3>สมาชิกในชุมชน</h3>${users.length ? users.map((user) => panelRow(user.name, `${user.email} · ${user.role} · ${user.isActive ? "ใช้งาน" : "ระงับ"}`, `<select class="mini-button" data-user-role="${escapeHtml(user._id)}"><option value="user"${user.role === "user" ? " selected" : ""}>สมาชิก</option><option value="admin"${user.role === "admin" ? " selected" : ""}>แอดมิน</option></select> ${safeButton("toggle-user", user._id, user.isActive ? "ระงับ" : "เปิดใช้งาน", !user.isActive)}`)).join("") : panelMessage("ยังไม่มีสมาชิก", "")}</div>`;
      } else if (tab === "categories") {
        const result = await api("/categories?isActive=false");
        const inactive = result.data || [];
        const all = await api("/categories?isActive=true");
        const categories = [...(all.data || []), ...inactive.filter((item) => !(all.data || []).some((active) => active._id === item._id))];
        body.innerHTML = `<div class="panel-card"><h3>เพิ่มหมวดหมู่</h3><form id="category-create-form" class="form-grid"><div class="form-field"><label>ชื่อ</label><input name="name" required></div><div class="form-field"><label>Slug ภาษาอังกฤษ</label><input name="slug" required pattern="[a-z0-9-]+"></div><div class="form-field"><label>คำอธิบาย</label><input name="description"></div><div class="form-field"><label>ไอคอน (emoji)</label><input name="icon"></div><button class="button button-dark" type="submit">เพิ่มหมวดหมู่</button></form></div><div class="panel-card"><h3>หมวดหมู่ทั้งหมด</h3>${categories.map((category) => panelRow(`${category.icon || "◇"} ${category.name}`, `${category.slug} · ${category.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}`, `${safeButton("edit-category", category._id, "แก้ไข")} ${safeButton("delete-category", category._id, category.isActive ? "ปิด/ลบ" : "ลบ", true)}`)).join("")}</div>`;
        categories.forEach((category) => state.categoryCache?.set(category._id, category));
        if (!state.categoryCache) state.categoryCache = new Map(categories.map((category) => [category._id, category]));
        byId("category-create-form").addEventListener("submit", createCategory);
      } else if (tab === "reports") {
        const result = await api("/reports?limit=100");
        const reports = result.data || [];
        body.innerHTML = reports.length ? `<div class="panel-card"><h3>รายงานจากสมาชิก</h3>${reports.map((report) => panelRow(report.listing?.title || "ประกาศ", `${reasonNames[report.reason] || report.reason} · ${statusNames[report.status] || report.status} · ${report.reporter?.name || ""}`, `${safeButton("view-report", report._id, "รายละเอียด")} ${safeButton("report-status", report._id, "กำลังตรวจสอบ")} ${safeButton("resolve-report", report._id, "ปิดรายงาน")}`)).join("")}</div>` : panelMessage("ยังไม่มีรายงาน", "รายงานจากสมาชิกจะแสดงที่นี่");
      }
    } catch (error) { body.innerHTML = panelMessage("โหลดข้อมูลไม่สำเร็จ", error.message); }
  }

  async function createCategory(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { await api("/categories", { method: "POST", body: JSON.stringify(data) }); toast("เพิ่มหมวดหมู่แล้ว"); await openAdminSpace("categories"); await loadCategories(); }
    catch (error) { toast(error.message, "error"); }
  }

  async function openCategoryEdit(id) {
    let category;
    try {
      const result = await api(`/categories/${encodeURIComponent(id)}`);
      category = result.data?.category || result.data;
    } catch (error) { toast(error.message, "error"); return; }
    if (!category) return;
    openModal(`<div class="modal-eyebrow">COMMUNITY CATEGORIES</div><h2>แก้ไขหมวดหมู่</h2><form id="category-edit-form" data-id="${escapeHtml(id)}"><div class="form-field"><label>ชื่อ</label><input name="name" value="${escapeHtml(category.name)}" required></div><div class="form-field"><label>Slug</label><input name="slug" value="${escapeHtml(category.slug)}" required></div><div class="form-field"><label>คำอธิบาย</label><input name="description" value="${escapeHtml(category.description || "")}"></div><div class="form-field"><label>ไอคอน</label><input name="icon" value="${escapeHtml(category.icon || "")}"></div><div class="form-field"><label>สถานะ</label><select name="isActive"><option value="true"${category.isActive ? " selected" : ""}>เปิดใช้งาน</option><option value="false"${!category.isActive ? " selected" : ""}>ปิดใช้งาน</option></select></div><div class="form-actions"><button class="button button-dark" type="submit">บันทึก</button></div></form>`);
    byId("category-edit-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget)); values.isActive = values.isActive === "true";
      try { await api(`/categories/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(values) }); closeModal(); toast("แก้ไขหมวดหมู่แล้ว"); await openAdminSpace("categories"); await loadCategories(); }
      catch (error) { toast(error.message, "error"); }
    });
  }

  async function handlePanelAction(action, id, element) {
    try {
      if (action === "reservation" || action === "reject" || action === "complete" || action === "cancel-reservation") {
        const suffix = { reservation: "approve", reject: "reject", complete: "complete", "cancel-reservation": "cancel" }[action];
        await api(`/reservations/${encodeURIComponent(id)}/${suffix}`, { method: "PATCH" });
        toast("อัปเดตคำขอเรียบร้อยแล้ว");
        if (panelRoot.dataset.listingId) await openListingRequests(panelRoot.dataset.listingId);
        else await openMySpace("requests");
      } else if (action === "edit-listing") { const listing = state.listingCache.get(id); if (listing) listingForm(listing); else await openListing(id); }
      else if (action === "view-listing") { closePanel(); await openListing(id); }
      else if (action === "delete-listing") {
        confirmListingCancellation(id, true);
      } else if (action === "toggle-user") {
        const user = (await api(`/users/${encodeURIComponent(id)}`)).data?.user;
        await api(`/users/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ isActive: !user.isActive }) });
        toast("อัปเดตสถานะสมาชิกแล้ว"); await openAdminSpace("users");
      } else if (action === "edit-category") await openCategoryEdit(id);
      else if (action === "delete-category") {
        if (!window.confirm("ต้องการปิดใช้งานหรือลบหมวดหมู่นี้หรือไม่")) return;
        await api(`/categories/${encodeURIComponent(id)}`, { method: "DELETE" }); toast("จัดการหมวดหมู่แล้ว"); await openAdminSpace("categories"); await loadCategories();
      } else if (action === "view-report") {
        const report = (await api(`/reports/${encodeURIComponent(id)}`)).data?.report;
        openModal(`<div class="modal-eyebrow">COMMUNITY REPORT</div><h2>${escapeHtml(report.listing?.title || "รายงานประกาศ")}</h2><p class="modal-intro">${escapeHtml(reasonNames[report.reason] || report.reason)} · ${escapeHtml(statusNames[report.status] || report.status)}</p><div class="panel-card"><p>${escapeHtml(report.description || "ไม่มีรายละเอียดเพิ่มเติม")}</p><small>ผู้รายงาน: ${escapeHtml(report.reporter?.name || "สมาชิก")} · ${formatDate(report.createdAt)}</small></div>`);
      } else if (action === "report-status" || action === "resolve-report") {
        await api(`/reports/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status: action === "report-status" ? "reviewing" : "resolved" }) });
        toast("อัปเดตสถานะรายงานแล้ว"); await openAdminSpace("reports");
      }
    } catch (error) { toast(error.message, "error"); }
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) { toast("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง", "error"); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      state.location = { lat: position.coords.latitude, lng: position.coords.longitude, radius: document.querySelector('select[name="radius"]').value };
      state.page = 1; toast("ค้นหาประกาศใกล้ตำแหน่งของคุณ"); loadListings();
    }, () => toast("ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาอนุญาตในเบราว์เซอร์", "error"), { enableHighAccuracy: false, timeout: 10000 });
  }

  document.addEventListener("click", async (event) => {
    const open = event.target.closest("[data-open-panel]");
    if (open) {
      const key = open.dataset.openPanel;
      if (key === "my-space") await openMySpace();
      else if (key === "admin-space") await openAdminSpace();
      else if (key === "create-listing") { if (!state.user) openAuth(); else listingForm(); }
      return;
    }
    const listingAction = event.target.closest("[data-listing-action]");
    if (listingAction) { await runListingAction(listingAction.dataset.listingAction, listingAction.dataset.id); return; }
    const panelAction = event.target.closest("[data-action]");
    if (panelAction) { await handlePanelAction(panelAction.dataset.action, panelAction.dataset.id, panelAction); return; }
    const card = event.target.closest("[data-listing-id]");
    if (card) { await openListing(card.dataset.listingId); return; }
    if (event.target.id === "retry-listings") await loadListings();
  });
  document.addEventListener("keydown", async (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".listing-card")) { event.preventDefault(); await openListing(event.target.dataset.listingId); }
    if (event.key === "Escape") { closeModal(); closePanel(); }
  });
  document.addEventListener("change", async (event) => {
    if (event.target.matches("[data-user-role]")) {
      try { await api(`/users/${encodeURIComponent(event.target.dataset.userRole)}/status`, { method: "PATCH", body: JSON.stringify({ role: event.target.value }) }); toast("เปลี่ยนสิทธิ์สมาชิกแล้ว"); }
      catch (error) { toast(error.message, "error"); await openAdminSpace("users"); }
    }
  });

  byId("login-open").addEventListener("click", () => openAuth("login"));
  byId("register-open").addEventListener("click", () => openAuth("register"));
  byId("logout-button").addEventListener("click", logout);
  byId("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.filters = Object.fromEntries([...form.entries()].filter(([key, value]) => value && key !== "radius"));
    if (state.location) state.location.radius = form.get("radius");
    state.page = 1; loadListings();
  });
  byId("prev-page").addEventListener("click", () => { if (state.page > 1) { state.page--; loadListings(); } });
  byId("next-page").addEventListener("click", () => { if (state.page < state.pages) { state.page++; loadListings(); } });
  byId("location-button").addEventListener("click", useCurrentLocation);
  byId("clear-location").addEventListener("click", () => { state.location = null; document.querySelector(".location-filter").open = false; loadListings(); toast("ล้างตัวกรองตำแหน่งแล้ว"); });
  byId("year").textContent = new Date().getFullYear();
  document.querySelector(".menu-toggle").addEventListener("click", (event) => {
    const nav = document.querySelector(".main-nav");
    nav.classList.toggle("open");
    event.currentTarget.setAttribute("aria-expanded", String(nav.classList.contains("open")));
  });
  document.querySelectorAll(".main-nav [data-open-panel]").forEach((link) => link.addEventListener("click", () => document.querySelector(".main-nav").classList.remove("open")));

  Promise.all([refreshUser(), loadCategories()]).then(loadListings).catch((error) => toast(error.message, "error"));
})();
