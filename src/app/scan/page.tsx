"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Upload,
  ArrowLeft,
  Shield,
  Loader2,
  Image as ImageIcon,
  X,
  Eye,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DetectedIssueCard } from "@/components/DetectedIssueCard";
import { searchAddresses, GeocodingResult } from "@/lib/geocode";

interface DetectedIssue {
  type: "pothole" | "graffiti" | "streetlight" | "sidewalk" | "litter" | "other";
  confidence: number;
  description: string;
  severity: "low" | "medium" | "high";
  suggestedTitle: string;
}

interface ScanResult {
  success: boolean;
  detections: DetectedIssue[];
  overallDescription: string;
}

// Default Universidad de Antioquia (Ciudad Universitaria) location
const DEFAULT_LOCATION = {
  lat: 6.2676,
  lng: -75.5685,
};

export default function ScanPage() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [address, setAddress] = useState("");
  const [confirmedIssues, setConfirmedIssues] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Address autocomplete state
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<GeocodingResult | null>(null);

  // User's geolocation for biasing results
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Fall back to UdeA campus center if geolocation denied
          setUserLocation(DEFAULT_LOCATION);
        }
      );
    } else {
      setUserLocation(DEFAULT_LOCATION);
    }
  }, []);

  // Debounced address search
  useEffect(() => {
    if (!address.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchAddresses(address, 5, {
        countryCode: "co",
        nearLat: userLocation?.lat,
        nearLng: userLocation?.lng,
      });
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [address, userLocation]);

  const handleSuggestionClick = (suggestion: GeocodingResult) => {
    setAddress(suggestion.display);
    setSelectedLocation(suggestion);
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleAddressBlur = () => {
    // Delay hiding to allow click on suggestion
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setImageFile(file);
      setScanResult(null);
      setConfirmedIssues(new Set());
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          mimeType: imageFile?.type || "image/jpeg",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze image");
      }

      const result = await response.json();
      setScanResult(result);
    } catch (err) {
      console.error("Scan error:", err);
      setError("Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmIssue = async (issue: DetectedIssue, index: number) => {
    if (!address.trim()) {
      setError("Please enter an address for the issue location");
      return;
    }

    // Get session ID
    let sessionId = localStorage.getItem("veritas-session-id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("veritas-session-id", sessionId);
    }

    // Create report - geocoding happens server-side
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: issue.type === "litter" ? "other" : issue.type,
        description: `${issue.suggestedTitle}\n\n${issue.description}`,
        address,
        severity: issue.severity,
        sessionId,
        source: "vision-scanner",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create report");
    }

    setConfirmedIssues((prev) => new Set(prev).add(index));
  };

  const clearImage = () => {
    setImage(null);
    setImageFile(null);
    setScanResult(null);
    setConfirmedIssues(new Set());
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <main className="min-h-screen bg-slate-900">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "-2s" }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Camera className="w-8 h-8 text-emerald-400" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                    AI Vision Scanner
                  </h1>
                  <p className="text-sm text-slate-400">
                    Upload a photo to detect civic issues
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Upload section */}
          <div className="space-y-6">
            {/* Upload area */}
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                Upload Photo
              </h2>

              {!image ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800/30 transition-colors"
                >
                  <ImageIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-300 mb-2">
                    Drag and drop an image here
                  </p>
                  <p className="text-sm text-slate-500 mb-4">or click to browse</p>
                  <Button variant="outline" size="sm">
                    Select Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={image}
                      alt="Uploaded photo"
                      className="w-full rounded-xl border border-slate-700"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute top-2 right-2 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {!scanResult && (
                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      variant="gradient"
                      className="w-full"
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Eye className="w-5 h-5 mr-2" />
                          Analyze Photo
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                accept="image/*"
                className="hidden"
              />
            </GlassCard>

            {/* Address input */}
            {scanResult && scanResult.detections.length > 0 && (
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  Issue Location
                </h3>
                <div className="relative">
                  <Input
                    placeholder="Enter the address where you took this photo..."
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (selectedLocation) setSelectedLocation(null);
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowDropdown(true);
                    }}
                    onBlur={handleAddressBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setShowDropdown(false);
                    }}
                    className="bg-slate-800/50 border-slate-600"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  )}
                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-auto">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.lat}-${suggestion.lng}-${index}`}
                          type="button"
                          className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:outline-none transition-colors border-b border-slate-700 last:border-b-0"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{suggestion.display}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedLocation && (
                  <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-emerald-300">{selectedLocation.display}</p>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  This address will be used for all reported issues from this photo
                </p>
              </GlassCard>
            )}
          </div>

          {/* Right: Results section */}
          <div className="space-y-6">
            {isAnalyzing ? (
              <GlassCard className="p-12 text-center">
                <Loader2 className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Analyzing Image...
                </h3>
                <p className="text-slate-400">
                  AI is scanning for civic issues
                </p>
              </GlassCard>
            ) : scanResult ? (
              <div className="space-y-6">
                {/* Summary */}
                <GlassCard className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-2">
                    Analysis Complete
                  </h2>
                  <p className="text-slate-300">{scanResult.overallDescription}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-4xl font-bold text-emerald-400">
                      {scanResult.detections.length}
                    </span>
                    <span className="text-slate-400">
                      {scanResult.detections.length === 1
                        ? "issue detected"
                        : "issues detected"}
                    </span>
                  </div>
                </GlassCard>

                {/* Detected issues */}
                {scanResult.detections.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">
                      Detected Issues
                    </h3>
                    {scanResult.detections.map((issue, index) => (
                      <DetectedIssueCard
                        key={index}
                        issue={issue}
                        index={index}
                        onConfirm={() => handleConfirmIssue(issue, index)}
                        isConfirmed={confirmedIssues.has(index)}
                      />
                    ))}
                  </div>
                ) : (
                  <GlassCard className="p-8 text-center">
                    <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      No Issues Detected
                    </h3>
                    <p className="text-slate-400">
                      The AI did not detect any civic issues in this photo.
                      Try uploading a clearer image or one that shows the issue
                      more prominently.
                    </p>
                  </GlassCard>
                )}
              </div>
            ) : (
              <GlassCard className="p-8 text-center">
                <Camera className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Upload a Photo to Begin
                </h3>
                <p className="text-slate-400 mb-4">
                  Take or upload a photo of a street, sidewalk, or public area.
                  Our AI will automatically detect issues like:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Potholes", "Graffiti", "Broken Lights", "Damaged Sidewalks", "Litter"].map(
                    (item) => (
                      <span
                        key={item}
                        className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-sm"
                      >
                        {item}
                      </span>
                    )
                  )}
                </div>
              </GlassCard>
            )}

            {error && (
              <GlassCard className="p-4 border-red-500/50 bg-red-900/10">
                <p className="text-red-400 text-sm">{error}</p>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
