import React, { useRef, useState } from 'react';
import { Camera, Check, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAccess } from '../../context/AccessContext';
import { CARTOON_AVATARS } from '../../data/avatars';
import { fileToAvatarDataUrl, avatarErrorMessage } from '../../data/avatarImage';

interface Props {
  onClose: () => void;
}

// Troca só a foto do perfil (avatar pronto ou foto própria), sem passar pelo Editar Perfil
export const ChangePhotoModal: React.FC<Props> = ({ onClose }) => {
  const { userProfile, updateUserProfile, showNotification } = useApp();
  const { isOwner } = useAccess();
  const current = userProfile.avatarUrl || CARTOON_AVATARS[0].url;
  const [selected, setSelected] = useState(current);
  const [custom, setCustom] = useState<string | null>(CARTOON_AVATARS.some((a) => a.url === current) ? null : current);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('Selecione um arquivo de imagem (JPG, PNG ou WEBP).', 'warning');
      return;
    }
    setLoading(true);
    fileToAvatarDataUrl(file)
      .then((url) => {
        setCustom(url);
        setSelected(url);
      })
      .catch(() => showNotification(avatarErrorMessage, 'warning'))
      .finally(() => setLoading(false));
  };

  const save = () => {
    if (selected !== current) updateUserProfile({ avatarUrl: selected });
    onClose();
  };

  return (
    <div
      className="app-modal fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="change-photo-modal"
        onClick={(e) => e.stopPropagation()}
        className="app-modal-panel w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4"
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Trocar foto do perfil</h3>
              <p className="text-xs text-slate-500">Escolha um avatar ou envie sua própria foto.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Prévia com a moldura do perfil */}
        <div className="flex justify-center py-1">
          <div className={`w-28 h-28 rounded-3xl overflow-hidden ${isOwner ? 'owner-gold-frame' : 'user-blue-frame'}`}>
            <img id="change-photo-preview" src={selected} alt="Prévia" className="w-full h-full object-cover rounded-[inherit]" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {CARTOON_AVATARS.map((a) => {
            const on = selected === a.url;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a.url)}
                title={a.label}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                  on ? 'border-sky-500 ring-4 ring-sky-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <img src={a.url} alt={a.label} className="w-full h-full object-cover" />
                {on && (
                  <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            id="change-photo-upload"
            onClick={() => (custom && selected !== custom ? setSelected(custom) : !loading && inputRef.current?.click())}
            className={`relative aspect-square rounded-2xl overflow-hidden border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
              custom && selected === custom ? 'border-sky-500 ring-4 ring-sky-500/20' : 'border-slate-300 dark:border-slate-700 hover:border-sky-500 text-slate-500 hover:text-sky-500'
            }`}
          >
            {loading ? (
              <>
                <span className="h-6 w-6 rounded-full border-2 border-sky-400/30 border-t-sky-500 animate-spin" />
                <span className="text-[10px] font-bold text-sky-500">Carregando</span>
              </>
            ) : custom ? (
              <img src={custom} alt="Sua foto" className="w-full h-full object-cover" />
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="text-[10px] font-bold">Enviar foto</span>
              </>
            )}
          </button>
        </div>
        {custom && (
          <button type="button" onClick={() => inputRef.current?.click()} className="w-full text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">
            Enviar outra foto
          </button>
        )}

        <div className="app-modal-footer flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            Cancelar
          </button>
          <button
            id="change-photo-save"
            onClick={save}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black shadow-md disabled:opacity-60 flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" /> Salvar foto
          </button>
        </div>
      </div>
    </div>
  );
};
