import React, { useState, useEffect, useCallback, useRef } from 'react';
import { parse } from 'marked';
import { markdownToHuman, getStats } from './utils/regexConverter';
import { generateSampleMarkdown, smartPolishText } from './services/geminiService';
import { CopyIcon, TrashIcon, SparklesIcon, RefreshIcon, ArrowRightIcon, MagicWandIcon, PaletteIcon, HelpIcon, XIcon } from './components/Icons';
import { ToastMessage, ViewMode, Theme } from './types';

// Documentation Modal Component
const DocsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Trap focus inside modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    modalRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="docs-title"
    >
      <div 
        ref={modalRef}
        className="bg-t-bg border border-t-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between p-6 border-b border-t-border bg-t-surface sticky top-0">
          <h2 id="docs-title" className="text-xl font-bold text-t-text flex items-center space-x-2">
            <HelpIcon />
            <span>User Guide</span>
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-t-muted hover:text-t-text hover:bg-t-surface-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-t-accent"
            aria-label="Close user guide"
          >
            <XIcon />
          </button>
        </div>
        
        <div className="p-6 space-y-8 text-t-text">
          <section>
            <h3 className="text-lg font-semibold text-t-accent mb-3">Quick Start</h3>
            <p className="text-t-muted/90 leading-relaxed mb-4">
              CleanText AI converts complex Markdown (like LLM output) into human-readable text. 
              Simply paste your markdown into the <strong>Input</strong> box on the left. The app will automatically generate:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-t-muted/90">
              <li><strong>Plain Text:</strong> Cleaned version stripped of symbols (middle box).</li>
              <li><strong>HTML Preview:</strong> Visual rendering of how the content looks (right box).</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-t-accent mb-3">Tools & Features</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-t-surface border border-t-border">
                <div className="flex items-center space-x-2 font-medium mb-2">
                  <SparklesIcon /> <span>AI Polish</span>
                </div>
                <p className="text-sm text-t-muted">Uses Gemini AI to rewrite the plain text for better flow and grammar.</p>
              </div>
              <div className="p-4 rounded-lg bg-t-surface border border-t-border">
                <div className="flex items-center space-x-2 font-medium mb-2">
                  <PaletteIcon /> <span>Themes</span>
                </div>
                <p className="text-sm text-t-muted">Switch between Midnight, Light, Ocean, Forest, and Coffee themes.</p>
              </div>
              <div className="p-4 rounded-lg bg-t-surface border border-t-border">
                <div className="flex items-center space-x-2 font-medium mb-2">
                  <RefreshIcon /> <span>Sample</span>
                </div>
                <p className="text-sm text-t-muted">Generates example markdown to test the application.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-t-accent mb-3">Accessibility</h3>
            <p className="text-t-muted/90 leading-relaxed">
              This application follows WCAG guidelines:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-t-muted/90 mt-2">
              <li>Full keyboard navigation support.</li>
              <li>High contrast focus indicators.</li>
              <li>Screen reader friendly labels (ARIA).</li>
              <li>Scrollable regions are keyboard accessible.</li>
            </ul>
          </section>
        </div>

        <div className="p-6 border-t border-t-border bg-t-surface/50 text-center">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-t-accent text-white rounded-lg hover:bg-t-accent-hover font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-t-bg focus-visible:ring-t-accent"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // State
  const [inputMarkdown, setInputMarkdown] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPolishing, setIsPolishing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Split);
  const [theme, setTheme] = useState<Theme>('midnight');
  const [showThemeMenu, setShowThemeMenu] = useState<boolean>(false);
  const [showDocs, setShowDocs] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Refs
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Derived State
  const stats = getStats(inputMarkdown, outputText);

  // Theme Application
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Click outside listener for theme menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toast Handler
  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Effects
  useEffect(() => {
    // Real-time conversion using regex (fast, no API needed)
    const converted = markdownToHuman(inputMarkdown);
    setOutputText(converted);

    // Convert to HTML for preview
    try {
        const parsed = parse(inputMarkdown);
        if (parsed instanceof Promise) {
            parsed.then(res => setHtmlPreview(res));
        } else {
            setHtmlPreview(parsed as string);
        }
    } catch (e) {
        console.error("Markdown parsing error", e);
    }
  }, [inputMarkdown]);

  // Handlers
  const handleGenerateSample = async () => {
    setIsProcessing(true);
    try {
      const sample = await generateSampleMarkdown();
      setInputMarkdown(sample);
      addToast('Generated sample markdown', 'success');
    } catch (error) {
      addToast('Failed to generate sample', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSmartPolish = async () => {
    if (!outputText) return;
    setIsPolishing(true);
    try {
      const polished = await smartPolishText(outputText);
      setOutputText(polished);
      addToast('Text polished with Gemini AI', 'success');
    } catch (error) {
      addToast('Failed to polish text. Check API Key.', 'error');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    addToast('Clean text copied to clipboard', 'success');
  };

  const handleClear = () => {
    setInputMarkdown('');
    addToast('Cleared all text', 'info');
  };

  // Responsive Check for ViewMode
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        // If coming from split mode and shrinking, default to Edit
        if (viewMode === ViewMode.Split) setViewMode(ViewMode.Edit);
      } else {
        // If large screen, force Split
        setViewMode(ViewMode.Split);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const themes: { id: Theme; name: string; color: string }[] = [
    { id: 'midnight', name: 'Midnight', color: 'bg-slate-900' },
    { id: 'light', name: 'Light', color: 'bg-white border border-slate-200' },
    { id: 'whiteboard', name: 'Whiteboard', color: 'bg-white border border-gray-200' },
    { id: 'ocean', name: 'Ocean', color: 'bg-[#0b1120]' },
    { id: 'forest', name: 'Forest', color: 'bg-[#052e16]' },
    { id: 'coffee', name: 'Coffee', color: 'bg-[#292524]' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-t-bg text-t-text selection:bg-t-accent/30 transition-colors duration-300">
      {showDocs && <DocsModal onClose={() => setShowDocs(false)} />}
      
      {/* Header */}
      <header className="border-b border-t-border bg-t-bg/90 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-[95%] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-t-accent p-2 rounded-lg text-white">
              <MagicWandIcon />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-t-text hidden sm:block">
              CleanText <span className="text-t-accent">AI</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
             {/* Mobile View Toggles */}
            <div className="lg:hidden flex bg-t-surface rounded-lg p-1 mr-2 border border-t-border" role="group" aria-label="View Mode Toggle">
              <button 
                onClick={() => setViewMode(ViewMode.Edit)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-t-accent ${viewMode === ViewMode.Edit ? 'bg-t-muted/20 text-t-text' : 'text-t-muted'}`}
                aria-pressed={viewMode === ViewMode.Edit}
              >
                Input
              </button>
              <button 
                onClick={() => setViewMode(ViewMode.PreviewText)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-t-accent ${viewMode === ViewMode.PreviewText ? 'bg-t-muted/20 text-t-text' : 'text-t-muted'}`}
                aria-pressed={viewMode === ViewMode.PreviewText}
              >
                Text
              </button>
              <button 
                onClick={() => setViewMode(ViewMode.PreviewHtml)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-t-accent ${viewMode === ViewMode.PreviewHtml ? 'bg-t-muted/20 text-t-text' : 'text-t-muted'}`}
                aria-pressed={viewMode === ViewMode.PreviewHtml}
              >
                HTML
              </button>
            </div>

            {/* Documentation Trigger */}
            <button
              onClick={() => setShowDocs(true)}
              className="p-2 text-t-muted hover:text-t-text hover:bg-t-surface rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-t-accent"
              title="Help / User Guide"
              aria-label="Open User Guide"
            >
              <HelpIcon />
            </button>

            {/* Theme Selector */}
            <div className="relative" ref={themeMenuRef}>
              <button 
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="p-2 text-t-muted hover:text-t-text hover:bg-t-surface rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-t-accent"
                title="Change Theme"
                aria-haspopup="true"
                aria-expanded={showThemeMenu}
                aria-label="Change Theme"
              >
                <PaletteIcon />
              </button>
              
              {showThemeMenu && (
                <div 
                  className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl bg-t-surface border border-t-border overflow-hidden z-50"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="theme-menu-button"
                >
                  <div className="p-1">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setTheme(t.id); setShowThemeMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center space-x-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-t-accent ${theme === t.id ? 'bg-t-accent/10 text-t-accent' : 'text-t-text hover:bg-t-surface-2'}`}
                        role="menuitem"
                        aria-current={theme === t.id ? 'true' : undefined}
                      >
                        <span className={`w-3 h-3 rounded-full ${t.color} border border-t-border/50`}></span>
                        <span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerateSample}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-t-muted hover:text-t-text hover:bg-t-surface rounded-lg transition-colors border border-transparent hover:border-t-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-t-accent"
              aria-label="Generate sample markdown text"
            >
              <RefreshIcon />
              <span className="hidden sm:inline">Sample</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-[95%] mx-auto w-full p-4 gap-4 overflow-hidden h-[calc(100vh-4rem)]">
        
        {/* BOX 1: Markdown Input */}
        <section 
          className={`flex-1 flex flex-col min-h-0 bg-t-bg border border-t-border rounded-xl overflow-hidden shadow-xl transition-colors duration-300 ${viewMode === ViewMode.Edit || viewMode === ViewMode.Split ? 'flex' : 'hidden'}`}
          aria-labelledby="input-label"
        >
          <div className="h-12 border-b border-t-border flex items-center justify-between px-4 bg-t-surface/50 shrink-0">
            <h2 id="input-label" className="text-sm font-semibold text-t-muted uppercase tracking-wider">Markdown Input</h2>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-t-muted font-mono" aria-label={`${inputMarkdown.length} characters`}>
                {inputMarkdown.length} chars
              </span>
              <button 
                onClick={handleClear}
                className="p-1.5 text-t-muted hover:text-red-400 hover:bg-t-surface rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                title="Clear Input"
                aria-label="Clear all input text"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
          <div className="flex-1 relative group">
            <label htmlFor="markdown-input" className="sr-only">Markdown Input Area</label>
            <textarea
              id="markdown-input"
              className="w-full h-full p-6 bg-transparent resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-t-accent font-mono text-sm leading-relaxed text-t-text placeholder-t-muted"
              placeholder="# Paste your Markdown here...&#10;&#10;- We will strip symbols&#10;- And make it readable"
              value={inputMarkdown}
              onChange={(e) => setInputMarkdown(e.target.value)}
              spellCheck={false}
            />
          </div>
        </section>

        {/* BOX 2: Human Readable Output */}
        <section 
          className={`flex-1 flex flex-col min-h-0 bg-t-bg border border-t-border rounded-xl overflow-hidden shadow-xl relative transition-colors duration-300 ${viewMode === ViewMode.PreviewText || viewMode === ViewMode.Split ? 'flex' : 'hidden'}`}
          aria-labelledby="output-label"
        >
          <div className="h-12 border-b border-t-border flex items-center justify-between px-4 bg-t-surface/50 shrink-0">
            <div className="flex items-center space-x-3">
              <h2 id="output-label" className="text-sm font-semibold text-t-accent uppercase tracking-wider">Plain Text</h2>
              {stats.reductionPercent > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-t-accent/10 text-t-accent border border-t-accent/20" aria-label={`Size reduced by ${stats.reductionPercent} percent`}>
                  -{stats.reductionPercent}%
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
               <button
                onClick={handleSmartPolish}
                disabled={!outputText || isPolishing}
                aria-label="Polish text with AI"
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-t-accent
                  ${!outputText ? 'opacity-50 cursor-not-allowed border-transparent text-t-muted' : 
                    isPolishing ? 'bg-t-accent/20 border-t-accent/30 text-t-accent animate-pulse' : 
                    'bg-t-accent text-white hover:bg-t-accent-hover border-t-accent shadow-lg shadow-t-accent/20'
                  }`}
              >
                <SparklesIcon />
                <span>{isPolishing ? '...' : 'AI Polish'}</span>
              </button>
              <button
                onClick={handleCopy}
                disabled={!outputText}
                className="p-1.5 text-t-muted hover:text-t-text hover:bg-t-surface rounded-md transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-t-accent"
                title="Copy to Clipboard"
                aria-label="Copy plain text to clipboard"
              >
                <CopyIcon />
              </button>
            </div>
          </div>

          <div className="flex-1 relative bg-t-surface-2/50">
            <label htmlFor="plain-text-output" className="sr-only">Plain Text Output</label>
            <textarea
              id="plain-text-output"
              ref={outputRef}
              readOnly
              className="w-full h-full p-6 bg-transparent resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-t-accent font-sans text-base leading-relaxed text-t-text placeholder-t-muted"
              placeholder="Clean text will appear here..."
              value={outputText}
            />
             {!inputMarkdown && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                 <div className="text-center text-t-muted/50 max-w-xs">
                   <p className="text-sm">Cleaned text output</p>
                 </div>
               </div>
            )}
          </div>
        </section>

        {/* BOX 3: HTML Preview */}
        <section 
          className={`flex-1 flex flex-col min-h-0 bg-t-bg border border-t-border rounded-xl overflow-hidden shadow-xl relative transition-colors duration-300 ${viewMode === ViewMode.PreviewHtml || viewMode === ViewMode.Split ? 'flex' : 'hidden'}`}
          aria-labelledby="preview-label"
        >
          <div className="h-12 border-b border-t-border flex items-center justify-between px-4 bg-t-surface/50 shrink-0">
            <h2 id="preview-label" className="text-sm font-semibold text-t-accent uppercase tracking-wider opacity-80">HTML Preview</h2>
            <div className="flex items-center space-x-2">
                {/* Placeholder for future HTML actions if needed */}
            </div>
          </div>

          <div 
            className="flex-1 relative bg-t-surface-2/50 overflow-y-auto scroll-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-t-accent"
            tabIndex={0}
            role="region"
            aria-label="Rendered HTML Preview"
          >
            {htmlPreview ? (
                <div 
                    className="p-6 prose-custom font-sans transition-colors duration-300"
                    dangerouslySetInnerHTML={{ __html: htmlPreview }}
                />
            ) : (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                   <div className="text-center text-t-muted/50 max-w-xs">
                     <p className="text-sm">Rendered HTML preview</p>
                   </div>
                 </div>
            )}
          </div>
        </section>

      </main>

      {/* Toast Notification Container */}
      <div 
        className="fixed bottom-6 right-6 flex flex-col space-y-2 z-50 pointer-events-none"
        role="log" 
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex items-center px-4 py-3 rounded-lg shadow-xl border backdrop-blur-md transform transition-all animate-[slideIn_0.3s_ease-out]
              ${toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/30 text-emerald-100' : ''}
              ${toast.type === 'error' ? 'bg-red-900/90 border-red-500/30 text-red-100' : ''}
              ${toast.type === 'info' ? 'bg-t-surface/90 border-t-border text-t-text' : ''}
            `}
          >
            <span className="text-sm font-medium">{toast.text}</span>
          </div>
        ))}
      </div>

    </div>
  );
};

export default App;