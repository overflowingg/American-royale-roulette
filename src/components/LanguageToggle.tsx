import React from "react";
import { useLanguage, Language } from "../lib/i18n";
import { Globe } from "lucide-react";

interface LanguageToggleProps {
  className?: string;
}

export default function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg p-0.5 sm:p-1 shrink-0 ${className}`}>
      <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 ml-1 sm:ml-1.5 shrink-0" />
      <div className="flex items-center text-[10px] sm:text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded transition-all ${
            language === "en"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="English (Default)"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage("zh")}
          className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded transition-all ${
            language === "zh"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="中文 (Chinese)"
        >
          中文
        </button>
      </div>
    </div>
  );
}
