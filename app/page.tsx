'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [commandes, setCommandes] = useState<any[]>([]);
  const [lignes, setLignes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Formulaire nouvelle commande
  const [nomFournisseur, setNomFournisseur] = useState('');
  const [emailFournisseur, setEmailFournisseur] = useState('');
  const [produit, setProduit] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [prix, setPrix] = useState(100);
  const [dateLivraison, setDateLivraison] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: fData } = await supabase.from('fournisseurs').select('*');
      const { data: cData } = await supabase.from('commandes').select('*, fournisseurs(*), lignes_commande(*), documents(*)');
      const { data: lData } = await supabase.from('lignes_commande').select('*');

      if (fData) setFournisseurs(fData);
      if (cData) setCommandes(cData);
      if (lData) setLignes(lData);
    } catch (err) {
      console.error("Erreur chargement:", err);
    }
    setLoading(false);
  }

  async function creerCommande(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Créer ou mettre à jour le fournisseur
      let fournisseurExist = fournisseurs.find(f => f.email === emailFournisseur);
      let fournisseurId = fournisseurExist?.id;

      if (fournisseurExist) {
        // Mettre à jour le nom si l'email existe déjà
        const { error: errUpdate } = await supabase
          .from('fournisseurs')
          .update({ nom: nomFournisseur })
          .eq('id', fournisseurId);

        if (errUpdate) throw errUpdate;
      } else {
        // Créer un nouveau fournisseur s'il n'existe pas
        const { data: newF, error: errF } = await supabase
          .from('fournisseurs')
          .insert([{ nom: nomFournisseur, email: emailFournisseur }])
          .select()
          .single();
        
        if (errF) throw errF;
        if (newF) fournisseurId = newF.id;
      }

      // 2. Créer la commande
      const { data: newC, error: errC } = await supabase
        .from('commandes')
        .insert([{ fournisseur_id: fournisseurId, statut: 'en_attente' }])
        .select()
        .single();

      if (errC) throw errC;

      if (newC) {
        // 3. Créer la ligne de commande
        const { error: errL } = await supabase.from('lignes_commande').insert([{
          commande_id: newC.id,
          produit,
          quantite,
          prix,
          date_livraison_prevue: dateLivraison
        }]);

        if (errL) throw errL;

        // 4. Générer le token d'accès
        const token = crypto.randomUUID();
        const dateExp = new Date();
        dateExp.setDate(dateExp.getDate() + 30);

        const { error: errAcc } = await supabase.from('liens_acces').insert([{
          fournisseur_id: fournisseurId,
          token_secret: token,
          date_expiration: dateExp.toISOString()
        }]);

        if (errAcc) throw errAcc;

        alert(`Commande créée avec succès !\nLien magique : ${window.location.origin}/portail/${token}`);
        
        // Reset form
        setNomFournisseur('');
        setEmailFournisseur('');
        setProduit('');
        fetchData();
      }
    } catch (error: any) {
      alert("Erreur lors de la création : " + (error.message || JSON.stringify(error)));
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  // Fonction d'annulation de commande
  async function annulerCommande(commandeId: string) {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) return;

    try {
      const { error } = await supabase
        .from('commandes')
        .update({ statut: 'annulee' })
        .eq('id', commandeId);

      if (error) throw error;

      alert("Commande annulée avec succès !");
      fetchData();
    } catch (error: any) {
      alert("Erreur lors de l'annulation : " + (error.message || JSON.stringify(error)));
    }
  }

  // Calcul du Scorecard pour un fournisseur donné
  function calculerScorecard(fournisseurId: string) {
    const cmdsFournisseur = commandes.filter(c => c.fournisseur_id === fournisseurId);
    if (cmdsFournisseur.length === 0) return { totalCmds: 0, confirmationRate: 0, scoreGrade: 'N/A' };

    let totalLignes = 0;
    let lignesConfirmees = 0;

    cmdsFournisseur.forEach(c => {
      if (c.lignes_commande) {
        totalLignes += c.lignes_commande.length;
        lignesConfirmees += c.lignes_commande.filter((l: any) => l.statut_confirmation === 'confirme').length;
      }
    });

    const confirmationRate = totalLignes > 0 ? Math.round((lignesConfirmees / totalLignes) * 100) : 0;
    
    let scoreGrade = 'C (Faible)';
    if (confirmationRate >= 80) scoreGrade = 'A (Excellent)';
    else if (confirmationRate >= 50) scoreGrade = 'B (Moyen)';

    return { totalCmds: cmdsFournisseur.length, confirmationRate, scoreGrade };
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-900 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-slate-800">E2 — Portail Acheteur</h1>

        {/* Section Création de Commande */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Créer une nouvelle commande</h2>
          <form onSubmit={creerCommande} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Nom Fournisseur</label>
              <input type="text" className="w-full border border-slate-300 p-2 rounded bg-white text-slate-900" value={nomFournisseur} onChange={e => setNomFournisseur(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Email Fournisseur</label>
              <input type="email" className="w-full border border-slate-300 p-2 rounded bg-white text-slate-900" value={emailFournisseur} onChange={e => setEmailFournisseur(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Produit</label>
              <input type="text" className="w-full border border-slate-300 p-2 rounded bg-white text-slate-900" value={produit} onChange={e => setProduit(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Quantité</label>
              <input type="number" className="w-full border border-slate-300 p-2 rounded bg-white text-slate-900" value={quantite} onChange={e => setQuantite(Number(e.target.value))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Prix (€)</label>
              <input type="number" className="w-full border border-slate-300 p-2 rounded bg-white text-slate-900" value={prix} onChange={e => setPrix(Number(e.target.value))} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Date de livraison prévue</label>
              <input type="date" className="w-full border border-slate-300 p-2 rounded bg-white text-slate-900" value={dateLivraison} onChange={e => setDateLivraison(e.target.value)} required />
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              className="md:col-span-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium transition disabled:bg-blue-300"
            >
              {submitting ? 'Traitement en cours...' : 'Générer Commande & Lien Fournisseur'}
            </button>
          </form>
        </section>

        {/* Liste des Commandes et Documents */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Liste des Commandes & Documents</h2>
          {loading ? <p className="text-slate-500">Chargement...</p> : (
            <div className="space-y-4">
              {commandes.length === 0 ? (
                <p className="text-slate-500 italic">Aucune commande enregistrée pour le moment.</p>
              ) : (
                commandes.map(c => (
                  <div key={c.id} className="border border-slate-200 p-4 rounded-lg bg-slate-50 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-bold text-slate-800">{c.fournisseurs?.nom || 'Fournisseur Inconnu'} <span className="font-normal text-sm text-slate-500">({c.fournisseurs?.email})</span></p>
                        <p className="text-sm text-slate-600">
                          Produit: <span className="font-medium">{c.lignes_commande[0]?.produit}</span> | Qté: {c.lignes_commande[0]?.quantite} | Prix: {c.lignes_commande[0]?.prix}€
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs rounded-full font-semibold ${
                          c.statut === 'annulee' ? 'bg-red-100 text-red-800' :
                          c.lignes_commande[0]?.statut_confirmation === 'confirme' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {c.statut === 'annulee' ? '🚫 Annulée' : c.lignes_commande[0]?.statut_confirmation === 'confirme' ? '✓ Confirmée' : 'En attente'}
                        </span>
                        {c.statut !== 'annulee' && (
                          <button 
                            onClick={() => annulerCommande(c.id)}
                            className="px-3 py-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium transition"
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Documents déposés */}
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-slate-700">Documents :</p>
                      {c.documents && c.documents.length > 0 ? (
                        c.documents.map((doc: any) => (
                          <div key={doc.id} className="flex justify-between bg-white p-2 rounded border border-slate-200">
                            <span>📄 [{doc.type_document}] {doc.nom_fichier}</span>
                            <a href={doc.url_fichier} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Voir le fichier</a>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 italic">Aucun document déposé par le fournisseur.</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Scorecard Fournisseurs */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">📊 Scorecard & Évaluation des Fournisseurs</h2>
          {fournisseurs.length === 0 ? (
            <p className="text-slate-500 italic">Aucun fournisseur répertorié.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <th className="p-3">Fournisseur</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Total Commandes</th>
                    <th className="p-3">Taux de Confirmation</th>
                    <th className="p-3">Grade Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {fournisseurs.map(f => {
                    const scorecard = calculerScorecard(f.id);
                    return (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-800">{f.nom}</td>
                        <td className="p-3 text-slate-600">{f.email}</td>
                        <td className="p-3 text-slate-800">{scorecard.totalCmds}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${scorecard.confirmationRate}%` }}></div>
                            </div>
                            <span className="font-semibold text-xs">{scorecard.confirmationRate}%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 text-xs rounded-md font-bold ${
                            scorecard.scoreGrade.startsWith('A') ? 'bg-green-100 text-green-800' :
                            scorecard.scoreGrade.startsWith('B') ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {scorecard.scoreGrade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}