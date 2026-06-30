import React, { useState } from 'react';
import { X } from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNote: string;
  onSave: (text: string) => Promise<void>;
}

const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  initialNote,
  onSave,
}) => {
  const [noteText, setNoteText] = useState(initialNote);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-brand-bg/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-300">
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full pt-12">
        <header className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-brand-teal">MATCH NOTE</h2>
          <button onClick={onClose} className="text-brand-text-secondary"><X size={28} /></button>
        </header>
        
        <p className="text-brand-text-secondary text-sm mb-4">Add a coaching note, commitment, or observation for this match.</p>
        
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Enter note here..."
          className="flex-1 bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6 text-xl font-medium focus:border-brand-teal/50 outline-none resize-none"
          autoFocus
        />
        
        <button 
          onClick={() => onSave(noteText)}
          className="mt-8 bg-brand-teal text-brand-bg font-black py-6 rounded-2xl text-xl shadow-2xl active:scale-[0.98] transition-all"
        >
          SAVE NOTE
        </button>
      </div>
    </div>
  );
};

export default NoteModal;
