import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper for Gemini AI instance
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Gemini Chat Endpoint for Medical Tutor
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages, userContext } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Return high-quality medical simulation response if API key is not yet set
      const lastMsg = messages?.[messages.length - 1]?.content || "";
      return res.json({
        text: `[Modo Simulação Dr. Gemini]: Recebi sua dúvida sobre "${lastMsg.slice(0, 80)}...".
        
📚 **Abordagem Clínica e Fisiopatológica:**
1. **Fisiopatologia / Mecanismo Principal:** Avalie a etiologia de base, alterações hemodinâmicas ou bioquímicas associadas e a cascata fisiopatológica.
2. **Quadro Clínico & Sinais de Alarme:** Anamnese focada, estratificação de risco (ex: TIMI, CURB-65, Glasgow) e exame físico dirigido.
3. **Diagnóstico Diferencial:** Descarte emergências e utilize exames complementares escalonados (laboratório, imagem, ECG/Ecocardiograma).
4. **Conduta Terapêutica:** Suporte inicial (ABCDE), medidas farmacológicas de primeira linha segundo diretrizes brasileiras (SBC/AMB/MS) e profilaxias.

💡 *Dica de Ouro para Provas & Residência:* Sempre atente para as contraindicações absolutas e doses de ajuste em insuficiência renal/hepática.

*(Dica: Para respostas geradas em tempo real com raciocínio profundo, configure a GEMINI_API_KEY nas Configurações)*`,
      });
    }

    const systemInstruction = `Você é o "Dr. Gemini", um preceptor médico e tutor acadêmico sênior altamente qualificado para estudantes de Medicina.
Seu papel é orientar estudantes de medicina, internos e candidatos à Residência Médica (Revalida, ENARE, USP, SUS-SP, AMP, etc.).
Diretrizes:
- Responda em Português do Brasil com precisão científica, didática exemplar, empatia e rigor acadêmico.
- Estruture explicações com clareza: Fisiopatologia, Quadro Clínico, Critérios Diagnósticos, Diagnóstico Diferencial e Conduta Baseada em Evidências (Diretrizes SBC, SBEM, AMB, MS, UpToDate, Harrison, Cecil).
- Forneça mnemônicos práticos, pérolas clínicas ("Clinical Pearls") e pegadinhas clássicas de provas de residência.
- Use formatação rica com Markdown (tabelas, listas, negrito e destaques).
Contexto do Estudante: ${JSON.stringify(userContext || {})}`;

    // Construct history for multi-turn chat
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text || "Sem resposta do tutor." });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({
      error: "Falha ao processar solicitação com Gemini.",
      details: error.message,
    });
  }
});

// Gemini Study Topic Hierarchy Generation Endpoint
app.post("/api/gemini/generate-topics", async (req, res) => {
  try {
    const { subject, area, count = 3 } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        topics: [
          {
            moduleName: "Cardiologia Clínica",
            title: "Insuficiência Cardíaca Aguda e Edema Agudo de Pulmão",
            description: "Critérios de Framingham, perfis hemodinâmicos de Stevenson (A, B, C, L), manejo com vasodilatadores, diuréticos de alça e VNI.",
            notes: "Focar na diferenciação entre perfil B (quente e úmido) e perfil C (frio e úmido).",
            difficulty: "dificil",
            preferredStudyMethod: "questoes",
            questionCount: 15,
          },
          {
            moduleName: "Emergências Cardiovasculares",
            title: "Síndromes Coronarianas Agudas sem Supra de ST",
            description: "Estratificação de risco com TIMI e GRACE score, antiagregação plaquetária dupla, anticoagulação e momento da cineangiocoronariografia.",
            notes: "Decorar doses de ataque de AAS + Clopidogrel/Ticagrelor.",
            difficulty: "medio",
            preferredStudyMethod: "questoes",
            questionCount: 20,
          },
          {
            moduleName: "Semiologia & Eletrocardiograma",
            title: "Arritmias Cardíacas: Taquiarritmias com QRS Estreito e Largo",
            description: "Abordagem das taquicardias supraventriculares, manobra vagal, adenosina, estabilidade vs instabilidade e cardioversão elétrica sincronizada.",
            notes: "Lembrar dos 4 sinais clássicos de instabilidade: hipotensão, dor torácica anginosa, dispneia/EAP e rebaixamento de consciência.",
            difficulty: "medio",
            preferredStudyMethod: "resumo",
            questionCount: 10,
          },
        ],
      });
    }

    const prompt = `Você é um coordenador pedagógico de medicina. Gere ${count} assuntos de estudo detalhados e de alto rendimento para a disciplina "${subject}" sobre o tema "${area}".
Siga estritamente a hierarquia: Disciplina -> Matéria/Módulo -> Título Detalhado do Assunto.
Retorne APENAS um JSON válido no formato de array de objetos com as seguintes propriedades:
[
  {
    "moduleName": "Nome da Matéria/Módulo",
    "title": "Título específico do Assunto de Estudo",
    "description": "Diretrizes e conceitos clínicos fundamentais para o estudo",
    "notes": "Pérola clínica / dica de foco",
    "difficulty": "facil" | "medio" | "dificil",
    "preferredStudyMethod": "questoes" | "videoaula" | "resumo" | "livros",
    "questionCount": 15
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "[]");
    res.json({ topics: parsed });
  } catch (error: any) {
    console.error("Topic Gen Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Gemini Flashcard Generation Endpoint (deprecated/kept for backwards compat)
app.post("/api/gemini/generate-flashcards", async (req, res) => {
  try {
    const { topic, subject, count = 5 } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        flashcards: [
          {
            front: `Quais os 4 pilares farmacológicos fundamentais no tratamento da ICFER (Fração de Ejeção Reduzida)?`,
            back: `1. Betabloqueador (Carvedilol, Succinato de Metoprolol ou Bisoprolol)\n2. iSGLT2 (Dapagliflozina ou Empagliflozina)\n3. IECA/BRA ou INRA (Sacubitril/Valsartana)\n4. Antagonista de Receptor Mineralocorticoide (Espironolactona).`,
            tags: ["Cardiologia", "IC", "Farmacologia"],
          },
          {
            front: `Qual a tríade clínica clássica da Estenose Aórtica grave sintomática e seu mnemônico?`,
            back: `Tríade: Dispneia, Angina e Síncope (Mnemônico: "D-A-S").\nAparecimento de sintomas indica indicação cirúrgica urgente de troca valvar.`,
            tags: ["Valvopatias", "Semiologia"],
          },
          {
            front: `Critérios diagnósticos de Cetoacidose Diabética (CAD)?`,
            back: `1. Glicemia > 200-250 mg/dL\n2. pH arterial < 7,30 ou Bicarbonato < 15-18 mEq/L\n3. Cetonemia positiva ou cetonúria moderada/forte\n4. Ânion Gap elevado (> 10-12).`,
            tags: ["Endocrinologia", "Emergência"],
          },
        ],
      });
    }

    const prompt = `Gere exatamente ${count} flashcards de alta produtividade (high-yield) para estudantes de medicina sobre o tema "${topic}" da matéria "${subject}".
Retorne APENAS um JSON válido no formato de array de objetos com as propriedades:
[
  {
    "front": "Pergunta objetiva e clínica",
    "back": "Resposta precisa, concisa e baseada em diretrizes",
    "tags": ["Tag1", "Tag2"]
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "[]");
    res.json({ flashcards: parsed });
  } catch (error: any) {
    console.error("Flashcard Gen Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Gemini Quiz Generation Endpoint
app.post("/api/gemini/generate-quiz", async (req, res) => {
  try {
    const { topic, difficulty = "médio" } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        quiz: [
          {
            id: "q1",
            question:
              "Paciente de 62 anos, hipertenso e tabagista, dá entrada na emergência com dor torácica retroesternal opressiva há 2 horas, irradiada para mandíbula e MSE. ECG evidencia supradesnivelamento do segmento ST de 2,5 mm em DII, DIII e aVF. Qual a artéria coronária mais frequentemente acometida e a conduta imediata?",
            options: [
              "Artéria Descendente Anterior; Trombólise se tempo porta-balão for < 90 min.",
              "Artéria Coronária Direita; Angioplastia primária imediata se tempo porta-balão < 120 min.",
              "Artéria Circunflexa; Heparinização plena e alta em 24h.",
              "Tronco da Coronária Esquerda; Revascularização miocárdica cirúrgica imediata.",
            ],
            correctIndex: 1,
            explanation:
              "O supradesnivelamento em DII, DIII e aVF caracteriza infarto de parede inferior, cuja artéria culpada em 85-90% das vezes é a Coronária Direita (dominância direita). A reperfusão primária mecânica (ICP) é a estratégia de escolha quando disponível dentro do tempo hábil.",
          },
        ],
      });
    }

    const prompt = `Gere 3 questões de múltipla escolha no estilo de prova de Residência Médica/Revalida sobre o tema "${topic}" (Nível: ${difficulty}).
Cada questão deve conter um caso clínico realista, 4 alternativas (A, B, C, D), o índice da correta (0 a 3) e uma explicação/comentário detalhado justificando a resposta correta e o erro das demais.
Retorne APENAS um JSON válido no formato:
[
  {
    "id": "q1",
    "question": "Enunciado com caso clínico...",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Comentário da questão..."
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "[]");
    res.json({ quiz: parsed });
  } catch (error: any) {
    console.error("Quiz Gen Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Gemini High-Yield Clinical Summary Generator
app.post("/api/gemini/summarize", async (req, res) => {
  try {
    const { topic, textContent } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        summary: `# Resumo Clínico de Alta Produtividade: ${topic || "Tema Médico"}

## 🩺 Definição & Epidemiologia
Doença com alta prevalência em prontos-socorros e ambulatórios gerais. Conhecimento essencial para provas e internato.

## 🔬 Fisiopatologia Simplificada
Mecanismos celulares e hemodinâmicos que desencadeiam os sintomas clínicos característicos.

## 📋 Quadro Clínico & Exame Físico
- **Sintomas Cardinais:** Tríades clássicas, evolução temporal.
- **Sinais Físicos:** Manobras semiológicas específicas com alto valor preditivo positivo.

## 🧪 Roteiro Diagnóstico
1. **Exames de Triagem:** Hemograma, Função Renal, Eletrólitos.
2. **Padrão Ouro:** Exame definitivo para confirmação diagnóstica.

## 💊 Protocolo de Tratamento (Passo a Passo)
- **Fase Aguda:** Estabilização e reversão de choque/risco iminente.
- **Fase de Manutenção:** Prevenção secundária e seguimento ambulatorial.

## 💎 Pérola Clínica / Pegadinha de Prova
> Atenção aos diagnósticos diferenciais mimetizadores e contraindicações medicamentosas!`,
      });
    }

    const prompt = `Você é um especialista em síntese acadêmica médica.
Crie um Resumo de Alta Produtividade (High-Yield Clinical Summary) estruturado em Markdown sobre o tema "${topic}".
Se houver texto fornecido, resuma-o com máxima clareza: "${textContent || ""}".
Estruture com:
1. Definição & Importância Clínica
2. Fisiopatologia Chave
3. Quadro Clínico & Sinais de Alerta
4. Fluxograma Diagnóstico
5. Manejo Terapêutico de 1ª Linha
6. Mnemônicos e Pérolas para Provas/Residência.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        temperature: 0.5,
      },
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error("Summary Gen Error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MedAcademic Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
