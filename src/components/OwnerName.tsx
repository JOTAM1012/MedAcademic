import React from 'react';
import { Crown } from 'lucide-react';
import { useAccess } from '../context/AccessContext';

interface OwnerNameProps {
  name: string;
  className?: string;
  /** mostra o selo "Dono" ao lado */
  badge?: boolean;
  crown?: boolean;
}

// Nome do usuário: dourado e brilhando para o Dono do site
export const OwnerName: React.FC<OwnerNameProps> = ({ name, className = '', badge = false, crown = false }) => {
  const { isOwner, role } = useAccess();
  if (!role) return <span className={className}>{name}</span>;
  return (
    <span className={`inline-flex items-center min-w-0 align-baseline ${badge || (crown && isOwner) ? 'gap-1.5' : ''}`}>
      {crown && isOwner && <Crown className="h-[0.9em] w-[0.9em] shrink-0 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />}
      <span className={`${isOwner ? 'owner-gold-name' : 'text-violet-400'} ${className}`} title={isOwner ? 'Dono do MedAcademic' : 'Moderador'}>
        {name}
      </span>
      {badge && (
        <span
          className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
            isOwner ? 'owner-gold-badge' : 'bg-violet-500/15 text-violet-300 border-violet-500/40'
          }`}
        >
          {isOwner ? 'Dono' : 'Moderador'}
        </span>
      )}
    </span>
  );
};
