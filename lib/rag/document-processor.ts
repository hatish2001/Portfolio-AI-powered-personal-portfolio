import fs from 'fs';
import path from 'path';
// pdf-parse uses CommonJS, so we need to use require for compatibility
const pdf = require('pdf-parse');

export interface ProcessedDocument {
  text: string;
  metadata: {
    source: string;
    type: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

export class DocumentProcessor {
  private chunkSize: number;
  private chunkOverlap: number;

  constructor(chunkSize: number = 1000, chunkOverlap: number = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  /**
   * Process a PDF file
   */
  async processPDF(filePath: string): Promise<ProcessedDocument[]> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      
      const chunks = this.chunkText(data.text);
      const fileName = path.basename(filePath);

      return chunks.map((chunk, index) => ({
        text: chunk,
        metadata: {
          source: fileName,
          type: 'pdf',
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      }));
    } catch (error) {
      console.error(`Error processing PDF ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Process a text file
   */
  async processTextFile(filePath: string): Promise<ProcessedDocument[]> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const chunks = this.chunkText(content);
      const fileName = path.basename(filePath);

      return chunks.map((chunk, index) => ({
        text: chunk,
        metadata: {
          source: fileName,
          type: 'text',
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      }));
    } catch (error) {
      console.error(`Error processing text file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Process a markdown file
   */
  async processMarkdown(filePath: string): Promise<ProcessedDocument[]> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Split by headers to maintain semantic meaning
      const sections = this.splitByMarkdownHeaders(content);
      const fileName = path.basename(filePath);

      return sections.map((section, index) => {
        // Further chunk if section is too large
        const chunks = section.length > this.chunkSize 
          ? this.chunkText(section)
          : [section];

        return chunks.map((chunk, chunkIdx) => ({
          text: chunk,
          metadata: {
            source: fileName,
            type: 'markdown',
            chunkIndex: index * chunks.length + chunkIdx,
            totalChunks: sections.length * chunks.length,
          },
        }));
      }).flat();
    } catch (error) {
      console.error(`Error processing markdown file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Process all documents in a directory
   */
  async processDirectory(dirPath: string): Promise<ProcessedDocument[]> {
    const documents: ProcessedDocument[] = [];
    
    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          // Recursively process subdirectories
          const subDocs = await this.processDirectory(filePath);
          documents.push(...subDocs);
        } else {
          const ext = path.extname(file).toLowerCase();
          
          if (ext === '.pdf') {
            const docs = await this.processPDF(filePath);
            documents.push(...docs);
          } else if (ext === '.txt') {
            const docs = await this.processTextFile(filePath);
            documents.push(...docs);
          } else if (ext === '.md') {
            const docs = await this.processMarkdown(filePath);
            documents.push(...docs);
          }
        }
      }

      return documents;
    } catch (error) {
      console.error(`Error processing directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Split text into chunks with overlap
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    
    // Clean and normalize text
    const cleanedText = text
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines
      .replace(/\s+/g, ' ') // Replace multiple spaces
      .trim();

    // Split by sentences to avoid breaking mid-sentence
    const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > this.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Add overlap from the end of the previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(this.chunkOverlap / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += sentence;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Split markdown content by headers to maintain context
   */
  private splitByMarkdownHeaders(content: string): string[] {
    const sections: string[] = [];
    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      // Check if line is a header (starts with #)
      if (line.match(/^#{1,6}\s/)) {
        if (currentSection.trim().length > 0) {
          sections.push(currentSection.trim());
        }
        currentSection = line + '\n';
      } else {
        currentSection += line + '\n';
      }
    }

    if (currentSection.trim().length > 0) {
      sections.push(currentSection.trim());
    }

    return sections;
  }

  /**
   * Process custom structured data (from contentData)
   */
  processStructuredData(data: any, source: string = 'website'): ProcessedDocument[] {
    const documents: ProcessedDocument[] = [];

    // Process apps/projects
    if (data.apps) {
      data.apps.forEach((app: any) => {
        const text = `
Project: ${app.title}
Description: ${app.shortDescription}
Technologies: ${app.tech.join(', ')}
Role: ${app.role}
Date: ${app.dateRange}
Problem: ${app.problem}
Solution: ${app.solution}
Contribution: ${app.myContribution}
Features: ${app.features.join(', ')}
Learnings: ${app.learned.join(', ')}
        `.trim();

        documents.push({
          text,
          metadata: {
            source: source,
            type: 'project',
          },
        });
      });
    }

    // Process experience
    if (data.experience) {
      data.experience.forEach((exp: any) => {
        const text = `
Experience: ${exp.role} at ${exp.company}
Period: ${exp.period}
Responsibilities: ${exp.responsibilities.join('. ')}
Technologies: ${exp.stack.join(', ')}
Impact: ${JSON.stringify(exp.impact)}
        `.trim();

        documents.push({
          text,
          metadata: {
            source: source,
            type: 'experience',
          },
        });
      });
    }

    // Process education
    if (data.education) {
      data.education.forEach((edu: any) => {
        const text = `
Education: ${edu.degreeLevel} in ${edu.program}
Institution: ${edu.institution}
Period: ${edu.period}
Courses: ${edu.courses.join(', ')}
Projects: ${edu.projects.join(', ')}
        `.trim();

        documents.push({
          text,
          metadata: {
            source: source,
            type: 'education',
          },
        });
      });
    }

    // Process about/bio
    if (data.about) {
      const skillsText = Object.entries(data.about.skills)
        .map(([category, skills]: [string, any]) => `${category}: ${skills.join(', ')}`)
        .join('\n');

      const text = `
About: ${data.about.headline}
Bio: ${data.about.bio}
Skills:
${skillsText}
Contact:
Email: ${data.about.contact.email}
Phone: ${data.about.contact.phone}
GitHub: ${data.about.contact.github}
LinkedIn: ${data.about.contact.linkedin}
        `.trim();

      documents.push({
        text,
        metadata: {
          source: source,
          type: 'about',
        },
      });
    }

    return documents;
  }
}

