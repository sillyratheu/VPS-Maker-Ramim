import React, { useState, useEffect, useRef } from 'react';
import { Save, LogOut, FileText, CheckCircle2 } from 'lucide-react';
import { VirtualFile } from '../types/terminal';

interface Props {
  filePath: string;
  initialContent: string;
  files: VirtualFile[];
  isRoot: boolean;
  user: string;
  onSave: (filePath: string, content: string) => void;
  onExit: () => void;
}

export const InteractiveNano: React.FC<Props> = ({
  filePath,
  initialContent,
  isRoot,
  user,
  onSave,
  onExit,
}) => {
  const [content, setContent] = useState(initialContent);
  const [statusMsg, setStatusMsg] = useState(`[ Read ${initialContent.split('\n').length} lines ]`);
  const [isModified, setIsModified] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsModified(true);
    updateCursor(e.target);
  };

  const updateCursor = (target: HTMLTextAreaElement) => {
    const textBefore = target.value.substring(0, target.selectionStart);
    const lines = textBefore.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  const handleSave = () => {
    onSave(filePath, content);
    setIsModified(false);
    const lineCount = content.split('\n').length;
    setStatusMsg(`[ Wrote ${lineCount} lines to ${filePath} ]`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+O: Write out (Save)
    if (e.ctrlKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      handleSave();
    }
    // Ctrl+X: Exit
    if (e.ctrlKey && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      onExit();
    }
    // Ctrl+S: Save
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  const lines = content.split('\n');

  return (
    <div className="flex flex-col h-full bg-[#18181b] text-neutral-100 font-mono text-xs select-text">
      {/* Nano Header Bar */}
      <div className="bg-neutral-800 text-neutral-200 px-3 py-1 flex items-center justify-between border-b border-neutral-700 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-100">GNU nano 7.2</span>
          <span className="text-neutral-400">·</span>
          <span className="text-sky-300 font-medium">{filePath}</span>
          {isModified && (
            <span className="text-amber-400 font-semibold">[Modified]</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-neutral-400">
          <span>User: <strong className={isRoot ? 'text-red-400' : 'text-emerald-400'}>{user}</strong></span>
          <span>Line {cursorPos.line}/{Math.max(1, lines.length)}, Col {cursorPos.col}</span>
        </div>
      </div>

      {/* Editor Main Content Area */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Line Numbers */}
        <div className="bg-[#121214] text-neutral-500 py-2 px-2 text-right select-none border-r border-neutral-800 shrink-0 font-mono text-[11px] min-w-[3rem]">
          {lines.map((_, i) => (
            <div key={i} className={cursorPos.line === i + 1 ? 'text-neutral-200 font-bold' : ''}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onClick={e => updateCursor(e.currentTarget)}
          onKeyUp={e => updateCursor(e.currentTarget)}
          className="flex-1 p-2 bg-transparent text-neutral-100 resize-none outline-none font-mono text-xs leading-relaxed overflow-auto whitespace-pre"
          spellCheck={false}
          autoFocus
        />
      </div>

      {/* Nano Status / Notification Bar */}
      <div className="bg-[#202024] text-neutral-300 px-3 py-1 text-center font-medium border-t border-neutral-800 shrink-0 flex items-center justify-center gap-2">
        <FileText className="w-3.5 h-3.5 text-neutral-400" />
        <span>{statusMsg}</span>
      </div>

      {/* Nano Bottom Hotkeys Bar */}
      <div className="bg-neutral-900 px-3 py-2 border-t border-neutral-800 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-[11px] shrink-0">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 transition-colors text-left"
          title="Ctrl + O: Write out changes to disk"
        >
          <span className="font-bold text-sky-400 bg-neutral-950 px-1 rounded">^O</span>
          <span className="font-medium">WriteOut (Save)</span>
        </button>

        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded border border-neutral-700 transition-colors text-left"
          title="Ctrl + X: Close nano and return to terminal"
        >
          <span className="font-bold text-amber-400 bg-neutral-950 px-1 rounded">^X</span>
          <span className="font-medium">Exit Editor</span>
        </button>

        <button
          onClick={() => {
            setContent(prev => prev + '\n');
            setIsModified(true);
          }}
          className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors text-left"
        >
          <span className="font-bold text-neutral-400 bg-neutral-950 px-1 rounded">^J</span>
          <span>New Line</span>
        </button>

        <button
          onClick={() => {
            const cutLine = lines[cursorPos.line - 1];
            navigator.clipboard.writeText(cutLine || '');
            setStatusMsg('[ Line copied to clipboard ]');
          }}
          className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors text-left"
        >
          <span className="font-bold text-neutral-400 bg-neutral-950 px-1 rounded">^K</span>
          <span>Cut / Copy</span>
        </button>

        <button
          onClick={() => {
            setStatusMsg(`[ File: ${filePath} | Size: ${content.length} bytes | Lines: ${lines.length} ]`);
          }}
          className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors text-left"
        >
          <span className="font-bold text-neutral-400 bg-neutral-950 px-1 rounded">^C</span>
          <span>Cur Pos Info</span>
        </button>

        <div className="flex items-center justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Quick Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
