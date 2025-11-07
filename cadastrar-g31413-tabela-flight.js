/**
 * Cadastrar voo G31413 na tabela Flight (para aparecer no frontend /flights)
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== CADASTRANDO G31413 NA TABELA FLIGHT ===\n");

  // Verificar se já existe
  const existing = await prisma.flight.findUnique({
    where: { flightNumber: "G31413" }
  });

  if (existing) {
    console.log("⚠️  Voo já existe na tabela Flight!");
    console.log("ID:", existing.id);
    console.log("Voo:", existing.flightNumber);
    console.log("Rota:", existing.origin, "->", existing.destination);
    console.log("\n🔄 Atualizando dados...");

    const updated = await prisma.flight.update({
      where: { id: existing.id },
      data: {
        origin: "REC",
        destination: "CGH",
        departureTime: new Date("2025-11-07T10:55:00.000Z"),
        arrivalTime: new Date("2025-11-07T14:25:00.000Z"),
        airline: "GOL",
        aircraft: "Boeing 737",
        status: "ACTIVE",
        departureGate: "7",
        estimatedDepartureTime: new Date("2025-11-07T10:55:00.000Z"),
        estimatedArrivalTime: new Date("2025-11-07T14:25:00.000Z"),
        updatedAt: new Date()
      }
    });

    console.log("\n✅ VOO ATUALIZADO!");
    console.log("ID:", updated.id);
    console.log("Número:", updated.flightNumber);
    console.log("Rota:", updated.origin, "->", updated.destination);
    console.log("Status:", updated.status);
    console.log("\n🌐 Acesse: https://www.reservasegura.pro/flights");
    return;
  }

  // Criar novo voo
  const flight = await prisma.flight.create({
    data: {
      flightNumber: "G31413",
      origin: "REC",
      destination: "CGH",
      departureTime: new Date("2025-11-07T10:55:00.000Z"),
      arrivalTime: new Date("2025-11-07T14:25:00.000Z"),
      airline: "GOL",
      aircraft: "Boeing 737",
      availableSeats: 150,
      totalSeats: 186,
      basePrice: 450.00,
      status: "ACTIVE",

      // Dados em tempo real
      departureGate: "7",
      estimatedDepartureTime: new Date("2025-11-07T10:55:00.000Z"),
      estimatedArrivalTime: new Date("2025-11-07T14:25:00.000Z"),
      delayMinutes: 0
    }
  });

  console.log("\n✅ VOO CADASTRADO COM SUCESSO!");
  console.log("ID:", flight.id);
  console.log("Número:", flight.flightNumber);
  console.log("Companhia:", flight.airline);
  console.log("Rota:", flight.origin, "->", flight.destination);
  console.log("Partida:", flight.departureTime.toISOString());
  console.log("Chegada:", flight.arrivalTime.toISOString());
  console.log("Portão:", flight.departureGate);
  console.log("Status:", flight.status);
  console.log("Assentos disponíveis:", flight.availableSeats, "/", flight.totalSeats);
  console.log("\n🌐 Acesse: https://www.reservasegura.pro/flights");
  console.log("🔍 O voo G31413 agora deve aparecer na lista!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error("❌ Erro:", e);
    prisma.$disconnect();
    process.exit(1);
  });
