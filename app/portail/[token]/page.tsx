'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';

export default function PortailFournisseur({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [valide, setValide] = useState(false);
  const [fournisseur, setFournisseur] = useState<any>(null);
  const [commandes, setCommandes] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    verifierToken();
  }, [token]);

  async function verifierToken() {
    const { data: lien } = await supabase
      .from('liens_acces')
      .select('*, fournisseurs(*)')
      .eq('token_secret', token)
      .single();

    if (lien && new Date(lien.date_expiration) > new Date()) {
      setValide(true);
      setFournisseur(lien.fournisseurs);
      
      const { data: cmdData } = await supabase
        .from('commandes')
        .select('*, lignes_commande(*), documents(*)')
        .eq('fournisseur_id', lien.fournisseur_id);

      if (cmdData) setCommandes(cmdData);
    }
    setLoading(false);
  }

  async function confirmerLigne(ligneId: string) {
    await supabase
      .from('lignes_commande')
      .update({ statut_confirmation: 'confirme' })
      .eq('id', ligneId);

    alert('Ligne confirmée avec succès !');
    verifierToken();
  }

  async function uploaderDocument(e: React.ChangeEvent<HTMLInputElement>, commandeId: string, typeDoc: string) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const filePath = `${commandeId}/${Date.now()}_${file.name}`;
      
      // 1. Upload du fichier dans Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Enregistrement dans la table 'documents'
      const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('documents').insert([{
        commande_id: commandeId,
        type_document: typeDoc,
        nom_fichier: file.name,
        url_fichier: publicUrlData.publicUrl
      }]);

      if (dbError) throw dbError;

      alert(`Document (${typeDoc}) téléversé avec succès !`);
      verifierToken();
    } catch (err: any) {
      alert("Erreur lors du téléversement : " + (err.message || "Assurez-vous que le bucket 'documents' est bien créé."));
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-600">Vérification du lien sécurisé...</div>;
  if (!valide) return <div className="p-8 text-center text-red-600 font-bold">Ce lien est invalide ou expiré.</div>;

  return (
    <main className="p-8 max-w-4xl mx-auto font-sans bg-slate-50 min-h-screen text-slate-900">
      <header className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">Portail Fournisseur — {fournisseur?.nom}</h1>
        <p className="text-slate-500 text-sm mt-1">Espace sécurisé de gestion et confirmation de vos commandes.</p>
      </header>

      <section className="space-y-6">
        {commandes.map(c => (
          <div key={c.id} className="border border-slate-200 p-6 rounded-xl shadow-sm bg-white space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-semibold text-lg text-slate-800">Commande #{c.id.slice(0, 8)}</h3>
              <span className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium uppercase">
                {c.statut}
              </span>
            </div>

            {/* Lignes de commande */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">Produits à valider :</h4>
              {c.lignes_commande.map((ligne: any) => (
                <div key={ligne.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
                  <div>
                    <p className="font-medium text-slate-800">{ligne.produit}</p>
                    <p className="text-sm text-slate-600">Quantité: {ligne.quantite} | Prix: {ligne.prix}€</p>
                    <p className="text-xs text-slate-500 mt-1">Livraison prévue: {ligne.date_livraison_prevue}</p>
                  </div>
                  <div>
                    {ligne.statut_confirmation === 'confirme' ? (
                      <span className="text-green-600 font-bold text-sm bg-green-50 px-3 py-1 rounded-md border border-green-200">
                        ✓ Confirmé
                      </span>
                    ) : (
                      <button
                        onClick={() => confirmerLigne(ligne.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
                      >
                        Confirmer la ligne
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Gestion des documents */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">Documents associés :</h4>
              
              {/* Liste des documents existants */}
              {c.documents && c.documents.length > 0 ? (
                <ul className="space-y-2">
                  {c.documents.map((doc: any) => (
                    <li key={doc.id} className="flex justify-between items-center text-sm bg-slate-100 p-2 rounded">
                      <span className="font-medium text-slate-700">[{doc.type_document}] {doc.nom_fichier}</span>
                      <a href={doc.url_fichier} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">
                        Télécharger / Voir
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">Aucun document déposé pour le moment.</p>
              )}

              {/* Formulaire d'upload de document */}
              <div className="flex items-center gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
                <span className="text-xs font-medium text-blue-900">Déposer un document (Devis / Facture) :</span>
                <input 
                  type="file" 
                  disabled={uploading}
                  onChange={(e) => uploaderDocument(e, c.id, 'devis')}
                  className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}