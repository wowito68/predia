const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.usuario.findMany({ select: { id_usuario: true, nombre: true, username: true } });
  console.log(users);
}
main().finally(() => prisma.$disconnect());
