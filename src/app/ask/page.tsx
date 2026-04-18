"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Send,
  Loader2,
  ArrowLeft,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/ui/card";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";
import { LanguageSelector, useTranslation } from "@/components/LanguageSelector";
import { CitationPanel } from "@/components/CitationPanel";
import { TextToSpeech } from "@/components/TextToSpeech";
import type { RAGResponse } from "@/lib/rag";

const sampleQuestions = [
  "When is my garbage day?",
  "How do I report a pothole?",
  "What are the noise bylaw hours?",
  "How do I get a parking permit?",
  "Where can I register for recreation programs?",
];

export default function AskPage() {
  const { t, language } = useTranslation();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<RAGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), language }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Use specific error message from API if available
        setError(data.error || "Failed to get an answer. Please try again.");
        return;
      }

      setResponse(data);
    } catch (err) {
      setError("Connection error. Please check your internet and try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleQuestion = (q: string) => {
    setQuestion(q);
  };

  return (
    <div className="min-h-screen gradient-mesh relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-orb w-[500px] h-[500px] bg-indigo-600/25 -top-32 -right-32 animate-float" />
        <div className="gradient-orb w-[400px] h-[400px] bg-purple-600/20 bottom-0 -left-32 animate-float-delayed" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div className="h-6 w-px bg-slate-700" />
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text hidden sm:inline">
                Veritas
              </span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <LanguageSelector />
            <AccessibilityToggle />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 mb-4 backdrop-blur-sm">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">
Información Universitaria con IA
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-white">
              {t('askQuestion')}
            </h1>
            <p className="text-slate-300">
              Obtén respuestas sobre los servicios de la Universidad de Antioquia con fuentes verificadas
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Question Form & Answer */}
            <div className="lg:col-span-2 space-y-6">
              {/* Question Form */}
              <GlassCard className="p-6">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="relative">
                      <Textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={t('typeQuestion')}
                        className="min-h-[120px] pr-12 resize-none"
                        disabled={isLoading}
                        maxLength={1000}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="absolute bottom-3 right-3"
                        disabled={!question.trim() || isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {question.length}/1000 characters
                      </span>
                      <Button
                        type="submit"
                        variant="gradient"
                        disabled={!question.trim() || isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Get Answer
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </GlassCard>

              {/* Sample Questions */}
              {!response && !isLoading && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Try a sample question:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sampleQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSampleQuestion(q)}
                        className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80 transition-colors focus-ring"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                  {error}
                </div>
              )}

              {/* Answer */}
              {response && (
                <GlassCard className="p-6 animate-fade-in-up">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold m-0">Answer</h2>
                      </div>
                      <TextToSpeech text={response.answer} />
                    </div>
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: response.answer
                          .replace(
                            /\[Source (\d+)\]/g,
                            '<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium">$1</span>'
                          )
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\n/g, "<br />"),
                      }}
                    />
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Sources Panel */}
            <div className="lg:col-span-1">
              {response ? (
                <CitationPanel
                  sources={response.sources}
                  confidence={response.confidence}
                />
              ) : (
                <GlassCard className="p-6">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      Ask a question to see sources used in the answer
                    </p>
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-6 border-t border-slate-700/50 relative z-10">
        <p className="text-xs text-center text-slate-500">
          {t('disclaimer')}
        </p>
      </footer>
    </div>
  );
}
