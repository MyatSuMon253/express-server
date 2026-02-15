import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.create({
    data: {
      name: "Boo",
      email: "boo@prisma.io",
      posts: {
        create: [
          {
            title: "Join the Prisma Discord",
            content: "https://pris.ly/discord",
            published: true,
          },
          {
            title: "Prisma on YouTube",
            content: "https://pris.ly/youtube",
          },
        ],
      },
    },
  });
}
