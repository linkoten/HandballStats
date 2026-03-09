"use client";

import { useState } from "react";
import { createEquipe } from "@/app/actions/equipe-actions";

export function AddEquipeModalButton({ clubId }: { clubId: number }) {
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await createEquipe({ nom, clubId });
      if (res.success) {
        setSuccess(true);
        setNom("");
        setOpen(false);
      } else {
        setError(res.error || "Erreur inconnue");
      }
    } catch (err: any) {
      setError(err.message || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => setOpen(true)}
      >
        Ajouter une équipe
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Nouvelle équipe</h2>
            <form onSubmit={handleSubmit}>
              <label className="block mb-2">
                Nom de l'équipe
                <input
                  type="text"
                  className="mt-1 block w-full border rounded px-2 py-1"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </label>
              {error && <div className="text-red-600 mb-2">{error}</div>}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-3 py-1 rounded border"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading || !nom.trim()}
                >
                  {loading ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
