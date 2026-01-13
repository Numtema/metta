
import React, { useState, useEffect } from 'react';
import { 
  Plus, History, Zap, ArrowRight, Download, Loader2, Trash2, 
  ChevronRight, Moon, Sun, Box, Archive, Upload, 
  CheckCircle, Code, Settings, FileJson, Copy, Maximize2,
  Terminal, Layers, FileCode, AlertCircle, MessageSquare,
  BrainCircuit, Info
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
    setSession(prev => prev ? ({ ...prev, currentStep: 'Analyse des octets...' }) : null);
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
      setSession(prev => prev ? ({ ...prev, sources: [...prev.sources, ...newSources], currentStep: 'Fichiers ingérés.' }) : null);
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
    setSession({ ...session, sources: [...session.sources, file], currentStep: `Snippet ajouté.` });
    setSnippetContent('');
  };

  const handleForge = async () => {
    if (!session || session.sources.length === 0) return;
    setIsProcessing(true);
    setSession({ ...session, status: 'analyzing', currentStep: 'Réflexion profonde de l\'architecte (Deep Reasoning)...' });
    
    try {
      const canonical = await buildCanonical(session.sources, targetRuntime, extraInstructions);
      setSession(prev => ({ 
        ...prev!, 
        canonical, 
        status: 'generating', 
        currentStep: 'Synthèse de l\'arborescence et des connexions...' 
      }));

      const artifacts = await generateProjectFiles(canonical, extraInstructions);
      const finalSession: PocketStore = { 
        ...session, 
        canonical, 
        artifacts, 
        status: 'ready', 
        currentStep: 'Projet assemblé avec succès.' 
      };
      setSession(finalSession);
      setHistory([finalSession, ...history]);
    } catch (err) {
      console.error(err);
      setSession({ ...session, status: 'error', currentStep: 'Échec de la réflexion architecturale.' });
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
                title="Logique de l'Architecte"
              >
                <BrainCircuit className="w-5 h-5" />
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
                <div className="px-5 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] rounded-full inline-block">Méta-Architecte Raisonné</div>
                <h2 className="text-5xl sm:text-8xl font-black tracking-tighter af-gradient-text leading-tight">Une réflexion d'élite,<br/>un code unifié.</h2>
                <p className="text-lg sm:text-2xl text-slate-500 font-light max-w-2xl mx-auto leading-relaxed">
                  L'agent analyse chaque fragment, anticipe les besoins et forge une architecture cohérente avant de générer une seule ligne de code.
                </p>
              </div>
              <button onClick={startNewSession} className="px-12 py-6 bg-blue-600 text-white rounded-[32px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 mx-auto group">
                Lancer la Forge <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {view === 'builder' && session && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 pb-20">
              <div className="lg:col-span-4 space-y-8 sticky top-0 self-start h-fit">
                <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[40px] p-8 space-y-8 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">01. Sources</h3>
                  <div className="space-y-4">
                    <label className="group flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border)] rounded-[24px] cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-500" />
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-4">Fragments (.zip, .tsx, .py, .md)</p>
                      </div>
                      <input type="file" className="hidden" multiple onChange={handleFileUpload} />
                    </label>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-[var(--border)]">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Snippet Direct</p>
                    <input 
                      type="text" 
                      placeholder="nom_du_fichier.ts" 
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={snippetName}
                      onChange={e => setSnippetName(e.target.value)}
                    />
                    <textarea 
                      placeholder="Code ou texte brut..." 
                      className="w-full h-44 bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                      value={snippetContent}
                      onChange={e => setSnippetContent(e.target.value)}
                    />
                    <button onClick={addSnippet} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 hover:text-white transition-all">
                      Injecter
                    </button>
                  </div>
                </section>

                <section className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[40px] p-8 space-y-8 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">02. Instructions</h3>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Runtime</p>
                      <div className="space-y-2">
                        {(['bun-http', 'python-fastapi', 'node-express'] as RuntimeTarget[]).map(r => (
                          <button 
                            key={r} 
                            onClick={() => setTargetRuntime(r)}
                            className={`w-full flex justify-between items-center p-4 rounded-[20px] border-2 transition-all ${targetRuntime === r ? 'bg-blue-600/10 border-blue-600 text-blue-600' : 'bg-transparent border-[var(--border)] text-slate-500'}`}
                          >
                            <span className="text-[10px] font-black uppercase">{r.split('-')[1]}</span>
                            {targetRuntime === r && <CheckCircle className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Brief Stratégique</p>
                      <textarea 
                        placeholder="Ex: 'Architecture micro-services', 'Style Glassmorphism dark-only', 'Ajoute un logger'..." 
                        className="w-full h-32 bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 text-[10px] font-medium outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                        value={extraInstructions}
                        onChange={e => setExtraInstructions(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleForge} 
                    disabled={session.sources.length === 0 || isProcessing}
                    className="w-full py-6 bg-blue-600 text-white rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                    Générer le Projet
                  </button>
                </section>
              </div>

              <div className="lg:col-span-8 space-y-8">
                {/* Reasoning Box - New Feature */}
                {session.canonical?.meta.reasoning && (
                  <div className="bg-blue-600/5 border-2 border-blue-600/20 rounded-[40px] p-8 space-y-6 animate-slide-up shadow-sm">
                    <div className="flex items-center gap-3">
                      <BrainCircuit className="w-6 h-6 text-blue-600" />
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">Raisonnement de l'Architecte</h3>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium italic">
                      "{session.canonical.meta.reasoning}"
                    </p>
                  </div>
                )}

                <div className={`bg-[var(--bg-secondary)] border rounded-[40px] p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm transition-all ${session.status === 'error' ? 'border-red-500' : 'border-[var(--border)]'}`}>
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center ${isProcessing ? 'bg-blue-600 text-white animate-pulse' : 'bg-blue-600/10 text-blue-600'}`}>
                      {isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Layers className="w-8 h-8" />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">{session.currentStep}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{session.sources.length} sources analysées</p>
                    </div>
                  </div>
                  {session.status === 'ready' && <div className="px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase">Prêt à l'emploi</div>}
                </div>

                {showCanonical && session.canonical && (
                  <div className="bg-[var(--bg-secondary)] border-2 border-blue-600/30 rounded-[40px] p-10 space-y-8 animate-slide-up shadow-2xl">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-[0.4em] text-blue-600">Plan Structurel Déduit</h4>
                      <Info className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-[var(--border)] pb-2">Back: Endpoints API</p>
                         <div className="space-y-2">
                           {session.canonical.api.endpoints.map((e, i) => (
                             <div key={i} className="text-xs font-bold p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] flex justify-between group">
                                <span className="text-slate-500 group-hover:text-blue-500 transition-colors">{e.path}</span> 
                                <span className="opacity-40 uppercase">{e.method}</span>
                             </div>
                           ))}
                         </div>
                      </div>
                      <div className="space-y-4">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-[var(--border)] pb-2">Front: Pages Harmonisées</p>
                         <div className="space-y-2">
                           {session.canonical.ui.pages.map((p, i) => (
                             <div key={i} className="text-xs font-bold p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                                {p.name} <span className="opacity-30 ml-2">({p.route})</span>
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                {session.status === 'ready' && (
                  <div className="artifact-grid animate-slide-up">
                    {session.artifacts.map((art, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setActiveArtifact(art)}
                        className="p-8 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[32px] hover:border-blue-600 transition-all cursor-pointer group shadow-sm hover:shadow-lg"
                      >
                        <div className="flex justify-between items-center mb-6">
                          <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                            {art.type === 'config' ? <Settings className="w-6 h-6" /> : <Code className="w-6 h-6" />}
                          </div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{art.type}</span>
                        </div>
                        <h4 className="font-black text-lg truncate group-hover:text-blue-600">{art.path}</h4>
                        <p className="text-[11px] text-slate-500 mt-2">Prêt pour exécution.</p>
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
                          <button onClick={() => setSession(prev => prev ? ({ ...prev, sources: prev.sources.filter((_, idx) => idx !== i) }) : null)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                       </div>
                     ))}
                   </div>
                )}

                {session.sources.length === 0 && (
                   <div className="h-64 flex flex-col items-center justify-center border-4 border-dashed border-[var(--border)] rounded-[60px] opacity-20">
                      <Box className="w-12 h-12 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Ready for ingest</p>
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
                  <div key={p.id} onClick={() => { setSession(p); setView('builder'); }} className="p-10 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[48px] flex justify-between items-center group cursor-pointer hover:border-blue-600 transition-all shadow-sm">
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
                <button onClick={() => navigator.clipboard.writeText(activeArtifact.content)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest">Copier</button>
                <button onClick={() => setActiveArtifact(null)} className="p-3 text-red-500"><Trash2 className="w-6 h-6" /></button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-10 bg-[var(--bg-primary)] custom-scrollbar">
              <pre className="text-[13px] font-mono text-slate-300 p-8 bg-black/90 rounded-3xl overflow-x-auto">
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
