
import { GoogleGenAI, Type } from "@google/genai";
import { CanonicalProject, Artifact } from "../types";

export async function generateProjectFiles(
  canonical: CanonicalProject,
  extraInstructions?: string
): Promise<Artifact[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const runtime = canonical.meta.target.runtime;

  const prompt = `Tu es l'Ingénieur Assembleur. Ta mission est de générer un projet COMPLET et CONNECTÉ.
  
  PROJET : ${canonical.meta.name}
  CIBLE : ${runtime}
  THEME UI : ${JSON.stringify(canonical.ui.theme)}
  
  INSTRUCTIONS CRITIQUES :
  1. UNIFICATION UI : Réécris les fragments UI pour qu'ils partagent le même thème Tailwind et la même esthétique ${canonical.ui.theme.style}.
  2. CONNEXION : Dans le code frontend (pages/composants), implémente les appels 'fetch' vers les endpoints backend définis dans le schéma : ${JSON.stringify(canonical.api.endpoints)}.
  3. BACKEND : Génère le serveur ${runtime} avec les routes correspondantes qui exécutent les flows décrits.
  4. STRUCTURE : Produis une arborescence claire (ex: /client pour l'UI, /server pour le backend).
  5. BRIEF UTILISATEUR : Prends en compte ces instructions spécifiques lors de la génération :
     "${extraInstructions || "Aucune instruction spécifique."}"
  
  MODEL CANONIQUE :
  ${JSON.stringify(canonical, null, 2)}
  
  Format de sortie : JSON array of { path: string, content: string, type: 'code' | 'config' | 'doc' }.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
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

  try {
    const rawArtifacts = JSON.parse(response.text || "[]");
    return rawArtifacts.map((art: any) => ({
      ...art,
      id: crypto.randomUUID()
    }));
  } catch (e) {
    console.error("Génération échouée", e);
    return [];
  }
}
