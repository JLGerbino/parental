
// Calcula el balance compartido entre los responsables.
// No modifica los gastos ni los pagos originales.

export function calculateBalance(responsables, gastos, pagos = []) {
  const saldos = {};

  // Inicializar el saldo de cada responsable.
  responsables.forEach((responsable) => {
    saldos[responsable.id] = {
      responsableId: responsable.id,
      nombre: responsable.nombre,
      balance: 0,
    };
  });

  // Procesar gastos compartidos.
  gastos.forEach((gasto) => {
    if (gasto.tipo !== "compartido") return;

    const importe = Number(gasto.importe) || 0;
    const quienPago = gasto.responsableId;

    if (!saldos[quienPago]) return;

    // Quien cargó el gasto queda registrado como quien pagó.
    saldos[quienPago].balance += importe;

    // Distribuir la responsabilidad según los porcentajes
    // guardados en el propio gasto.
    const distribucion = gasto.distribucion;

if (distribucion) {
  [distribucion.responsibleA, distribucion.responsibleB]
    .filter(Boolean)
    .forEach((item) => {
      const id = item.id;
      const porcentaje = Number(item.percentage) || 0;

      if (!saldos[id]) return;

      const parte = importe * porcentaje / 100;
      saldos[id].balance -= parte;
    });
}    
  });

  // Aplicar solamente pagos confirmados.
  pagos.forEach((pago) => {
    if (pago.status !== "confirmed") return;

    const desde = pago.fromResponsibleId;
    const hacia = pago.toResponsibleId;
    const importe = Number(pago.amount) || 0;

    if (!saldos[desde] || !saldos[hacia]) return;

    saldos[desde].balance += importe;
    saldos[hacia].balance -= importe;
  });

  // Redondear los saldos a dos decimales.
  const balances = Object.values(saldos).map((item) => ({
    ...item,
    balance: Math.round((item.balance + Number.EPSILON) * 100) / 100,
  }));

  // Obtener la deuda neta entre los responsables.
  const deudores = balances
    .filter((item) => item.balance < -0.01)
    .map((item) => ({ ...item }));

  const acreedores = balances
    .filter((item) => item.balance > 0.01)
    .map((item) => ({ ...item }));

  const deudas = [];

  let i = 0;
  let j = 0;

  while (i < deudores.length && j < acreedores.length) {
    const importe = Math.min(
      Math.abs(deudores[i].balance),
      acreedores[j].balance
    );

    deudas.push({
      fromResponsibleId: deudores[i].responsableId,
      from: deudores[i].nombre,
      toResponsibleId: acreedores[j].responsableId,
      to: acreedores[j].nombre,
      amount: Math.round(importe * 100) / 100,
    });

    deudores[i].balance += importe;
    acreedores[j].balance -= importe;

    if (Math.abs(deudores[i].balance) < 0.01) i++;
    if (acreedores[j].balance < 0.01) j++;
  }

  const totalGastosCompartidos = gastos
    .filter((gasto) => gasto.tipo === "compartido")
    .reduce((total, gasto) => total + (Number(gasto.importe) || 0), 0);

  return {
    balances,
    deudas,
    totalGastosCompartidos,
  };
}


