const router = require("express").Router();
const { optionalAuth, requireAdmin } = require("../middlewares/auth");
const { requireWebAuth } = require("../middlewares/webAuth");
const verifyCsrf = require("../middlewares/csrf");
const homeController = require("../controllers/web/home.controller");
const listingPageController = require("../controllers/web/listing-page.controller");
const authPageController = require("../controllers/web/auth-page.controller");
const dashboardController = require("../controllers/web/dashboard.controller");
const reservationPageController = require("../controllers/web/reservation-page.controller");
const listingFormController = require("../controllers/web/listing-form.controller");
const userListingsPageController = require("../controllers/web/user-listings-page.controller");
const listingReservationsPageController = require("../controllers/web/listing-reservations-page.controller");
const adminPageController = require("../controllers/web/admin-page.controller");
const profilePageController = require("../controllers/web/profile-page.controller");
const helpPageController = require("../controllers/web/help-page.controller");

// หน้าแรก (hero/search/chips/recent listings)
router.get("/", homeController.index);

// หน้ารวมประกาศ + ฟอร์มลงประกาศใหม่ (ต้องขึ้นก่อน /listings/:id เสมอ ไม่งั้น "new" จะถูกตีความเป็น :id)
router.get("/listings", optionalAuth, listingPageController.index);
router.get("/listings/new", requireWebAuth, listingFormController.newForm);

// หน้ารายละเอียดประกาศ, ฟอร์มแก้ไข, และหน้าจัดการคำขอของประกาศนั้น (ต้องอยู่หลัง /listings/new)
router.get("/listings/:id", optionalAuth, listingPageController.show);
router.get("/listings/:id/edit", requireWebAuth, listingFormController.editForm);
router.get("/listings/:id/reservations", requireWebAuth, listingReservationsPageController.index);

// ฟอร์มเข้าสู่ระบบ/สมัครสมาชิก (login/register ผ่าน ApiService ฝั่ง client) + logout (ฟอร์ม POST จริงเพื่อ redirect)
router.get("/auth", authPageController.form);
router.post("/auth/logout", verifyCsrf, authPageController.logout);

// หน้าสรุปภาพรวมของผู้ใช้ และหน้าคำขอรับของของฉัน
router.get("/dashboard", requireWebAuth, dashboardController.index);
router.get("/reservations/my", requireWebAuth, reservationPageController.myReservations);

// หน้ารวมประกาศของฉัน
router.get("/users/me/listings", requireWebAuth, userListingsPageController.index);

// หน้าหลังบ้านผู้ดูแลระบบ (เฉพาะ admin)
router.get("/admin", requireWebAuth, requireAdmin, adminPageController.index);
router.get("/admin/listings", requireWebAuth, requireAdmin, adminPageController.listings);
router.get("/admin/reports", requireWebAuth, requireAdmin, adminPageController.reports);
router.get("/admin/users", requireWebAuth, requireAdmin, adminPageController.users);
router.get("/admin/categories", requireWebAuth, requireAdmin, adminPageController.categories);

// หน้าโปรไฟล์ของฉัน และฟอร์มเปลี่ยนรหัสผ่าน
router.get("/users/me", requireWebAuth, profilePageController.me);
router.get("/auth/password", requireWebAuth, profilePageController.passwordForm);

// หน้าอธิบายวิธีใช้งานระบบ
router.get("/help/how-it-works", helpPageController.howItWorks);

module.exports = router;
