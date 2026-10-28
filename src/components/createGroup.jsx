import { useState, useEffect } from "react";
import { db } from "../firebase";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function CreateGroup({ onGroupCreated, user }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const { t } = useTranslation();


  useEffect(() => {
    document.body.style.overflow = showCreate ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showCreate]);


  const closeCreateModal = () => {

    setShowCreate(false);
    setName("");
    setCode("");
    setIsAdmin("");
    setAdminName("");
    setAdminPin("");

  };

  //Crear grupo
  const createGroup = async () => {
    if (!name.trim()) {
      Swal.fire({
        icon: "warning",
        title: t("faltaNombreGrupo"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
      });
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      Swal.fire({
        icon: "warning",
        title: t("codigoDebeTener6"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
      });
      return;
    }

    const groupId =
      name.trim().toLowerCase().replace(/\s+/g, "-") + "_" + code;

    const ref = doc(db, "groups", groupId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      closeCreateModal();
      document.activeElement?.blur();
      Swal.fire({
        title: t("yaExisteGrupo"),
        text: t("elegiOtro"),
        icon: "error",
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
        className: "swal-container",
      });

      return;
    }
    if (isAdmin && !adminName.trim()) {
      Swal.fire({
        icon: "warning",
        title: t("ingresaNombreAdmin"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
      });
      return;
    }
    if (isAdmin) {
      if (!adminName.trim()) {

        return;
      }

      if (!/^\d{4}$/.test(adminPin)) {
        Swal.fire({
          icon: "warning",
          title: t("PINDebeTener4"),
          background: "#dee0e0",
          color: "#283655",
          iconColor: "#269181",
          confirmButtonColor: "#35b67e",
          confirmButtonText: t("cerrar"),
        });

        return;
      }
    }
    await setDoc(ref, {
      name: name.trim(),
      code,
      createdAt: serverTimestamp(),
      status: "open",
      adminUid: isAdmin ? user.uid : null,
      adminName: isAdmin ? adminName.trim() : null,
      adminPin: isAdmin ? adminPin : null,
    });


    onGroupCreated({
      groupId,
      groupName: name.trim(),
      hasAdmin: isAdmin,
    });

    setName("");
    setCode("");
    setJoinName("");
    setJoinCode("");
    setShowCreate(false);
  };

  //Entrar a grupo existente
  const joinGroup = async () => {
    if (!joinName.trim()) {
      Swal.fire({
        icon: "warning",
        title: t("faltaNombreGrupo"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
      });
      return;
    }

    if (!/^\d{6}$/.test(joinCode)) {
      Swal.fire({
        icon: "warning",
        title: t("codigoDebeTener6"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
      });
      return;
    }

    const groupId =
      joinName.trim().toLowerCase().replace(/\s+/g, "-") +
      "_" +
      joinCode;

      const ref = doc(db, "groups", groupId);

console.log("Usuario autenticado:", user?.uid ?? "No disponible");
console.log("Grupo que intenta consultar:", groupId);

let snap;

try {
  snap = await getDoc(ref);
  console.log("Consulta del grupo realizada correctamente");
} catch (error) {
  console.error("Error al consultar el grupo:", error);
  console.error("Código del error:", error.code);

  Swal.fire({
    icon: "error",
    title: "No se pudo consultar el grupo",
    text: "Revisá la consola para ver el detalle del error.",
  });

  return;
}

    // const ref = doc(db, "groups", groupId);
    // const snap = await getDoc(ref);

    if (!snap.exists()) {
      Swal.fire({
        title: t("noExisteGrupo"),
        background: "#dee0e0",
        color: "#283655",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
      });

      return;
    }

    onGroupCreated({
      groupId,
      groupName: snap.data().name,
      hasAdmin: !!snap.data().adminUid,
    });

  };




  return (
    <div>
      <div className="card">
        <h2>{t("yaTenesGrupo")}</h2>
        <h4>{t("ingresaAca")}</h4>
        <div>
          <input
            placeholder={t("nombreGrupo")}
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
          />
        </div>
        <div>
          <input
            placeholder={t("codigo6")}
            value={joinCode}
            maxLength={6}
            onChange={(e) => setJoinCode(e.target.value)}
          />
        </div>
        <button className="boton" onClick={joinGroup}>
          {t("entrarGrupo")}
        </button>

        {showCreate && (
          <div className="modal-overlay" onClick={closeCreateModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close"
                onClick={closeCreateModal}
              >

                <i className="fa-solid fa-x"></i>
              </button>

              <h2>{t("crearNuevoGrupo")}</h2>

              <input
                placeholder={t("nombreGrupo")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                placeholder={t("codigo6")}
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value)}
              />
              <div>
                <label>
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={isAdmin}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsAdmin(checked);

                      if (!checked) {
                        setAdminName("");
                      }
                    }}
                  />
                  {t("administradorGrupo")}
                </label></div>
              {isAdmin && (
                <div>
                  <input
                    type="text"
                    placeholder={t("nombreAdmin")}
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="input"
                  />
                  <input
                    type="password"
                    placeholder={t("pin4")}
                    maxLength={4}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="input"
                  />
                  <p>{t("textoAdmin1")}</p>
                  <p>{t("textoAdmin2")}</p>


                </div>

              )}

              <button className="boton" onClick={createGroup}>
                {t("crearGrupo")}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="nuevo-grupo-container">
        <h2 className="grupo">{t("nuevoGrupo")}</h2>
        <div
          onClick={() => setShowCreate(true)}
          className="nuevo nuevo-grupo"
        >
          <i className="fa-solid fa-circle-plus"></i>
        </div>
      </div>
    </div>
  );
}






