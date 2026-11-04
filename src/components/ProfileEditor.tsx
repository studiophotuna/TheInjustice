"use client";

// Minimal profile editing: a photo and a short introduction. The photo is shrunk to a 160×160
// JPEG in the browser before it's sent, so it stays small.

import { Camera, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { PlayerAvatar } from "./art/Portraits";
import type { GameApi } from "./useGame";

const SIZE = 160;
const BIO_MAX = 160;

async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("bad image"));
      i.src = url;
    });
    // Centre square crop, then scale down.
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ProfileEditor({ game }: { game: GameApi }) {
  const view = game.view!;
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(view.profile.bio ?? "");
  const [photo, setPhoto] = useState<string | null>(view.profile.photo);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  if (!editing) {
    return (
      <section className="card profile-card">
        <div className="row between">
          <h3 className="card-title"><Pencil size={16} /> Your profile</h3>
          <button className="btn btn-ghost btn-xs" onClick={() => { setBio(view.profile.bio ?? ""); setPhoto(view.profile.photo); setEditing(true); }}>Edit</button>
        </div>
        <div className="row profile-preview">
          <PlayerAvatar name={view.name} path={view.path?.id} photo={view.profile.photo} className="avatar-md" />
          <p className={view.profile.bio ? "" : "muted"}>{view.profile.bio ? `“${view.profile.bio}”` : "No introduction yet. Tell people who you are, or who you want them to think you are."}</p>
        </div>
        <p className="fine muted">Other players see this in People. Your street name can&apos;t be changed: the police already know it.</p>
      </section>
    );
  }

  return (
    <section className="card profile-card">
      <h3 className="card-title"><Pencil size={16} /> Your profile</h3>
      <div className="row profile-preview">
        <PlayerAvatar name={view.name} path={view.path?.id} photo={photo} className="avatar-md" />
        <div className="row wrap">
          <button className="btn btn-ghost btn-sm" onClick={() => file.current?.click()}><Camera size={14} /> {photo ? "Change photo" : "Add a photo"}</button>
          {photo && <button className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}><Trash2 size={14} /> Remove</button>}
        </div>
        <input
          ref={file}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              setError(null);
              setPhoto(await shrink(f));
            } catch {
              setError("That image couldn't be read.");
            }
          }}
        />
      </div>
      <label className="field">
        <span className="crime-label">Introduction</span>
        <textarea maxLength={BIO_MAX} rows={3} value={bio} placeholder="A line or two about your character." onChange={(e) => setBio(e.target.value)} />
        <span className="fine muted">{bio.length}/{BIO_MAX}</span>
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="row">
        <button
          className="btn btn-primary btn-sm"
          disabled={game.busy}
          onClick={async () => {
            const changed: Record<string, unknown> = { type: "profile", bio };
            if (photo !== view.profile.photo) changed.photo = photo;
            const v = await game.act(changed as never);
            if (v) setEditing(false);
          }}
        >
          Save
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </section>
  );
}
