import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";

export function Modal({ terbuka, onTutup, judul, deskripsi, lebar, children, aksi }) {
  const idJudul = useId();
  const panel = useRef(null);
  const tutup = useRef(onTutup);
  tutup.current = onTutup;

  useEffect(() => {
    if (!terbuka) return;
    const fokusSebelum = document.activeElement;
    const saatTombol = (e) => e.key === "Escape" && tutup.current?.();
    document.addEventListener("keydown", saatTombol);
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", saatTombol);
      document.body.style.overflow = "";
      fokusSebelum?.focus?.();
    };
  }, [terbuka]);

  if (!terbuka) return null;

  return createPortal(
    <div className="modal-latar" onMouseDown={(e) => e.target === e.currentTarget && onTutup?.()}>
      <div
        ref={panel}
        className={`modal ${lebar ? "modal--lebar" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        tabIndex={-1}
      >
        <div className="modal__kepala">
          <div>
            <h2 id={idJudul} style={{ fontSize: "var(--teks-xl)" }}>
              {judul}
            </h2>
            {deskripsi && <p className="teks-redup teks-kecil" style={{ marginTop: 6 }}>{deskripsi}</p>}
          </div>
          {onTutup && (
            <button type="button" className="modal__tutup" onClick={onTutup} aria-label="Tutup">
              <LuX />
            </button>
          )}
        </div>
        {children}
        {aksi && <div className="modal__aksi">{aksi}</div>}
      </div>
    </div>,
    document.body,
  );
}
