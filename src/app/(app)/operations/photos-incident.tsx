"use client";

import { useState } from "react";
import { Notice } from "@/components/ui";
import { PhotosOps, type PhotoVue } from "./checklist-vue";

export function PhotosIncident({ id, photos, modifiable }: { id: string; photos: PhotoVue[]; modifiable: boolean }) {
  const [erreur, setErreur] = useState("");
  return (
    <div className="space-y-3">
      <PhotosOps cible="incident" id={id} photos={photos} modifiable={modifiable} libelle={photos.length ? "Ajouter une photo" : "Prendre une photo"} onErreur={setErreur} />
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}
