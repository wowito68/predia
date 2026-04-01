const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const citas = await prisma.consultaMedica.findMany({
    where: { proxima_cita: { not: null } },
    select: { id_consulta: true, proxima_cita: true, motivo_consulta: true },
    orderBy: { flex_id: 'desc' }, // Wait, id_consulta desc
    take: 5
  });
  console.log(citas);
}
main().catch(console.error).finally(() => prisma.$disconnect());
