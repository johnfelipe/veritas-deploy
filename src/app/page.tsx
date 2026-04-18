"use client";

import Link from "next/link";
import { MessageSquare, AlertTriangle, LayoutDashboard, Shield, CheckCircle, Sparkles, Camera, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";
import { LanguageSelector, useTranslation } from "@/components/LanguageSelector";
import { TrustBadge } from "@/components/TrustBadge";

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen gradient-mesh relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-orb w-[600px] h-[600px] bg-indigo-600/30 -top-48 -left-48 animate-float" />
        <div className="gradient-orb w-[500px] h-[500px] bg-purple-600/25 top-1/4 -right-32 animate-float-delayed" />
        <div className="gradient-orb w-[400px] h-[400px] bg-pink-600/20 bottom-0 left-1/4 animate-float-slow" />
        <div className="gradient-orb w-[300px] h-[300px] bg-cyan-500/15 top-1/2 left-1/2 animate-float" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">Veritas</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              {t('dashboard')}
            </Link>
            <LanguageSelector />
            <AccessibilityToggle />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 pt-32 pb-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in-up">
          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Plataforma Universitaria con IA</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 backdrop-blur-sm">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Para la Universidad de Antioquia</span>
            </div>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
            <span className="gradient-text drop-shadow-lg">Verdad y Claridad</span>
            <br />
            <span className="text-white">para la vida universitaria</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Obtén respuestas confiables sobre los servicios de la Universidad de Antioquia - Colombia
            y reporta incidencias del campus con confianza. Impulsado por IA con fuentes transparentes.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-8">
          {/* Ask a Question Card */}
          <Link href="/ask" className="block group">
            <GlassCard className="p-8 h-full hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-2 hover:border-indigo-400/50">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/30">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2 text-white">{t('askQuestion')}</h2>
                  <p className="text-slate-300 mb-4">
                    Obtén respuestas sobre servicios universitarios, reglamentos, programas y más.
                    Cada respuesta incluye fuentes verificadas.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      Fuentes oficiales UdeA
                    </li>
                    <li className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      Available in multiple languages
                    </li>
                    <li className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      Clear next steps
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-6">
                <Button variant="gradient" className="w-full glow-hover" size="lg">
                  {t('askQuestion')}
                </Button>
              </div>
            </GlassCard>
          </Link>

          {/* Report an Issue Card */}
          <Link href="/report" className="block group">
            <GlassCard className="p-8 h-full hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-300 hover:-translate-y-2 hover:border-pink-400/50">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-pink-500/30">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2 text-white">{t('reportIssue')}</h2>
                  <p className="text-slate-300 mb-4">
                    Reporta huecos en vías internas, graffitis, ruido, fallas eléctricas y otras
                    incidencias del campus. Haz seguimiento del estado de tu reporte.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      Photo upload support
                    </li>
                    <li className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      Map-based location
                    </li>
                    <li className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      AI-assisted triage
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-6">
                <Button variant="gradient" className="w-full glow-hover" size="lg">
                  {t('reportIssue')}
                </Button>
              </div>
            </GlassCard>
          </Link>
        </div>

        {/* Secondary Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* AI Vision Scanner Card */}
          <Link href="/scan" className="block group">
            <GlassCard className="p-8 h-full hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-400/50">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2 text-white">AI Scanner</h2>
                  <p className="text-slate-300 mb-4">
                    Upload a photo and let AI automatically detect civic issues
                    like potholes, graffiti, and damaged infrastructure.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      Auto-detect issues
                    </li>
                    <li className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      One-click reporting
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-6">
                <Button variant="outline" className="w-full border-emerald-500/50 hover:bg-emerald-500/10 text-white" size="lg">
                  Scan Photo
                </Button>
              </div>
            </GlassCard>
          </Link>

          {/* Trust Dashboard Card */}
          <Link href="/trust" className="block group">
            <GlassCard className="p-8 h-full hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-2 hover:border-cyan-400/50">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/30">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold mb-2 text-white">Trust Dashboard</h2>
                  <p className="text-slate-300 mb-4">
                    View transparency metrics, blockchain verification status,
                    and the tamper-evident audit chain.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      Blockchain verified
                    </li>
                    <li className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      Full audit history
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-6">
                <Button variant="outline" className="w-full border-cyan-500/50 hover:bg-cyan-500/10 text-white" size="lg">
                  View Trust Metrics
                </Button>
              </div>
            </GlassCard>
          </Link>
        </div>

        {/* Dashboard Link */}
        <div className="max-w-4xl mx-auto">
          <Link href="/dashboard" className="block group">
            <GlassCard className="p-6 hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 hover:border-emerald-400/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30">
                    <LayoutDashboard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{t('dashboard')}</h3>
                    <p className="text-sm text-slate-300">
                      Visualiza todas las incidencias reportadas en un mapa del campus y su estado
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="border-slate-600 hover:bg-slate-700 text-white">{t('dashboard')}</Button>
              </div>
            </GlassCard>
          </Link>
        </div>

        {/* Trust & Transparency Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <GlassCard className="p-6 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 hover:border-purple-400/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-semibold text-white">Transparencia verificable por cadena de hashes</h3>
                  <p className="text-sm text-slate-300">
                    Cada interacción se registra criptográficamente para rendición de cuentas pública
                  </p>
                </div>
              </div>
              <TrustBadge />
            </div>
          </GlassCard>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-slate-700/50 relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-400">
              Veritas - Universidad de Antioquia · Claridad Institucional
            </span>
          </div>
          <p className="text-xs text-slate-500 text-center">
            {t('disclaimer')}
          </p>
        </div>
      </footer>
    </div>
  );
}
