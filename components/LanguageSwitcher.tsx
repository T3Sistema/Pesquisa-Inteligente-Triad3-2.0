import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// FIX: Added 'as const' to ensure lang.code is typed as a literal union ('pt' | 'en' | 'es')
// which is compatible with the LanguageCode type, resolving the error on line 18.
const languages = [
    { code: 'pt', flag: 'https://flagcdn.com/w40/br.png', name: 'Português' },
    { code: 'en', flag: 'https://flagcdn.com/w40/us.png', name: 'English' },
    { code: 'es', flag: 'https://flagcdn.com/w40/es.png', name: 'Español' },
] as const;

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="flex items-center gap-2">
            {languages.map(lang => (
                <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`p-1 rounded-full transition-all duration-200 ${language === lang.code ? 'opacity-100 ring-2 ring-light-primary ring-offset-2 ring-offset-light-background dark:ring-offset-dark-card' : 'opacity-50 hover:opacity-100'}`}
                    aria-label={`Mudar idioma para ${lang.name}`}
                >
                    <img src={lang.flag} alt={lang.name} className="h-5 w-auto rounded-full object-cover" />
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;