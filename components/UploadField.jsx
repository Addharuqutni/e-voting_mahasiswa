"use client";
import { useState } from "react";

// Upload row: the native input is visually hidden inside a label, so the whole
// row is one target. The uploaded URL travels through a hidden field.
export default function UploadField({ name, kind, label, initial }) {
  const [value, setValue] = useState(initial ?? "");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isPhoto = kind === "photo";

  async function upload(file) {
    setBusy(true); setErr("");
    const body = new FormData();
    body.set("file", file); body.set("kind", kind);
    try {
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload gagal");
      setValue(json.url);
    } catch (e) {
      setErr(e.message || "Upload gagal");
    } finally {
      setBusy(false);
    }
  }

  const status = busy ? "Mengunggah..." : err ? err : fileName || (value ? "File tersimpan" : "Belum ada file");

  return (
    <div className="form-group">
      <label>{label}</label>
      <input type="hidden" name={name} value={value} />
      <label className="upload">
        <input
          type="file"
          accept={kind === "cv" ? "application/pdf" : "image/*"}
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            setFileName(file.name);
            upload(file);
          }}
        />
        {isPhoto && value ? (
          <img className="upload-thumb" src={value} alt="" />
        ) : (
          <span className="upload-thumb thumb-empty" aria-hidden="true"><i className="fas fa-cloud-upload-alt" /></span>
        )}
        <span className="upload-text">
          <span className="upload-pick">Pilih file</span>
          <span className={`upload-status${busy ? " is-busy" : err ? " is-error" : ""}`}>{status}</span>
        </span>
      </label>
    </div>
  );
}
