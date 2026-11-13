import React, { useState } from 'react';
import { X, BookOpen, GraduationCap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AreaPicker } from '../AreaPicker';
import { SpecialtyPicker } from '../SpecialtyPicker';
import { MEDICAL_AREAS, getMedicalArea, getSpecialty, isClinicaMedica } from '../../data/areas';
import { CycleSubjectForm } from './CycleSubjectForm';
import { cycleOfSemester, getSubjectFormat } from '../../data/subjectFormats';
import type { SubjectFormat, SubjectOrganization } from '../../types';
import Segmented from '../shared/Segmented';
import Stepper, { Step } from '../shared/Stepper';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 font-medium';
const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1';

export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({ isOpen, onClose }) => {
  const { currentSemester, addSubject, updateSubject, subjects, triggerConfetti } = useApp();
  // Tipo: disciplina (grande área / formato) ou Módulo da faculdade
  const [kind, setKind] = useState<'subject' | 'module'>('subject');
  const [moduleId, setModuleId] = useState('');
  const [linkIds, setLinkIds] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('');
  // Básico/Clínico
  const [format, setFormat] = useState<SubjectFormat | null>(null);
  const [organization, setOrganization] = useState<SubjectOrganization>('checklist');
  const [tutorialCount, setTutorialCount] = useState(5);
  // Módulo / matéria da faculdade (opcional) → universitySubject
  const [moduleName, setModuleName] = useState('');
  // Passo atual do Stepper (1 Tipo → 2 Dados → 3 Vínculos)
  const [step, setStep] = useState(1);

  if (!isOpen) return null;
  const cycle = cycleOfSemester(currentSemester);
  const isCycleMode = cycle !== 'internato';

  const semSubjects = subjects.filter((x) => !x.semesterId || !currentSemester || x.semesterId === currentSemester.id);
  const modules = semSubjects.filter((x) => x.kind === 'module');
  const linkable = semSubjects.filter((x) => x.kind !== 'module');
  const chosenModule = modules.find((m) => m.id === moduleId);
  /** Depois de criar uma disciplina: entra no módulo escolhido */
  const attachToModule = (newId: string) => {
    if (!chosenModule) return;
    updateSubject(chosenModule.id, { linkedSubjectIds: Array.from(new Set([...(chosenModule.linkedSubjectIds || []), newId])) }, { silent: true });
  };
  const isCM = isClinicaMedica(area || undefined);
  const areaInfo = area ? getMedicalArea(area) : null;

  const reset = () => {
    setName('');
    setArea(null);
    setSpecialty('');
    setFormat(null);
    setOrganization('checklist');
    setTutorialCount(5);
    setModuleName('');
    setKind('subject');
    setModuleId('');
    setLinkIds([]);
    setStep(1);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAreaChange = (next: string) => {
    setArea(next);
    if (!isClinicaMedica(next)) {
      // Nome que veio de uma especialidade não faz sentido em outra área
      if (specialty && name === specialty) setName('');
      setSpecialty('');
    }
  };

  // Preenche o nome com a especialidade enquanto o usuário não tiver digitado outro
  const handleSpecialtyChange = (next: string) => {
    if (!name.trim() || name === specialty) setName(next);
    setSpecialty(next);
  };

  // Campos obrigatórios do passo "Dados" (mesma regra do antigo botão de salvar)
  const dataValid = !!name.trim() && (kind === 'module' ? true : isCycleMode ? !!format : !!area);
  const dataHint =
    kind === 'module'
      ? !name.trim() ? 'Informe o nome do módulo' : undefined
      : isCycleMode
        ? !format ? 'Escolha o formato' : !name.trim() ? 'Informe o nome' : undefined
        : !area ? 'Escolha a grande área' : !name.trim() ? 'Informe o nome da disciplina' : undefined;
  const nextDisabled = step >= 2 && !dataValid;

  const goToStep = (next: number) => {
    // Pelos indicadores do topo também não dá para pular "Dados" incompleto
    if (next > 2 && !dataValid) return;
    setStep(next);
  };

  // Enter num campo avança o passo (ou cria, no último) em vez de salvar direto
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      if (!nextDisabled) goToStep(step + 1);
      return;
    }
    handleSave();
  };

  const handleSave = () => {
    if (kind === 'module') {
      if (!name.trim()) return;
      addSubject({
        kind: 'module',
        name: name.trim(),
        universitySubject: name.trim(),
        code: 'MOD',
        color: '#0d9488',
        organization: 'blocos',
        linkedSubjectIds: linkIds.length ? linkIds : undefined,
        targetGrade: 7.0,
        semesterId: currentSemester?.id,
      });
      triggerConfetti();
      handleClose();
      return;
    }
    if (isCycleMode) {
      if (!name.trim() || !format) return;
      const f = getSubjectFormat(format);
      const newId = addSubject({
        name: name.trim(),
        universitySubject: chosenModule?.name || moduleName.trim() || name.trim(),
        majorArea: cycle === 'ciclo_clinico' && area ? area : undefined,
        code: f.label.slice(0, 3).toUpperCase(),
        color: f.color,
        format,
        organization,
        checklistModules: [],
        tutorials:
          format === 'tutoria' && organization === 'checklist'
            ? Array.from({ length: tutorialCount }, (_, i) => ({ id: `tut-${Date.now()}-${i}`, name: `Tutoria ${i + 1}` }))
            : undefined,
        targetGrade: 7.0,
        semesterId: currentSemester?.id,
      });
      attachToModule(newId);
      triggerConfetti();
      handleClose();
      return;
    }
    if (!name.trim() || !area || !areaInfo) return;
    const sp = isCM ? getSpecialty(specialty) : undefined;

    const newId = addSubject({
      name: name.trim(),
      code: areaInfo.short,
      color: areaInfo.color,
      majorArea: area,
      specialty: sp?.id,
      targetGrade: 7.0,
      semesterId: currentSemester?.id,
      universitySubject: chosenModule?.name || moduleName.trim() || name.trim(),
    });
    attachToModule(newId);

    triggerConfetti();
    handleClose();
  };

  return (
    <div className="app-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="app-modal-panel relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{kind === 'module' ? 'Novo módulo da faculdade' : isCycleMode ? 'Novo componente do semestre' : 'Nova Disciplina da Faculdade'}</h2>
              <p className="text-xs text-slate-500">
                {isCycleMode ? `${cycle === 'ciclo_basico' ? 'Ciclo Básico' : 'Ciclo Clínico'} · escolha o formato e como organizar` : 'Cadastre a disciplina da sua grade curricular'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-4">
          <Stepper
            key={kind}
            step={step}
            onStepChange={goToStep}
            onFinalStepCompleted={handleSave}
            linear
            transition="slide"
            completeButtonText={kind === 'module' ? 'Criar módulo' : 'Criar disciplina'}
            nextButtonProps={{ disabled: nextDisabled, title: nextDisabled ? dataHint : undefined }}
          >
          {/* Passo 1: semestre + o que criar */}
          <Step title="Tipo">
          <div className="space-y-4">
          {/* Semestre vinculado */}
          <div className="px-3 py-2.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider">Semestre Vinculado</div>
                <div className="text-xs font-black text-sky-700 dark:text-sky-200 truncate">{currentSemester?.name || 'Semestre Vigente'}</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-200/80 dark:bg-sky-900 text-sky-800 dark:text-sky-200 shrink-0">
              {currentSemester?.code || 'Atual'}
            </span>
          </div>

          {/* Tipo: disciplina ou módulo da faculdade */}
          <Segmented
            ariaLabel="O que você quer criar"
            stretch
            options={[
              { id: 'subject', label: 'Disciplina', hint: isCycleMode ? 'formato e assuntos' : 'grande área e assuntos' },
              { id: 'module', label: 'Módulo da faculdade', hint: 'assuntos próprios + vínculos' },
            ]}
            value={kind}
            onChange={(id) => setKind(id)}
            idFor={(id) => `subject-kind-${id}`}
          />
          </div>
          </Step>

          {/* Passo 2: campos obrigatórios (nome, área/especialidade ou formato/organização) */}
          <Step title="Dados">
          <div className="space-y-4">
          {kind === 'module' ? (
            <>
              <div>
                <label className={labelCls} htmlFor="module-name">Nome do módulo</label>
                <input
                  id="module-name"
                  type="text"
                  placeholder="Ex: Saúde da Criança, Módulo IV, Sistema Cardiovascular..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  required
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  O módulo tem os próprios assuntos (como uma disciplina) e pode juntar disciplinas, outros módulos e assuntos.
                </p>
              </div>
            </>
          ) : isCycleMode ? (
            <CycleSubjectForm
              cycle={cycle}
              format={format}
              onFormat={setFormat}
              name={name}
              onName={setName}
              organization={organization}
              onOrganization={setOrganization}
              tutorialCount={tutorialCount}
              onTutorialCount={setTutorialCount}
            />
          ) : null}
          {kind === 'subject' && isCycleMode && cycle === 'ciclo_clinico' && (
            <div>
              <label className={labelCls}>
                Grande área <span className="font-medium text-slate-400">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Grande área (opcional)">
                {MEDICAL_AREAS.map((a) => {
                  const on = area === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setArea(on ? null : a.id)}
                      className={`h-10 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-colors ${
                        on ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                      style={on ? { backgroundColor: a.color } : undefined}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? '#fff' : a.color }} />
                      {a.id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {kind === 'module' || isCycleMode ? null : (
          <>
          {/* 1. Grande área (define grupo e cor) */}
          <AreaPicker value={area} onChange={handleAreaChange} label="1. Grande Área" />

          {/* 2. Especialidade (só Clínica Médica) */}
          {isCM && <SpecialtyPicker value={specialty} onChange={handleSpecialtyChange} />}

          {/* Nome da disciplina */}
          <div>
            <label className={labelCls} htmlFor="subject-name">
              {isCM ? '3. Nome da Disciplina' : '2. Nome da Disciplina'}
            </label>
            <div className="relative">
              {areaInfo && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getSpecialty(specialty)?.color || areaInfo.color }} />
              )}
              <input
                id="subject-name"
                type="text"
                placeholder={isCM ? 'Ex: Cardiologia, Clínica Médica I...' : 'Ex: Neonatologia, Cirurgia do Trauma, Pré-natal...'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputCls} ${areaInfo ? 'pl-8' : ''}`}
                required
              />
            </div>
          </div>
          </>
          )}
          </div>
          </Step>

          {/* Passo 3: vínculos opcionais + resumo; o botão final cria */}
          <Step title="Vínculos">
          <div className="space-y-4">
          {/* Resumo do que vai ser criado */}
          <div className="px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {kind === 'module' ? 'Módulo' : 'Disciplina'} · {currentSemester?.name || 'Semestre Vigente'}
            </div>
            <div className="mt-0.5 text-sm font-black text-slate-900 dark:text-white truncate">{name.trim() || 'Sem nome'}</div>
            {kind === 'subject' && (
              <div className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {[
                  isCycleMode && format ? getSubjectFormat(format).label : null,
                  area,
                  isCM && specialty ? specialty : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
          </div>

          {/* Módulo: vincula disciplinas existentes (opcional) */}
          {kind === 'module' &&
            (linkable.length > 0 ? (
              <div>
                <span className={labelCls}>
                  Vincular disciplinas agora <span className="font-medium text-slate-400">(opcional, dá para fazer depois)</span>
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {linkable.map((x) => {
                    const on = linkIds.includes(x.id);
                    return (
                      <button
                        key={x.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setLinkIds((v) => (on ? v.filter((i) => i !== x.id) : [...v, x.id]))}
                        className={`min-h-[36px] px-3 rounded-full border text-[11px] font-bold transition-colors ${
                          on ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400'
                        }`}
                      >
                        {on ? '✓ ' : ''}
                        {x.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ainda não há disciplinas neste semestre para vincular. Dá para vincular depois.
              </p>
            ))}

          {/* Disciplina: entra num módulo da faculdade (opcional) */}
          {kind === 'subject' && (
            <div>
              <label className={labelCls} htmlFor="subject-module">
                Faz parte de um módulo da faculdade? <span className="font-medium text-slate-400">(opcional)</span>
              </label>
              {modules.length > 0 ? (
                <select id="subject-module" value={moduleId} onChange={(e) => setModuleId(e.target.value)} className={inputCls}>
                  <option value="">Não / nenhum</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    id="subject-module"
                    type="text"
                    placeholder="Ex: Saúde da Criança, Módulo IV..."
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    className={inputCls}
                  />
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Dica: crie o módulo em "Módulo da faculdade" acima para ele ter os próprios assuntos e vínculos.
                  </p>
                </>
              )}
            </div>
          )}

          </div>
          </Step>
          </Stepper>
        </form>
      </div>
    </div>
  );
};
