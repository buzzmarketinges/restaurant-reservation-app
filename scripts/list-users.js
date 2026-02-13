const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- Listado de Usuarios ---");
    const users = await prisma.user.findMany();

    if (users.length === 0) {
        console.log("No hay usuarios registrados.");
    } else {
        users.forEach(u => {
            console.log(`- ${u.name || 'Sin nombre'} (${u.email}) [ID: ${u.id}]`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
