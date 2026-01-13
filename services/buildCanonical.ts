
import { GoogleGenAI, Type } from "@google/genai";
import { SourceFile, CanonicalProject, RuntimeTarget } from "../types";

export async function buildCanonical(
  sources: SourceFile[], 
  targetRuntime: RuntimeTarget,
  extraInstructions?: string
): Promise<CanonicalProject> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // On limite encore plus le résumé pour éviter de saturer la fenêtre de contexte
  const summary = sources.map(f => `FILE: ${f.path}\nCONTENT: ${f.content.substring(0, 500)}...`).join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Tu es un Architecte Logiciel. Analyse ces fragments et définis le plan "Canonique".
    
    IMPORTANT : 
    - Reste CONCIS. 
    - Utilise des IDs COURTS (ex: "upload_file", pas "pipeline_id_010101..."). 
    - Ne te répète pas.
    - Le raisonnement (reasoning) doit être un paragraphe dense de max 500 caractères.

    INSTRUCTIONS UTILISATEUR :
    ${extraInstructions || "Projet standard."}

    SOURCES :
    ${summary}
    `,
    config: {
      thinkingConfig: { thinkingBudget: 8000 },
      maxOutputTokens: 60000, 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          meta: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["name", "description", "reasoning"]
          },
          api: {
            type: Type.OBJECT,
            properties: {
              endpoints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    method: { type: Type.STRING },
                    path: { type: Type.STRING },
                    triggersFlow: { type: Type.STRING },
                    description: { type: Type.STRING }
                  }
                }
              }
            }
          },
          logic: {
            type: Type.OBJECT,
            properties: {
              flows: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    description: { type: Type.STRING },
                    steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          },
          ui: {
            type: Type.OBJECT,
            properties: {
              pages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    route: { type: Type.STRING },
                    components: { type: Type.ARRAY, items: { type: Type.STRING } },
                    description: { type: Type.STRING }
                  }
                }
              },
              theme: {
                type: Type.OBJECT,
                properties: {
                  primaryColor: { type: Type.STRING },
                  fontFamily: { type: Type.STRING },
                  style: { type: Type.STRING }
                },
                required: ["primaryColor", "fontFamily", "style"]
              }
            },
            required: ["pages", "theme"]
          },
          dependencies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                version: { type: Type.STRING }
              }
            }
          }
        },
        required: ["meta", "api", "logic", "ui", "dependencies"]
      }
    }
  });

  const text = response.text || "{}";
  const cleanedJson = text.replace(/^```json/, "").replace(/```$/, "").trim();
  
  try {
    const rawJson = JSON.parse(cleanedJson);
    const depsRecord: Record<string, string> = {};
    if (Array.isArray(rawJson.dependencies)) {
      rawJson.dependencies.forEach((d: any) => { if(d.name) depsRecord[d.name] = d.version || "latest"; });
    }

    return {
      ...rawJson,
      dependencies: depsRecord,
      meta: {
        ...rawJson.meta,
        target: { runtime: targetRuntime }
      }
    };
  } catch (e) {
    console.error("Erreur JSON", e, cleanedJson);
    throw new Error("L'IA a produit un JSON invalide (limite de tokens). Essayez de réduire le nombre de fichiers ou d'être plus spécifique.");
  }
}
