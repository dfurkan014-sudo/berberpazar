// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const demoImages = [
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/kitten_fighting.jpg',
  'https://res.cloudinary.com/demo/image/upload/balloons.jpg',
];

async function main() {
  // Aynı hash'i create ve update için kullan
  const hash1 = await bcrypt.hash('123456', 10);
  const hash2 = await bcrypt.hash('123456', 10);

  // (İsteğe bağlı) passwordHash'i boş olan eski kayıtları düzelt
  await prisma.user.updateMany({
    where: { passwordHash: null },
    data: { passwordHash: hash1 },
  });

  // 1) Kullanıcıları oluştur / güncelle
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'furkan@example.com' },
      update: {
        name: 'Furkan',
        passwordHash: hash1, // ← var olan kullanıcıda da şifreyi set et
      },
      create: {
        email: 'furkan@example.com',
        name: 'Furkan',
        passwordHash: hash1,
      },
    }),
    prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {
        name: 'Demo Kullanıcı',
        passwordHash: hash2, // ← var olan kullanıcıda da şifreyi set et
      },
      create: {
        email: 'demo@example.com',
        name: 'Demo Kullanıcı',
        passwordHash: hash2,
      },
    }),
  ]);

  const sellerId = users[0].id;

  // (Opsiyonel) Aynı seller'ın eski ilanlarını temizlemek istersen:
  // await prisma.listing.deleteMany({ where: { sellerId } });

  // 2) İlanlar
  const listingsData = Array.from({ length: 15 }).map(() => {
    const priceNum = faker.number.float({ min: 150, max: 7500, fractionDigits: 2 });
    const price = priceNum.toFixed(2); // Prisma Decimal'e string vermek güvenli

    const count = faker.number.int({ min: 0, max: 3 });
    const images = faker.helpers.arrayElements(demoImages, count);

    return {
      title: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price,     // Decimal (string)
      images,    // Json (string[])
      sellerId,
    };
  });

  await prisma.listing.createMany({ data: listingsData });

  const total = await prisma.listing.count();
  console.log(`Seed tamamlandı. Toplam listing: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
