
import React, { useState, useEffect } from 'react';
import { 
  Plus, History, Zap, ArrowRight, Download, Loader2, Trash2, 
  ChevronRight, Moon, Sun, Box, Archive, Upload, 
  CheckCircle, Code, Settings, FileJson, Copy, Maximize2,
  Terminal, Layers, FileCode, AlertCircle, MessageSquare
} from 'lucide-react';
import JSZip from 'jszip';
import { PocketStore, SourceFile, Artifact, RuntimeTarget } from './types';
import { ingestZip, ingestSnippet, ingestFile } from './services/codeIngestor';
import { buildCanonical } from './services/buildCanonical';
import { generateProjectFiles } from './services/projectGenerator';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('forge_theme') as 'light' | 'dark') || 'dark');
  const [session, setSession] = useState<PocketStore | null>(null);
  const [history, setHistory] = useState<PocketStore[]>(() => JSON.parse(localStorage.getItem('forge_history') || '[]'));
  const [view, setView] = useState<'landing' | 'builder' | 'history'>('landing');
  const [targetRuntime, setTargetRuntime] = useState<RuntimeTarget>('bun-http');
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [snippetName, setSnippetName] = useState('page.tsx');
  const [snippetContent, setSnippetContent] = useState('');
  const [extraInstructions, setExtraInstructions] = useState('');
  const [showCanonical, setShowCanonical] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('forge_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('forge_history', JSON.stringify(history));
  }, [history]);

  const startNewSession = () => {
    const newSession: PocketStore = {
      id: crypto.randomUUID(),
      name: 'Projet sans titre',
      status: 'idle',
      currentStep: 'Attente des sources...',
      sources: [],
      canonical: null,
      artifacts: [],
      createdAt: Date.now()
    };
    setSession(newSession);
    setView('builder');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !session) return;
    
    setIsProcessing(true);
    setSession(prev => prev ? ({ ...prev, currentStep: 'Ingestion des fichiers...' }) : null);
    try {
      const newSources: SourceFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.zip')) {
          const zipSources = await ingestZip(file);
          newSources.push(...zipSources);
          if (session.name === 'Projet sans titre') {
            setSession(prev => prev ? ({ ...prev, name: file.name.replace('.zip', '') }) : null);
          }
        } else {
          const singleSource = await ingestFile(file);
          newSources.push(singleSource);
        }
      }
      setSession(prev => prev ? ({ ...prev, sources: [...prev.sources, ...newSources], currentStep: 'Sources prêtes.' }) : null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const addSnippet = () => {
    if (!session || !snippetContent.trim()) return;
    const file = ingestSnippet(snippetName, snippetContent);
    setSession({ ...session, sources: [...session.sources, file], currentStep: `Snippet ${snippetName} ajouté.` });
    setSnippetContent('');
  };

  const handleForge = async () => {
    if (!session || session.sources.length === 0) return;
    setIsProcessing(true);
    setSession({ ...session, status: 'analyzing', currentStep: 'Intelligence Artificielle en action : Analyse structurelle...' });
    
    try {
      // Pass extraInstructions to the architect
      const canonical = await buildCanonical(session.sources, targetRuntime, extraInstructions);
      setSession(prev => ({ 
        ...prev!, 
        canonical, 
        status: 'generating', 
        currentStep: 'Unification UI & Câblage Backend...' 
      }));

      const artifacts = await generateProjectFiles(canonical, extraInstructions);
      const finalSession: PocketStore = { 
        ...session, 
        canonical, 
        artifacts, 
        status: 'ready', 
        currentStep: 'Forge terminée. Projet prêt pour export.' 
      };
      setSession(finalSession);
      setHistory([finalSession, ...history]);
    } catch (err) {
      console.error(err);
      setSession({ ...session, status: 'error', currentStep: 'Erreur lors de la Forge. Vérifiez vos crédits API.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportZip = async () => {
    if (!session || session.artifacts.length === 0) return;
    const zip = new JSZip();
    session.artifacts.forEach(art => {
      zip.file(art.path, art.content);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forge-${session.name.toLowerCase().replace(/\s+/g, '-')}.zip`;
    link.click();
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <nav className="w-20 border-r border-[var(--border)] flex flex-col items-center py-8 gap-10 bg-[var(--bg-secondary)] h-screen sticky top-0 z-50">
        <div onClick={() => setView('landing')} className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white cursor-pointer shadow-lg hover:rotate-12 transition-all">
          <Zap className="w-6 h-6 fill-current" />
        </div>
        <div className="flex flex-col gap-8 flex-1">
          <button onClick={startNewSession} title="Nouvelle Forge" className={`p-3 rounded-2xl transition-all ${view === 'builder' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-blue-600'}`}>
            <Plus />
          </button>
          <button onClick={() => setView('history')} title="Historique" className={`p-3 rounded-2xl transition-all ${view === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-blue-600'}`}>
            <History />
          </button>
        </div>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 text-slate-500 hover:text-blue-600 transition-all">
          {theme === 'dark' ? <Sun /> : <Moon />}
        </button>
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 px-10 flex justify-between items-center border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-black uppercase tracking-tighter af-gradient-text hidden sm:block">ProjectForge</h1>
            {session && (
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-black text-slate-500 px-3 py-1 bg-slate-500/10 rounded-full truncate max-w-[150px]">{session.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {session?.canonical && (
              <button 
                onClick={() => setShowCanonical(!showCanonical)}
                className={`p-2 rounded-xl border transition-all ${showCanonical ? 'bg-blue-600/10 border-blue-600 text-blue-600' : 'border-[var(--border)] text-slate-500'}`}
                title="Voir le Modèle Canonique"
              >
                <FileJson className="w-5 h-5" />
              </button>
            )}
            {session?.status === 'ready' && (
              <button onClick={exportZip} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg active:scale-95 transition-all">
                <Download className="w-4 h-4" /> Exporter
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-10 overflow-y-auto custom-scrollbar">
          {view === 'landing' && (
            <div className="max-w-4xl mx-auto mt-20 text-center space-y-16 animate-slide-up">
              <div className="space-y-6">
                <div className="px-5 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] rounded-full inline-block">Méta-Agent Assembleur Fullstack</div>
                <h2 className="text-5xl sm:text-8xl font-black tracking-tighter af-gradient-text leading-tight">Forgez du code,<br/>connectez les points.</h2>
                <p className="text-lg sm:text-2xl text-slate-500 font-light max-w-2xl mx-auto leading-relaxed">
                  Importez vos composants UI et vos fragments backend. ProjectForge s'occupe de l'harmonisation visuelle et du câblage automatique.
                </p>
              </div>
              <button onClick={startNewSession} className="px-12 py-6 bg-blue-600 text-white rounded-[32px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 mx-auto group">
                Initialiser la Forge <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {view === 'builder' && session && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 pb-20">
              <div className="lg:col-span-4 space-y-8 sticky top-0 self-start h-fit">
                <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[40px] p-8 space-y-8 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">01. Ingestion de Fragments</h3>
                  
                  <div className="space-y-4">
                    <label className="group flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border)] rounded-[24px] cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-500 transition-colors" />
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest text-center px-4">ZIP, MD, TXT, PY, JS, TSX...</p>
                      </div>
                      <input type="file" className="hidden" multiple accept=".zip,.md,.txt,.py,.js,.ts,.tsx,.json,.html,.css" onChange={handleFileUpload} />
                    </label>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Snippet d'Agent ou d'UI</p>
                      <Terminal className="w-4 h-4 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="component.tsx ou flow.py" 
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={snippetName}
                      onChange={e => setSnippetName(e.target.value)}
                    />
                    <textarea 
                      placeholder="Collez du code React, FastAPI, etc..." 
                      className="w-full h-44 bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/20 resize-none custom-scrollbar"
                      value={snippetContent}
                      onChange={e => setSnippetContent(e.target.value)}
                    />
                    <button onClick={addSnippet} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 hover:text-white transition-all">
                      Injecter
                    </button>
                  </div>
                </section>

                <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[40px] p-8 space-y-8 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">02. Configuration Forge</h3>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Cible Backend</p>
                      <div className="space-y-2">
                        {(['bun-http', 'python-fastapi', 'node-express'] as RuntimeTarget[]).map(r => (
                          <button 
                            key={r} 
                            onClick={() => setTargetRuntime(r)}
                            className={`w-full flex justify-between items-center p-4 rounded-[20px] border-2 transition-all ${targetRuntime === r ? 'bg-blue-600/10 border-blue-600 text-blue-600' : 'bg-transparent border-[var(--border)] hover:border-slate-400 text-slate-500'}`}
                          >
                            <span className="text-[10px] font-black uppercase">{r.split('-')[1]} <span className="text-[9px] opacity-60 ml-1">({r.split('-')[0]})</span></span>
                            {targetRuntime === r && <CheckCircle className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Le Brief (Instructions)</p>
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                      </div>
                      <textarea 
                        placeholder="Ex: 'Ajoute une authentification JWT', 'Fais un style Glassmorphism', 'Connecte le formulaire au flow d'ingestion'..." 
                        className="w-full h-32 bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 text-[10px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 resize-none custom-scrollbar"
                        value={extraInstructions}
                        onChange={e => setExtraInstructions(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleForge} 
                    disabled={session.sources.length === 0 || isProcessing}
                    className="w-full py-6 bg-blue-600 text-white rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                    Lancer l'Assemblage
                  </button>
                </section>
              </div>

              <div className="lg:col-span-8 space-y-8">
                <div className={`bg-[var(--bg-secondary)] border rounded-[40px] p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm transition-all ${session.status === 'error' ? 'border-red-500 bg-red-500/5' : 'border-[var(--border)]'}`}>
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all ${isProcessing ? 'bg-blue-600 text-white animate-pulse' : (session.status === 'error' ? 'bg-red-500 text-white' : 'bg-blue-600/10 text-blue-600')}`}>
                      {isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> : (session.status === 'error' ? <AlertCircle className="w-8 h-8" /> : <Layers className="w-8 h-8" />)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">{session.currentStep}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <Archive className="w-3 h-3" /> {session.sources.length} sources
                        </span>
                        {session.status === 'ready' && <span className="text-green-500 font-bold text-[10px] uppercase">● Opérationnel</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {showCanonical && session.canonical && (
                  <div className="bg-[var(--bg-secondary)] border-2 border-blue-600/30 rounded-[40px] p-10 space-y-6 animate-slide-up shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-[0.4em] text-blue-600">Plan de Montage Fullstack</h4>
                      <span className="text-[10px] font-black bg-blue-600/10 px-3 py-1 rounded-full text-blue-600 uppercase tracking-widest">Connected Backend IR</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Routes API Détectées</p>
                         {session.canonical.api.endpoints.map((e, i) => (
                           <div key={i} className="text-xs font-bold p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] flex justify-between">
                              <span>{e.path}</span> <span className="text-blue-500">{e.method}</span>
                           </div>
                         ))}
                      </div>
                      <div className="space-y-4">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interface & Pages</p>
                         {session.canonical.ui.pages.map((p, i) => (
                           <div key={i} className="text-xs font-bold p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                              {p.name} <span className="opacity-50 ml-2">({p.route})</span>
                           </div>
                         ))}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-[var(--border)]">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thème Harmonisé</p>
                       <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                             <div className="w-4 h-4 rounded-full" style={{ backgroundColor: session.canonical.ui.theme.primaryColor }} />
                             <span className="text-xs font-bold">{session.canonical.ui.theme.primaryColor}</span>
                          </div>
                          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{session.canonical.ui.theme.style}</span>
                       </div>
                    </div>
                  </div>
                )}

                {session.status === 'ready' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
                    {session.artifacts.map((art, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setActiveArtifact(art)}
                        className="p-8 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] hover:border-blue-600 transition-all cursor-pointer group hover:shadow-xl"
                      >
                        <div className="flex justify-between items-center mb-6">
                          <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                            {art.type === 'config' ? <Settings className="w-6 h-6" /> : <Code className="w-6 h-6" />}
                          </div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{art.type}</span>
                        </div>
                        <h4 className="font-black text-lg truncate group-hover:text-blue-600">{art.path}</h4>
                        <p className="text-[11px] text-slate-500 mt-2">Code unifié et connecté.</p>
                      </div>
                    ))}
                  </div>
                )}

                {(session.status === 'idle' || session.status === 'analyzing') && session.sources.length > 0 && (
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-slide-up">
                     {session.sources.map((s, i) => (
                       <div key={i} className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl flex items-center gap-3 relative group">
                          <FileCode className="w-5 h-5 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black truncate">{s.path}</p>
                            <p className="text-[9px] font-black uppercase opacity-40">{s.content.length} chars</p>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSession(prev => prev ? ({ ...prev, sources: prev.sources.filter((_, idx) => idx !== i) }) : null);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                       </div>
                     ))}
                   </div>
                )}

                {session.status === 'idle' && session.sources.length === 0 && (
                   <div className="h-[400px] flex flex-col items-center justify-center border-4 border-dashed border-[var(--border)] rounded-[60px] opacity-40">
                      <Box className="w-16 h-16 mb-4 text-slate-300" />
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Prêt pour l'ingestion</p>
                   </div>
                )}
              </div>
            </div>
          )}

          {view === 'history' && (
            <div className="max-w-5xl mx-auto space-y-12 animate-slide-up pb-20">
              <h2 className="text-5xl font-black af-gradient-text tracking-tighter">Archives</h2>
              <div className="grid grid-cols-1 gap-6">
                {history.map(p => (
                  <div key={p.id} onClick={() => { setSession(p); setView('builder'); }} className="p-10 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[48px] flex justify-between items-center group cursor-pointer hover:border-blue-600 transition-all">
                    <div className="flex items-center gap-8">
                      <div className="w-16 h-16 rounded-[24px] bg-blue-600/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Archive /></div>
                      <div>
                        <h4 className="font-black text-2xl tracking-tight">{p.name}</h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-8 h-8 text-slate-300 group-hover:text-blue-600" />
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="text-center py-20 opacity-30">
                    <p className="text-xl font-black italic">Aucun projet dans les archives.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {activeArtifact && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]" onClick={() => setActiveArtifact(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-5xl bg-[var(--bg-secondary)] z-[101] border-l border-[var(--border)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            <header className="p-10 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-secondary)]">
              <div>
                <h2 className="text-3xl font-black tracking-tight">{activeArtifact.path.split('/').pop()}</h2>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">{activeArtifact.path}</span>
              </div>
              <div className="flex gap-4">
                <button onClick={() => navigator.clipboard.writeText(activeArtifact.content)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"><Copy className="w-4 h-4 inline mr-2"/> Copier</button>
                <button onClick={() => setActiveArtifact(null)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 className="w-6 h-6" /></button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-10 bg-[var(--bg-primary)] custom-scrollbar">
              <pre className="text-[13px] font-mono text-slate-300 p-8 bg-black/90 rounded-3xl overflow-x-auto shadow-inner">
                <code>{activeArtifact.content}</code>
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
