const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const readline = require('readline');

const prisma = new PrismaClient();

async function main() {
    console.log("--- Crear Usuario Administrador ---");

    // Check for command line arguments
    const args = process.argv.slice(2);
    let email = args[0];
    let password = args[1];

    if (email && password) {
        console.log(`Usando credenciales proporcionadas: ${email}`);
    } else {
        // Interactive mode fallback
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (query) => new Promise((resolve) => rl.question(query, resolve));

        email = await question("Email: ");
        password = await question("Password: ");
        rl.close();
    }

    if (!email || !password) {
        console.error("Email y Password son requeridos.");
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: 'Admin'
            }
        });
        console.log(`Usuario creado exitosamente: ${user.email}`);
    } catch (e) {
        if (e.code === 'P2002') {
            console.log("El usuario ya existe. Actualizando contraseña...");
            // Optional: update password if user exists
            await prisma.user.update({
                where: { email },
                data: { password: hashedPassword }
            });
            console.log("Contraseña actualizada correctamente.");
        } else {
            console.error("Error creando usuario:", e);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
