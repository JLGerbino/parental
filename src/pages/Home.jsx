
import "./Home.css";

function Home({ groupName, onOpenChild }) {
  // Datos de ejemplo para probar el diseño.
  // Más adelante los reemplazaremos por datos de Firebase.
  const responsables = [
    { id: 1, nombre: "Responsable 1", parentesco: "Padre / Madre / Tutor" },
    { id: 2, nombre: "Responsable 2", parentesco: "Padre / Madre / Tutor" },
  ];

  const hijos = [
    { id: 1, nombre: "Nombre del hijo" },
  ];

  return (
    <main className="home-family">
      <header className="home-family-header">
        <h1>{groupName || "Mi familia"}</h1>
        <p>Información compartida de la familia</p>
      </header>

      <section className="home-section">
        <h2>Responsables</h2>

        <div className="responsables-grid">
          {responsables.map((responsable) => (
            <article className="responsable-card" key={responsable.id}>
              <i className="fa-solid fa-user"></i>
              <h3>{responsable.nombre}</h3>
              <p>{responsable.parentesco}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>Hijos</h2>

        <div className="hijos-list">
          {hijos.map((hijo) => (
            <button
              type="button"
              className="hijo-card"
              key={hijo.id}
              onClick={() => onOpenChild?.(hijo)}
            >
              <i className="fa-solid fa-child"></i>

              <span>{hijo.nombre}</span>

              <i className="fa-solid fa-chevron-right"></i>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Home;
