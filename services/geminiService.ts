import { GoogleGenAI, Type } from "@google/genai";
import { Player, MatchResult } from '../types';

export const generateSmartTeams = async (
  availablePlayers: Player[],
  playersPerTeam: number,
  history: MatchResult[],
  tacticalSchema: string
): Promise<{ teamA: string[], teamB: string[], reasoning: string }> => {

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API Key not found. Please set VITE_GEMINI_API_KEY in .env.local");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Format player list with stats for better decision making
  const playersList = availablePlayers.map(p =>
    `- ${p.name} (Posições: ${p.positions.join(', ')} | Rank: ${p.stats.points} pts | Tipo: ${p.type})`
  ).join('\n');

  // Format recent history (last 5 matches) to give context
  const recentHistory = history
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const historyText = recentHistory.length > 0
    ? recentHistory.map((m, i) => {
      const tA = m.teamA.map(p => p.name).join(', ');
      const tB = m.teamB.map(p => p.name).join(', ');
      return `Partida ${i + 1} (${new Date(m.date).toLocaleDateString()}): [Time A: ${tA}] vs [Time B: ${tB}]`;
    }).join('\n')
    : "Nenhum histórico recente.";

  const prompt = `
    Atue como um técnico de futebol experiente. Tenho uma lista com ${availablePlayers.length} jogadores presentes.
    Preciso dividir TODOS eles em dois grandes elencos (Time A e Time B) de forma equilibrada.
    
    Nota: O limite de jogadores em campo é ${playersPerTeam}, mas você deve alocar TODOS os jogadores disponíveis (mesmo que ultrapasse esse número). O sistema definirá automaticamente quem começa jogando pela ordem de chegada, sua tarefa é apenas equilibrar os elencos (Titulares + Reservas) tecnicamente.

    JOGADORES DISPONÍVEIS:
    ${playersList}

    HISTÓRICO RECENTE:
    ${historyText}

    CONFIGURAÇÃO TÁTICA (Base para equilíbrio):
    - Formação Alvo: ${tacticalSchema} 
    - Tente garantir que ambos os times tenham peças suficientes para suprir essa formação.

    REGRAS DE OURO:
    1. DISTRIBUIÇÃO TOTAL: Todos os nomes da lista DEVEM estar ou no Time A ou no Time B.
    2. EQUILÍBRIO TÁTICO: 
       - Distribua Goleiros, Defensores, Meias e Atacantes igualmente entre os dois grupos.
       - Distribua os jogadores de maior Rank (pts) equitativamente.
    
    3. ROTAÇÃO E VARIABILIDADE: 
       - Evite repetir os mesmos times do 'HISTÓRICO RECENTE'.
       - SEPARE "panelinhas".
    
    4. SAÍDA JSON:
       - Retorne APENAS o JSON com os nomes exatos.
    
    5. RACIOCÍNIO (reasoning): 
       - Explique brevemente como você equilibrou os reservas e titulares.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teamA: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista completa de jogadores do Time A (Titulares + Reservas)"
            },
            teamB: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista completa de jogadores do Time B (Titulares + Reservas)"
            },
            reasoning: {
              type: Type.STRING,
              description: "Explicação da divisão dos elencos."
            }
          },
          required: ["teamA", "teamB", "reasoning"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text);

  } catch (error) {
    console.error("Erro ao gerar times com Gemini:", error);
    throw error;
  }
};