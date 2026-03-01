const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const currentEmail = 'info@restaurantloremar.com';
    const newEmail = 'LoremarRestaurante';
    const password = 'Loremar2026!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
        where: { email: currentEmail },
        data: {
            email: newEmail,
            password: hashedPassword
        },
    });

    console.log(`Password for user ${user.email} has been reset to: ${password}`);
}

main()
    .catch((e) => {
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
