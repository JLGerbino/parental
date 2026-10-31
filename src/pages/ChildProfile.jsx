import React from "react";

function ChildProfile({ hijo, onBack, canEdit, onEdit }) {
  if (!hijo) return null;

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
          <strong>Colegio:</strong>{" "}
          {hijo.fechaNacimiento || "Sin registrar"}
        </p>

        {canEdit && (
          <button type="button" onClick={() => onEdit(hijo)}>
            <i className="fa-solid fa-pen"></i>
            Editar datos
          </button>
        )}
      </section>
    </main>
  );
}

export default ChildProfile;