
import { useState } from "react";
import Swal from "sweetalert2";
import "./Home.css";

function Home({
  groupName,
  responsables = [],
  hijos = [],
  canEdit,
  onAddResponsible,
  onEditResponsible,
  onAddChild,
  onEditChild,
  onOpenChild,
}) {
  const [saving, setSaving] = useState(false);

  const handleAddResponsible = async () => {
    const result = await Swal.fire({
      title: "Agregar responsable",
      html: `
        <input id="responsable-nombre" class="swal2-input" placeholder="Nombre y apellido">
        <select id="responsable-parentesco" class="swal2-select">
          <option value="">Seleccionar parentesco</option>
          <option value="Madre">Madre</option>
          <option value="Padre">Padre</option>
          <option value="Tutor/a">Tutor/a</option>
          <option value="Otro">Otro</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#269181",
      preConfirm: () => {
        const nombre = document
          .getElementById("responsable-nombre")
          .value.trim();

        const parentesco = document
          .getElementById("responsable-parentesco")
          .value;

        if (!nombre || !parentesco) {
          Swal.showValidationMessage(
            "Ingresá el nombre y seleccioná el parentesco."
          );
          return false;
        }

        return { nombre, parentesco };
      },
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      await onAddResponsible(result.value);

      await Swal.fire({
        title: "Responsable agregado",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error al agregar responsable:", error);

      Swal.fire(
        "Error",
        "No se pudo guardar el responsable. Revisá la conexión y los permisos de Firebase.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditResponsible = async (responsable) => {
    const nombreSeguro = String(responsable.nombre || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const result = await Swal.fire({
      title: "Editar responsable",
      html: `
        <input
          id="responsable-nombre"
          class="swal2-input"
          placeholder="Nombre y apellido"
          value="${nombreSeguro}"
        >
        <select id="responsable-parentesco" class="swal2-select">
          <option value="Madre" ${responsable.parentesco === "Madre" ? "selected" : ""}>Madre</option>
          <option value="Padre" ${responsable.parentesco === "Padre" ? "selected" : ""}>Padre</option>
          <option value="Tutor/a" ${responsable.parentesco === "Tutor/a" ? "selected" : ""}>Tutor/a</option>
          <option value="Otro" ${responsable.parentesco === "Otro" ? "selected" : ""}>Otro</option>
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar cambios",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#269181",
      preConfirm: () => {
        const nombre = document
          .getElementById("responsable-nombre")
          .value.trim();

        const parentesco = document
          .getElementById("responsable-parentesco")
          .value;

        if (!nombre || !parentesco) {
          Swal.showValidationMessage(
            "Ingresá el nombre y seleccioná el parentesco."
          );
          return false;
        }

        return { nombre, parentesco };
      },
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      await onEditResponsible(responsable.id, result.value);

      await Swal.fire({
        title: "Cambios guardados",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error al editar responsable:", error);

      Swal.fire(
        "Error",
        "No se pudieron guardar los cambios. Revisá la conexión y los permisos de Firebase.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  // Agregar hijo
  const handleAddChild = async () => {
    const result = await Swal.fire({
      title: "Agregar hijo/a",
      html: `
        <input
          id="hijo-nombre"
          class="swal2-input"
          placeholder="Nombre y apellido"
          maxlength="120"
        >
        <label for="hijo-fecha" style="display:block; margin-top:16px;">
          Fecha de nacimiento
        </label>
        <input
          id="hijo-fecha"
          type="date"
          class="swal2-input"
          max="${new Date().toLocaleDateString("en-CA")}"
        >
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#269181",
      preConfirm: () => {
        const nombre = document
          .getElementById("hijo-nombre")
          .value.trim();

        const fechaNacimiento = document
          .getElementById("hijo-fecha")
          .value;

        if (!nombre || !fechaNacimiento) {
          Swal.showValidationMessage(
            "Ingresá el nombre y apellido y la fecha de nacimiento."
          );
          return false;
        }

        if (fechaNacimiento > new Date().toLocaleDateString("en-CA")) {
          Swal.showValidationMessage(
            "La fecha de nacimiento no puede ser futura."
          );
          return false;
        }

        return { nombre, fechaNacimiento };
      },
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      await onAddChild(result.value);

      await Swal.fire({
        title: "Hijo/a agregado/a",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error al agregar hijo:", error);

      Swal.fire(
        "Error",
        "No se pudo guardar. Revisá la conexión y los permisos de Firebase.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  // Editar hijo
  const handleEditChild = async (hijo) => {
    const nombreSeguro = String(hijo.nombre || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const hoy = new Date().toLocaleDateString("en-CA");

    const result = await Swal.fire({
      title: "Editar hijo/a",
      html: `
        <input
          id="hijo-nombre"
          class="swal2-input"
          placeholder="Nombre y apellido"
          maxlength="120"
          value="${nombreSeguro}"
        >
        <label for="hijo-fecha" style="display:block; margin-top:16px;">
          Fecha de nacimiento
        </label>
        <input
          id="hijo-fecha"
          type="date"
          class="swal2-input"
          max="${hoy}"
          value="${String(hijo.fechaNacimiento || "").replace(/[^0-9-]/g, "")}"
        >
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar cambios",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#269181",
      preConfirm: () => {
        const nombre = document
          .getElementById("hijo-nombre")
          .value.trim();

        const fechaNacimiento = document
          .getElementById("hijo-fecha")
          .value;

        if (!nombre || !fechaNacimiento) {
          Swal.showValidationMessage(
            "Ingresá el nombre y apellido y la fecha de nacimiento."
          );
          return false;
        }

        if (fechaNacimiento > hoy) {
          Swal.showValidationMessage(
            "La fecha de nacimiento no puede ser futura."
          );
          return false;
        }

        return { nombre, fechaNacimiento };
      },
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      await onEditChild(hijo.id, result.value);

      await Swal.fire({
        title: "Cambios guardados",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error al editar hijo:", error);

      Swal.fire(
        "Error",
        "No se pudieron guardar los cambios. Revisá la conexión y los permisos de Firebase.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="home-family">
      {/* <header className="home-family-header">
        <h1>{groupName || "Mi familia"}</h1>
        <p>Información compartida de la familia</p>
      </header> */}

      <section className="home-section">
        <h2>Responsables</h2>

        <div className="responsables-grid">
          {responsables.map((responsable) => (
            <article className="responsable-card" key={responsable.id}>
              <i className="fa-solid fa-user"></i>
              <h3>{responsable.nombre}</h3>
              <p>{responsable.parentesco}</p>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleEditResponsible(responsable)}
                  disabled={saving}
                >
                  <i className="fa-solid fa-pen"></i> Editar
                </button>
              )}
            </article>
          ))}
        </div>

        {responsables.length === 0 && (
          <p>Todavía no hay responsables cargados.</p>
        )}

        {canEdit && responsables.length < 2 && (
          <button
            type="button"
            className="add-responsible-button"
            onClick={handleAddResponsible}
            disabled={saving}
          >
            <i className="fa-solid fa-user-plus"></i>
            Agregar responsable
          </button>
        )}
      </section>

      <section className="home-section">
        <h2>Hijos</h2>

        <div className="hijos-list">
          {hijos.map((hijo) => (
            <div className="hijo-card" key={hijo.id}>
              <button
                type="button"
                className="hijo-card-main"
                onClick={() => onOpenChild?.(hijo)}
              >
                <i className="fa-solid fa-child"></i>
                <span>
                  {hijo.nombre}
                  <small>
                    {hijo.fechaNacimiento
                      ? `Nacimiento: ${hijo.fechaNacimiento}`
                      : ""}
                  </small>
                </span>
                <i className="fa-solid fa-chevron-right"></i>
              </button>

              {canEdit && (
                <button
                  type="button"
                  className="hijo-edit-button"
                  onClick={() => handleEditChild(hijo)}
                  disabled={saving}
                >
                  <i className="fa-solid fa-pen"></i> Editar
                </button>
              )}
            </div>
          ))}
        </div>

        {hijos.length === 0 && (
          <p>Todavía no hay hijos cargados.</p>
        )}

        {canEdit && (
          <button
            type="button"
            className="add-responsible-button"
            onClick={handleAddChild}
            disabled={saving}
          >
            <i className="fa-solid fa-user-plus"></i>
            Agregar hijo/a
          </button>
        )}
      </section>
    </main>
  );
}

export default Home;



// import { useState } from "react";
// import Swal from "sweetalert2";
// import "./Home.css";

// function Home({
//   groupName,
//   responsables = [],
//   canEdit,
//   onAddResponsible,
//   onEditResponsible,
//   onOpenChild,
// }) {
//   const [saving, setSaving] = useState(false);

//   const handleAddResponsible = async () => {
//     const result = await Swal.fire({
//       title: "Agregar responsable",
//       html: `
//         <input id="responsable-nombre" class="swal2-input" placeholder="Nombre y apellido">
//         <select id="responsable-parentesco" class="swal2-select">
//           <option value="">Seleccionar parentesco</option>
//           <option value="Madre">Madre</option>
//           <option value="Padre">Padre</option>
//           <option value="Tutor/a">Tutor/a</option>
//           <option value="Otro">Otro</option>
//         </select>
//       `,
//       showCancelButton: true,
//       confirmButtonText: "Guardar",
//       cancelButtonText: "Cancelar",
//       confirmButtonColor: "#269181",
//       preConfirm: () => {
//         const nombre = document
//           .getElementById("responsable-nombre")
//           .value.trim();

//         const parentesco = document
//           .getElementById("responsable-parentesco")
//           .value;

//         if (!nombre || !parentesco) {
//           Swal.showValidationMessage(
//             "Ingresá el nombre y seleccioná el parentesco."
//           );
//           return false;
//         }

//         return { nombre, parentesco };
//       },
//     });

//     if (!result.isConfirmed) return;

//     try {
//       setSaving(true);
//       await onAddResponsible(result.value);

//       await Swal.fire({
//         title: "Responsable agregado",
//         icon: "success",
//         timer: 1200,
//         showConfirmButton: false,
//       });
//     } catch (error) {
//       console.error("Error al agregar responsable:", error);

//       Swal.fire(
//         "Error",
//         "No se pudo guardar el responsable. Revisá la conexión y los permisos de Firebase.",
//         "error"
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleEditResponsible = async (responsable) => {
//     const result = await Swal.fire({
//       title: "Editar responsable",
//       html: `
//         <input
//           id="responsable-nombre"
//           class="swal2-input"
//           placeholder="Nombre y apellido"
//           value="${String(responsable.nombre || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}"
//         >
//         <select id="responsable-parentesco" class="swal2-select">
//           <option value="Madre" ${responsable.parentesco === "Madre" ? "selected" : ""}>Madre</option>
//           <option value="Padre" ${responsable.parentesco === "Padre" ? "selected" : ""}>Padre</option>
//           <option value="Tutor/a" ${responsable.parentesco === "Tutor/a" ? "selected" : ""}>Tutor/a</option>
//           <option value="Otro" ${responsable.parentesco === "Otro" ? "selected" : ""}>Otro</option>
//         </select>
//       `,
//       showCancelButton: true,
//       confirmButtonText: "Guardar cambios",
//       cancelButtonText: "Cancelar",
//       confirmButtonColor: "#269181",
//       preConfirm: () => {
//         const nombre = document
//           .getElementById("responsable-nombre")
//           .value.trim();

//         const parentesco = document
//           .getElementById("responsable-parentesco")
//           .value;

//         if (!nombre || !parentesco) {
//           Swal.showValidationMessage(
//             "Ingresá el nombre y seleccioná el parentesco."
//           );
//           return false;
//         }

//         return { nombre, parentesco };
//       },
//     });

//     if (!result.isConfirmed) return;

//     try {
//       setSaving(true);
//       await onEditResponsible(responsable.id, result.value);

//       await Swal.fire({
//         title: "Cambios guardados",
//         icon: "success",
//         timer: 1200,
//         showConfirmButton: false,
//       });
//     } catch (error) {
//       console.error("Error al editar responsable:", error);

//       Swal.fire(
//         "Error",
//         "No se pudieron guardar los cambios. Revisá la conexión y los permisos de Firebase.",
//         "error"
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   // Hijos de ejemplo: todavía no están conectados a Firebase.
//   const hijos = [
//     { id: 1, nombre: "Nombre del hijo" },
//   ];

//   return (
//     <main className="home-family">
//       <header className="home-family-header">
//         <h1>{groupName || "Mi familia"}</h1>
//         <p>Información compartida de la familia</p>
//       </header>

//       <section className="home-section">
//         <h2>Responsables</h2>

//         <div className="responsables-grid">
//           {responsables.map((responsable) => (
//             <article className="responsable-card" key={responsable.id}>
//               <i className="fa-solid fa-user"></i>
//               <h3>{responsable.nombre}</h3>
//               <p>{responsable.parentesco}</p>

//               {canEdit && (
//                 <button
//                   type="button"
//                   onClick={() => handleEditResponsible(responsable)}
//                   disabled={saving}
//                 >
//                   <i className="fa-solid fa-pen"></i> Editar
//                 </button>
//               )}
//             </article>
//           ))}
//         </div>

//         {responsables.length === 0 && (
//           <p>Todavía no hay responsables cargados.</p>
//         )}

//         {canEdit && responsables.length < 2 && (
//           <button
//             type="button"
//             className="add-responsible-button"
//             onClick={handleAddResponsible}
//             disabled={saving}
//           >
//             <i className="fa-solid fa-user-plus"></i>
//             Agregar responsable
//           </button>
//         )}
//       </section>

//       <section className="home-section">
//         <h2>Hijos</h2>

//         <div className="hijos-list">
//           {hijos.map((hijo) => (
//             <button
//               type="button"
//               className="hijo-card"
//               key={hijo.id}
//               onClick={() => onOpenChild?.(hijo)}
//             >
//               <i className="fa-solid fa-child"></i>
//               <span>{hijo.nombre}</span>
//               <i className="fa-solid fa-chevron-right"></i>
//             </button>
//           ))}
//         </div>
//       </section>
//     </main>
//   );
// }

// export default Home;





// import "./Home.css";

// function Home({ groupName, onOpenChild }) {
//   // Datos de ejemplo para probar el diseño.
//   // Más adelante los reemplazaremos por datos de Firebase.
//   const responsables = [
//     { id: 1, nombre: "Responsable 1", parentesco: "Padre / Madre / Tutor" },
//     { id: 2, nombre: "Responsable 2", parentesco: "Padre / Madre / Tutor" },
//   ];

//   const hijos = [
//     { id: 1, nombre: "Nombre del hijo" },
//   ];

//   return (
//     <main className="home-family">
//       <header className="home-family-header">
//         <h1>{groupName || "Mi familia"}</h1>
//         <p>Información compartida de la familia</p>
//       </header>

//       <section className="home-section">
//         <h2>Responsables</h2>

//         <div className="responsables-grid">
//           {responsables.map((responsable) => (
//             <article className="responsable-card" key={responsable.id}>
//               <i className="fa-solid fa-user"></i>
//               <h3>{responsable.nombre}</h3>
//               <p>{responsable.parentesco}</p>
//             </article>
//           ))}
//         </div>
//       </section>

//       <section className="home-section">
//         <h2>Hijos</h2>

//         <div className="hijos-list">
//           {hijos.map((hijo) => (
//             <button
//               type="button"
//               className="hijo-card"
//               key={hijo.id}
//               onClick={() => onOpenChild?.(hijo)}
//             >
//               <i className="fa-solid fa-child"></i>

//               <span>{hijo.nombre}</span>

//               <i className="fa-solid fa-chevron-right"></i>
//             </button>
//           ))}
//         </div>
//       </section>
//     </main>
//   );
// }

// export default Home;
