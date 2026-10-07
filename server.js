require("dotenv").config();

const app = require("./src/app");
const { connectDatabase } = require("./src/config/database");

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

start();
