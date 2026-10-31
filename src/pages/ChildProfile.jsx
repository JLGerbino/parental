import React from "react";
import Swal from "sweetalert2";

function ChildProfile({ hijo, onBack, canEdit, onEdit, onEditChild }) {
  if (!hijo) return null;

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
        <label for="hijo-colegio" style="display:block; margin-top:16px;">
          Colegio
        </label>
        <input
          id="hijo-colegio"
          class="swal2-input"
          placeholder="Colegio"
          maxlength="150"
          value="${String(hijo.colegio || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}"
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
        const colegio = document
          .getElementById("hijo-colegio")  
          .value;

        if (!nombre || !fechaNacimiento) {
          Swal.showValidationMessage(
            "Ingresá el nombre y apellido y la fecha de nacimiento."
          );
          return false;
        }

        if (fechaNacimiento > hoy) {
          Swal.showValidationMessage(
            "La fecha de nacimiento es erronea."
          );
          return false;
        }

        return { nombre, fechaNacimiento, colegio };
      },
    });

    if (!result.isConfirmed) return;

    try {      
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
    } 
  };

  const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return "Sin registrar";

  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  const hoy = new Date();

  let edad = hoy.getFullYear() - nacimiento.getFullYear();

  const aunNoCumplio =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() &&
      hoy.getDate() < nacimiento.getDate());

  if (aunNoCumplio) {
    edad--;
  }

  return `${edad} ${edad === 1 ? "año" : "años"}`;
};

  return (
    <main className="child-profile">
      <button type="button" onClick={onBack}>
        <i className="fa-solid fa-arrow-left"></i>
        Volver
      </button>

      <h2>{hijo.nombre}</h2>

      <section className="child-profile-section">
        <h3>Datos personales</h3>

        <p>
          <strong>Nombre:</strong> {hijo.nombre}
        </p>

        <p>
          <strong>Fecha de nacimiento:</strong>{" "}
          {hijo.fechaNacimiento || "Sin registrar"}
        </p>

        <p>
          <strong>Edad:</strong> {calcularEdad(hijo.fechaNacimiento)}
        </p>

        <p>
          <strong>Colegio:</strong>{" "}
          {hijo.colegio || "Sin registrar"}
        </p>
        

        {canEdit && (
          <button type="button" onClick={() => handleEditChild(hijo)}>
            <i className="fa-solid fa-pen"></i>
            Editar datos
          </button>
        )}
      </section>
    </main>
  );
}

export default ChildProfile;