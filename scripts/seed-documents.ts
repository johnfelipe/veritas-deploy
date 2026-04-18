import "dotenv/config";
import { db } from "../src/lib/db";
import { documents } from "../drizzle/schema";
import { generateEmbedding } from "../src/lib/gemini";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

interface DocumentChunk {
  title: string;
  content: string;
  url: string;
  category: string;
}

// Document metadata
const documentMeta: Record<string, { url: string; category: string }> = {
  "waste-collection.md": {
    url: "https://www.udea.edu.co/gestion-ambiental",
    category: "waste",
  },
  "parking-bylaws.md": {
    url: "https://www.udea.edu.co/servicios/parqueaderos",
    category: "parking",
  },
  "recreation-programs.md": {
    url: "https://www.udea.edu.co/bienestar/deporte-cultura",
    category: "recreation",
  },
  "noise-bylaws.md": {
    url: "https://www.udea.edu.co/reglamentos/convivencia",
    category: "reglamentos",
  },
  "report-issues.md": {
    url: "https://www.udea.edu.co/servicios/reporte-incidencias",
    category: "services",
  },
  "city-services-faq.md": {
    url: "https://www.udea.edu.co/servicios",
    category: "services",
  },
  "bylaws-overview.md": {
    url: "https://www.udea.edu.co/reglamentos",
    category: "reglamentos",
  },
  "community-services-211.md": {
    url: "https://www.udea.edu.co/bienestar",
    category: "bienestar",
  },
};

// Split content into chunks by headers
function chunkByHeaders(content: string, title: string): string[] {
  const lines = content.split("\n");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentHeader = title;

  for (const line of lines) {
    // Check for h1 or h2 headers
    if (line.startsWith("## ") || line.startsWith("# ")) {
      // Save previous chunk if it has content
      if (currentChunk.length > 0) {
        const chunkContent = currentChunk.join("\n").trim();
        if (chunkContent.length > 50) {
          chunks.push(`${currentHeader}\n\n${chunkContent}`);
        }
      }
      currentHeader = line.replace(/^#+\s*/, "");
      currentChunk = [];
    } else {
      currentChunk.push(line);
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    const chunkContent = currentChunk.join("\n").trim();
    if (chunkContent.length > 50) {
      chunks.push(`${currentHeader}\n\n${chunkContent}`);
    }
  }

  return chunks;
}

// Extract title from first h1
function extractTitle(content: string): string {
  const match = content.match(/^# (.+)/m);
  return match ? match[1] : "Unknown Document";
}

async function seedDocuments() {
  console.log("Starting document seeding...\n");

  const docsDir = path.join(process.cwd(), "src/data/documents");
  const files = fs.readdirSync(docsDir).filter((f) => f.endsWith(".md"));

  console.log(`Found ${files.length} document files\n`);

  // Clear existing documents
  await db.delete(documents);
  console.log("Cleared existing documents\n");

  let totalChunks = 0;

  for (const file of files) {
    console.log(`Processing: ${file}`);

    const content = fs.readFileSync(path.join(docsDir, file), "utf-8");
    const title = extractTitle(content);
    const meta = documentMeta[file] || {
      url: "https://www.udea.edu.co",
      category: "general",
    };

    // Chunk the document
    const chunks = chunkByHeaders(content, title);
    console.log(`  Created ${chunks.length} chunks`);

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkTitle = `${title} - Section ${i + 1}`;

      console.log(`  Embedding chunk ${i + 1}/${chunks.length}...`);

      try {
        // Generate embedding
        const embedding = await generateEmbedding(chunk);

        // Insert into database
        await db.insert(documents).values({
          id: uuidv4(),
          title: chunkTitle,
          content: chunk,
          url: meta.url,
          category: meta.category,
          embedding,
        });

        totalChunks++;

        // Rate limiting - wait between API calls
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`  Error embedding chunk ${i + 1}:`, error);
      }
    }

    console.log(`  Done with ${file}\n`);
  }

  console.log(`\nSeeding complete! Total chunks indexed: ${totalChunks}`);
}

// Run the seeding
seedDocuments().catch(console.error);
