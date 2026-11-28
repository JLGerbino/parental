import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { calculateBalance } from "../utils/calculateBalance";
import "./Movements.css";
import Swal from "sweetalert2";


function Movements({
  groupId,
  user,
  responsables,
  responsableVinculado,
  hijos,
  expenses,
  payments,
  acuerdoVigente,
  initialAction,
  onBack,
}) {
  // Formularios
  const [mostrarFormularioGasto, setMostrarFormularioGasto] = useState(false);
  const [mostrarFormularioPago, setMostrarFormularioPago] = useState(false);
  
  

  // Datos del gasto
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState("");
  const [tipoGasto, setTipoGasto] = useState("compartido");
  const [hijosSeleccionados, setHijosSeleccionados] = useState([]);
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);

  // Datos del pago
  const [importePago, setImportePago] = useState("");
  const [metodoPago, setMetodoPago] = useState("transfer");
  const [deudaSeleccionada, setDeudaSeleccionada] = useState(null);

  // Cálculos
  const resultado = calculateBalance(responsables, expenses, payments);

  const deudaPropia = resultado.deudas.find(
    (deuda) => deuda.fromResponsibleId === responsableVinculado?.id
  );

  useEffect(() => {
  if (initialAction === "expense") {
    setMostrarFormularioGasto(true);
    setMostrarFormularioPago(false);
  } else if (initialAction === "payment") {
    setMostrarFormularioPago(true);
    setMostrarFormularioGasto(false);
    setDeudaSeleccionada(deudaPropia || null);
  }
}, [initialAction]);


  const movimientosOrdenados = [
  ...expenses.map((gasto) => ({
    ...gasto,
    tipoMovimiento: "gasto",
    fechaOrden: gasto.createdAt?.toDate
      ? gasto.createdAt.toDate()
      : new Date(gasto.createdAt || 0),
  })),

  ...payments.map((pago) => ({
    ...pago,
    tipoMovimiento: "pago",
    fechaOrden: pago.createdAt?.toDate
      ? pago.createdAt.toDate()
      : new Date(pago.createdAt || 0),
  })),
].sort((a, b) => b.fechaOrden - a.fechaOrden);

  // const gastosOrdenados = [...expenses].sort((a, b) => {
  //   const fechaA = a.createdAt?.toDate
  //     ? a.createdAt.toDate()
  //     : new Date(a.createdAt || 0);

  //   const fechaB = b.createdAt?.toDate
  //     ? b.createdAt.toDate()
  //     : new Date(b.createdAt || 0);

  //   return fechaB - fechaA;
  // });

  // const pagosOrdenados = [...payments].sort((a, b) => {
  //   const fechaA = a.createdAt?.toDate
  //     ? a.createdAt.toDate()
  //     : new Date(a.createdAt || 0);

  //   const fechaB = b.createdAt?.toDate
  //     ? b.createdAt.toDate()
  //     : new Date(b.createdAt || 0);

  //   return fechaB - fechaA;
  // });



const guardarPago = async () => {
  const importeNumerico = Number(importePago);

  if (!deudaSeleccionada) {
    alert("No se encontró una deuda para registrar.");
    return;
  }

  if (!importeNumerico || importeNumerico <= 0) {
    alert("Ingresá un importe válido.");
    return;
  }

  if (importeNumerico > deudaSeleccionada.amount) {
    alert("El importe no puede superar la deuda pendiente.");
    return;
  }

  if (!user?.uid || !responsableVinculado?.id) {
    alert("No se pudo identificar al responsable.");
    return;
  }

  try {
    const pago = {
      fromResponsibleId: deudaSeleccionada.fromResponsibleId,
      fromName: deudaSeleccionada.from,
      toResponsibleId: deudaSeleccionada.toResponsibleId,
      toName: deudaSeleccionada.to,
      amount: importeNumerico,
      method: metodoPago,
      status: "pending",
      createdByUid: user.uid,
      createdAt: serverTimestamp(),
      confirmedByUid: null,
      confirmedAt: null,
      rejectedByUid: null,
      rejectedAt: null,
    };

    const pagoRef = await addDoc(
      collection(db, "groups", groupId, "payments"),
      pago
    );

    const responsableReceptor = responsables.find(
      (responsable) =>
        responsable.id === deudaSeleccionada.toResponsibleId
    );

    if (responsableReceptor?.linkedUid) {
      await addDoc(
        collection(db, "groups", groupId, "notifications"),
        {
          type: "payment_created",
          actorUid: user.uid,
          actorName: responsableVinculado.nombre,
          recipientUid: responsableReceptor.linkedUid,
          message: `registró un pago de $${importeNumerico.toLocaleString("es-AR")} que está pendiente de confirmación.`,
          paymentId: pagoRef.id,
          readBy: [],
          deletedBy: [],
          createdAt: serverTimestamp(),
        }
      );
    }

    alert("Pago registrado. Queda pendiente de confirmación.");

    setMostrarFormularioPago(false);
    setDeudaSeleccionada(null);
    setImportePago("");
    setMetodoPago("transfer");

  } catch (error) {
    console.error("Error al registrar el pago:", error);
    alert("No se pudo registrar el pago.");
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
    const gastoRef = await addDoc(
      collection(db, "groups", groupId, "expenses"),
      gasto
    );
    const otroResponsable = responsables.find(
      (responsable) => responsable.id !== responsableVinculado.id
    );
    if (otroResponsable?.linkedUid) {
      await addDoc(
        collection(db, "groups", groupId, "notifications"),
        {
          type: "expense_created",
          actorUid: user.uid,
          actorName: responsableVinculado.nombre,
          recipientUid: otroResponsable.linkedUid,
          message: `registró un nuevo gasto: ${descripcion.trim()}.`,
          expenseId: gastoRef.id,
          readBy: [],
          deletedBy: [],
          createdAt: serverTimestamp(),
        }
      );
    }
    setDescripcion("");
    setImporte("");
    setTipoGasto("compartido");
    setHijosSeleccionados([]);
    setTodosSeleccionados(false);
    setMostrarFormularioGasto(false);
    //alert("Gasto registrado correctamente.");
    return Swal.fire({
              icon: "warning",
              title: "se carga el gasto gil",
              background: "#dee0e0",
              color: "#283655",
              iconColor: "#269181",
              confirmButtonColor: "#35b67e",
              confirmButtonText: "cerrar"
            });
  } catch (error) {
    console.error("Error al guardar el gasto:", error);
    alert("No se pudo guardar el gasto.");
  }
};



const resolverPago = async (pago, decision) => {
  if (!user?.uid || !responsableVinculado?.id) {
    alert("No se pudo identificar al responsable.");
    return;
  }

  if (pago.toResponsibleId !== responsableVinculado.id) {
    alert("No tenés autorización para resolver este pago.");
    return;
  }

  if (pago.status !== "pending") {
    alert("Este pago ya fue resuelto.");
    return;
  }

  const confirmar = window.confirm(
    decision === "confirmed"
      ? "¿Confirmás que recibiste este pago?"
      : "¿Estás seguro de que querés rechazar este pago?"
  );

  if (!confirmar) return;

  try {
    const paymentRef = doc(
      db,
      "groups",
      groupId,
      "payments",
      pago.id
    );

    if (decision === "confirmed") {
      await updateDoc(paymentRef, {
        status: "confirmed",
        confirmedByUid: user.uid,
        confirmedAt: serverTimestamp(),
        rejectedByUid: null,
        rejectedAt: null,
      });
    } else {
      await updateDoc(paymentRef, {
        status: "rejected",
        rejectedByUid: user.uid,
        rejectedAt: serverTimestamp(),
        confirmedByUid: null,
        confirmedAt: null,
      });
    }

    if (pago.createdByUid) {
      await addDoc(
        collection(db, "groups", groupId, "notifications"),
        {
          type: "payment_resolved",
          actorUid: user.uid,
          actorName: responsableVinculado.nombre,
          recipientUid: pago.createdByUid,
          message:
            decision === "confirmed"
              ? "confirmó el pago que registraste."
              : "rechazó el pago que registraste.",
          paymentId: pago.id,
          readBy: [],
          deletedBy: [],
          createdAt: serverTimestamp(),
        }
      );
    }

    alert(
      decision === "confirmed"
        ? "Pago confirmado correctamente."
        : "Pago rechazado."
    );

  } catch (error) {
    console.error("Error al resolver el pago:", error);
    alert("No se pudo actualizar el pago.");
  }
};

  
return (
  <div className="movements-page">
    <button type="button" onClick={onBack}>
      ← Volver a Gastos
    </button>

    <h2>Movimientos</h2>

    <section className="movements-actions">
      <button
        type="button"
        onClick={() => setMostrarFormularioGasto(true)}
      >
        + Cargar gasto
      </button>

      <button
        type="button"
        disabled={!deudaPropia}
        onClick={() => {
          setDeudaSeleccionada(deudaPropia);
          setImportePago(String(deudaPropia.amount));
          setMetodoPago("transfer");
          setMostrarFormularioPago(true);
        }}
      >
        Registrar pago
      </button>
    </section>

    {mostrarFormularioGasto && (
      <div
        className="expense-modal-overlay"
        onClick={() => setMostrarFormularioGasto(false)}
      >
        <div
          className="expense-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="expense-modal-header">
            <h3>Nuevo gasto</h3>

            <button
              type="button"
              className="expense-modal-close"
              onClick={() => setMostrarFormularioGasto(false)}
            >
              ×
            </button>
          </div>

          <div className="expense-form">
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
              placeholder="Ingresá el importe"
            />

            <label>Tipo de gasto</label>
            <label className="expense-checkbox">
              <input
                type="checkbox"
                checked={tipoGasto === "exclusivo"}
                onChange={(e) =>
                  setTipoGasto(
                    e.target.checked ? "exclusivo" : "compartido"
                  )
                }
              />
              Gasto exclusivo (lo asume quien lo carga)
            </label>

            <p className="expense-children-title">Hijos relacionados</p>

            <label className="expense-checkbox">
              <input
                type="checkbox"
                checked={todosSeleccionados}
                onChange={(e) => {
                  const seleccionado = e.target.checked;
                  setTodosSeleccionados(seleccionado);

                  setHijosSeleccionados(
                    seleccionado ? hijos.map((hijo) => hijo.id) : []
                  );
                }}
              />
              Todos
            </label>

            {hijos.length === 0 ? (
              <p>No hay hijos registrados.</p>
            ) : (
              hijos.map((hijo) => (
                <label className="expense-checkbox" key={hijo.id}>
                  <input
                    type="checkbox"
                    checked={hijosSeleccionados.includes(hijo.id)}
                    onChange={(e) => {
                      const seleccionados = e.target.checked
                        ? [...hijosSeleccionados, hijo.id]
                        : hijosSeleccionados.filter(
                            (id) => id !== hijo.id
                          );

                      setHijosSeleccionados(seleccionados);
                      setTodosSeleccionados(
                        hijos.length > 0 &&
                        seleccionados.length === hijos.length
                      );
                    }}
                  />
                  {hijo.nombre}
                </label>
              ))
            )}

            <div className="expense-modal-actions">
              <button
                type="button"
                className="btn-cancel-expense"
                onClick={() => setMostrarFormularioGasto(false)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-save-expense"
                onClick={guardarGasto}
              >
                Guardar gasto
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {mostrarFormularioPago && deudaSeleccionada && (
      <section className="payment-form">
        <h3>Registrar pago</h3>

        <p>
          <strong>{deudaSeleccionada.from}</strong> paga a{" "}
          <strong>{deudaSeleccionada.to}</strong>
        </p>

        <label>Importe del pago</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={importePago}
          onChange={(e) => setImportePago(e.target.value)}
          placeholder="Ingresar importe"
        />

        <label>Medio de pago</label>
        <select
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value)}
        >
          <option value="transfer">Transferencia</option>
          <option value="cash">Efectivo</option>
        </select>

        <button type="button" onClick={guardarPago}>
          Guardar pago
        </button>

        <button
          type="button"
          onClick={() => {
            setMostrarFormularioPago(false);
            setDeudaSeleccionada(null);
            setImportePago("");
          }}
        >
          Cancelar
        </button>
      </section>
    )}

    <section className="movements-list">
  <h3>Historial de movimientos</h3>

  {movimientosOrdenados.length === 0 ? (
    <p>Todavía no hay movimientos registrados.</p>
  ) : (
    movimientosOrdenados.map((movimiento) => (
      <article
        className={
          movimiento.tipoMovimiento === "gasto"
            ? "expense-item"
            : "payment-item"
        }
        key={`${movimiento.tipoMovimiento}-${movimiento.id}`}
      >
        {movimiento.tipoMovimiento === "gasto" ? (
          <>
            <div>
              <strong>
                {movimiento.descripcion || "Gasto sin descripción"}
              </strong>

              <p>
                Pagado por: {movimiento.responsableNombre || "Responsable"}
              </p>

              <p>
                {movimiento.tipo === "exclusivo"
                  ? "Gasto exclusivo"
                  : "Gasto compartido"}
              </p>
            </div>

            <strong>
              ${(Number(movimiento.importe) || 0).toLocaleString("es-AR")}
            </strong>
          </>
        ) : (
          <>
            <div>
              <strong>
                {movimiento.fromName || "Responsable"} →{" "}
                {movimiento.toName || "Responsable"}
              </strong>

              <p>
                {movimiento.method === "transfer"
                  ? "Transferencia"
                  : "Efectivo"}
                {" · "}
                {movimiento.status === "confirmed"
                  ? "Confirmado"
                  : movimiento.status === "pending"
                    ? "Pendiente"
                    : movimiento.status === "rejected"
                      ? "Rechazado"
                      : "Sin estado"}
              </p>
            </div>

            <strong>
              ${(Number(movimiento.amount) || 0).toLocaleString("es-AR")}
            </strong>

            {movimiento.status === "pending" &&
              movimiento.toResponsibleId === responsableVinculado?.id && (
                <div className="payment-actions">
                  <button
                    type="button"
                    onClick={() => resolverPago(movimiento, "confirmed")}
                  >
                    Confirmar pago
                  </button>

                  <button
                    type="button"
                    onClick={() => resolverPago(movimiento, "rejected")}
                  >
                    Rechazar pago
                  </button>
                </div>
              )}
          </>
        )}

        <p className="movement-date">
          Cargado el:{" "}
          {movimiento.createdAt?.toDate
            ? movimiento.createdAt.toDate().toLocaleDateString("es-AR")
            : "Fecha pendiente"}
        </p>
      </article>
    ))
  )}
</section>   

  </div>
);

}

export default Movements;
