"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  ArrowLeft,
  LayoutDashboard,
  AlertTriangle,
  Loader2,
  MapPin,
  ExternalLink,
  X,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";
import { LanguageSelector, useTranslation } from "@/components/LanguageSelector";
import { ReportCard } from "@/components/ReportCard";
import { ReportMap } from "@/components/ReportMap";
import { FilterBar } from "@/components/FilterBar";
import { VoteButton } from "@/components/VoteButton";
import { FollowButton } from "@/components/FollowButton";
import type { Report } from "@/drizzle/schema";

interface TrendingReport extends Report {
  voteCount: number;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sessionId, setSessionId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("all");
  const [trendingReports, setTrendingReports] = useState<TrendingReport[]>([]);

  // Get session ID
  useEffect(() => {
    const id = localStorage.getItem("veritas-session-id") || "";
    setSessionId(id);
  }, []);

  // Fetch trending reports
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch("/api/reports/trending?limit=5");
        if (response.ok) {
          const data = await response.json();
          setTrendingReports(data.trending);
        }
      } catch (error) {
        console.error("Error fetching trending:", error);
      }
    };
    fetchTrending();
  }, []);

  // Fetch reports
  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (typeFilter !== "all") params.set("type", typeFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (activeTab === "my" && sessionId) {
          params.set("sessionId", sessionId);
        }

        const response = await fetch(`/api/reports?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch reports");

        const data = await response.json();
        setReports(data.reports);
      } catch (err) {
        setError("Failed to load reports");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [typeFilter, statusFilter, activeTab, sessionId]);

  const filteredReports = reports;

  const stats = {
    total: reports.length,
    new: reports.filter((r) => r.status === "new").length,
    inProgress: reports.filter((r) => r.status === "in_progress").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  return (
    <div className="min-h-screen gradient-mesh relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-orb w-[500px] h-[500px] bg-emerald-600/20 -top-32 -right-32 animate-float" />
        <div className="gradient-orb w-[400px] h-[400px] bg-teal-600/15 bottom-0 -left-32 animate-float-delayed" />
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
            <Link href="/report">
              <Button variant="gradient" size="sm" className="glow-hover">
                <AlertTriangle className="w-4 h-4 mr-2" />
                {t('reportIssue')}
              </Button>
            </Link>
            <LanguageSelector />
            <AccessibilityToggle />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('dashboard')}</h1>
          </div>
          <p className="text-slate-300">
            Visualiza y rastrea incidencias reportadas en la Universidad de Antioquia
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-slate-400">Total Reports</p>
          </GlassCard>
          <GlassCard className="p-4 text-center border-amber-500/30">
            <p className="text-2xl font-bold text-amber-400">{stats.new}</p>
            <p className="text-sm text-slate-400">New</p>
          </GlassCard>
          <GlassCard className="p-4 text-center border-blue-500/30">
            <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
            <p className="text-sm text-slate-400">In Progress</p>
          </GlassCard>
          <GlassCard className="p-4 text-center border-emerald-500/30">
            <p className="text-2xl font-bold text-emerald-400">{stats.resolved}</p>
            <p className="text-sm text-slate-400">Resolved</p>
          </GlassCard>
        </div>

        {/* Trending Issues */}
        {trendingReports.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Trending Issues</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {trendingReports.slice(0, 5).map((report) => (
                <GlassCard
                  key={report.id}
                  className="p-3 cursor-pointer hover:border-indigo-500/50 transition-colors"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {report.type}
                    </Badge>
                    {sessionId && (
                      <VoteButton
                        reportId={report.id}
                        sessionId={sessionId}
                        initialVoteCount={report.voteCount}
                        size="sm"
                      />
                    )}
                  </div>
                  <p className="text-sm text-white truncate mb-1">
                    {report.triageTitle || report.description.slice(0, 50)}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {report.address.split(",")[0]}
                  </p>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">{t('allReports')}</TabsTrigger>
            <TabsTrigger value="my">{t('recentReports')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="mb-6">
          <FilterBar
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            viewMode={viewMode}
            onTypeChange={setTypeFilter}
            onStatusChange={setStatusFilter}
            onViewModeChange={setViewMode}
            onClearFilters={() => {
              setTypeFilter("all");
              setStatusFilter("all");
            }}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : filteredReports.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-slate-500" />
            <h3 className="text-lg font-medium mb-2 text-white">{t('noReportsFound')}</h3>
            <p className="text-slate-400 mb-4">
              {activeTab === "my"
                ? "You haven't submitted any reports yet."
                : "No reports match your current filters."}
            </p>
            <Link href="/report">
              <Button variant="gradient" className="glow-hover">
                <AlertTriangle className="w-4 h-4 mr-2" />
                {t('reportIssue')}
              </Button>
            </Link>
          </GlassCard>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Map/List View */}
            <div className="lg:col-span-2">
              <GlassCard className="overflow-hidden">
                {viewMode === "map" ? (
                  <div className="h-[500px]">
                    <ReportMap
                      reports={filteredReports}
                      onReportSelect={setSelectedReport}
                      selectedReportId={selectedReport?.id}
                    />
                  </div>
                ) : (
                  <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {filteredReports.map((report) => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        onClick={() => setSelectedReport(report)}
                        isSelected={selectedReport?.id === report.id}
                        sessionId={sessionId}
                        showVotes={true}
                      />
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-1">
              {selectedReport ? (
                <GlassCard className="p-6 sticky top-28">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-lg text-white">
                      {selectedReport.triageTitle ||
                        `${selectedReport.type} Report`}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedReport(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Vote and Follow buttons */}
                  {sessionId && (
                    <div className="flex gap-2 mb-4">
                      <VoteButton
                        reportId={selectedReport.id}
                        sessionId={sessionId}
                        size="default"
                      />
                      <FollowButton
                        reportId={selectedReport.id}
                        sessionId={sessionId}
                        size="default"
                      />
                    </div>
                  )}

                  {selectedReport.photoUrl && (
                    <img
                      src={selectedReport.photoUrl}
                      alt="Report photo"
                      className="w-full h-48 object-cover rounded-xl mb-4 border border-slate-700"
                    />
                  )}

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Status</p>
                      <Badge
                        variant={
                          selectedReport.status === "resolved"
                            ? "success"
                            : selectedReport.status === "in_progress"
                            ? "warning"
                            : "default"
                        }
                      >
                        {selectedReport.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400 mb-1">
                        Description
                      </p>
                      <p className="text-sm text-slate-200">{selectedReport.description}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400 mb-1">
                        Location
                      </p>
                      <p className="text-sm text-slate-200">{selectedReport.address}</p>
                    </div>

                    {selectedReport.triageExplanation && (
                      <div>
                        <p className="text-sm text-slate-400 mb-1">
                          AI Assessment
                        </p>
                        <p className="text-sm text-slate-200">
                          {selectedReport.triageExplanation}
                        </p>
                        {selectedReport.suggestedDepartment && (
                          <Badge variant="secondary" className="mt-2">
                            Dept: {selectedReport.suggestedDepartment}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-slate-400 mb-1">
                        Reported
                      </p>
                      <p className="text-sm text-slate-200">
                        {new Date(selectedReport.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                      <p className="text-xs text-slate-500">
                        Report ID: {selectedReport.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="p-6 text-center">
                  <MapPin className="w-8 h-8 mx-auto mb-3 text-slate-500" />
                  <p className="text-sm text-slate-400">
                    Select a report to view details
                  </p>
                </GlassCard>
              )}
            </div>
          </div>
        )}
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
