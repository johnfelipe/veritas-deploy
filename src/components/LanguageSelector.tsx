"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// NOTE: The union type retains "fr" as the language code to preserve
// backward compatibility with persisted user preferences, but the label and
// content are now Spanish (Universidad de Antioquia, Colombia).
export type Language = "en" | "fr";

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

const languages: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "fr", name: "Spanish", nativeName: "Español" },
];

// Simple i18n translations
export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    askQuestion: "Ask a Question",
    reportIssue: "Report an Issue",
    dashboard: "Dashboard",
    home: "Home",

    // Common actions
    search: "Search...",
    submit: "Submit",
    cancel: "Cancel",
    next: "Next",
    back: "Back",
    loading: "Loading...",
    noResults: "No results found",

    // Q&A page
    typeQuestion: "Type your question about Universidad de Antioquia services...",
    viewSources: "View Sources",
    askAnything: "Ask anything about Universidad de Antioquia services",
    questionPlaceholder: "e.g., What are the library hours at UdeA?",

    // Report page
    reportSubmitted: "Report submitted successfully",
    selectLocation: "Select location on map",
    uploadPhoto: "Upload Photo",
    description: "Description",
    issueType: "Issue Type",
    whereIsIssue: "Where is the issue?",
    describeIssue: "Describe the Issue",
    reviewSubmit: "Review & Submit",
    selectIssueType: "Select Issue Type",
    whatTypeOfIssue: "What type of issue are you reporting?",
    provideDetails: "Provide details about the issue",
    descriptionPlaceholder: "Please describe the issue in detail...",
    clickMapToSelect: "Click on the map to select the issue location",
    reviewYourReport: "Review Your Report",
    submitReport: "Submit Report",
    submitting: "Submitting...",

    // Issue types
    pothole: "Pothole",
    streetlight: "Streetlight",
    graffiti: "Graffiti",
    garbage: "Garbage/Litter",
    parking: "Parking Issue",
    noise: "Noise Complaint",
    water: "Water/Sewer",
    other: "Other",

    // Dashboard
    recentReports: "Recent Reports",
    allReports: "All Reports",
    pending: "Pending",
    inProgress: "In Progress",
    resolved: "Resolved",
    searchReports: "Search reports...",
    noReportsFound: "No reports found",

    // Misc
    disclaimer: "Informational only. Verify with Universidad de Antioquia for official decisions.",
    welcomeTitle: "Your University, Simplified",
    welcomeSubtitle: "Get instant answers about Universidad de Antioquia services, report campus issues, and track their resolution.",
  },
  fr: {
    // Navigation
    askQuestion: "Hacer una pregunta",
    reportIssue: "Reportar una incidencia",
    dashboard: "Tablero",
    home: "Inicio",

    // Common actions
    search: "Buscar...",
    submit: "Enviar",
    cancel: "Cancelar",
    next: "Siguiente",
    back: "Atrás",
    loading: "Cargando...",
    noResults: "Sin resultados",

    // Q&A page
    typeQuestion: "Escribe tu pregunta sobre los servicios de la Universidad de Antioquia...",
    viewSources: "Ver fuentes",
    askAnything: "Pregunta cualquier cosa sobre los servicios de la Universidad de Antioquia",
    questionPlaceholder: "ej.: ¿Cuál es el horario de la Biblioteca Central?",

    // Report page
    reportSubmitted: "Reporte enviado exitosamente",
    selectLocation: "Seleccionar ubicación en el mapa",
    uploadPhoto: "Subir foto",
    description: "Descripción",
    issueType: "Tipo de incidencia",
    whereIsIssue: "¿Dónde está la incidencia?",
    describeIssue: "Describe la incidencia",
    reviewSubmit: "Revisar y enviar",
    selectIssueType: "Selecciona el tipo de incidencia",
    whatTypeOfIssue: "¿Qué tipo de incidencia estás reportando?",
    provideDetails: "Agrega detalles sobre la incidencia",
    descriptionPlaceholder: "Por favor describe la incidencia en detalle...",
    clickMapToSelect: "Haz clic en el mapa para seleccionar la ubicación",
    reviewYourReport: "Revisa tu reporte",
    submitReport: "Enviar reporte",
    submitting: "Enviando...",

    // Issue types
    pothole: "Hueco en vía",
    streetlight: "Alumbrado",
    graffiti: "Grafiti",
    garbage: "Basura",
    parking: "Parqueadero",
    noise: "Ruido",
    water: "Agua/alcantarillado",
    other: "Otro",

    // Dashboard
    recentReports: "Reportes recientes",
    allReports: "Todos los reportes",
    pending: "Pendiente",
    inProgress: "En curso",
    resolved: "Resuelto",
    searchReports: "Buscar reportes...",
    noReportsFound: "No se encontraron reportes",

    // Misc
    disclaimer: "Información referencial. Verifica con la Universidad de Antioquia para decisiones oficiales.",
    welcomeTitle: "Tu universidad, simplificada",
    welcomeSubtitle: "Obtén respuestas instantáneas sobre los servicios de la Universidad de Antioquia, reporta incidencias del campus y haz seguimiento a su resolución.",
  },
};

// Language Context
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Language Provider component
export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to Spanish ("fr" in our legacy code) since this deployment
  // targets the Universidad de Antioquia community.
  const [language, setLanguageState] = useState<Language>("fr");
  const [isHydrated, setIsHydrated] = useState(false);

  // Load language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("veritas-language") as Language;
    if (saved && (saved === "en" || saved === "fr")) {
      setLanguageState(saved);
    }
    setIsHydrated(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("veritas-language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  // Prevent hydration mismatch by rendering children only after hydration
  if (!isHydrated) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use translations
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    // Fallback for components not wrapped in provider
    return {
      language: "en" as Language,
      setLanguage: () => {},
      t: (key: string) => translations.en[key] || key,
    };
  }
  return context;
}

interface LanguageSelectorProps {
  onChange?: (lang: Language) => void;
}

export function LanguageSelector({ onChange }: LanguageSelectorProps) {
  const { language, setLanguage } = useTranslation();

  const handleChange = (value: Language) => {
    setLanguage(value);
    onChange?.(value);
  };

  return (
    <Select value={language} onValueChange={handleChange}>
      <SelectTrigger
        className="w-[140px] focus-ring bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700"
        aria-label="Select language"
      >
        <Globe className="h-4 w-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-700">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="text-white hover:bg-slate-700">
            {lang.nativeName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
