import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
    language: string;
    setLanguage: (lang: string) => void;
}

const languages = [
    { code: 'ko', name: 'Korean' },
    { code: 'en', name: 'English' },
    { code: 'id', name: 'Indonesian' },
    { code: 'fr', name: 'French' },
    { code: 'zh', name: 'Chinese' },
];

export default function LanguageSelector({ language, setLanguage }: LanguageSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedLang = languages.find(l => l.code === language) || languages[0];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                className="glass-panel hover:bg-white/10 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    minWidth: '150px',
                    justifyContent: 'space-between',
                    color: 'white',
                    border: '1px solid var(--color-glass-border)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={18} color="#c084fc" />
                    <span>{selectedLang.name}</span>
                </div>
                <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isOpen && (
                <div
                    className="glass-panel"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        width: '100%',
                        padding: '4px',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        backgroundColor: 'rgba(5, 5, 16, 0.9)' // slightly darker backdrop for readability
                    }}
                >
                    {languages.map((lang) => (
                        <div
                            key={lang.code}
                            onClick={() => {
                                setLanguage(lang.code);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                transition: 'background 0.2s',
                                backgroundColor: language === lang.code ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                color: language === lang.code ? '#fff' : 'rgba(255,255,255,0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = language === lang.code ? 'rgba(139, 92, 246, 0.2)' : 'transparent'}
                        >
                            <span style={{ fontSize: '0.9rem' }}>{lang.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
