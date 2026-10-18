import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

export default function AddPerson({
  people,
  addPersonToDB,
  deletePerson,
  editPersonInDB,
  group,
  canEdit,
}) {
  const [name, setName] = useState("");
  const [count, setCount] = useState(1);
  const [alias, setAlias] = useState("");
  const { t } = useTranslation();


  const totalPersonas = people.reduce((acc, p) => acc + p.count, 0);

//cambio de lenguaje y local storage
const changeLang = (lang) => {
  i18n.changeLanguage(lang);
  localStorage.setItem("lang", lang);
};

  //Agregar persona
  const addPerson = async () => {
    if (!name.trim()) return Swal.fire({
      icon: "warning",
      title: t("faltaNombreParticipante"),
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      confirmButtonColor: "#35b67e",
      confirmButtonText: t("cerrar"),
    });
    if (count < 1 || 0 ) return Swal.fire({
      icon: "warning",
      title: t("cantidadInvalida"),
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      confirmButtonColor: "#35b67e",
      confirmButtonText: t("cerrar"),
    });

    if (people.some(p => p.name === name.trim())) {
      return Swal.fire({
        icon: "warning",
        title: t("yaExisteParticipante"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
      });
    }
     Swal.fire({
      title: t("agregandoParticipante"),
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
    await addPersonToDB({
      name: name.trim(),
      count: Number(count),
      alias: alias.trim(),
    });
    Swal.fire({
      icon: "success",
      title: t("participanteAgregado"),
      html: `<b>${name}</b>`,
      timer: 1500,
      showConfirmButton: false,
      iconColor: "#269181",
    });

    setName("");
    setCount(1);
    setAlias("");
  };

  //Borrar persona
  const handleDeletePerson = async (person) => {
    const result = await Swal.fire({
      title: ` ${t("seguroEliminar")} ${person.name}?`,
      text: t("seEliminaraPersona"),
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
      title: t("eliminandoParticipante"),
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
      await deletePerson(person);

      await Swal.fire({
        icon: "success",
        title: t("eliminado"),
        text: t("personaGastosEliminados"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
        allowOutsideClick: false,
      });
    } catch (error) {
      console.error("Error eliminando persona:", error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: t("noPudoEliminarPersona"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
      });
    }
  };

  //Mostrar alias
  const showPersonAlias = (person) => {
    Swal.fire({
      title: person.name,
      html: `
      <p><strong>${t("cantidad")}:</strong> ${person.count}</p>

      ${person.alias
          ? `
            <hr />
            <p><strong>${t("aliasParaRecibir")}</strong></p>
            <p 
              id="copyAliasPerson"
              style="
                font-size:22px;
                cursor:pointer;
                color:#1976d2;
                user-select:all;
              "
            >
              ${person.alias}
            </p>
            <p style="font-size:12px;color:gray">
              ${t("tocaAlias")}
            </p>
          `
          : `<p style="color:gray">${t("sinAlias")}</p>`
        }
    `,
      confirmButtonText: t("cerrar"),
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      confirmButtonColor: "#35b67e",

      didOpen: () => {
        if (!person.alias) return;

        const aliasEl = document.getElementById("copyAliasPerson");

        aliasEl?.addEventListener("click", async () => {
          await navigator.clipboard.writeText(person.alias);

          Swal.fire({
            toast: true,
            position: "top",
            icon: "success",
            title: t("aliasCopiado"),
            background: "#dee0e0",
            color: "#283655",
            iconColor: "#269181",
            confirmButtonColor: "#35b67e",
            showConfirmButton: false,
            timer: 1500,
          });
        });
      },
    });
  };

  //Editar persona
  const handleEditPerson = async (person) => {
    const result = await Swal.fire({
      title: t("editarParticipante"),
      html: `
      <div
      style= "text-align: center;
             font-size: 26px;
             font-weight: 600;
             color: #35b67e;
             margin-bottom: 10px;">              
        ${person.name}
</div>
        
        <div>
        <input
          id="editCount"
          type="number"
          min="1"
          class="swal2-input"
          value="${person.count}"                        
        /></div><label>${t("cantidadPersonas")}</label>        
        <div>        
        <input
          id="editAlias"
          class="swal2-input"
          value="${person.alias || ""}"          
        />
      </div><label>${t("aliasOpcional")}</label>
    `,
      showCancelButton: true,
      confirmButtonText: t("guardar"),
      cancelButtonText: t("cancelar"),
      background: "#dee0e0",
      color: "#283655",
      confirmButtonColor: "#35b67e",
      preConfirm: () => {
        const count = Number(
          document.getElementById("editCount").value
        );
        const alias = document
          .getElementById("editAlias")
          .value
          .trim();

        if (!count || count < 1) {
          Swal.showValidationMessage(
            t("cantidadMayor0")
          );
          return;
        }

        return { count, alias };
      },
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: t("guardandoCambios"),
      allowOutsideClick: false,
      background: "#dee0e0",
      iconColor: "#269181",
      color: "#283655",
      didOpen: () => Swal.showLoading(),
    });

    try {
      await editPersonInDB(person.id, result.value);

      Swal.fire({
        icon: "success",
        title: t("participanteActualizado"),
        color: "#283655",
        iconColor: "#269181",
        timer: 1500,
        showConfirmButton: false,
        background: "#dee0e0",
      });
    } catch (error) {
      console.error(error);
      Swal.fire(
        t("error"),        
        t("noPudoActualizarParticipante"),
        t("error")
      );
    }
  };


  return (
    <div className="card" id="section-people">
      <h2 className="titulo">{t("agregarParticipante")}</h2>
      <div>
        <h3>{t("nombre")}</h3>
        <input
          type="text"
          placeholder={t("nombre")}
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={!canEdit}
        />
      </div>
      <div>
        <h3>{t("personasCargo")}</h3>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={count}
          onChange={e => setCount(e.target.value)}
          placeholder={t("cantidadPersonas")}
          disabled={!canEdit}
        />
      </div>
      <div>
        <h3>{t("alias")}</h3>
        <input
          type="text"
          placeholder={t("opcional")}
          value={alias}
          onChange={e => setAlias(e.target.value)}
          disabled={!canEdit}
        />
      </div>
      <div>
        {canEdit && (
          <button className="boton" onClick={addPerson}>{t("agregar")}</button>)}
      </div>
      <h3>{t("participantes")}</h3>

      <ul>
        {people.map(p => (

          <li key={p.id} className="people-item"><span> {canEdit && (<button onClick={() => handleEditPerson(p)}> <i className="fa-solid fa-pencil edit-icon"

          ></i></button>)}</span><span
            className="expense-payer people-name"
            onClick={() => showPersonAlias(p)}
          >
              {p.name} (x{p.count})
            </span>


            {canEdit && (<button className="delete-btn" onClick={() => handleDeletePerson(p)}>
              <i className="fa-solid fa-trash"></i>
            </button>)}
          </li>
        ))}
      </ul>
      <p>{t("totalPersonas")}:{totalPersonas}</p>
    </div>
  );
}










