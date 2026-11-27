
import { useState } from "react";
import { calculateBalance } from "../utils/calculateBalance";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import "./Expenses.css";

function Expenses({
  groupId,
  user,
  responsables,
  responsableVinculado,
  expenses,
  payments,
  acuerdoVigente,
  expenseAgreements,
  onOpenMovements,
}) {
  const [porcentajePropio, setPorcentajePropio] = useState("50");
  const [mostrarPropuesta, setMostrarPropuesta] = useState(false);

  const resultado = calculateBalance(responsables, expenses, payments);

  const porcentajeOtro = 100 - Number(porcentajePropio);

  const porcentajeValido =
    porcentajePropio !== "" &&
    Number.isFinite(Number(porcentajePropio)) &&
    Number(porcentajePropio) >= 0 &&
    Number(porcentajePropio) <= 100;

  const otroResponsable = responsables.find(
    (r) => r.id !== responsableVinculado?.id
  );

  const propuestaPendiente = expenseAgreements.find(
    (acuerdo) => acuerdo.status === "pending"
  );

  const propuestaRecibida =
    propuestaPendiente &&
    propuestaPendiente.proposedByUid !== user?.uid
      ? propuestaPendiente
      : null;

  const propuestaPropia =
    propuestaPendiente &&
    propuestaPendiente.proposedByUid === user?.uid;

  const responsableA = responsables.find(
    (r) => r.id === propuestaRecibida?.responsibleA.id
  );

  const responsableB = responsables.find(
    (r) => r.id === propuestaRecibida?.responsibleB.id
  );

  const enviarPropuesta = async () => {
    if (!porcentajeValido) return;

    if (!responsableVinculado || !otroResponsable) {
      alert("No se encontraron los dos responsables.");
      return;
    }

    if (propuestaPendiente) {
      alert("Ya existe una propuesta pendiente de aceptación.");
      return;
    }

    try {
      const agreementRef = await addDoc(
  collection(db, "groups", groupId, "expenseAgreements"),
  {
    responsibleA: {
      id: responsableVinculado.id,
      percentage: Number(porcentajePropio),
    },
    responsibleB: {
      id: otroResponsable.id,
      percentage: porcentajeOtro,
    },
    proposedByUid: user.uid,
    proposedAt: serverTimestamp(),
    acceptedByUid: null,
    acceptedAt: null,
    status: "pending",
    effectiveFrom: null,
  }
);

if (otroResponsable.linkedUid) {
  await addDoc(
    collection(db, "groups", groupId, "notifications"),
    {
      type: "expense_agreement_proposed",
      actorUid: user.uid,
      actorName: responsableVinculado.nombre,
      recipientUid: otroResponsable.linkedUid,
      message: "propuso un nuevo acuerdo de distribución de gastos.",
      agreementId: agreementRef.id,
      readBy: [],
      deletedBy: [],
      createdAt: serverTimestamp(),
    }
  );
}
      setMostrarPropuesta(false);
      alert("Propuesta enviada correctamente.");
    } catch (error) {
      console.error("Error al enviar la propuesta:", error);
      alert("No se pudo enviar la propuesta.");
    }
  };

  const aceptarPropuesta = async () => {
  if (!propuestaRecibida) return;

  try {
    const agreementRef = doc(
      db,
      "groups",
      groupId,
      "expenseAgreements",
      propuestaRecibida.id
    );

    await updateDoc(agreementRef, {
      status: "approved",
      acceptedByUid: user.uid,
      acceptedAt: serverTimestamp(),
      effectiveFrom: serverTimestamp(),
    });

    if (propuestaRecibida.proposedByUid) {
      await addDoc(
        collection(db, "groups", groupId, "notifications"),
        {
          type: "expense_agreement_accepted",
          actorUid: user.uid,
          actorName: responsableVinculado.nombre,
          recipientUid: propuestaRecibida.proposedByUid,
          message: "aceptó tu propuesta de distribución de gastos.",
          agreementId: propuestaRecibida.id,
          readBy: [],
          deletedBy: [],
          createdAt: serverTimestamp(),
        }
      );
    }

    alert("Acuerdo de distribución aceptado correctamente.");
  } catch (error) {
    console.error("Error al aceptar el acuerdo:", error);
    alert("No se pudo aceptar el acuerdo.");
  }
};

  // const aceptarPropuesta = async () => {
  //   if (!propuestaRecibida) return;

  //   try {
  //     const agreementRef = doc(
  //       db,
  //       "groups",
  //       groupId,
  //       "expenseAgreements",
  //       propuestaRecibida.id
  //     );

  //     await updateDoc(agreementRef, {
  //       status: "approved",
  //       acceptedByUid: user.uid,
  //       acceptedAt: serverTimestamp(),
  //       effectiveFrom: serverTimestamp(),
  //     });

  //     alert("Acuerdo de distribución aceptado correctamente.");
  //   } catch (error) {
  //     console.error("Error al aceptar el acuerdo:", error);
  //     alert("No se pudo aceptar el acuerdo.");
  //   }
  // };

  const rechazarPropuesta = async () => {
  if (!propuestaRecibida) return;

  const confirmar = window.confirm(
    "¿Estás seguro de que querés rechazar esta propuesta?"
  );

  if (!confirmar) return;

  try {
    const agreementRef = doc(
      db,
      "groups",
      groupId,
      "expenseAgreements",
      propuestaRecibida.id
    );

    await updateDoc(agreementRef, {
      status: "rejected",
      rejectedByUid: user.uid,
      rejectedAt: serverTimestamp(),
    });

    if (propuestaRecibida.proposedByUid) {
      await addDoc(
        collection(db, "groups", groupId, "notifications"),
        {
          type: "expense_agreement_rejected",
          actorUid: user.uid,
          actorName: responsableVinculado.nombre,
          recipientUid: propuestaRecibida.proposedByUid,
          message: "rechazó tu propuesta de distribución de gastos.",
          agreementId: propuestaRecibida.id,
          readBy: [],
          deletedBy: [],
          createdAt: serverTimestamp(),
        }
      );
    }

    alert("Propuesta rechazada.");
  } catch (error) {
    console.error("Error al rechazar la propuesta:", error);
    alert("No se pudo rechazar la propuesta.");
  }
};

  // const rechazarPropuesta = async () => {
  //   if (!propuestaRecibida) return;

  //   const confirmar = window.confirm(
  //     "¿Estás seguro de que querés rechazar esta propuesta?"
  //   );

  //   if (!confirmar) return;

  //   try {
  //     const agreementRef = doc(
  //       db,
  //       "groups",
  //       groupId,
  //       "expenseAgreements",
  //       propuestaRecibida.id
  //     );

  //     await updateDoc(agreementRef, {
  //       status: "rejected",
  //       rejectedByUid: user.uid,
  //       rejectedAt: serverTimestamp(),
  //     });

  //     alert("Propuesta rechazada.");
  //   } catch (error) {
  //     console.error("Error al rechazar la propuesta:", error);
  //     alert("No se pudo rechazar la propuesta.");
  //   }
  // };

  const porcentajeResponsable = (responsableId) => {
    if (!acuerdoVigente) return null;

    if (acuerdoVigente.responsibleA.id === responsableId) {
      return acuerdoVigente.responsibleA.percentage;
    }

    if (acuerdoVigente.responsibleB.id === responsableId) {
      return acuerdoVigente.responsibleB.percentage;
    }

    return null;
  };

  return (
    <div className="expenses-page">
      <h2>Gastos</h2>

      <section className="expenses-responsables">
        <h3>Distribución de gastos</h3>

        <div className="expenses-responsables-grid">
          {responsables.map((responsable) => (
            <article className="expenses-responsable-card" key={responsable.id}>
              <h4>{responsable.nombre}</h4>

              <strong>
                {porcentajeResponsable(responsable.id) !== null
                  ? `${porcentajeResponsable(responsable.id)}%`
                  : "Por definir"}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <section className="expense-agreement">
        <h3>Acuerdo de distribución</h3>

        {propuestaRecibida && (
          <div className="agreement-pending">
            <h4>Tenés una propuesta pendiente</h4>

            <p>
              {responsableA?.nombre || "Responsable A"}:{" "}
              <strong>
                {propuestaRecibida.responsibleA.percentage}%
              </strong>
            </p>

            <p>
              {responsableB?.nombre || "Responsable B"}:{" "}
              <strong>
                {propuestaRecibida.responsibleB.percentage}%
              </strong>
            </p>

            <p>Revisá los porcentajes antes de aceptar.</p>

            <button type="button" onClick={aceptarPropuesta}>
              Aceptar propuesta
            </button>

            <button type="button" onClick={rechazarPropuesta}>
              Rechazar propuesta
            </button>
          </div>
        )}

        {propuestaPropia && (
          <p>
            Tu propuesta está pendiente de aceptación por el otro responsable.
          </p>
        )}

        {acuerdoVigente ? (
          <div className="agreement-approved">
            <h4>Acuerdo aprobado</h4>
            <p>Los porcentajes de distribución están vigentes.</p>
          </div>
        ) : (
          <p>
            Todavía no hay un acuerdo aprobado. Para cargar gastos compartidos,
            primero deberán acordar cómo distribuirlos.
          </p>
        )}

        <button
          type="button"
          onClick={() => setMostrarPropuesta(!mostrarPropuesta)}
        >
          {mostrarPropuesta ? "Cancelar" : "Proponer porcentajes"}
        </button>

        {mostrarPropuesta && (
          <div className="agreement-form">
            <label>Porcentaje que proponés asumir</label>

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={porcentajePropio}
              onChange={(e) => setPorcentajePropio(e.target.value)}
            />

            <p>
              Tu porcentaje: <strong>{porcentajePropio}%</strong>
            </p>

            <p>
              Porcentaje del otro responsable:{" "}
              <strong>{porcentajeOtro}%</strong>
            </p>

            <button
              type="button"
              disabled={!porcentajeValido || !!propuestaPendiente}
              onClick={enviarPropuesta}
            >
              Enviar propuesta
            </button>
          </div>
        )}
      </section>

      <section className="expenses-summary">
        <h3>Saldo acumulado</h3>

        <p>
          Total de gastos compartidos:{" "}
          <strong>
            ${resultado.totalGastosCompartidos.toLocaleString("es-AR")}
          </strong>
        </p>

        {resultado.deudas.length === 0 ? (
          <p>Están al día. No hay deudas pendientes.</p>
        ) : (
          resultado.deudas.map((deuda, index) => (
            <article className="expense-debt-card" key={index}>
              <strong>{deuda.from}</strong>
              <span>debe</span>
              <strong>
                ${deuda.amount.toLocaleString("es-AR")}
              </strong>
              <span>a</span>
              <strong>{deuda.to}</strong>
            </article>
          ))
        )}
      </section>

      <section className="expenses-actions">
  <button
    type="button"
    onClick={() => onOpenMovements("expense")}
  >
    + Cargar gasto
  </button>

  <button
    type="button"
    onClick={() => onOpenMovements("payment")}
  >
    Registrar pago
  </button>

  <button
    type="button"
    onClick={() => onOpenMovements()}
  >
    Ver movimientos
  </button>
</section>
    </div>
  );
}

export default Expenses;

