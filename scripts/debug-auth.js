const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@restaurante.com';
    const password = 'password123';

    console.log(`Checking user: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error("User NOT FOUND in DB.");
        return;
    }

    console.log("User found.");
    console.log("Stored Hash:", user.password);

    const match = await bcrypt.compare(password, user.password);
    console.log("Password match result:", match);

    if (match) {
        console.log("Credentials are VALID in the script context.");
    } else {
        console.error("Credentials INVALID in the script context.");

        // Re-hashing to fix it
        console.log("Resetting password...");
        const newHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { email },
            data: { password: newHash }
        });
        console.log("Password reset complete. Try logging in again.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
