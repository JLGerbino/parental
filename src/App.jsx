import { useState, useEffect, useRef } from "react";
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
        <img src="logo.png" alt="Cuentas Claras" className="Create" />

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
      <p>{t("slogan")}</p>
      <img src="logo.png" alt="Cuentas Claras" className="Create" />

   

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









