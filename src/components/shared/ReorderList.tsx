// Lista que o aluno reordena arrastando pela alça (GripVertical) ou com ↑/↓ na alça.
// - Arrastar só pela alça (dragListener desligado): cliques, rolagem no celular e botões seguem normais.
// - Durante o arraste a ordem fica em estado local; só ao soltar chama onCommit (não grava a cada pixel).
// - Mola suave no reposicionamento e leve elevação no item arrastado; "reduzir movimento" sem mola/escala.
import React, { useRef, useState } from 'react';
import { Reorder, useDragControls, useReducedMotion, type DragControls } from 'motion/react';
import { GripVertical } from 'lucide-react';

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 40 };
const INSTANT = { duration: 0 };

type ItemTag = 'li' | 'div' | 'section';

export interface ReorderHandleProps {
  /** id do elemento da alça (para devolver o foco depois de mover com o teclado) */
  id: string;
  label?: string;
  disabled?: boolean;
  disabledTitle?: string;
  className?: string;
}

interface ItemProps<T extends { id: string }> {
  item: T;
  tag: ItemTag;
  itemProps?: React.HTMLAttributes<HTMLElement> & { id?: string };
  transition: object;
  reduce: boolean;
  onDragEnd: () => void;
  render: (item: T, handle: (p: ReorderHandleProps) => React.ReactNode) => React.ReactNode;
  onMove: (id: string, dir: -1 | 1, handleId: string) => void;
  canDrag: boolean;
}

const Handle: React.FC<ReorderHandleProps & { controls: DragControls; onMove: (dir: -1 | 1) => void; canDrag: boolean }> = ({
  id,
  label = 'Arrastar para reordenar',
  disabled,
  disabledTitle = 'Limpe o filtro para reordenar',
  className = '',
  controls,
  onMove,
  canDrag,
}) => {
  const off = disabled || !canDrag;
  return (
    <button
      type="button"
      id={id}
      data-no-swipe
      aria-label={label}
      aria-disabled={off || undefined}
      tabIndex={off ? -1 : 0}
      title={off ? (disabled ? disabledTitle : undefined) : 'Arraste (ou use ↑/↓) para mudar a ordem'}
      onPointerDown={(e) => {
        if (off) return;
        e.stopPropagation();
        e.preventDefault();
        controls.start(e);
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (off) return;
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          onMove(e.key === 'ArrowUp' ? -1 : 1);
        }
      }}
      style={off ? undefined : { touchAction: 'none' }}
      className={`reorder-handle shrink-0 grid place-items-center rounded-lg select-none transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 ${
        off
          ? 'opacity-30 cursor-default text-slate-400 dark:text-slate-500'
          : 'cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 can-hover:hover:text-slate-600 dark:can-hover:hover:text-slate-300 can-hover:hover:bg-slate-500/10'
      } ${className}`}
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );
};

function Item<T extends { id: string }>({ item, tag, itemProps, transition, reduce, onDragEnd, render, onMove, canDrag }: ItemProps<T>) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as={tag}
      value={item.id}
      // Só posição: abrir/fechar conteúdo (subtópicos, bloco recolhido) não estica o texto
      layout="position"
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      transition={transition}
      whileDrag={reduce ? { boxShadow: '0 6px 18px rgba(15,23,42,0.18)' } : { scale: 1.02, boxShadow: '0 10px 28px rgba(15,23,42,0.22)' }}
      {...(itemProps as object)}
      style={{ position: 'relative', ...(itemProps?.style || {}) }}
    >
      {render(item, (p) => (
        <Handle {...p} controls={controls} canDrag={canDrag} onMove={(dir) => onMove(item.id, dir, p.id)} />
      ))}
    </Reorder.Item>
  );
}

interface Props<T extends { id: string }> {
  items: T[];
  /** Chamado só ao soltar (ou ao mover com o teclado), com a nova ordem dos ids */
  onCommit: (orderedIds: string[]) => void;
  as?: 'ul' | 'div' | 'ol';
  itemAs?: ItemTag;
  className?: string;
  itemProps?: (item: T) => React.HTMLAttributes<HTMLElement> & { id?: string };
  /** handle(props) devolve a alça já ligada ao item */
  renderItem: (item: T, handle: (p: ReorderHandleProps) => React.ReactNode) => React.ReactNode;
}

export function ReorderList<T extends { id: string }>({ items, onCommit, as = 'ul', itemAs = 'li', className, itemProps, renderItem }: Props<T>) {
  const reduce = !!useReducedMotion();
  const [local, setLocal] = useState<string[] | null>(null);
  const localRef = useRef<string[] | null>(null);
  const baseIds = items.map((i) => i.id);
  const byId = new Map(items.map((i) => [i.id, i] as const));
  // Durante o arraste: ordem local (sem os excluídos no meio do caminho, com os novos no fim)
  const ids = local ? [...local.filter((id) => byId.has(id)), ...baseIds.filter((id) => !local.includes(id))] : baseIds;
  const ordered = ids.map((id) => byId.get(id) as T);
  const canDrag = items.length > 1;

  const update = (next: string[]) => {
    localRef.current = next;
    setLocal(next);
  };
  const commit = () => {
    const next = localRef.current;
    localRef.current = null;
    setLocal(null);
    if (next && next.join('|') !== baseIds.join('|')) onCommit(next);
  };
  const move = (id: string, dir: -1 | 1, handleId: string) => {
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    onCommit(next);
    // Mover o nó no DOM pode tirar o foco: devolve para a alça
    requestAnimationFrame(() => document.getElementById(handleId)?.focus());
  };

  return (
    <Reorder.Group as={as} axis="y" values={ids} onReorder={update} className={className}>
      {ordered.map((item) => (
        <React.Fragment key={item.id}>
        <Item
          item={item}
          tag={itemAs}
          itemProps={itemProps?.(item)}
          transition={reduce ? INSTANT : SPRING}
          reduce={reduce}
          onDragEnd={commit}
          render={renderItem}
          onMove={move}
          canDrag={canDrag}
        />
        </React.Fragment>
      ))}
    </Reorder.Group>
  );
}
