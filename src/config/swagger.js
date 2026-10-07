const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Sharing Leftovers API",
      version: "1.0.0",
      description: "API สำหรับแพลตฟอร์มแบ่งปันของเหลือใช้ (ใช้ session-based authentication ผ่าน cookie)"
    },

    servers: [
      {
        url: "http://localhost:3000/api/v1"
      }
    ],

    components: {
      securitySchemes: {
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "sid"
        }
      }
    }
  },

  apis: ["./src/routes/*.js", "./src/docs/*.yaml"]
};

module.exports = swaggerJsdoc(options);
