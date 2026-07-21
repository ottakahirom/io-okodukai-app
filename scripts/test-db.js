const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const env = fs.readFileSync(".env", "utf8");
const match = env.match(/DATABASE_URL="([^"]+)"/);
if (!match) {
  console.error("no DATABASE_URL");
  process.exit(1);
}
process.env.DATABASE_URL = match[1];
console.log("host", match[1].split("@")[1].split("/")[0]);

const prisma = new PrismaClient();
prisma
  .$connect()
  .then(() => prisma.$queryRaw`SELECT 1 as ok`)
  .then((r) => {
    console.log("connected", r);
    return prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("error", e.message);
    try {
      await prisma.$disconnect();
    } catch (_) {}
    process.exit(1);
  });
