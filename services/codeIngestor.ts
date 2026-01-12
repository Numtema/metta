
import JSZip from 'jszip';
import { SourceFile } from '../types';

export async function ingestZip(file: File): Promise<SourceFile[]> {
  const zip = new JSZip();
  const content = await zip.loadAsync(file);
  const files: SourceFile[] = [];

  for (const [path, zipEntry] of Object.entries(content.files)) {
    const entry = zipEntry as any;
    if (entry.dir) continue;
    
    if (path.includes('node_modules') || path.includes('.git') || path.includes('__pycache__')) continue;

    const data = await entry.async('string');
    files.push({
      path,
      content: data,
      language: path.split('.').pop() || 'text'
    });
  }

  return files;
}

export async function ingestFile(file: File): Promise<SourceFile> {
  const content = await file.text();
  return {
    path: file.name,
    content: content,
    language: file.name.split('.').pop() || 'text'
  };
}

export function ingestSnippet(name: string, content: string): SourceFile {
  return {
    path: name,
    content,
    language: name.split('.').pop() || 'text'
  };
}
