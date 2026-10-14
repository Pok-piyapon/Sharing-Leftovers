const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");
const attachLocals = require("./middlewares/attachLocals");

const webRoutes = require("./routes/web.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const categoryRoutes = require("./routes/category.routes");
const listingRoutes = require("./routes/listing.routes");
const reservationRoutes = require("./routes/reservation.routes");
const reportRoutes = require("./routes/report.routes");
const adminRoutes = require("./routes/admin.routes");
const uploadRoutes = require("./routes/upload.routes");

// ไฟล์นี้ประกอบ (compose) Express app ทั้งหมด: ตั้งค่า view engine, middleware กลาง (CORS, session,
// static files, attachLocals), mount เอกสาร Swagger, mount route ทั้ง 8 กลุ่มของ REST API และ route
// หน้าเว็บ แล้วปิดท้ายด้วย error handler กลาง — ไม่มี business logic อยู่ในไฟล์นี้โดยตรง
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true // จำเป็นสำหรับส่ง session cookie ข้าม origin
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true })); // สำหรับฟอร์ม HTML ฝั่งเว็บที่ POST จริง (เช่น /auth/logout)
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/assets", express.static(path.join(__dirname, "../frontend/public")));

// Session-based authentication: เก็บ session ใน MongoDB (รอดจาก restart)
app.use(
  session({
    name: process.env.SESSION_NAME || "sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60, // 7 วัน
      stringify: false // เก็บ session เป็น document จริง เพื่อ query/ลบ session ของ user รายคนได้ตรงๆตอนแบน
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // production ต้องใช้ https
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

// เตรียม res.locals (currentUser, isAuthenticated, unreadCount, csrfToken, flash) ให้ทุก request
app.use(attachLocals);

// Swagger docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// หน้าที่: endpoint ตรวจสอบสถานะเซิร์ฟเวอร์ (health check) สำหรับ monitoring/uptime
app.get("/health", (req, res) => {
  res.json({ success: true, status: "ok", uptime: process.uptime() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/listings", listingRoutes);
app.use("/api/v1/reservations", reservationRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/uploads", uploadRoutes);

app.use("/", webRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
