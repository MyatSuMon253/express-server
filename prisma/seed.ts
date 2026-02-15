import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import * as bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import { create } from "node:domain";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

export function createRandomUser() {
  return {
    phone: faker.phone.number({ style: "international" }),
    password: "",
    randToken: faker.internet.jwt(),
  };
}

export const userData = faker.helpers.multiple(createRandomUser, { count: 10 });

async function main() {
  console.log("start seeding...");

  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash("123456", salt);

  for (const u of userData) {
    u.password = password;
    await prisma.user.create({
      data: u,
    });
  }

  console.log("seeding finished");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
