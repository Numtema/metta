
export type RuntimeTarget = 'python-fastapi' | 'bun-http' | 'node-express';
export type Transport = 'http' | 'sse' | 'ws' | 'queue';

export interface SourceFile {
  path: string;
  content: string;
  language?: string;
  roleHint?: 'api' | 'flow' | 'agent' | 'model' | 'infra' | 'ui';
}

export interface CanonicalEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  triggersFlow: string;
  description: string;
}

export interface CanonicalFlow {
  id: string;
  description: string;
  steps: string[];
}

export interface CanonicalUI {
  pages: {
    name: string;
    route: string;
    components: string[];
    description: string;
  }[];
  theme: {
    primaryColor: string;
    fontFamily: string;
    style: 'minimal' | 'modern' | 'glassmorphism' | 'brutalism';
  };
}

export interface CanonicalProject {
  meta: {
    name: string;
    description: string;
    reasoning: string; // La réflexion profonde de l'agent
    target: {
      runtime: RuntimeTarget;
    };
  };
  api: {
    endpoints: CanonicalEndpoint[];
  };
  logic: {
    flows: CanonicalFlow[];
  };
  ui: CanonicalUI;
  dependencies: Record<string, string>;
}

export interface Artifact {
  id: string;
  path: string;
  content: string;
  type: 'code' | 'config' | 'doc';
}

export interface PocketStore {
  id: string;
  name: string;
  status: 'idle' | 'ingesting' | 'analyzing' | 'generating' | 'ready' | 'error';
  currentStep: string;
  sources: SourceFile[];
  canonical: CanonicalProject | null;
  artifacts: Artifact[];
  createdAt: number;
}
