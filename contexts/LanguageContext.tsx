import React, { createContext, useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { Campaign } from '../types';

type LanguageCode = 'pt' | 'en' | 'es';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  translateCampaign: (campaign: Campaign, targetLanguage: LanguageCode) => Promise<Campaign>;
  translateCampaigns: (campaigns: Campaign[], targetLanguage: LanguageCode) => Promise<Campaign[]>;
  isTranslating: boolean;
}

const translations: Record<LanguageCode, Record<string, string>> = {
  pt: {
    researcherPanel: 'Painel do Pesquisador',
    myAvailableCampaigns: 'Minhas Campanhas Disponíveis',
    searchCampaign: 'Buscar campanha...',
    progress: 'Progresso',
    startSurvey: 'Iniciar Pesquisa',
    goalMet: 'Meta Atingida',
    noCampaignsFound: 'Nenhuma campanha encontrada com esse nome.',
    noCampaignsAssigned: 'Nenhuma campanha foi atribuída a você no momento.',
    tryAnotherTerm: 'Tente buscar por outro termo.',
    contactAdmin: 'Por favor, entre em contato com um administrador.',
    loadingCampaigns: 'Carregando campanhas',
    surveyTerms: 'Termos da Pesquisa',
    beforeYouStart: 'Antes de começar...',
    agreeAndParticipate: 'Concordo e quero participar',
    participantId: 'Identificação do Participante',
    fillDataToContinue: 'Por favor, preencha seus dados para continuar.',
    fullName: 'Nome Completo',
    ageRange: 'Faixa Etária',
    phone: 'Telefone (WhatsApp)',
    selectAgeRange: 'Por favor, selecione sua faixa etária.',
    start: 'Iniciar',
    answeringSurvey: 'Respondendo Pesquisa',
    previous: 'Anterior',
    next: 'Próximo',
    finish: 'Finalizar',
    loadingSurvey: 'Carregando pesquisa',
    translating: 'Traduzindo...'
  },
  en: {
    researcherPanel: 'Researcher Panel',
    myAvailableCampaigns: 'My Available Campaigns',
    searchCampaign: 'Search campaign...',
    progress: 'Progress',
    startSurvey: 'Start Survey',
    goalMet: 'Goal Met',
    noCampaignsFound: 'No campaigns found with that name.',
    noCampaignsAssigned: 'No campaigns have been assigned to you at the moment.',
    tryAnotherTerm: 'Try searching for another term.',
    contactAdmin: 'Please contact an administrator.',
    loadingCampaigns: 'Loading campaigns',
    surveyTerms: 'Survey Terms',
    beforeYouStart: 'Before you start...',
    agreeAndParticipate: 'I agree and want to participate',
    participantId: 'Participant Identification',
    fillDataToContinue: 'Please fill in your details to continue.',
    fullName: 'Full Name',
    ageRange: 'Age Range',
    phone: 'Phone (WhatsApp)',
    selectAgeRange: 'Please select your age range.',
    start: 'Start',
    answeringSurvey: 'Answering Survey',
    previous: 'Previous',
    next: 'Next',
    finish: 'Finish',
    loadingSurvey: 'Loading survey',
    translating: 'Translating...'
  },
  es: {
    researcherPanel: 'Panel del Investigador',
    myAvailableCampaigns: 'Mis Campañas Disponibles',
    searchCampaign: 'Buscar campaña...',
    progress: 'Progreso',
    startSurvey: 'Iniciar Encuesta',
    goalMet: 'Meta Alcanzada',
    noCampaignsFound: 'No se encontraron campañas con ese nombre.',
    noCampaignsAssigned: 'No se le han asignado campañas en este momento.',
    tryAnotherTerm: 'Intente buscar otro término.',
    contactAdmin: 'Por favor, póngase en contacto con un administrador.',
    loadingCampaigns: 'Cargando campañas',
    surveyTerms: 'Términos de la Encuesta',
    beforeYouStart: 'Antes de comenzar...',
    agreeAndParticipate: 'Acepto y quiero participar',
    participantId: 'Identificación del Participante',
    fillDataToContinue: 'Por favor, complete sus datos para continuar.',
    fullName: 'Nombre Completo',
    ageRange: 'Rango de Edad',
    phone: 'Teléfono (WhatsApp)',
    selectAgeRange: 'Por favor, seleccione su rango de edad.',
    start: 'Iniciar',
    answeringSurvey: 'Respondiendo Encuesta',
    previous: 'Anterior',
    next: 'Siguiente',
    finish: 'Finalizar',
    loadingSurvey: 'Cargando encuesta',
    translating: 'Traduciendo...'
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const questionOptionSchema = { type: Type.OBJECT, properties: { value: { type: Type.STRING }, jumpTo: { type: Type.STRING, nullable: true } }, required: ['value'] };
const questionSchema = { type: Type.OBJECT, properties: { id: { type: Type.STRING }, text: { type: Type.STRING }, type: { type: Type.STRING }, options: { type: Type.ARRAY, items: questionOptionSchema, nullable: true } }, required: ['id', 'text', 'type'] };
const campaignSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING }, name: { type: Type.STRING }, description: { type: Type.STRING }, theme: { type: Type.STRING }, isActive: { type: Type.BOOLEAN },
        startDate: { type: Type.STRING, nullable: true }, endDate: { type: Type.STRING, nullable: true }, startTime: { type: Type.STRING, nullable: true }, endTime: { type: Type.STRING, nullable: true },
        questions: { type: Type.ARRAY, items: questionSchema }, lgpdText: { type: Type.STRING }, companyIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        researcherIds: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }, collectUserInfo: { type: Type.BOOLEAN }, responseGoal: { type: Type.INTEGER }, finalRedirectUrl: { type: Type.STRING, nullable: true },
    },
    required: ['id', 'name', 'description', 'theme', 'isActive', 'questions', 'lgpdText', 'companyIds', 'collectUserInfo', 'responseGoal'],
};
const campaignListSchema = { type: Type.ARRAY, items: campaignSchema };


export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>(() => (localStorage.getItem('language') as LanguageCode) || 'pt');
  const [isTranslating, setIsTranslating] = useState(false);
  const translationCache = useRef(new Map<string, any>());

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = useCallback((key: string): string => {
    return translations[language][key] || key;
  }, [language]);
  
  const getLanguageName = (code: LanguageCode) => {
      if (code === 'en') return 'English';
      if (code === 'es') return 'Spanish';
      return 'Portuguese';
  }

  const translateCampaign = useCallback(async (campaign: Campaign, targetLanguage: LanguageCode): Promise<Campaign> => {
      const cacheKey = `${campaign.id}-${targetLanguage}`;
      if (translationCache.current.has(cacheKey)) {
          return translationCache.current.get(cacheKey);
      }

      setIsTranslating(true);
      try {
          const languageName = getLanguageName(targetLanguage);
          const prompt = `Translate all user-facing text fields in the following JSON object from Portuguese to ${languageName}. The user-facing fields are: 'name', 'description', 'lgpdText', and for each question in the 'questions' array, the 'text' field, and for each option in the 'options' array, the 'value' field. Do not translate any other fields like IDs, types, booleans, or URLs. Maintain the exact original JSON structure. JSON object: ${JSON.stringify(campaign)}`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: { responseMimeType: "application/json", responseSchema: campaignSchema }
          });

          const translatedCampaign = JSON.parse(response.text) as Campaign;
          translationCache.current.set(cacheKey, translatedCampaign);
          return translatedCampaign;
      } catch (error) {
          console.error("Failed to translate campaign:", error);
          return campaign; // Fallback to original
      } finally {
          setIsTranslating(false);
      }
  }, []);
  
  const translateCampaigns = useCallback(async (campaigns: Campaign[], targetLanguage: LanguageCode): Promise<Campaign[]> => {
      const cacheKey = `list-${campaigns.map(c => c.id).join('-')}-${targetLanguage}`;
      if (translationCache.current.has(cacheKey)) {
          return translationCache.current.get(cacheKey);
      }

      setIsTranslating(true);
      try {
          const languageName = getLanguageName(targetLanguage);
          const prompt = `Translate all user-facing text fields in the following array of JSON objects from Portuguese to ${languageName}. For each object, the user-facing fields are: 'name', 'description'. Do not translate any other fields. Maintain the exact original JSON array structure. JSON array: ${JSON.stringify(campaigns.map(({name, description, ...rest}) => ({name, description, ...rest})))}`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: { responseMimeType: "application/json", responseSchema: campaignListSchema }
          });

          const translatedCampaigns = JSON.parse(response.text) as Campaign[];
          translationCache.current.set(cacheKey, translatedCampaigns);
          return translatedCampaigns;
      } catch (error) {
          console.error("Failed to translate campaigns list:", error);
          return campaigns; // Fallback to original
      } finally {
          setIsTranslating(false);
      }
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    translateCampaign,
    translateCampaigns,
    isTranslating,
  }), [language, t, translateCampaign, translateCampaigns, isTranslating]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
