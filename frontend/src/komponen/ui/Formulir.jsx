import { useId } from "react";

function Bidang({ label, bantuan, galat, id, children }) {
  return (
    <div className="isian">
      {label && (
        <label className="isian__label" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {galat ? (
        <span className="isian__galat" id={`${id}-galat`}>
          {galat}
        </span>
      ) : (
        bantuan && <span className="isian__bantuan">{bantuan}</span>
      )}
    </div>
  );
}

export function Isian({ label, bantuan, galat, awalan, ...sisa }) {
  const idOtomatis = useId();
  const id = sisa.id || idOtomatis;
  const kontrol = (
    <input
      id={id}
      className="kontrol"
      aria-invalid={galat ? "true" : undefined}
      aria-describedby={galat ? `${id}-galat` : undefined}
      {...sisa}
    />
  );
  return (
    <Bidang label={label} bantuan={bantuan} galat={galat} id={id}>
      {awalan ? (
        <div className="kontrol-awalan">
          <span>{awalan}</span>
          {kontrol}
        </div>
      ) : (
        kontrol
      )}
    </Bidang>
  );
}

export function Pilihan({ label, bantuan, galat, opsi = [], ...sisa }) {
  const idOtomatis = useId();
  const id = sisa.id || idOtomatis;
  return (
    <Bidang label={label} bantuan={bantuan} galat={galat} id={id}>
      <select id={id} className="kontrol" aria-invalid={galat ? "true" : undefined} {...sisa}>
        {opsi.map((o) => (
          <option key={o.nilai} value={o.nilai}>
            {o.label}
          </option>
        ))}
      </select>
    </Bidang>
  );
}

export function AreaTeks({ label, bantuan, galat, ...sisa }) {
  const idOtomatis = useId();
  const id = sisa.id || idOtomatis;
  return (
    <Bidang label={label} bantuan={bantuan} galat={galat} id={id}>
      <textarea id={id} className="kontrol" aria-invalid={galat ? "true" : undefined} {...sisa} />
    </Bidang>
  );
}

export function Segmen({ opsi, nilai, onUbah, label }) {
  return (
    <div className="segmen" role="group" aria-label={label}>
      {opsi.map((o) => (
        <button key={o.nilai} type="button" aria-pressed={nilai === o.nilai} onClick={() => onUbah(o.nilai)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
