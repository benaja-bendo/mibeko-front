import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Page d'accueil permettant à l'utilisateur de saisir l'ID d'un document.
 */
export default function Home() {
  const [docId, setDocId] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (docId.trim()) {
      navigate(`/editor/viewer/${docId.trim()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-bg text-t1 font-body">
      <div className="max-w-md w-full p-8 bg-s1 border border-b1 rounded-xl shadow-2xl">
        <div className="flex items-center justify-center gap-3 mb-8 text-gold font-display text-2xl font-medium tracking-tight">
          <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-current fill-none stroke-[1.5] stroke-linecap-round stroke-linejoin-round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Mibeko LexViewer
        </div>
        
        <p className="text-t2 text-center mb-8 font-serif italic text-sm">
          Saisissez l'identifiant du document juridique pour accéder à l'interface d'édition et de révision.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="docId" className="block text-xs font-mono uppercase tracking-widest text-t3 mb-2">
              Identifiant du Document (ID)
            </label>
            <input
              id="docId"
              type="text"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              placeholder="Ex: d123-456..."
              className="w-full h-10 bg-s2 border border-b1 rounded-md text-t1 px-4 font-body outline-none transition-colors focus:border-gold-d2 focus:bg-s3 placeholder:text-t4"
            />
          </div>
          
          <button
            type="submit"
            disabled={!docId.trim()}
            className="w-full h-10 bg-gold text-[#120e00] font-body font-semibold rounded-md flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2] stroke-linecap-round stroke-linejoin-round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
            Ouvrir le Document
          </button>
        </form>
      </div>
    </div>
  );
}
