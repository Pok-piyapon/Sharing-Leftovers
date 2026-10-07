const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const categoryRoutes = require("./routes/category.routes");
const listingRoutes = require("./routes/listing.routes");
const reservationRoutes = require("./routes/reservation.routes");
const reportRoutes = require("./routes/report.routes");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true // จำเป็นสำหรับส่ง session cookie ข้าม origin
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

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
      ttl: 7 * 24 * 60 * 60 // 7 วัน
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // production ต้องใช้ https
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

// Swagger docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (req, res) => {
  res.json({ success: true, status: "ok", uptime: process.uptime() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/listings", listingRoutes);
app.use("/api/v1/reservations", reservationRoutes);
app.use("/api/v1/reports", reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
