import { useState } from "react";
import Swal from "sweetalert2";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
export default function AddExpense({
  group,
  people,
  expenses,
  addExpenseToDB,
  deleteExpenseFromDB,
  deleteAllExpenses,
  canEdit,

}) {
  const [payer, setPayer] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("all");
  const [participants, setParticipants] = useState([]);
  const { t } = useTranslation();
  
function Test() {
  const { t } = useTranslation();

  return <button>{t("addExpense")}</button>;
}

  //Agregar gasto 
  const addExpense = async () => {
    if (!payer || !amount || !desc ) return Swal.fire({
      icon: "warning",
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      confirmButtonColor: "#35b67e",
      title: t("completaCampos"),
      confirmButtonText: t("cerrar"),
    });

    if (Number(amount) <= 0) {
  return Swal.fire({
    icon: "warning",
    title: t("montoInvalido"),
    text: t("montoMayor0"),
    background: "#dee0e0",
    color: "#283655",
    iconColor: "#269181",
    confirmButtonColor: "#35b67e",
    confirmButtonText: t("cerrar")
  });
}

    if (mode === "some") {

      const selected = participants.filter(p => p.selected);

      if (selected.length === 0) {
        return Swal.fire({
          icon: "warning",
          title: t("seleccionaParticipante"),
          text: t("elegirUnParticipante"),
          background: "#dee0e0",
          color: "#283655",
          iconColor: "#269181",
          confirmButtonColor: "#35b67e",
          confirmButtonText: t("cerrar")
        });
      }

      const invalidUnits = selected.some(
        p => !p.units || Number(p.units) <= 0
      );

      if (invalidUnits) {
        return Swal.fire({
          icon: "warning",
          title: t("cantidadInvalida"),
          text: t("personasCargoNo0"),
          background: "#dee0e0",
          color: "#283655",
          iconColor: "#269181",
          confirmButtonColor: "#35b67e",
          confirmButtonText: t("cerrar")
        });
      }

    }

    const finalParticipants =
      mode === "all"
        ? people.map(p => ({
          name: p.name,
          units: p.count
        }))
        : participants
          .filter(p => p.selected)
          .map(p => ({
            name: p.name,
            units: Number(p.units)
          }));

    const expense = mode === "all" ? {
      payer,
      amount: Number(amount),
      desc,
      createdAt: new Date()
    }
      : {
        payer,
        amount: Number(amount),
        desc,
        participants: finalParticipants,
        createdAt: new Date()
      };
     

      
       Swal.fire({
      title: t("agregandoGasto"),
      allowOutsideClick: false,
      allowEscapeKey: false,
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      confirmButtonColor: "#35b67e",
      didOpen: () => {
        Swal.showLoading();
      },
    });

    await addExpenseToDB(expense);
    Swal.fire({
      icon: "success",
      title: t("gastoAgregado"),
      html: `<b>${payer}</b> ${t("pagó")} $${amount} ${desc || ""}`,
      timer: 1500,
      showConfirmButton: false,
      iconColor: "#269181",
    });

    setPayer("");
    setAmount("");
    setDesc("");
    setMode("all")
  };


  //Borrar gasto
  const deleteExpense = async (expenseId) => {
    const expense = expenses.find(e => e.id === expenseId);
    const result = await Swal.fire({
      title: t("eliminarGasto?"),
      html: `
    <div style="text-align:center; font-size:26px; margin-top:10px;">
      <p style=font-size:26px; margin-top:10px;"><strong>${t("pagó")}:</strong> ${expense.payer}</p>
      <p style=font-size:26px; margin-top:10px;"><strong>${t("detalle")}:</strong> ${expense.desc || t("sinDescripcion")}</p>
      <p style="font-size:26px; margin-top:10px;">
        <strong>${t("monto")}:</strong> $${Number(expense.amount).toFixed(2)}
      </p>
    </div>
    <p style="font-size:18px; margin-top:10px;">
        ${t("accionNoPuedeDeshacer")}
      </p>

  `,

      icon: "question",
      showCancelButton: true,
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      confirmButtonColor: "#35b67e",
      confirmButtonText: t("eliminar"),
      cancelButtonText: t("cancelar"),
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: t("eliminandoGasto"),
      allowOutsideClick: false,
      allowEscapeKey: false,
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      confirmButtonColor: "#35b67e",
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      await deleteExpenseFromDB(expenseId);

      await Swal.fire({
        icon: "success",
        title: t("eliminado"),
        text: t("gastoEliminado"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
        allowOutsideClick: false,
      });
    } catch (error) {
      console.error("Error eliminando gasto:", error);

      await Swal.fire({
        icon: "error",
        title: t("error"),
        text: t("noPudoEliminarGasto"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
      });
    }
  };


  //Borrar todos los gastos
  const deleteAll = async () => {
    const result = await Swal.fire({
      title: t("borrarTodosGastos?"),
      text: t("accionNoPuedeDeshacer"),
      icon: "question",
      showCancelButton: true,
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      confirmButtonColor: "#d33",
      confirmButtonText: t("siBorrarTodo"),
      cancelButtonText: t("cancelar"),
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: t("eliminandoGastos"),
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      await deleteAllExpenses();

      await Swal.fire({
        icon: "success",
        title: t("eliminados"),
        text: t("todosGastosEliminados"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),

      });
    } catch (error) {
      console.error("Error borrando gastos:", error);
      Swal.fire({
        text: t("noPudieronEliminarGastos"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
      });
    }
  };

  const showParticipants = (expense) => {
    const isAll = !expense.participants;
    if (isAll) {
      Swal.fire({
        title: t("participanGasto"),
        text: t("todos"),
        icon: "info",
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonText: t("cerrar"),
        confirmButtonColor: "#35b67e",
      });
      return;
    }
    const list = expense.participants
      .map(p => `${p.name} (x${p.units})`)
      .join("<br>");

    Swal.fire({
      title: t("participanGasto"),
      html: list,
      icon: "info",
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      confirmButtonText: t("cerrar"),
      confirmButtonColor: "#35b67e",
    });
  };


  //Mostrar gastos y alias
  const showPersonExpenses = (personName) => {
    const personExpenses = expenses.filter(
      e => e.payer === personName
    );

    const person = people.find(p => p.name === personName);
    const alias = person?.alias;

    if (personExpenses.length === 0) {
      Swal.fire(
        t("sinGastos"),
        `${personName} ${t("noGastosRegistrados")}`,
        "info"
      );
      return;
    }

    const total = personExpenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    const listHtml = personExpenses
      .map(e => {
        let participantsText = "";

        if (!e.participants || e.participants.length === 0) {
          participantsText = t("participanTodos");
        } else if (e.participants.length === people.length) {
          participantsText = t("participanTodos");
        } else {
          participantsText =
            t("participan") + 
            e.participants
              .map(p => `${p.name} (x${p.units})`)
              .join(", ");
        }

        return `
      <li style="margin-bottom:8px">
        <strong>${e.desc || t("sinDescripcion")}</strong> - $${e.amount}
        <br/>
        <span style="font-size:12px;color:gray">
          ${participantsText}
        </span>
      </li>
    `;
      })
      .join("");

    Swal.fire({
      title: `${t("gastosDe")} ${personName}`,
      html: `
      <ul style="text-align:left">
        ${listHtml}
      </ul>

      <hr />
      <strong>Total: $${total}</strong>

      ${alias
          ? `
            <hr />
            <p><strong>${t("aliasParaRecibir")}</strong></p>
            <p
              id="copyAliasExpense"
              style="
                font-size:22px;
                cursor:pointer;
                color:#1976d2;
                user-select:all;
              "
            >
              ${alias}
            </p>
            <p style="font-size:12px;color:gray">
              ${t("aliasParaRecibir")}
            </p>
          `
          : ""
        }
    `,
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      confirmButtonColor: "#35b67e",
      confirmButtonText: t("cerrar"),
      didOpen: () => {
        if (!alias) return;

        const aliasEl = document.getElementById("copyAliasExpense");

        aliasEl?.addEventListener("click", async () => {
          await navigator.clipboard.writeText(alias);

          Swal.fire({
            toast: true,
            position: "top",
            icon: "success",
            title: t("aliasCopiado"),
            background: "#dee0e0",
            color: "#283655",
            iconColor: "#269181",
            showConfirmButton: false,
            timer: 1500,
          });
        });
      },
    });
  };

  //Maneja inicializar cuando cambia all/some
  const handleSplitTypeChange = (value) => {

    setMode(value);

    if (value === "some") {
      const initialParticipants = people.map(p => ({
        name: p.name,
        units: p.count,
        selected: false
      }));

      setParticipants(initialParticipants);
    }

    if (value === "all") {
      const allParticipants = people.map(p => ({
        name: p.name,
        units: p.count,
        selected: true
      }));

      setParticipants(allParticipants);
    }
  };


  //inicializar participantes
  useEffect(() => {
    if (people.length > 0) {
      setParticipants(
        people.map(p => ({
          name: p.name,
          units: p.count,
          selected: false,
        }))
      );
    }
  }, [people]);

  console.log("AddExpense group:", group);

  return (
    
    <div className="card" id="section-expense">

      <h2 className="titulo">{t("agregarGasto")}</h2>

      <h3>{t("quienPago")}</h3>
      <div>
        
        <select value={payer} onChange={(e) => setPayer(e.target.value)} disabled={!canEdit}>
          <option value="">--    {t("seleccionarParticipante")}    --</option>
          {people.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3>{t("descripcionGasto")}</h3>
        <input
          type="text"
          placeholder={t("ingresarDescripcion")}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          disabled={!canEdit}
        />
      </div>

      <div>
        <h3>{t("quienesParticipan")}</h3>

        <label>
          <input
            className="checkbox"
            type="radio"
            name="splitType"
            value="all"
            checked={mode === "all"}
            onChange={(e) => handleSplitTypeChange(e.target.value)}
            disabled={!canEdit}
          />
          {t("todos")}
        </label>

        <label>
          <input
            className="checkbox"
            type="radio"
            name="splitType"
            value="some"
            checked={mode === "some"}
            onChange={(e) => handleSplitTypeChange(e.target.value)}
            disabled={!canEdit}
          />
          {t("algunos")}
        </label>
      </div>

      {mode === "some" && (
        <div>
          <h4>{t("quienesParticipanGasto")}</h4>
          <div className="some">
            <div>
              {participants.map((p, index) => (
                <div
                  key={p.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "6px"
                  }}
                >

                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={p.selected}
                    onChange={(e) => {
                      const updated = [...participants];
                      updated[index].selected = e.target.checked;
                      setParticipants(updated);
                    }}
                  />

                  <span style={{ width: "120px" }}>
                    {p.name}
                  </span>

                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={p.units}
                    disabled={!p.selected}
                    style={{ width: "60px", marginLeft: "10px" }}
                    onChange={(e) => {
                      const value = e.target.value;

                      const updated = [...participants];

                      updated[index].units = value === "" ? "" : Number(value);

                      setParticipants(updated);
                    }}
                  />

                </div>
              ))}
            </div>
          </div>
        </div>)}

      <div>
        <h3>{t("importeGastado")}</h3>
        <input
          type="number"
          inputMode="numeric"
          placeholder={t("ingresarImporte")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={!canEdit}
        />
      </div>



      <div>
        {canEdit && (<button className="boton" onClick={addExpense}>{t("agregar")}</button>)}
      </div>


      <h3>{t("gastos")}</h3>

      <ul>
        {expenses.map((e) => {

          const isAll = !e.participants || e.participants.length === 0;
          return (
            <li
              key={e.id}
              className={`people-item expense-item`}
            >
              <span className="expense-icon"
                onClick={() => showParticipants(e)}>
                {isAll ? <i className="fa-solid fa-users"></i> : <i className="fa-solid fa-user-group"></i>}</span>
              <span
                className="people-name expense-payer"
                onClick={() => showPersonExpenses(e.payer)}
              >

                {e.payer} {t("pagó")} ${e.amount} ({e.desc})
              </span>

              {canEdit && (
                <button onClick={() => deleteExpense(e.id)}>
                  <i className="fa-solid fa-trash"></i>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div>
        {canEdit && (<button
          className="btn-danger"
          onClick={deleteAll}
          disabled={!expenses?.length}
        >
          <i className="fa-solid fa-trash"></i> {t("borrarTodosGastos")}</button>)}

      </div>
    </div>
  );
}



















