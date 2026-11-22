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

function Expenses({
  groupId,
  user,
  responsables,
  responsableVinculado,
  hijos,
  expenses,
  payments,
  acuerdoVigente,
  expenseAgreements,
}) {

  const [mostrarFormularioGasto, setMostrarFormularioGasto] = useState(false);
const [descripcion, setDescripcion] = useState("");
const [importe, setImporte] = useState("");
const [tipoGasto, setTipoGasto] = useState("compartido");
const [hijosSeleccionados, setHijosSeleccionados] = useState([]);
const [todosSeleccionados, setTodosSeleccionados] = useState(false);
const [porcentajePropio, setPorcentajePropio] = useState("50");
const [mostrarPropuesta, setMostrarPropuesta] = useState(false);


    const resultado = calculateBalance(
  responsables,
  expenses,
  payments
);

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

const gastosOrdenados = [...expenses].sort((a, b) => {
  const fechaA = a.createdAt?.toDate
    ? a.createdAt.toDate()
    : new Date(a.createdAt || 0);

  const fechaB = b.createdAt?.toDate
    ? b.createdAt.toDate()
    : new Date(b.createdAt || 0);

  return fechaB - fechaA;
});


const pagosOrdenados = [...payments].sort((a, b) => {
  const fechaA = a.createdAt?.toDate
    ? a.createdAt.toDate()
    : new Date(a.createdAt || 0);

  const fechaB = b.createdAt?.toDate
    ? b.createdAt.toDate()
    : new Date(b.createdAt || 0);

  return fechaB - fechaA;
});


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
    await addDoc(
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

    alert("Acuerdo de distribución aceptado correctamente.");
  } catch (error) {
    console.error("Error al aceptar el acuerdo:", error);
    alert("No se pudo aceptar el acuerdo.");
  }
};

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

    alert("Propuesta rechazada.");
  } catch (error) {
    console.error("Error al rechazar la propuesta:", error);
    alert("No se pudo rechazar la propuesta.");
  }
};

const guardarGasto = async () => {
  if (!descripcion.trim()) {
    alert("Ingresá una descripción para el gasto.");
    return;
  }

  const importeNumerico = Number(importe);

  if (!importe || !Number.isFinite(importeNumerico) || importeNumerico <= 0) {
    alert("Ingresá un importe válido.");
    return;
  }

  if (!responsableVinculado || !user) {
    alert("No se pudo identificar al responsable.");
    return;
  }

  if (tipoGasto === "compartido" && !acuerdoVigente) {
    alert("Primero deben tener un acuerdo de distribución aprobado.");
    return;
  }

  try {
    const gasto = {
      descripcion: descripcion.trim(),
      importe: importeNumerico,
      tipo: tipoGasto,
      responsableId: responsableVinculado.id,
      responsableNombre: responsableVinculado.nombre,
      creadoPorUid: user.uid,
      hijos: hijosSeleccionados,
      createdAt: serverTimestamp(),
    };

    if (tipoGasto === "compartido") {
      gasto.distribucion = {
        responsibleA: {
          id: acuerdoVigente.responsibleA.id,
          percentage: acuerdoVigente.responsibleA.percentage,
        },
        responsibleB: {
          id: acuerdoVigente.responsibleB.id,
          percentage: acuerdoVigente.responsibleB.percentage,
        },
      };
      gasto.acuerdoId = acuerdoVigente.id;
    }

    await addDoc(
      collection(db, "groups", groupId, "expenses"),
      gasto
    );

    setDescripcion("");
    setImporte("");
    setTipoGasto("compartido");
    setHijosSeleccionados([]);
    setTodosSeleccionados(false);
    setMostrarFormularioGasto(false);

    alert("Gasto registrado correctamente.");
  } catch (error) {
    console.error("Error al guardar el gasto:", error);
    alert("No se pudo guardar el gasto.");
  }
};

const responsableA = responsables.find(
  (r) => r.id === propuestaRecibida?.responsibleA.id
);

const responsableB = responsables.find(
  (r) => r.id === propuestaRecibida?.responsibleB.id
);

const responsableAcuerdoA = responsables.find(
  (r) => r.id === acuerdoVigente?.responsibleA.id
);

const responsableAcuerdoB = responsables.find(
  (r) => r.id === acuerdoVigente?.responsibleB.id
);


  return (
    <div className="expenses-page">
      <h2>Gastos</h2>

      <section className="expense-agreement">
  <h3>Acuerdo de distribución</h3>

  {propuestaRecibida && (
  <div className="agreement-pending">
    <h4>Tenés una propuesta pendiente</h4>

    <p>
      El otro responsable propone esta distribución:
    </p>

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

    <p>
      Revisá los porcentajes antes de aceptar.
    </p>

    <button
  type="button"
  onClick={aceptarPropuesta}
>
  Aceptar propuesta
</button>

<button
  type="button"
  onClick={rechazarPropuesta}
>
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
    <h4>Acuerdo de distribución aprobado</h4>

    <p>
      {responsableAcuerdoA?.nombre || "Responsable A"}:{" "}
      <strong>{acuerdoVigente.responsibleA.percentage}%</strong>
    </p>

    <p>
      {responsableAcuerdoB?.nombre || "Responsable B"}:{" "}
      <strong>{acuerdoVigente.responsibleB.percentage}%</strong>
    </p>
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
      Porcentaje del otro responsable: <strong>{porcentajeOtro}%</strong>
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
  <h3>Resumen</h3>

  <p>
    Total de gastos compartidos:{" "}
    <strong>
      ${resultado.totalGastosCompartidos.toLocaleString("es-AR")}
    </strong>
  </p>

  <h4>Saldo acumulado</h4>

  {resultado.deudas.length === 0 ? (
    <p>Están al día. No hay deudas pendientes.</p>
  ) : (
    resultado.deudas.map((deuda, index) => (
      <p key={index}>
        <strong>{deuda.from}</strong> debe{" "}
        <strong>
          ${deuda.amount.toLocaleString("es-AR")}
        </strong>{" "}
        a <strong>{deuda.to}</strong>
      </p>
    ))
  )}
</section>
      

      <section className="expenses-actions">
        {mostrarFormularioGasto && (
  <section className="expense-form">
    <h3>Nuevo gasto</h3>

    <label>Descripción</label>
    <input
      type="text"
      value={descripcion}
      onChange={(e) => setDescripcion(e.target.value)}
      placeholder="Ej. Cuota escolar"
    />

    <label>Importe</label>
    <input
      type="number"
      min="0"
      step="0.01"
      value={importe}
      onChange={(e) => setImporte(e.target.value)}
      placeholder="Ingrese el importe"
    />

    <label>Tipo de gasto</label>
    <label>
      <input
        type="checkbox"
        checked={tipoGasto === "exclusivo"}
        onChange={(e) =>
          setTipoGasto(e.target.checked ? "exclusivo" : "compartido")
        }
      />
      Gasto exclusivo (lo asume quien lo carga)
    </label>

    <p>Hijos relacionados</p>

<label>
  <input
    type="checkbox"
    checked={todosSeleccionados}
    onChange={(e) => {
      const seleccionado = e.target.checked;
      setTodosSeleccionados(seleccionado);

      if (seleccionado) {
        setHijosSeleccionados(hijos.map((hijo) => hijo.id));
      } else {
        setHijosSeleccionados([]);
      }
    }}
  />
  Todos
</label>

    {hijos.length === 0 ? (
      <p>No hay hijos registrados.</p>
    ) : (
      hijos.map((hijo) => (
        <label key={hijo.id}>
          <input
            type="checkbox"
            checked={hijosSeleccionados.includes(hijo.id)}
            onChange={(e) => {
  const seleccionados = e.target.checked
    ? [...hijosSeleccionados, hijo.id]
    : hijosSeleccionados.filter((id) => id !== hijo.id);

  setHijosSeleccionados(seleccionados);

  setTodosSeleccionados(
    hijos.length > 0 && seleccionados.length === hijos.length
  );
}}
          />
          {hijo.nombre}
        </label>
      ))
    )}

    <button
  type="button"
  onClick={guardarGasto}
>
  Guardar gasto
</button>
  </section>
)}
        <button
  type="button"
  onClick={() => setMostrarFormularioGasto(!mostrarFormularioGasto)}
>
  {mostrarFormularioGasto ? "Cancelar" : "Cargar gasto"}
</button>

        <button type="button">
          Registrar pago
        </button>
      </section>

     

<section className="expenses-list">
  <h3>Movimientos</h3>

  {gastosOrdenados.length === 0 ? (
    <p>Todavía no hay gastos registrados.</p>
  ) : (
    gastosOrdenados.map((gasto) => (
      <article className="expense-item" key={gasto.id}>
        <div>
  <strong>{gasto.descripcion || "Gasto sin descripción"}</strong>

  <p>
    Pagado por: {gasto.responsableNombre || "Responsable"}
  </p>

  <p>
    {gasto.tipo === "exclusivo" ? "Exclusivo" : "Compartido"}
  </p>
</div>

        <strong>
          ${(Number(gasto.importe) || 0).toLocaleString("es-AR")}
        </strong>
      </article>
    ))
  )}

  <h4>Pagos</h4>

{pagosOrdenados.length === 0 ? (
  <p>Todavía no hay pagos registrados.</p>
) : (
  pagosOrdenados.map((pago) => (
    <article className="payment-item" key={pago.id}>
      <div>
        <strong>
          {pago.fromName || "Responsable"} → {pago.toName || "Responsable"}
        </strong>

        <p>
          {pago.method === "transfer" ? "Transferencia" : "Efectivo"}
          {" · "}
          {pago.status === "confirmed"
            ? "Confirmado"
            : pago.status === "pending"
              ? "Pendiente"
              : pago.status === "rejected"
                ? "Rechazado"
                : "Sin estado"}
        </p>
      </div>

      <strong>
        ${(Number(pago.amount) || 0).toLocaleString("es-AR")}
      </strong>
    </article>
  ))
)}
</section>

    </div>
  );
}

export default Expenses;