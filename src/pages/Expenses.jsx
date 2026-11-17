import { useState } from "react";
import { calculateBalance } from "../utils/calculateBalance";
import {
  collection,
  addDoc,
  serverTimestamp,
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


  return (
    <div className="expenses-page">
      <h2>Gastos</h2>

      <section className="expense-agreement">
  <h3>Acuerdo de distribución</h3>

  {acuerdoVigente ? (
    <p>Hay un acuerdo de porcentajes aprobado.</p>
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

    <button type="button" disabled>
      Guardar gasto (próximamente)
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