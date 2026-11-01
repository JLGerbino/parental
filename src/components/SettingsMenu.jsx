import { useState } from "react";
import LanguageSelector from "./languageSelector";

const SettingsMenu = ({
  menuRef,
  groupName,
  groupCode,
  onExitGroup,
  onDeleteGroup,
}) => {
  const [showGroupData, setShowGroupData] = useState(false);
  const [showLang, setShowLang] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(groupCode);
    } catch (error) {
      console.error("No se pudo copiar el código:", error);
    }
  };

  return (
    <div className="settings-menu" ref={menuRef}>

      <div
        className="bottom-icon bottom-icon-inline"
        onClick={() => {
          setShowGroupData(!showGroupData);
          setShowLang(false);
        }}
      >
        <i className="fa-solid fa-users"></i>
        <small>Datos del grupo</small>
        <i className={`fa-solid fa-chevron-${showGroupData ? "up" : "down"}`}></i>
      </div>

      {showGroupData && (
        <div className="group-data-panel">
          <p>
            <strong>Nombre:</strong> {groupName || "Sin nombre"}
          </p>

          <div className="group-code-row">
            <p>
              <strong>Código:</strong> {groupCode || "Sin código"}
            </p>

            <button type="button" onClick={copyCode}>
              <i className="fa-solid fa-copy"></i>
              Copiar
            </button>
          </div>
        </div>
      )}

      <div
        className="bottom-icon bottom-icon-inline"
        onClick={onExitGroup}
      >
        <i className="fa-solid fa-house"></i>
        <small>Salir del grupo</small>
      </div>

      <div
        className="bottom-icon bottom-icon-inline"
        onClick={onDeleteGroup}
      >
        <i className="fa-solid fa-trash-arrow-up"></i>
        <small>Eliminar grupo</small>
      </div>

      <div
        className="bottom-icon bottom-icon-inline"
        onClick={() => {
          setShowLang(!showLang);
          setShowGroupData(false);
        }}
      >
        <i className="fa-solid fa-language"></i>
        <small>Idioma</small>
      </div>

      {showLang && (
        <LanguageSelector direction="vertical" />
      )}

    </div>
  );
};

export default SettingsMenu;
