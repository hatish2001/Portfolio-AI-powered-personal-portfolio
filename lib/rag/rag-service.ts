import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { contentData } from '@/lib/data';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export class RAGService {
  private static instance: RAGService;
  private pinecone: Pinecone | null = null;
  private openai: OpenAI;
  private indexName: string;
  private isInitialized: boolean = false;

  private constructor() {
    // Initialize OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not found. RAG service will use fallback mode.');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
    });

    this.indexName = process.env.PINECONE_INDEX_NAME || 'portfolio-chatbot';
  }

  public static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  private async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize Pinecone if API key is available
      if (process.env.PINECONE_API_KEY) {
        this.pinecone = new Pinecone({
          apiKey: process.env.PINECONE_API_KEY,
        });
        this.isInitialized = true;
        console.log('RAG service initialized with Pinecone');
      } else {
        console.log('RAG service initialized in fallback mode (no Pinecone)');
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('Error initializing RAG service:', error);
      this.isInitialized = true; // Still mark as initialized to use fallback
    }
  }

  private async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw new Error('Failed to create embedding');
    }
  }

  private async searchVectorStore(query: string, topK: number = 5): Promise<string[]> {
    if (!this.pinecone) {
      console.log('Pinecone not available, using fallback context');
      return this.getFallbackContext(query);
    }

    try {
      const queryEmbedding = await this.createEmbedding(query);
      const index = this.pinecone.index(this.indexName);

      const searchResults = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
      });

      const contexts = searchResults.matches
        ?.filter((match) => match.metadata && match.metadata.text)
        .map((match) => match.metadata!.text as string) || [];

      return contexts;
    } catch (error: any) {
      // Check if it's a Pinecone index not found error
      if (error.message && error.message.includes('404')) {
        console.log('Pinecone index not found, using fallback context. Create the index or remove PINECONE_API_KEY to use fallback mode.');
      } else {
        console.error('Error searching vector store:', error);
      }
      // Fallback to static context if vector search fails
      return this.getFallbackContext(query);
    }
  }

  private getFallbackContext(query: string): string[] {
    // Extract relevant information from contentData based on query
    const contexts: string[] = [];
    const queryLower = query.toLowerCase();

    // About section
    contexts.push(`About Harishraj: ${contentData.about.bio}`);
    contexts.push(`Contact: Email: ${contentData.about.contact.email}, Phone: ${contentData.about.contact.phone}`);
    contexts.push(`LinkedIn: ${contentData.about.contact.linkedin}, GitHub: ${contentData.about.contact.github}`);

    // Skills
    const skillsText = Object.entries(contentData.about.skills)
      .map(([category, skills]) => `${category}: ${skills.join(', ')}`)
      .join('. ');
    contexts.push(`Skills: ${skillsText}`);

    // Check for specific company names in query
    const companyMatches: string[] = [];
    contentData.experience.forEach((exp) => {
      const companyLower = exp.company.toLowerCase().replace(/[^a-z0-9]/g, '');
      const queryNormalized = queryLower.replace(/[^a-z0-9]/g, '');
      if (queryNormalized.includes(companyLower) || companyLower.includes(queryNormalized)) {
        companyMatches.push(exp.company);
      }
    });

    // Experience - always include if query mentions experience/work/job, or if specific company is mentioned
    if (queryLower.includes('experience') || queryLower.includes('work') || queryLower.includes('job') || 
        queryLower.includes('role') || queryLower.includes('position') || companyMatches.length > 0 ||
        queryLower.includes('summarize') || queryLower.includes('tell me about')) {
      contentData.experience.forEach((exp) => {
        const impactText = exp.impact ? 
          ` Impact: ${Object.entries(exp.impact).map(([k, v]) => `${k}: ${v}`).join(', ')}` : '';
        const tagsText = exp.tags ? ` Tags: ${exp.tags.join(', ')}` : '';
        const responsibilitiesText = exp.responsibilities ? exp.responsibilities.join(' ') : '';
        const stackText = exp.stack ? exp.stack.join(', ') : '';
        contexts.push(
          `${exp.role} at ${exp.company} (${exp.period})${tagsText}. ${responsibilitiesText} Tech Stack: ${stackText}.${impactText}`
        );
      });
    }

    // Projects
    if (queryLower.includes('project') || queryLower.includes('built') || queryLower.includes('app')) {
      contentData.apps.forEach((app) => {
        contexts.push(
          `Project: ${app.title} - ${app.shortDescription}. Tech: ${app.tech.join(', ')}. ${app.myContribution}`
        );
      });
    }

    // Education
    if (queryLower.includes('education') || queryLower.includes('degree') || queryLower.includes('university')) {
      contentData.education.forEach((edu) => {
        contexts.push(
          `Education: ${edu.degreeLevel} in ${edu.program} from ${edu.institution} (${edu.period}). Courses: ${edu.courses.join(', ')}.`
        );
      });
    }

    return contexts.slice(0, 10); // Return top 10 most relevant contexts
  }

  private buildPrompt(query: string, contexts: string[], conversationHistory: Message[]): string {
    const contextText = contexts.join('\n\n');
    
    let historyText = '';
    if (conversationHistory.length > 0) {
      // Include last 3 messages for context
      const recentHistory = conversationHistory.slice(-6);
      historyText = recentHistory
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
    }

    return `You are an AI assistant that represents Harishraj Udaya Bhaskar, an AI Software Engineer. Your role is to help recruiters and visitors learn about his background, skills, and experience.

IMPORTANT GUIDELINES:
- Be conversational, friendly, and professional
- Answer only based on the provided context
- If you don't have information, politely say so and suggest they contact him directly
- Keep responses concise (2-3 paragraphs max) unless asked for details
- Use first-person perspective when discussing Harishraj (e.g., "I have experience in...")
- Highlight his AI/ML expertise, recent projects, and impact metrics
- Be enthusiastic about his work but remain humble

CONTEXT ABOUT HARISHRAJ:
${contextText}

${historyText ? `CONVERSATION HISTORY:\n${historyText}\n` : ''}
USER QUESTION: ${query}

Please provide a helpful, accurate response based on the context above:`;
  }

  public async query(userQuery: string, conversationHistory: Message[] = []): Promise<string> {
    await this.initialize();

    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        return "I'm currently not configured properly. Please set up the OpenAI API key to enable the chatbot. In the meantime, feel free to explore the portfolio or reach out directly at uharishraj@gmail.com!";
      }

      // Search for relevant context
      const contexts = await this.searchVectorStore(userQuery);

      // Build prompt with context and history
      const prompt = this.buildPrompt(userQuery, contexts, conversationHistory);

      // Get completion from OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant representing Harishraj Udaya Bhaskar.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      return response;
    } catch (error) {
      console.error('Error in RAG query:', error);
      
      if (error instanceof Error && error.message.includes('API key')) {
        return "I'm having trouble connecting to my AI backend. Please make sure the API keys are configured correctly. You can still reach out directly at uharishraj@gmail.com!";
      }
      
      throw error;
    }
  }

  // Method to ingest documents into the vector store
  public async ingestDocuments(documents: Array<{ text: string; metadata?: Record<string, any> }>): Promise<void> {
    await this.initialize();

    if (!this.pinecone) {
      throw new Error('Pinecone is not initialized. Please provide PINECONE_API_KEY.');
    }

    try {
      const index = this.pinecone.index(this.indexName);

      // Process documents in batches
      const batchSize = 100;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        const vectors = await Promise.all(
          batch.map(async (doc, idx) => {
            const embedding = await this.createEmbedding(doc.text);
            return {
              id: `doc-${i + idx}-${Date.now()}`,
              values: embedding,
              metadata: {
                text: doc.text,
                ...doc.metadata,
              },
            };
          })
        );

        await index.upsert(vectors);
        console.log(`Ingested batch ${i / batchSize + 1} of ${Math.ceil(documents.length / batchSize)}`);
      }

      console.log(`Successfully ingested ${documents.length} documents`);
    } catch (error) {
      console.error('Error ingesting documents:', error);
      throw error;
    }
  }
}

