import React, { useState, useEffect } from 'react';
import { getClientTimeZone, getClientCountryFlag } from '../utils/dateTime';

interface HeaderBranchClockProps {
  country?: string;
  timezone?: string;
}

export const HeaderBranchClock: React.FC<HeaderBranchClockProps> = ({ country, timezone }) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [showSeconds, setShowSeconds] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const resolvedTz = getClientTimeZone(country, timezone);
  const flag = getClientCountryFlag(country);
  const resolvedCountry = country || localStorage.getItem('client_country') || 'Colombia';

  // Formatear hora local según la zona horaria de la empresa/sede
  let formattedTime = '';
  let formattedDate = '';
  try {
    formattedTime = new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: true,
      timeZone: resolvedTz
    }).format(now);

    formattedDate = new Intl.DateTimeFormat('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: resolvedTz
    }).format(now);
  } catch (e) {
    formattedTime = now.toLocaleTimeString();
    formattedDate = now.toLocaleDateString();
  }

  return (
    <div 
      onClick={() => setShowSeconds(prev => !prev)}
      className="flex items-center gap-2 px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-[#F2EFE9] border border-[#E2DFD7] rounded-[4px] text-xs font-mono text-[#161616] shadow-xs cursor-pointer select-none transition-colors"
      title={`Hora oficial del negocio en ${resolvedCountry} (${resolvedTz})\n${formattedDate}\nHaz clic para ${showSeconds ? 'ocultar' : 'ver'} segundos.`}
    >
      <span className="material-symbols-outlined text-[15px] text-[#D9381E] shrink-0">
        schedule
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-bold tracking-tight text-[#161616] text-[11px] sm:text-xs">
          {formattedTime}
        </span>
        <span className="text-[10px] text-[#76746E] hidden md:inline uppercase font-sans">
          {formattedDate}
        </span>
      </div>
      <span className="text-xs shrink-0 pl-1 border-l border-[#E2DFD7] flex items-center gap-1" title={resolvedCountry}>
        <span>{flag}</span>
      </span>
    </div>
  );
};
