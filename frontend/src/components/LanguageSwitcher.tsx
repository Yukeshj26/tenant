"use client";
// LanguageSwitcher — EN / தமிழ் / हिन्दी toggle — Vithara light theme

interface LanguageSwitcherProps {
  value: string;
  onChange: (lang: string) => void;
}

const LANGUAGES = [
  { code: "en", label: "EN",     full: "English" },
  { code: "ta", label: "தமிழ்", full: "Tamil"   },
  { code: "hi", label: "हिन्दी", full: "Hindi"   },
];

export default function LanguageSwitcher({ value, onChange }: LanguageSwitcherProps) {
  return (
    <div
      id="language-switcher"
      style={{
        display: "flex",
        gap: 3,
        background: "#f2ede4",
        border: "1px solid rgba(122,158,126,0.25)",
        borderRadius: 40,
        padding: 4,
      }}
    >
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          id={`lang-btn-${code}`}
          title={LANGUAGES.find(l => l.code === code)?.full}
          onClick={() => onChange(code)}
          style={{
            padding: "4px 12px",
            borderRadius: 40,
            border: "none",
            cursor: "pointer",
            fontSize: "0.75rem",
            fontWeight: 700,
            fontFamily: "inherit",
            transition: "all 0.2s ease",
            background: value === code ? "#4e7a54" : "transparent",
            color:      value === code ? "#ffffff" : "#888880",
            boxShadow:  value === code ? "0 2px 8px rgba(78,122,84,0.3)" : "none",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
