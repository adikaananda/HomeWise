let janjiSnap = null;

export function muatSnap(clientKey, produksi) {
  if (window.snap) return Promise.resolve(window.snap);
  if (janjiSnap) return janjiSnap;

  janjiSnap = new Promise((selesai, gagal) => {
    const skrip = document.createElement("script");
    skrip.src = produksi ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js";
    skrip.setAttribute("data-client-key", clientKey);
    skrip.async = true;
    skrip.onload = () => selesai(window.snap);
    skrip.onerror = () => {
      janjiSnap = null;
      gagal(new Error("Gagal memuat Midtrans Snap."));
    };
    document.head.appendChild(skrip);
  });
  return janjiSnap;
}

export async function bukaSnap(snapToken, { clientKey, produksi }) {
  const snap = await muatSnap(clientKey, produksi);
  return new Promise((selesai) => {
    snap.pay(snapToken, {
      onSuccess: () => selesai("lunas"),
      onPending: () => selesai("menunggu"),
      onError: () => selesai("gagal"),
      onClose: () => selesai("ditutup"),
    });
  });
}
