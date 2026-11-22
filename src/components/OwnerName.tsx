import React from 'react';
import { Crown } from 'lucide-react';
import { useAccess } from '../context/AccessContext';

interface OwnerNameProps {
  name: string;
  className?: string;
  /** mostra o selo "Dono"/"Moderador" ao lado */
  badge?: boolean;
  crown?: boolean;
}

// Nome do usuário: brilho esmeralda para todos e dourado para o Dono (cores da paleta).
export const OwnerName: React.FC<OwnerNameProps> = ({ name, className = '', badge = false, crown = false }) => {
  const { isOwner, role } = useAccess();
  if (!role) return <span className={`user-blue-name ${className}`}>{name}</span>;
  return (
    <span className={`inline-flex items-center min-w-0 align-baseline ${badge || (crown && isOwner) ? 'gap-1.5' : ''}`}>
      {crown && isOwner && <Crown className="h-[0.9em] w-[0.9em] shrink-0 text-amber-400" aria-label="Dono" />}
      <span className={`min-w-0 ${isOwner ? 'owner-gold-name' : 'user-blue-name'} ${className}`} title={isOwner ? 'Dono do MedAcademic' : 'Moderador'}>
        {name}
      </span>
      {badge && (
        <span className="count-badge shrink-0 inline-flex items-center text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md">
          {isOwner ? <Crown className="h-3.5 w-3.5 text-amber-400" aria-label="Dono" /> : 'Moderador'}
        </span>
      )}
    </span>
  );
};
