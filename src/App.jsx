import { useState, useEffect, useRef } from "react";
import Agenda from "./pages/Agenda.jsx";
import Notifications from "./components/Notifications.jsx";
import Chat from "./pages/Chat.jsx";
import Home from "./pages/Home.jsx";
import AddPerson from "./components/addPerson";
import AddExpense from "./components/addExpense";
import BalanceList from "./components/balanceList";
import CreateGroup from "./components/createGroup";
import Swal from "sweetalert2";
import { db } from "./firebase";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import LanguageSelector from "./components/languageSelector";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  updateDoc,
  writeBatch,
  orderBy,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import "./App.css";

function App() {
  // Estado inicial desde localStorage
  const [groupId, setGroupId] = useState(() => {
    return localStorage.getItem("groupId");
  });

  const [groupName, setGroupName] = useState(() => {
    return localStorage.getItem("groupName") || "";
  });

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activePage, setActivePage] = useState("home");
  const [unreadChat, setUnreadChat] = useState(0);
  const [responsables, setResponsables] = useState([]);
  const [hijos, setHijos] = useState([]);
  const [responsableVinculado, setResponsableVinculado] = useState(null);
  const [identificandoResponsable, setIdentificandoResponsable] = useState(true);
  const [responsablesLoaded, setResponsablesLoaded] = useState(false);
  const [selectedResponsibleId, setSelectedResponsibleId] = useState("");
  const [savingResponsible, setSavingResponsible] = useState(false);
  const [responsibleError, setResponsibleError] = useState("");

  const [loading, setLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [user, setUser] = useState(null);
  const [group, setGroup] = useState(null);
  const [groupCode, setGroupCode] = useState("");
  const [people, setPeople] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [started, setStarted] = useState(false);
  const [payments, setPayments] = useState([]);
  const [debts, setDebts] = useState([]);
  const hasAdmin = !!group?.adminUid;
  const isAdmin = !!group?.adminUid && group.adminUid === user?.uid;
  const bothResponsiblesLinked = responsables.length >= 2 && responsables.every((responsable) => !!responsable.linkedUid);
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const closeMenu = () => {setShowMenu(false); setShowLang(false);};
  const toggleMenu = () => {
  setShowMenu(prev => {
    if (!prev) setShowLang(false); // 👈 resetea al abrir
    return !prev;
  });
};

  //para cerrar Settings
useEffect(() => {
  setShowMenu(false);
  setShowLang(false);
}, [groupId]);

const menuRef = useRef(null);

useEffect(() => {
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setShowMenu(false);
      setShowLang(false);
    }
  };
  document.addEventListener("click", handleClickOutside);  

  return () => {
     document.addEventListener("click", handleClickOutside);    
  };
}, []);


  // Guardar groupId en localStorage
  useEffect(() => {
    if (groupId) {
      localStorage.setItem("groupId", groupId);
    }
  }, [groupId]);

  //login anonimo
  useEffect(() => {
    const auth = getAuth();

    signInAnonymously(auth).catch(console.error);

    const unsub = onAuthStateChanged(auth, user => {
      setUser(user);
    });

    return unsub;
  }, []);

  //si no hay admin todos editan si hay, solo edita admin
  const canEdit = !hasAdmin || isAdmin;



  // traer grupo en tiempo real
  useEffect(() => {
    if (!groupId) return;

    const unsub = onSnapshot(
      doc(db, "groups", groupId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();

          setGroup({
            id: snap.id,
            ...data,
            status: data.status || "open",
          });

          setGroupName(data.name || "");
          setGroupCode(data.code || "");
        }
      }
    );

    return () => unsub();
  }, [groupId]);



  //Borra grupo
  const handleDeleteGroup = async () => {
    const confirm1 = await Swal.fire({
      title: t("eliminarGrupo"),
      text: t("accionEliminaraGrupo"),
      icon: "warning",
      iconColor: "#269181",
      showCancelButton: true,
      confirmButtonText: t("eliminar"),
      cancelButtonText: t("cancelar"),
      confirmButtonColor: "#d33",
      background: "#dee0e0",
      color: "#283655",
    });

    if (!confirm1.isConfirmed) return;

    const confirm2 = await Swal.fire({
      title: t("completamenteSeguro"),
      text: t("accionIrreversible"),
      icon: "error",
      showCancelButton: true,
      confirmButtonText: t("siEliminarDefinit"),
      cancelButtonText: t("cancelar"),
      confirmButtonColor: "#d33",
      background: "#dee0e0",
      color: "#283655",
    });

    if (!confirm2.isConfirmed) return;
    Swal.fire({
      title: t("eliminandoGrupo"),
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
      const expensesSnap = await getDocs(
        collection(db, "groups", groupId, "expenses")
      );
      for (const docu of expensesSnap.docs) {
        await deleteDoc(docu.ref);
      }

      const paymentsSnap = await getDocs(
        collection(db, "groups", groupId, "payments")
      );
      for (const docu of paymentsSnap.docs) {
        await deleteDoc(docu.ref);
      }

      const peopleSnap = await getDocs(
        collection(db, "groups", groupId, "people")
      );
      for (const docu of peopleSnap.docs) {
        await deleteDoc(docu.ref);
      }

      await deleteDoc(doc(db, "groups", groupId));

      await Swal.fire({
        title: t("grupoEliminado"),
        icon: "success",
        iconColor: "#269181",
        timer: 1500,
        showConfirmButton: false,
        background: "#dee0e0",
        color: "#283655",
      });

      setGroupId(null);

    } catch (error) {
      console.error(error);
      Swal.fire({
        title: t("errorEliminar"),
        text: t("intentaNuevamente"),
        icon: "error",
        iconColor: "#269181",
        background: "#dee0e0",
        color: "#283655",
      });
    }
  };

  //Scroll secciones
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        document.activeElement?.blur();
      }, 300);
    }
  };


  //Traspasar administrador
  const handleAdminPinLogin = async () => {
    const result = await Swal.fire({
      title: t("queresSerAdministrador?"),
      text: t("ingresaPIN"),
      input: "password",
      background: "#dee0e0",
      color: "#283655",
      iconColor: "#269181",
      showCancelButton: true,
      confirmButtonColor: "#35b67e",
      confirmButtonText: t("confirmar"),
      cancelButtonText: t("cerrar"),
      inputAttributes: {
        maxlength: 4,
        inputmode: "numeric",
      },
      inputPlaceholder: t("pin4"),
    });

    if (!result.isConfirmed) return;

    const pin = result.value;


    if (!pin || !pin.trim()) {
      await Swal.fire({
        title: t("tenesIngresarPIN4"),
        icon: "warning",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        background: "#dee0e0",
        color: "#283655",
      });
      return;
    }
    if (pin !== group.adminPin) {
      await Swal.fire({
        title: t("PINIncorrecto"),
        icon: "error",
        iconColor: "#269181",
        confirmButtonColor: "#35b67e",
        background: "#dee0e0",
        color: "#283655",
      });
      return;
    }
    const { value: newName } = await Swal.fire({
      title: t("ingresaNombreAdmin"),
      input: "text",
      inputPlaceholder: t("tuNombre"),
      background: "#dee0e0",
      color: "#283655",
      confirmButtonColor: "#35b67e",
      confirmButtonText: t("confirmar"),
      cancelButtonText: t("cancelar"),
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return t("ingresarNombreAdmin");
        }
      },
    });

    if (!newName) return;

    Swal.fire({
      title: t("cambiandoAdmin"),
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


    await updateDoc(doc(db, "groups", groupId), {
      adminUid: user.uid,
      adminName: newName,
    });

    Swal.fire({
      title: t("ahoraSosAdmin"),
      icon: "success",
      iconColor: "#269181",
      confirmButtonColor: "#35b67e",
      background: "#dee0e0",
      color: "#283655",
      confirmButtonText: t("cerrar"),
    });
  };

  // Ver personas en tiempo real
  useEffect(() => {
    if (!groupId) return;

    const unsub = onSnapshot(
      collection(db, "groups", groupId, "people"),
      (snap) => {
        setPeople(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );
    return unsub;
  }, [groupId]);

  // Ver responsables en tiempo real
useEffect(() => {
  if (!groupId) {
    setResponsables([]);
    setResponsablesLoaded(false);
    return;
  }

  const unsub = onSnapshot(
    collection(db, "groups", groupId, "responsables"),
    (snap) => {
      setResponsables(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
      setResponsablesLoaded(true);
    },
    (error) => {
      console.error("Error al cargar responsables:", error);
    }
  );

  return unsub;
}, [groupId]);

// Identificar al responsable vinculado con esta cuenta
useEffect(() => {
  if (!groupId || !user?.uid || !responsablesLoaded) {
    setIdentificandoResponsable(true);
    return;
  }

  const responsable = responsables.find(
    (item) => item.linkedUid === user.uid
  );

  setResponsableVinculado(responsable || null);
  setIdentificandoResponsable(false);
}, [groupId, user?.uid, responsables, responsablesLoaded]);

// Ver hijos en tiempo real
useEffect(() => {
  if (!groupId) {
    setHijos([]);
    return;
  }

  const unsub = onSnapshot(
    collection(db, "groups", groupId, "hijos"),
    (snap) => {
      setHijos(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    },
    (error) => {
      console.error("Error al cargar hijos:", error);
    }
  );

  return unsub;
}, [groupId]);

// Agregar responsable
const addResponsibleToDB = async (responsable) => {
  if (!groupId) return;

  await addDoc(
    collection(db, "groups", groupId, "responsables"),
    {
      nombre: responsable.nombre.trim(),
      parentesco: responsable.parentesco.trim(),
    }
  );
};

// Editar responsable
const editResponsibleInDB = async (responsableId, data) => {
  if (!groupId) return;

  const ref = doc(
    db,
    "groups",
    groupId,
    "responsables",
    responsableId
  );

  await updateDoc(ref, {
    nombre: data.nombre.trim(),
    parentesco: data.parentesco.trim(),
  });
};

// Vincular la cuenta con un responsable
const handleSelectResponsible = async (event) => {
  event.preventDefault();

  const responsable = responsables.find(
    (item) => item.id === selectedResponsibleId
  );

  if (!responsable || !user?.uid || !groupId) return;

  setSavingResponsible(true);
  setResponsibleError("");

  try {
    const responsableRef = doc(
      db,
      "groups",
      groupId,
      "responsables",
      responsable.id
    );

    const profileRef = doc(
      db,
      "groups",
      groupId,
      "chatProfiles",
      user.uid
    );

    await runTransaction(db, async (transaction) => {
      const responsableSnap = await transaction.get(responsableRef);
      const profileSnap = await transaction.get(profileRef);

      if (!responsableSnap.exists()) {
        throw new Error("RESPONSABLE_NO_EXISTE");
      }

      const responsableData = responsableSnap.data();

      if (
        responsableData.linkedUid &&
        responsableData.linkedUid !== user.uid
      ) {
        throw new Error("RESPONSABLE_VINCULADO");
      }

      if (
        profileSnap.exists() &&
        profileSnap.data().responsableId &&
        profileSnap.data().responsableId !== responsable.id
      ) {
        throw new Error("CUENTA_YA_VINCULADA");
      }

      transaction.update(responsableRef, {
        linkedUid: user.uid,
        linkedAt: serverTimestamp(),
      });

      transaction.set(
        profileRef,
        {
          name: responsable.nombre,
          responsableId: responsable.id,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    setResponsableVinculado({
      ...responsable,
      linkedUid: user.uid,
    });

  } catch (err) {
    console.error("Error al vincular responsable:", err);

    if (err.message === "RESPONSABLE_VINCULADO") {
      setResponsibleError(
        "Este responsable ya está vinculado a otra cuenta."
      );
    } else if (err.message === "CUENTA_YA_VINCULADA") {
      setResponsibleError(
        "Esta cuenta ya está vinculada a otro responsable."
      );
    } else if (err.message === "RESPONSABLE_NO_EXISTE") {
      setResponsibleError(
        "El responsable seleccionado ya no existe."
      );
    } else {
      setResponsibleError(
        "No se pudo guardar la vinculación. Intentá nuevamente."
      );
    }
  } finally {
    setSavingResponsible(false);
  }
};


  // Agregar hijo
  const addChildToDB = async (hijo) => {
    if (!groupId) return;

    await addDoc(
      collection(db, "groups", groupId, "hijos"),
      {
        nombre: hijo.nombre.trim(),
        fechaNacimiento: hijo.fechaNacimiento,
      }
    );
  };

  // Editar hijo
  const editChildInDB = async (hijoId, data) => {
    if (!groupId) return;

    const ref = doc(
      db,
      "groups",
      groupId,
      "hijos",
      hijoId
    );

    await updateDoc(ref, {
      nombre: data.nombre.trim(),
      fechaNacimiento: data.fechaNacimiento,
    });
  };


  // Ver gastos en tiempo real
  useEffect(() => {
    if (!groupId) return;

    const unsub = onSnapshot(
      collection(db, "groups", groupId, "expenses"),
      (snap) => {
        setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );
    return unsub;
  }, [groupId]);

  //ver pago en tiemo real 
  useEffect(() => {
    if (!groupId) return;

    const unsub = onSnapshot(
      collection(db, "groups", groupId, "payments"),
      (snap) => {
        setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return unsub;
  }, [groupId]);

  // Agregar Persona
  const addPersonToDB = (person) =>
    addDoc(collection(db, "groups", groupId, "people"), person);

  // Borrar persona + gastos
  const deletePersonAndExpenses = async (person) => {
    await deleteDoc(doc(db, "groups", groupId, "people", person.id));

    const q = query(
      collection(db, "groups", groupId, "expenses"),
      where("payer", "==", person.name)
    );

    const snap = await getDocs(q);
    await Promise.all(
      snap.docs.map(d =>
        deleteDoc(doc(db, "groups", groupId, "expenses", d.id))
      )
    );
  };

  // Agregar Gasto
  const addExpenseToDB = (expense) =>
    addDoc(collection(db, "groups", groupId, "expenses"), expense);

  // Borrar Gasto
  const deleteExpenseFromDB = (expenseId) =>
    deleteDoc(doc(db, "groups", groupId, "expenses", expenseId));

  //Borrar TODOS los gastos del grupo
  const deleteAllExpenses = async () => {
    const q = query(
      collection(db, "groups", groupId, "expenses")
    );

    const snap = await getDocs(q);

    await Promise.all(
      snap.docs.map(d =>
        deleteDoc(doc(db, "groups", groupId, "expenses", d.id))
      )
    );
  };

  // Editar participante (cantidad + alias)
  const editPersonInDB = async (personId, data) => {
    const ref = doc(db, "groups", groupId, "people", personId);
    try {
      await updateDoc(ref, {
        count: Number(data.count),
        alias: data.alias.trim(),
      });
    } catch (error) {
      console.error(error);

    } finally {
      setLoading(false);
    }

  };

  //guardar pago
  const addPayment = async (payment) => {
    await addDoc(
      collection(db, "groups", groupId, "payments"),
      payment
    );
  };

  //Borrar todos los pagos
  const handleClearPayments = async () => {
    const result = await Swal.fire({
      title: t("eliminarTodosPagos?"),
      text: t("accionNoDeshacer"),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t("siEliminar"),
      cancelButtonText: t("cancelar"),
      confirmButtonColor: "#d33",
      iconColor: "#269181"
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: t("eliminandoPagos"),
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
      const paymentsRef = collection(db, "groups", groupId, "payments");

      const snapshot = await getDocs(paymentsRef);

      const batch = writeBatch(db);

      snapshot.forEach((docu) => {
        batch.delete(docu.ref);
      });

      await batch.commit();

      Swal.fire({
        title: t("pagosEliminados"),
        icon: "success",
        background: "#dee0e0",
        color: "#283655",
        confirmButtonColor: "#35b67e",
        confirmButtonText: t("cerrar"),
        iconColor: "#269181",
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

 

  // Salir del grupo
  const exitGroup = async () => {
    const result = await Swal.fire({
      title: t("salirGrupo"),
      text: t("seguroSalirGrupo?"),
      icon: "question",
      iconColor: "#269181",
      showCancelButton: true,
      confirmButtonText: t("salirGrupo"),
      cancelButtonText: t("cerrar"),
      confirmButtonColor: "#35b67e",
      background: "#dee0e0",
      color: "#283655",
    });

    if (!result.isConfirmed) return;
    Swal.fire({
      title: t("saliendoGrupo"),
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

    localStorage.removeItem("groupId");
    setGroupId(null);
    setPeople([]);
    setExpenses([]);

    Swal.fire({
      title: t("salisteGrupo"),
      icon: "success",
      timer: 1200,
      iconColor: "#269181",
      showConfirmButton: false,
      background: "#dee0e0",
      color: "#283655",
    });
  };

  
useEffect(() => {
  if (!groupId || !user?.uid) {
    setUnreadChat(0);
    return;
  }

  const messagesRef = collection(db, "groups", groupId, "messages");
  const profileRef = doc(
    db,
    "groups",
    groupId,
    "chatProfiles",
    user.uid
  );

  let messages = [];
  let lastReadMillis = 0;

  const updateUnreadCount = () => {
    if (activePage === "chat") {
      setUnreadChat(0);
      return;
    }

    const unread = messages.filter((item) => {
      if (item.senderUid === user.uid) return false;

      const createdAt = item.createdAt?.toMillis?.();
      return createdAt && createdAt > lastReadMillis;
    }).length;

    setUnreadChat(unread);
  };

  const unsubscribeMessages = onSnapshot(
    query(messagesRef, orderBy("createdAt", "asc")),
    (snapshot) => {
      messages = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      updateUnreadCount();
    },
    (error) => console.error("Error al contar mensajes:", error)
  );

  const unsubscribeProfile = onSnapshot(
    profileRef,
    (snapshot) => {
      lastReadMillis =
        snapshot.data()?.lastReadAt?.toMillis?.() || 0;

      updateUnreadCount();
    },
    (error) => console.error("Error al leer el perfil del chat:", error)
  );

  return () => {
    unsubscribeMessages();
    unsubscribeProfile();
  };
}, [groupId, user?.uid, activePage]);


  //Bienvenida
  if (!started && !groupId) {
    return (
      <div className="app welcome">
        <LanguageSelector />
        <img src="logo.png" alt="Cuentas Claras" className="logo" />
        <h2>{t("slogan")}</h2>
        <h3>{t("slogan2")}</h3>
        <button className="boton" onClick={() => setStarted(true)}>
          {t("ingresar")}
        </button>
      </div>
    );
  }

  // Pantalla crear/Entrar a grupo
  if (!groupId) {
    return (
      <div className="app">
        <p>{t("slogan")}</p>
        <img src="logo.png" alt="Vamo&Vamo" className="Create" />

        <CreateGroup
          user={user}
          onGroupCreated={({ groupId, groupName, hasAdmin }) => {
            setGroupId(groupId);
            setGroupName(groupName);
          }}
        />
      </div>
    );
  }

  // Esperar a que Firebase y los responsables estén cargados
if (!user?.uid || identificandoResponsable) {
  return (
    <div className="app">
      <p>Cargando...</p>
    </div>
  );
}

// Seleccionar responsable si la cuenta todavía no está vinculada
if (!responsableVinculado && responsables.length >= 2) {
  return (
    <div className="app">
      <div className="responsible-selection">
        <h2>Identificación familiar</h2>

        <p>Seleccioná quién está utilizando la aplicación.</p>

        {responsables.length === 0 ? (
          <p>
            Todavía no hay responsables cargados.
            Primero hay que agregarlos a la familia.
          </p>
        ) : (
          <form onSubmit={handleSelectResponsible}>
            <label htmlFor="responsible-select">
              ¿Quién sos?
            </label>

            <select
              id="responsible-select"
              value={selectedResponsibleId}
              onChange={(event) =>
                setSelectedResponsibleId(event.target.value)
              }
              required
            >
              <option value="">Seleccioná tu nombre</option>

              {responsables.map((responsable) => (
                <option
                  key={responsable.id}
                  value={responsable.id}
                  disabled={
                    responsable.linkedUid &&
                    responsable.linkedUid !== user.uid
                  }
                >
                  {responsable.nombre} — {responsable.parentesco}
                  {responsable.linkedUid &&
                    responsable.linkedUid !== user.uid
                    ? " (Vinculado)"
                    : ""}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={savingResponsible || !selectedResponsibleId}
            >
              {savingResponsible
                ? "Guardando..."
                : "Continuar"}
            </button>
          </form>
        )}

        {responsibleError && (
          <p className="chat-error">{responsibleError}</p>
        )}
      </div>
    </div>
  );
}

  
if (activePage === "chat" && bothResponsiblesLinked) {
  return (
    <div className="app chat-screen">
      <button
        type="button"
        className="chat-back-button"
        onClick={() => setActivePage("home")}
      >
        <i className="fa-solid fa-arrow-left"></i>
        {" "}Volver
      </button>

      <Chat
  groupId={groupId}
  user={user}
  responsables={responsables}
/>
    </div>
  );
}

if (activePage === "agenda" && bothResponsiblesLinked) {
  return (
    <div className="app">
      <button
        type="button"
        className="chat-back-button"
        onClick={() => setActivePage("home")}
      >
        <i className="fa-solid fa-arrow-left"></i>
        {" "}Volver
      </button>

      <Agenda groupId={groupId} user={user} hijos={hijos} responsables={responsables}/>
    </div>
  );
}


  return (
    
    <div className="app">
    
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        {/* <div style={{ marginBottom: "10px" }}>
  <button onClick={() => changeLang("es")}>ES</button>
  <button onClick={() => changeLang("en")}>EN</button>
  <button onClick={() => changeLang("pt")}>PT</button>
  <button onClick={() => changeLang("fr")}>FR</button></div> */}
  {/* <LanguageSelector /> */}
</div>
     
      {/* <div id="section-agenda">
  <Agenda groupId={groupId} user={user} />
</div> */}

      <img src="logo.png" alt="Cuentas Claras" className="Create" />
 <p>{t("slogan")}</p>
   

      <h1 className="group-title">{groupName}</h1>
      <p className="group-code">
        <strong>{groupCode}</strong>
      </p>
      {group?.adminUid && (
        <p className="admin-label">
          {t("administrador")}: <strong>{group.adminName}</strong>
          {isAdmin && " (vos)"}
        </p>
      )}

      <Home
  groupName={groupName}
  responsables={responsables}
  hijos={hijos}
  canEdit={canEdit}
  onAddResponsible={addResponsibleToDB}
  onEditResponsible={editResponsibleInDB}
  onAddChild={addChildToDB}
  onEditChild={editChildInDB}
  onOpenChild={(hijo) => {
    console.log("Hijo seleccionado:", hijo);
  }}
/>

   {bothResponsiblesLinked && (
  <div id="section-notifications">
    <Notifications
      groupId={groupId}
      user={user}
      onUnreadCountChange={setUnreadNotifications}
    />
  </div>
)}  

      <AddPerson
        people={people}
        addPersonToDB={addPersonToDB}
        deletePerson={deletePersonAndExpenses}
        editPersonInDB={editPersonInDB}
        group={group}
        isAdminMode={isAdminMode}
        canEdit={canEdit}
      />

      <AddExpense
        people={people}
        expenses={expenses}
        addExpenseToDB={addExpenseToDB}
        deleteExpenseFromDB={deleteExpenseFromDB}
        deleteAllExpenses={deleteAllExpenses}
        group={group}
        isAdminMode={isAdminMode}
        canEdit={canEdit}
      />

      <BalanceList
        people={people}
        expenses={expenses}
        payments={payments}
        debts={debts}
        group={group}
        onPayDebt={addPayment}
        groupId={groupId}
        isAdminMode={isAdminMode}
        canEdit={canEdit}
        handleClearPayments={handleClearPayments}
      />


      {groupId && (
        <div className="bottom-bar">


          <div className="bottom-icon" onClick={() => scrollToSection("section-people")}>
            <i className="fa-solid fa-person-circle-plus"></i>
            <small>{t("persona")}</small>
          </div>

          <div className="bottom-icon" onClick={() => scrollToSection("section-expense")}>
            <i className="fa-solid fa-circle-plus"></i>
            <small>{t("gasto")}</small>
          </div>

          <div className="bottom-icon" onClick={() => scrollToSection("section-balance")}>
            <i className="fa-solid fa-calculator"></i>
            <small>{t("balance")}</small>
          </div>

          
<div
  className={`bottom-icon ${!bothResponsiblesLinked ? "disabled" : ""}`}
  onClick={() => setActivePage("chat")}
>
  <i className="fa-solid fa-comments"></i>
  <small>Chat</small>

  {unreadChat > 0 && (
    <span className="notification-badge">
      {unreadChat > 99 ? "99+" : unreadChat}
    </span>
  )}
</div>


        
<div
  className={`bottom-icon ${!bothResponsiblesLinked ? "disabled" : ""}`}
  onClick={() => {
    if (!bothResponsiblesLinked) return;
    setActivePage("agenda");
  }}
>
  <i className="fa-solid fa-calendar-days"></i>
  <small>Agenda</small>
</div>


<div
  className={`bottom-icon ${!bothResponsiblesLinked ? "disabled" : ""}`}
  onClick={() => scrollToSection("section-notifications")}
>
  <i className="fa-solid fa-bell"></i>
  <small>Avisos</small>

  {unreadNotifications > 0 && (
    <span className="notification-badge">
      {unreadNotifications > 99 ? "99+" : unreadNotifications}
    </span>
  )}
</div>

          
<div 
  className="bottom-icon" onClick={(e) => {e.stopPropagation(); toggleMenu();}}>
        
  <i className="fa-solid fa-gear"></i>
  <small>{t("mas")}</small>
</div>
{showMenu && (
  <div className="settings-menu" ref={menuRef}>
    
{group?.adminUid && group.adminUid !== user?.uid && (
            <div className="bottom-icon bottom-icon-inline" onClick={handleAdminPinLogin}>
              <i className="fa-solid fa-crown"></i>
              <small> {t("cambiarAdmin")}</small>
            </div>
          )}
       <div className="bottom-icon bottom-icon-inline" onClick={exitGroup}>
            <i className="fa-solid fa-house"></i>
            <small> {t("salirGrupo")}</small>
          </div>   
    

    <div className="bottom-icon bottom-icon-inline" onClick={handleDeleteGroup}>
  <i className="fa-solid fa-trash-arrow-up"></i>
  <small> {t("eliminarGrupo")}</small>
</div>   

<div className="bottom-icon bottom-icon-inline" onClick={() => setShowLang(!showLang)}>
  <i className="fa-solid fa-comments"></i>
  <small> {t("idioma")}</small>
</div>

{showLang && (
  <LanguageSelector direction="vertical" />
)}
    

  </div>
)}         
        </div> 
      )}      
    </div>
  );

}

export default App;









