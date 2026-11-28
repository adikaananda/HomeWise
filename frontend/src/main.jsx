import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PenyediaAuth } from "./lib/auth";
import { PenyediaKonfigurasi } from "./lib/konfigurasi";
import { PenyediaNotifikasi } from "./lib/notifikasi";
import { PenyediaRouter } from "./lib/router";
import "./gaya/token.css";
import "./gaya/dasar.css";
import "./gaya/komponen.css";
import "./gaya/tata-letak.css";
import "./gaya/beranda.css";
import "./gaya/halaman.css";
import "./gaya/peta-harga.css";
import "./gaya/imersif.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PenyediaRouter>
      <PenyediaKonfigurasi>
        <PenyediaAuth>
          <PenyediaNotifikasi>
            <App />
          </PenyediaNotifikasi>
        </PenyediaAuth>
      </PenyediaKonfigurasi>
    </PenyediaRouter>
  </StrictMode>,
);
