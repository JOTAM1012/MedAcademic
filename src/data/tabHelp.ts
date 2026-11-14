// Tutorial de cada aba (botão "Ajuda" no topo da aba). Texto simples, em passos curtos.
export interface TabHelpSection {
  emoji: string;
  title: string;
  steps: string[];
}
export interface TabHelp {
  title: string;
  intro: string;
  sections: TabHelpSection[];
  tip?: string;
}

export const TAB_HELP: Record<string, TabHelp> = {
  dashboard: {
    title: 'Como usar o Dashboard',
    intro: 'É a sua tela inicial. Mostra, em cartões, o resumo do semestre e o que fazer hoje.',
    sections: [
      {
        emoji: '🧩',
        title: 'Os cartões',
        steps: [
          'Semestre: quanto do semestre já passou e as aulas de hoje.',
          'Seu plano de hoje: a próxima tarefa. Toque em "Abrir meu plano" para ver o dia todo.',
          'Checklist do dia: os 7 hábitos de estudo. Toque em cada um para marcar.',
          'Revisões, Acertos em questões, Progresso das disciplinas e Próximas provas: toque no título de cada cartão para abrir a aba dele.',
        ],
      },
      {
        emoji: '📅',
        title: 'Filtrar o período',
        steps: ['Use os botões 7 dias, 30 dias, Semestre e Sempre para mudar o período dos números.', 'Em "Todas as áreas" você filtra por uma grande área.'],
      },
      {
        emoji: '✏️',
        title: 'Deixar do seu jeito',
        steps: ['Toque em "Personalizar" para esconder cartões, mudar a ordem e o tamanho.', 'O que você mudar fica salvo na sua conta.'],
      },
    ],
    tip: 'Comece o dia por aqui: veja o plano de hoje e as revisões que vencem.',
  },
  calendar: {
    title: 'Como usar o Planner',
    intro: 'O Planner monta o seu plano de estudo do dia e mostra a sua agenda.',
    sections: [
      {
        emoji: '☀️',
        title: 'Meu plano de hoje',
        steps: [
          'O plano vem na ordem certa: revisões primeiro, depois questões e, por último, tema novo.',
          'Toque em "Começar" para abrir o Pomodoro já com a tarefa.',
          'Terminou? Toque em "Já fiz". Não vai dar hoje? Tire a tarefa de hoje.',
          'Dia ruim? Toque em "Dia difícil" e o plano fica menor. Dia de prova ou plantão também tem botão.',
        ],
      },
      {
        emoji: '🛠️',
        title: 'Planejar',
        steps: [
          '"Planejar dia": escolha o que entra hoje, fixe tarefas e mude a ordem.',
          '"Planejar semana": espalhe temas novos e revisões pelos próximos dias.',
          '"Minha rotina": tempo por dia, turnos livres, dia de descanso, semanas de prova e blocos de foco.',
        ],
      },
      {
        emoji: '🗓️',
        title: 'Hoje, Semana e Mês',
        steps: ['Troque a visão nos botões Hoje, Semana e Mês.', 'Use "+ Atividade" e "+ Prova" para colocar algo na agenda.', 'Na agenda, arraste um item para mudar de dia.'],
      },
    ],
    tip: 'Se sobrar revisão na fila, use "Replanejar" para espalhar pelos próximos dias.',
  },
  semester: {
    title: 'Como usar o Semestre',
    intro: 'Aqui ficam as datas do semestre, a grade de horários e as provas.',
    sections: [
      {
        emoji: '🎓',
        title: 'Semestre',
        steps: ['No topo você vê quanto do semestre já passou e quantos dias faltam.', 'Toque no lápis para mudar as datas de início e fim.'],
      },
      {
        emoji: '🕒',
        title: 'Grade de horários',
        steps: [
          'Toque em "+ Atividade" para pôr aula, estágio, plantão, academia e outras.',
          'Rodízio: crie várias atividades de uma vez, com data de início e fim.',
          'Toque numa atividade para editar, excluir só daquele dia ou trocar por outra naquele dia.',
          'A agenda da semana mostra as horas de cada dia e o dia mais cheio.',
        ],
      },
      {
        emoji: '📝',
        title: 'Provas',
        steps: [
          'Toque em "+ Prova" e ponha a data, o tipo e os assuntos que caem.',
          'Cada assunto vira um check list: estudar, revisar e fazer questões.',
          'O site lembra da prova 30, 15, 7, 3 e 1 dia antes.',
          'Depois da prova, ponha a nota para acompanhar a média.',
        ],
      },
    ],
    tip: 'Com a grade preenchida, a "Minha rotina" consegue marcar sozinha os turnos em que você tem aula.',
  },
  structure: {
    title: 'Como usar Disciplinas & assuntos',
    intro: 'Aqui você cadastra o que vai estudar: módulos, disciplinas, blocos e tópicos.',
    sections: [
      {
        emoji: '📚',
        title: 'Criar',
        steps: [
          'Toque em "+ Nova disciplina" e dê um nome. Você escolhe a cor e a grande área.',
          '"Novo módulo" cria um módulo da faculdade, que pode juntar disciplinas e assuntos.',
          'Dentro da disciplina, toque em "+ Novo bloco" (ex.: Diabetes) e adicione os tópicos.',
        ],
      },
      {
        emoji: '✅',
        title: 'Marcar o que estudou',
        steps: [
          '"Concluído": já estudei este tópico.',
          '"Ver depois": ainda não vi. O bloco segue para as revisões com essa pendência.',
          '"Aula bônus": assunto extra, que não conta para fechar o bloco.',
          'Quando todos os tópicos do bloco estão vistos, o bloco entra nas Revisões sozinho.',
        ],
      },
      {
        emoji: '🧾',
        title: 'Subtópicos (opcional)',
        steps: [
          'Toque no ícone de lista ao lado do tópico e escreva "Título: descrição".',
          'Pode colar a lista inteira do plano de ensino: cada linha vira um subtópico.',
          'Em "Editar" você arrasta para mudar a ordem, muda o texto e apaga. "OK" guarda.',
          'Toque no nome do tópico para mudar o nome.',
        ],
      },
      {
        emoji: '🔗',
        title: 'Compartilhar e apagar',
        steps: [
          'O ícone de compartilhar no card copia um link. Seu amigo abre e recebe a lista, sem o seu progresso.',
          'A lixeira no card apaga a disciplina. O site pergunta antes.',
        ],
      },
    ],
    tip: 'Use a estrela no bloco para marcar os temas mais importantes para a prova.',
  },
  spaced_repetition: {
    title: 'Como usar as Revisões',
    intro: 'Cada bloco que você termina volta no dia certo para você não esquecer.',
    sections: [
      {
        emoji: '🔁',
        title: 'Como funciona',
        steps: [
          '1ª revisão em 24 horas: folha em branco. Escreva o que lembra e depois confira.',
          '2ª em 7 dias: questões só daquele tema.',
          '3ª em 30 dias: questões novas e os erros do caderno.',
          '4ª em diante: questões misturadas com outros temas.',
        ],
      },
      {
        emoji: '▶️',
        title: 'Fazer uma revisão',
        steps: [
          'Em "Para hoje" ficam as revisões do dia. Toque em "Revisar".',
          'Siga os passos da técnica e, no fim, diga como foi: fácil, médio ou difícil.',
          'Foi difícil? A próxima vem mais cedo. Foi fácil? O intervalo aumenta.',
          'Registre as questões que fez e os acertos para ver sua evolução.',
        ],
      },
      {
        emoji: '📒',
        title: 'Caderno de erros',
        steps: ['Anote cada questão que errou e o motivo.', 'O site traz o erro de volta para você refazer.'],
      },
    ],
    tip: 'Revisão atrasada não é problema: faça as mais antigas primeiro ou use "Replanejar" no Planner.',
  },
  personal: {
    title: 'Como usar os Estudos pessoais',
    intro: 'Para o que você estuda fora da grade: residência, inglês, pesquisa, liga, concurso.',
    sections: [
      {
        emoji: '🚀',
        title: 'Criar um projeto',
        steps: ['Toque em "Novo projeto" e escolha o tipo: Faculdade, Residência ou Outro.', 'Diga quantos blocos de foco por semana você quer dedicar.'],
      },
      {
        emoji: '🧱',
        title: 'Itens do projeto',
        steps: [
          'Adicione os itens (capítulos, aulas, temas).',
          'Ao concluir um item, ele pode entrar nas revisões, como os blocos das disciplinas.',
          'O projeto aparece no plano do dia, sem passar na frente das revisões.',
        ],
      },
      {
        emoji: '🏆',
        title: 'Provas de concurso e provas anteriores',
        steps: ['Registre as provas que fez fora da faculdade e a nota.', 'Guarde provas anteriores para refazer depois.'],
      },
    ],
  },
  stopwatch: {
    title: 'Como usar o Pomodoro',
    intro: 'O cronômetro de estudo. Ele conta o tempo de foco e as pausas.',
    sections: [
      {
        emoji: '⏱️',
        title: 'Começar',
        steps: [
          'Escolha o formato: o seu bloco curto (revisões), o seu bloco longo (tema novo) ou Livre. No bloco, o primeiro número é o foco e o segundo é a pausa.',
          'Escolha a disciplina ou a tarefa e toque em "Iniciar".',
          'Quando o foco acaba, o site avisa e começa a pausa.',
        ],
      },
      {
        emoji: '🎧',
        title: 'Sons e ciclo',
        steps: ['Ligue um som de fundo (chuva, cafeteria, ondas) se ajudar a concentrar.', '"Meu plano de hoje" roda as tarefas do plano em sequência.'],
      },
      {
        emoji: '💾',
        title: 'Salvar',
        steps: ['Ao terminar, o tempo é salvo sozinho na disciplina.', 'Esse tempo aparece no Dashboard e no Perfil.'],
      },
    ],
    tip: 'O cronômetro continua contando se você mudar de aba no site.',
  },
  checklist: {
    title: 'Como usar o Checklist',
    intro: 'Sua lista de tarefas, separada em blocos com nome e cor.',
    sections: [
      {
        emoji: '🗂️',
        title: 'Blocos e itens',
        steps: ['Toque em "+ Novo bloco" e escolha nome, cor e emoji.', 'Escreva em "Adicionar item…" e aperte Enter.', 'Toque no quadrado para marcar como feito. Dois toques no texto editam.'],
      },
      {
        emoji: '⭐',
        title: 'Destacar e pôr data',
        steps: ['A estrela marca o item como essencial e sobe para o topo.', 'O calendário põe uma data. Com data, o item aparece no Planner.'],
      },
      {
        emoji: '🧾',
        title: 'Subitens (opcional)',
        steps: ['Toque no ícone de lista para criar subitens "Título: descrição".', 'A setinha com a contagem (ex.: 1/4) abre e fecha a lista.', 'Em "Editar" você arrasta, muda o texto e apaga.'],
      },
    ],
    tip: 'Use "Limpar concluídos" no menu do bloco para tirar o que já foi feito.',
  },
  profile: {
    title: 'Como usar o Perfil',
    intro: 'Seus dados, o resumo do semestre e o histórico de estudo.',
    sections: [
      {
        emoji: '👤',
        title: 'Seus dados',
        steps: ['Mude foto, nome, faculdade, semestre e a especialidade que você quer.', 'A meta de horas por semana e a média alvo também ficam aqui.'],
      },
      {
        emoji: '📈',
        title: 'Resumo e histórico',
        steps: ['Veja horas estudadas, questões, revisões e sequência de dias.', 'Toque em "Histórico" para ver os semestres anteriores.'],
      },
      {
        emoji: '☁️',
        title: 'Conta',
        steps: ['Seus dados são salvos sozinhos no aparelho e na nuvem.', 'A bolinha na sua foto mostra o estado: verde salvo, amarela salvando, vermelha offline.'],
      },
    ],
  },
  customize: {
    title: 'Como usar o Personalizar',
    intro: 'Aqui você deixa o site do seu jeito. Tudo fica salvo na sua conta.',
    sections: [
      {
        emoji: '🗓️',
        title: 'Minha rotina',
        steps: ['Toque em "Ajustar rotina" para mudar tempo por dia, turnos, descanso, semanas de prova e blocos de foco.', 'É a mesma rotina do Planner.'],
      },
      {
        emoji: '🧩',
        title: 'Painel (Dashboard)',
        steps: ['Ligue ou desligue cada cartão.', 'Use as setas para mudar a ordem e escolha o tamanho.', '"Voltar ao padrão" desfaz tudo.'],
      },
      {
        emoji: '📱',
        title: 'Barra de baixo no celular',
        steps: ['Escolha até 4 abas para a barra de baixo.', 'As outras ficam em "Mais".'],
      },
    ],
  },
};
