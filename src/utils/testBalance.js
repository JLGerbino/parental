
import { calculateBalance } from "./calculateBalance.js";

const responsables = [
  { id: "A", nombre: "Responsable A" },
  { id: "B", nombre: "Responsable B" },
];

const gastos = [
  {
    importe: 100000,
    tipo: "compartido",
    responsableId: "A",
    porcentajes: [
      { responsableId: "A", porcentaje: 70 },
      { responsableId: "B", porcentaje: 30 },
    ],
  },
  {
    importe: 50000,
    tipo: "compartido",
    responsableId: "B",
    porcentajes: [
      { responsableId: "A", porcentaje: 70 },
      { responsableId: "B", porcentaje: 30 },
    ],
  },
  {
    importe: 20000,
    tipo: "exclusivo",
    responsableId: "A",
  },
];

const pagos = [
  {
    fromResponsibleId: "A",
    toResponsibleId: "B",
    amount: 3000,
    status: "rejected",
  },
];

const resultado = calculateBalance(
  responsables,
  gastos,
  pagos
);

console.log("Resultado del balance:", resultado);
