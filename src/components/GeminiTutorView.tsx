import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Stethoscope,
  BookOpen,
  HelpCircle,
  Plus,
  Copy,
  Check,
  Zap,
  RotateCw,
  BookmarkCheck,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TopicDifficulty, PreferredStudyMethod } from '../types';

interface GeneratedTopicItem {
  moduleName: string;
  title: string;
  description: string;
  notes?: string;
  difficulty: TopicDifficulty;
  preferredStudyMethod: PreferredStudyMethod;
  questionCount?: number;
  added?: boolean;
}

export const GeminiTutorView: React.FC = () => {
  const { subjects, addTopic, addXp, triggerConfetti, showNotification, tutorMessages: messages, setTutorMessages: setMessages } = useApp();
  const [activeMode, setActiveMode] = useState<'chat' | 'topics' | 'quiz'>('chat');
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Generated topics state
  const [generatedTopics, setGeneratedTopics] = useState<GeneratedTopicItem[]>([]);

  // Quiz state
  const [generatedQuiz, setGeneratedQuiz] = useState<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  } | null>(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [showQuizAnswer, setShowQuizAnswer] = useState<boolean>(false);

  const QUICK_TOPICS = [
    { title: '📝 Caso Clínico: Cetoacidose', prompt: 'Gostaria de discutir um caso clínico simulado de Cetoacidose Diabética (CAD). Pode apresentar o quadro do paciente?' },
    { title: '🫀 Interpretação de ECG', prompt: 'Qual o passo a passo sistemático e seguro para interpretar um Eletrocardiograma no IAM com supra de ST?' },
    { title: '🔍 Dispneia Aguda: Diferenciais', prompt: 'Quais os principais diagnósticos diferenciais para um paciente idoso com queixa de dispneia aguda?' },
    { title: '💊 Crise Hipertensiva: Conduta', prompt: 'Qual a conduta inicial e escolha de drogas na Crise Hipertensiva (diferenciando Urgência de Emergência)?' },
  ];

  const handleQuickTopicClick = async (promptText: string) => {
    if (isLoading) return;
    const userText = promptText;
    setInputPrompt('');
    const newMessages = [
      ...messages,
      { role: 'user' as const, text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.text })),
          systemInstruction:
            'Você é o Dr. Gemini, um tutor sênior e preceptor de medicina clínica e acadêmica para estudantes universitários. Seja preciso, use terminologia técnica e diretrizes médicas atualizadas (SBC, SBPT, AMB, MS). Forneça explicações didáticas, com foco em fisiopatologia, diagnóstico diferencial e condutas baseadas em evidências.',
        }),
      });

      if (!res.ok) throw new Error('Falha no servidor');
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply || data.text || 'Excelente raciocínio clínico. Continue praticando!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      addXp(20, 'Dúvida tirada com Dr. Gemini');
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `[Tutor Clínico]: Analisando "${userText}": Lembre-se sempre de correlacionar a anamnese completa com o exame físico minucioso. Na dúvida em situações de emergência (como dor torácica ou sepse), priorize o mnemônico ABCDE do trauma ou o protocolo de dor torácica imediata (ECG em menos de 10 min).`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputPrompt.trim() || isLoading) return;

    const userText = inputPrompt;
    setInputPrompt('');
    const newMessages = [
      ...messages,
      { role: 'user' as const, text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.text })),
          systemInstruction:
            'Você é o Dr. Gemini, um tutor sênior e preceptor de medicina clínica e acadêmica para estudantes universitários. Seja preciso, use terminologia técnica e diretrizes médicas atualizadas (SBC, SBPT, AMB, MS). Forneça explicações didáticas, com foco em fisiopatologia, diagnóstico diferencial e condutas baseadas em evidências.',
        }),
      });

      if (!res.ok) throw new Error('Falha no servidor');
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply || data.text || 'Excelente raciocínio clínico. Continue praticando!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      addXp(20, 'Dúvida tirada com Dr. Gemini');
    } catch {
      // Fallback didactic preceptor answer if offline or missing key
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `[Tutor Clínico]: Analisando "${userText}": Lembre-se sempre de correlacionar a anamnese completa com o exame físico minucioso. Na dúvida em situações de emergência (como dor torácica ou sepse), priorize o mnemônico ABCDE do trauma ou o protocolo de dor torácica imediata (ECG em menos de 10 min).`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTopics = async () => {
    if (!inputPrompt.trim() || isLoading) return;
    setIsLoading(true);

    const subObj = subjects.find((s) => s.id === selectedSubjectId);
    const subName = subObj ? subObj.name : 'Medicina Geral';

    try {
      const res = await fetch('/api/gemini/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subName,
          area: inputPrompt,
          count: 3,
        }),
      });

      if (!res.ok) throw new Error('Falha no servidor');
      const data = await res.json();
      setGeneratedTopics(data.topics || []);
      addXp(50, 'Estruturação de Assuntos com IA');
    } catch {
      // Fallback structured study topics
      setGeneratedTopics([
        {
          moduleName: 'Semiologia & Diagnóstico',
          title: `Fisiopatologia e Quadro Clínico de ${inputPrompt}`,
          description: `Sinais e sintomas patognomônicos, estratificação de gravidade e exames subsidiários fundamentais para confirmação de ${inputPrompt}.`,
          notes: 'Focar na correlação com os critérios diagnósticos das diretrizes vigentes.',
          difficulty: 'medio',
          preferredStudyMethod: 'questoes',
          questionCount: 15,
        },
        {
          moduleName: 'Terapêutica e Conduta',
          title: `Manejo Farmacológico e Terapêutica de ${inputPrompt}`,
          description: `Drogas de primeira linha, mecanismos de ação, ajustes de posologia e critérios de alta ou internação em UTI.`,
          notes: 'Revisar efeitos adversos e contraindicações absolutas.',
          difficulty: 'dificil',
          preferredStudyMethod: 'questoes',
          questionCount: 20,
        },
        {
          moduleName: 'Prognóstico & Complicações',
          title: `Manejo de Complicações e Seguimento Ambulatorial de ${inputPrompt}`,
          description: `Prevenção secundária, metas de controle clínico e rastreio de lesão de órgão-alvo.`,
          notes: 'Ponto-chave para provas de residência e internato.',
          difficulty: 'facil',
          preferredStudyMethod: 'resumo',
          questionCount: 10,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!inputPrompt.trim() || isLoading) return;
    setIsLoading(true);
    setSelectedQuizOption(null);
    setShowQuizAnswer(false);

    try {
      const res = await fetch('/api/gemini/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: inputPrompt }),
      });

      if (!res.ok) throw new Error('Falha');
      const data = await res.json();
      const quizItem = Array.isArray(data.quiz) ? data.quiz[0] : data;
      setGeneratedQuiz(quizItem);
    } catch {
      setGeneratedQuiz({
        question: `(ENARE/Revalida) Paciente de 54 anos apresenta quadro compatível com ${inputPrompt}. Considerando a melhor conduta baseada em evidências, assinale a alternativa CORRETA:`,
        options: [
          'A) Iniciar antibioticoterapia empírica e solicitar tomografia imediata sem exame físico.',
          'B) Realizar estabilização clínica, exames laboratoriais direcionados e estratificação de risco segundo diretriz.',
          'C) Indicar procedimento cirúrgico de urgência sem avaliação cardiológica prévia.',
          'D) Alta ambulatorial apenas com sintomáticos comuns.',
        ],
        correctIndex: 1,
        explanation:
          'A abordagem inicial correta requer sempre estabilização hemodinâmica, confirmação diagnóstica e estratificação adequada antes de intervenções invasivas.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTopicToSpacedRepetition = (item: GeneratedTopicItem, index: number) => {
    const targetSubId = selectedSubjectId || subjects[0]?.id;

    if (!targetSubId) {
      showNotification('Cadastre ao menos uma disciplina no semestre antes de adicionar tópicos.', 'warning');
      return;
    }

    addTopic({
      subjectId: targetSubId,
      moduleName: item.moduleName,
      title: item.title,
      description: item.description,
      status: 'nao_iniciado',
      priority: item.difficulty === 'dificil' ? 'alta' : 'media',
      firstContactDate: new Date().toISOString().split('T')[0],
      scheduleFirstContact: true,
      inSpacedRepetition: true,
      preferredStudyMethods: [item.preferredStudyMethod],
      questionCount: item.questionCount,
      difficulty: item.difficulty,
      cycleStep: undefined,
      intervalDays: undefined,
      nextReviewDate: undefined,
      notes: item.notes,
      tags: [item.moduleName, item.preferredStudyMethod],
    });

    setGeneratedTopics((prev) =>
      prev.map((t, i) => (i === index ? { ...t, added: true } : t))
    );
    triggerConfetti();
    addXp(40, 'Assunto Adicionado às Revisões');
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Dr. Gemini - Preceptor IA
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-xs">
              Powered by Gemini 2.5
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Tire dúvidas clínicas, estruture assuntos com repetição espaçada e simule questões de provas de residência.
          </p>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveMode('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'chat'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>Tutor Clínico (Chat)</span>
        </button>

        <button
          onClick={() => setActiveMode('topics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'topics'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <BookmarkCheck className="h-4 w-4" />
          <span>Gerador de Assuntos & Matérias</span>
        </button>

        <button
          onClick={() => setActiveMode('quiz')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'quiz'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          <span>Simulador de Questões (Quiz)</span>
        </button>
      </div>

      {/* MODE 1: CHAT TUTOR */}
      {activeMode === 'chat' && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs flex flex-col h-[560px]">
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span
                    className={`block text-[10px] mt-2 font-semibold ${
                      msg.role === 'user'
                        ? 'text-sky-200 text-right'
                        : 'text-slate-400'
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {messages.length === 1 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Selecione um tema abaixo para iniciar uma conversação imediatamente:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_TOPICS.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickTopicClick(topic.prompt)}
                      disabled={isLoading}
                      className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-800/85 transition-all text-xs text-slate-800 dark:text-slate-300 font-semibold flex flex-col justify-between cursor-pointer"
                    >
                      <span className="text-sky-600 dark:text-sky-400">{topic.title}</span>
                      <span className="text-[10px] text-slate-400 mt-1 font-normal line-clamp-1">
                        {topic.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center gap-2">
            <input
              type="text"
              placeholder="Pergunte sobre condutas, diagnósticos diferenciais, fisiopatologia..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
              className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputPrompt.trim()}
              className="p-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white shadow-xs transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: TOPIC & HIERARCHY GENERATOR */}
      {activeMode === 'topics' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-sky-500 text-white">
                <BookmarkCheck className="h-4 w-4" />
              </span>
              Gerador Inteligente de Assuntos & Matérias de Estudo
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Informe o tema desejado e a IA estruturará a hierarquia completa (Disciplina → Matéria → Assunto Detalhado) pronta para o Ciclo de Repetições Espaçadas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Ex: Farmacologia dos Anti-hipertensivos, Eletrocardiograma no IAM..."
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                >
                  {subjects.length === 0 ? (
                    <option value="">(Nenhuma disciplina cadastrada)</option>
                  ) : (
                    subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        Disciplina: {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateTopics}
              disabled={isLoading || !inputPrompt.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold text-xs shadow-xs hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>{isLoading ? 'Estruturando Assuntos...' : 'Gerar Assuntos de Estudo com IA'}</span>
            </button>
          </div>

          {/* Generated Topics Result List */}
          {generatedTopics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedTopics.map((topicItem, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200/50 dark:border-sky-800/40">
                        {topicItem.moduleName}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {topicItem.difficulty === 'dificil'
                          ? '🔴 1d'
                          : topicItem.difficulty === 'medio'
                          ? '🟡 3d'
                          : '🟢 7d'}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                      {topicItem.title}
                    </h3>
                    
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {topicItem.description}
                    </p>

                    {topicItem.notes && (
                      <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                        💡 {topicItem.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => handleCopy(`${topicItem.title}\n${topicItem.description}`, idx)}
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-emerald-500">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleAddTopicToSpacedRepetition(topicItem, idx)}
                      disabled={topicItem.added}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                        topicItem.added
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                      }`}
                    >
                      {topicItem.added ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Adicionado ao Ciclo</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Adicionar às Revisões</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODE 3: QUIZ & RESIDENCY SIMULATOR */}
      {activeMode === 'quiz' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Simulador de Questões de Prova / Residência
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Informe a área médica para praticar questões estilo USP, ENARE e Revalida.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Cetoacidose Diabética, Sepse e Choque Séptico, Apendicite Aguda..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
              />
              <button
                onClick={handleGenerateQuiz}
                disabled={isLoading || !inputPrompt.trim()}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                {isLoading ? 'Gerando...' : 'Criar Questão'}
              </button>
            </div>
          </div>

          {generatedQuiz && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Caso Clínico & Enunciado
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                {generatedQuiz.question}
              </div>

              {/* Options */}
              <div className="space-y-2 pt-2">
                {generatedQuiz.options.map((opt, idx) => {
                  const isSelected = selectedQuizOption === idx;
                  const isCorrect = generatedQuiz.correctIndex === idx;

                  let optClass =
                    'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 text-slate-800 dark:text-slate-200 hover:border-sky-400';

                  if (showQuizAnswer) {
                    if (isCorrect) {
                      optClass =
                        'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold';
                    } else if (isSelected && !isCorrect) {
                      optClass =
                        'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                    }
                  } else if (isSelected) {
                    optClass = 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-bold';
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => !showQuizAnswer && setSelectedQuizOption(idx)}
                      className={`p-3.5 rounded-2xl border cursor-pointer text-xs transition-all ${optClass}`}
                    >
                      {opt}
                    </div>
                  );
                })}
              </div>

              {/* Action and Explanation */}
              {!showQuizAnswer ? (
                <button
                  onClick={() => {
                    if (selectedQuizOption !== null) {
                      setShowQuizAnswer(true);
                      if (selectedQuizOption === generatedQuiz.correctIndex) {
                        addXp(100, 'Acerto em Questão de Residência');
                        triggerConfetti();
                      }
                    }
                  }}
                  disabled={selectedQuizOption === null}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs disabled:opacity-50 transition-all"
                >
                  Conferir Resposta
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 space-y-1 text-xs text-sky-950 dark:text-sky-200 animate-in fade-in">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-sky-600" />
                    <span>Gabarito Comentado pelo Dr. Gemini:</span>
                  </div>
                  <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                    {generatedQuiz.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
