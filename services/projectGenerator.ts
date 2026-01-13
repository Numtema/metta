
import { GoogleGenAI, Type } from "@google/genai";
import { CanonicalProject, Artifact } from "../types";

export async function generateProjectFiles(
  canonical: CanonicalProject,
  extraInstructions?: string
): Promise<Artifact[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const runtime = canonical.meta.target.runtime;

  const prompt = `Génère le code source complet pour le projet "${canonical.meta.name}".
  
  RÉFLEXION : ${canonical.meta.reasoning}
  THEME : ${JSON.stringify(canonical.ui.theme)}
  
  RÈGLES :
  1. Produis un tableau JSON d'objets Artifact.
  2. Chaque Artifact doit avoir path, content, et type.
  3. Sois très concis dans les commentaires de code. 
  4. NE PAS GÉNÉRER DE FICHIERS BINAIRES.
  5. Assure-toi que les imports fonctionnent entre les fichiers générés.
  6. Si le projet est grand, concentre-toi sur les fichiers CRITIQUES pour qu'il soit exécutable.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 8000 },
      // 100k total - 8k thinking = 92k tokens pour le JSON. Large suffisant si pas de boucle infinie.
      maxOutputTokens: 100000, 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            path: { type: Type.STRING },
            content: { type: Type.STRING },
            type: { type: Type.STRING }
          },
          required: ["path", "content", "type"]
        }
      }
    }
  });

  const text = response.text || "[]";
  const cleanedJson = text.replace(/^```json/, "").replace(/```$/, "").trim();

  try {
    const rawArtifacts = JSON.parse(cleanedJson);
    return rawArtifacts.map((art: any) => ({
      ...art,
      id: crypto.randomUUID()
    }));
  } catch (e) {
    console.error("Génération corrompue", e, cleanedJson);
    throw new Error("Le flux de génération a été tronqué. Essayez de générer le projet par étapes ou avec moins d'instructions.");
  }
}
