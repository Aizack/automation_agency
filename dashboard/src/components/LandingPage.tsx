import React, { useState } from 'react';
import { FrantLandingPage } from './FrantLandingPage';
import { DiazLabLandingPage } from './DiazLabLandingPage';

interface LandingPageProps {
  onLoginClick: () => void;
  forcedSite?: 'frant' | 'diazlab';
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, forcedSite }) => {
  const [site, setSite] = useState<'frant' | 'diazlab'>(() => {
    if (forcedSite) return forcedSite;
    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const siteParam = params.get('site');

    if (siteParam === 'diazlab' || path === '/diazlab' || host === 'diazlab.online' || host === 'www.diazlab.online') {
      return 'diazlab';
    }
    return 'frant';
  });

  if (site === 'diazlab') {
    return (
      <DiazLabLandingPage
        onLoginClick={onLoginClick}
        onGoToFrant={() => setSite('frant')}
      />
    );
  }

  return (
    <FrantLandingPage
      onLoginClick={onLoginClick}
      onGoToDiazLab={() => setSite('diazlab')}
    />
  );
};
