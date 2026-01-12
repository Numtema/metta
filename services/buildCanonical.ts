
import { GoogleGenAI, Type } from "@google/genai";
import { SourceFile, CanonicalProject, RuntimeTarget } from "../types";

export async function buildCanonical(
  sources: SourceFile[], 
  targetRuntime: RuntimeTarget,
  extraInstructions?: string
): Promise<CanonicalProject> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summary = sources.map(f => `FILE: ${f.path}\nROLE_HINT: ${f.roleHint || 'unknown'}\nCONTENT: ${f.content.substring(0, 800)}...`).join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Tu es un Architecte Fullstack Senior. 
    Analyse les fichiers sources et les instructions de l'utilisateur pour créer une structure CanonicalProject JSON.
    
    OBJECTIFS :
    1. Extraire la structure API (Endpoints).
    2. Extraire la logique métier (Flows).
    3. Analyser les fragments d'UI pour identifier les pages, les thèmes et les composants.
    4. HARMONISATION : Définis un thème cohérent basé sur les snippets fournis ET les instructions.
    
    CIBLE RUNTIME : ${targetRuntime}

    INSTRUCTIONS UTILISATEUR :
    ${extraInstructions || "Aucune instruction spécifique. Fais au mieux selon les fichiers."}
    
    SOURCES :
    ${summary}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          meta: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["name", "description"]
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
              },
              required: ["name", "version"]
            }
          }
        },
        required: ["meta", "api", "logic", "ui", "dependencies"]
      }
    }
  });

  const rawJson = JSON.parse(response.text || "{}");
  
  const depsRecord: Record<string, string> = {};
  if (Array.isArray(rawJson.dependencies)) {
    rawJson.dependencies.forEach((d: any) => {
      depsRecord[d.name] = d.version;
    });
  }

  return {
    ...rawJson,
    dependencies: depsRecord,
    meta: {
      ...rawJson.meta,
      target: { runtime: targetRuntime }
    }
  };
}
