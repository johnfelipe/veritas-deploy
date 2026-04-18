"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  MapPin,
  CheckCircle,
  Loader2,
  Car,
  Volume2,
  Construction,
  Lightbulb,
  Footprints,
  Paintbrush,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";
import { LanguageSelector, useTranslation } from "@/components/LanguageSelector";
import { PhotoUpload } from "@/components/PhotoUpload";
import { searchAddresses, GeocodingResult } from "@/lib/geocode";

// Default Universidad de Antioquia (Ciudad Universitaria) location
const DEFAULT_LOCATION = {
  lat: 6.2676,
  lng: -75.5685,
  address: "Ciudad Universitaria, Universidad de Antioquia, Medellín, Colombia"
};

// Default coordinates for location biasing (UdeA campus)
const DEFAULT_COORDS = {
  lat: 6.2676,
  lng: -75.5685,
};

type IssueType =
  | "pothole"
  | "noise"
  | "parking"
  | "graffiti"
  | "streetlight"
  | "sidewalk"
  | "other";

interface IssueTypeOption {
  type: IssueType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const issueTypes: IssueTypeOption[] = [
  {
    type: "pothole",
    label: "Pothole",
    description: "Road damage, holes in pavement",
    icon: <Construction className="w-6 h-6" />,
    color: "bg-orange-500",
  },
  {
    type: "noise",
    label: "Noise Complaint",
    description: "Excessive noise, bylaw violations",
    icon: <Volume2 className="w-6 h-6" />,
    color: "bg-purple-500",
  },
  {
    type: "parking",
    label: "Parking Issue",
    description: "Illegal parking, blocked access",
    icon: <Car className="w-6 h-6" />,
    color: "bg-blue-500",
  },
  {
    type: "graffiti",
    label: "Graffiti",
    description: "Vandalism, unwanted markings",
    icon: <Paintbrush className="w-6 h-6" />,
    color: "bg-pink-500",
  },
  {
    type: "streetlight",
    label: "Streetlight",
    description: "Broken or flickering lights",
    icon: <Lightbulb className="w-6 h-6" />,
    color: "bg-yellow-500",
  },
  {
    type: "sidewalk",
    label: "Sidewalk",
    description: "Damaged or unsafe walkways",
    icon: <Footprints className="w-6 h-6" />,
    color: "bg-green-500",
  },
  {
    type: "other",
    label: "Other",
    description: "Other civic issues",
    icon: <HelpCircle className="w-6 h-6" />,
    color: "bg-gray-500",
  },
];

export default function ReportPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [auditHash, setAuditHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [description, setDescription] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");

  // User's geolocation for biasing results
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Session ID for tracking user's reports
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    // Get or create session ID
    let id = localStorage.getItem("veritas-session-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("veritas-session-id", id);
    }
    setSessionId(id);
  }, []);

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
          setUserLocation(DEFAULT_COORDS);
        }
      );
    } else {
      setUserLocation(DEFAULT_COORDS);
    }
  }, []);

  const canProceed = () => {
    switch (step) {
      case 1:
        return issueType !== null;
      case 2:
        return description.trim().length >= 10;
      case 3:
        return true; // Photo is optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Debounced address search
  useEffect(() => {
    if (!addressInput.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchAddresses(addressInput, 5, {
        countryCode: "co",
        nearLat: userLocation?.lat,
        nearLng: userLocation?.lng,
      });
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [addressInput, userLocation]);

  const handleSuggestionClick = (suggestion: GeocodingResult) => {
    setLocation({
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: suggestion.display,
    });
    setAddressInput(suggestion.display);
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleAddressBlur = () => {
    // Delay hiding to allow click on suggestion
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleSubmit = async () => {
    if (!issueType) return;

    setIsSubmitting(true);
    setError(null);

    // Use provided location or fall back to default UdeA campus location
    const reportLocation = location || DEFAULT_LOCATION;

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: issueType,
          description,
          latitude: reportLocation.lat,
          longitude: reportLocation.lng,
          address: reportLocation.address,
          photoUrl: photoUrl || null,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit report");
      }

      const data = await response.json();
      setReportId(data.report.id);
      setAuditHash(data.auditHash || null);

      // Trigger triage
      await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: data.report.id }),
      });

      setSubmitSuccess(true);
    } catch (err) {
      setError("Failed to submit report. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = issueTypes.find((t) => t.type === issueType);

  return (
    <div className="min-h-screen gradient-mesh relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-orb w-[500px] h-[500px] bg-pink-600/25 -top-32 -left-32 animate-float" />
        <div className="gradient-orb w-[400px] h-[400px] bg-rose-600/20 bottom-0 -right-32 animate-float-delayed" />
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
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 mb-4 backdrop-blur-sm">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Report a Civic Issue</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-white">
              {t('reportIssue')}
            </h1>
            <p className="text-slate-300">
              Help improve our community by reporting problems
            </p>
          </div>

          {/* Progress Steps */}
          {!submitSuccess && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex items-center ${s < 3 ? "flex-1" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                      s <= step
                        ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/30"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {s < step ? <CheckCircle className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded transition-colors ${
                        s < step ? "bg-gradient-to-r from-pink-500 to-rose-500" : "bg-slate-700"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step Content */}
          {!submitSuccess ? (
            <GlassCard className="p-6">
              {/* Step 1: Issue Type */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white">
                    {t('whatTypeOfIssue')}
                  </h2>
                  <p className="text-sm text-slate-400">
                    Select the category that best describes the problem
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {issueTypes.map((type) => (
                      <button
                        key={type.type}
                        onClick={() => setIssueType(type.type)}
                        className={`p-4 rounded-xl border-2 transition-all focus-ring ${
                          issueType === type.type
                            ? "border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/20"
                            : "border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-600"
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-full ${type.color} flex items-center justify-center text-white mx-auto mb-2 shadow-lg`}
                        >
                          {type.icon}
                        </div>
                        <p className="font-medium text-sm text-white">{type.label}</p>
                        <p className="text-xs text-slate-400">
                          {type.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Description & Location */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white">
                    {t('describeIssue')}
                  </h2>
                  <p className="text-sm text-slate-400">
                    Provide details to help us understand and address the problem
                  </p>
                  {selectedType && (
                    <Badge className={`${selectedType.color} text-white`}>
                      {selectedType.label}
                    </Badge>
                  )}
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('descriptionPlaceholder')}
                    className="min-h-[150px]"
                    maxLength={1000}
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Minimum 10 characters</span>
                    <span>{description.length}/1000</span>
                  </div>

                  {/* Location Input */}
                  <div className="pt-4 border-t border-slate-700">
                    <label className="block text-sm font-medium text-white mb-2">
                      <MapPin className="w-4 h-4 inline-block mr-1" />
                      Location (optional)
                    </label>
                    <div className="relative">
                      <Input
                        value={addressInput}
                        onChange={(e) => {
                          setAddressInput(e.target.value);
                          // Clear location when user edits the input
                          if (location) setLocation(null);
                        }}
                        onFocus={() => {
                          if (suggestions.length > 0) setShowDropdown(true);
                        }}
                        onBlur={handleAddressBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setShowDropdown(false);
                          }
                        }}
                        placeholder="ej., Bloque 9, Ciudad Universitaria, Medellín"
                        className="w-full bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
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
                    {location && (
                      <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-emerald-300">{location.address}</p>
                      </div>
                    )}
                    {!location && (
                      <p className="text-xs text-slate-500 mt-2">
                        Escribe para buscar una dirección, o déjalo en blanco para usar la ubicación por defecto (Ciudad Universitaria, UdeA, Medellín)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Photo */}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white">
                    Add a photo (optional)
                  </h2>
                  <p className="text-sm text-slate-400">
                    A photo helps us understand the issue better
                  </p>
                  <PhotoUpload onUpload={setPhotoUrl} currentUrl={photoUrl} />

                  {/* Summary */}
                  <div className="mt-6 p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                    <h3 className="font-medium mb-3 text-white">Report Summary</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Type:</dt>
                        <dd className="font-medium text-white">{selectedType?.label}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400 mb-1">Description:</dt>
                        <dd className="text-sm text-slate-200">{description}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400 mb-1">Location:</dt>
                        <dd className="text-sm text-slate-200">{location?.address || DEFAULT_LOCATION.address}</dd>
                      </div>
                      {photoUrl && (
                        <div className="flex justify-between">
                          <dt className="text-slate-400">Photo:</dt>
                          <dd className="text-emerald-400">Attached</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Privacy Note */}
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-blue-300">
                      <strong>Privacy:</strong> No personal information is required.
                      Location is stored only to route your report to the appropriate
                      department.
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
                {step > 1 ? (
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('back')}
                  </Button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <Button
                    variant="gradient"
                    onClick={handleNext}
                    disabled={!canProceed()}
                  >
                    {t('next')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    variant="gradient"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('submitting')}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t('submitReport')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </GlassCard>
          ) : (
            /* Success State */
            <GlassCard className="p-8 text-center animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">Report Submitted!</h2>
              <p className="text-slate-300 mb-4">
                Thank you for helping improve our community.
              </p>
              {reportId && (
                <p className="text-sm mb-4 text-slate-400">
                  Report ID:{" "}
                  <code className="px-2 py-1 rounded bg-slate-700 font-mono text-white">
                    {reportId.slice(0, 8)}
                  </code>
                </p>
              )}

              {/* Blockchain Verification Badge */}
              {auditHash && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold text-purple-300">Anchored to Solana Blockchain</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Your report is cryptographically sealed in our hash chain and anchored to Solana devnet for tamper-proof verification.
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    <code className="text-xs px-3 py-1.5 rounded bg-slate-800 font-mono text-emerald-300 border border-emerald-500/30">
                      {auditHash}
                    </code>
                    <div className="flex items-center gap-3">
                      <Link
                        href="/trust"
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <Shield className="w-3 h-3" />
                        Verify on Trust Dashboard
                      </Link>
                      <a
                        href="https://explorer.solana.com/?cluster=devnet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        Solana Explorer
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => router.push("/dashboard")}>
                  <MapPin className="w-4 h-4 mr-2" />
                  View Dashboard
                </Button>
                <Button
                  variant="gradient"
                  onClick={() => {
                    setSubmitSuccess(false);
                    setStep(1);
                    setIssueType(null);
                    setDescription("");
                    setAddressInput("");
                    setLocation(null);
                    setSuggestions([]);
                    setShowDropdown(false);
                    setPhotoUrl("");
                    setReportId(null);
                    setAuditHash(null);
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Report Another Issue
                </Button>
              </div>
            </GlassCard>
          )}
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
