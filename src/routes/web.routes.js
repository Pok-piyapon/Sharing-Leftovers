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

// Phase 4: หน้าแรก (hero/search/chips/recent listings)
router.get("/", homeController.index);

// Phase 1: /listings (ต้องขึ้นก่อน /listings/:id เสมอ ไม่งั้น "new" จะถูกตีความเป็น :id)
router.get("/listings", optionalAuth, listingPageController.index);
router.get("/listings/new", requireWebAuth, listingFormController.newForm);

// Phase 2: /listings/:id (ต้องอยู่หลัง /listings/new)
router.get("/listings/:id", optionalAuth, listingPageController.show);
router.get("/listings/:id/edit", requireWebAuth, listingFormController.editForm);
router.get("/listings/:id/reservations", requireWebAuth, listingReservationsPageController.index);

// Phase 3: /auth (login/register ผ่าน ApiService ฝั่ง client) + logout (ฟอร์ม POST จริงเพื่อ redirect)
router.get("/auth", authPageController.form);
router.post("/auth/logout", verifyCsrf, authPageController.logout);

// Phase 5: /dashboard, /reservations/my
router.get("/dashboard", requireWebAuth, dashboardController.index);
router.get("/reservations/my", requireWebAuth, reservationPageController.myReservations);

// Phase 6: /users/me/listings
router.get("/users/me/listings", requireWebAuth, userListingsPageController.index);

// Phase 8-9: /admin/*
router.get("/admin", requireWebAuth, requireAdmin, adminPageController.index);
router.get("/admin/listings", requireWebAuth, requireAdmin, adminPageController.listings);
router.get("/admin/reports", requireWebAuth, requireAdmin, adminPageController.reports);
router.get("/admin/users", requireWebAuth, requireAdmin, adminPageController.users);
router.get("/admin/categories", requireWebAuth, requireAdmin, adminPageController.categories);

// Phase 7: /users/me, /auth/password
router.get("/users/me", requireWebAuth, profilePageController.me);
router.get("/auth/password", requireWebAuth, profilePageController.passwordForm);

// Phase 10: /help/how-it-works
router.get("/help/how-it-works", helpPageController.howItWorks);

module.exports = router;
