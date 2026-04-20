import { useEffect } from 'react';

const BotpressChat = () => {
  useEffect(() => {
    const existingScript = document.getElementById('bp-webchat-script');
    const existingCustom = document.getElementById('bp-custom-script');
    if (existingScript && existingCustom) return;

    const script1 = document.createElement('script');
    script1.id = 'bp-webchat-script';
    script1.src = 'https://cdn.botpress.cloud/webchat/v3.6/inject.js';
    script1.async = true;
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.id = 'bp-custom-script';
    script2.src = 'https://files.bpcontent.cloud/2026/04/20/05/20260420053642-H0AXLN0O.js';
    script2.defer = true;
    document.body.appendChild(script2);

    return () => {
      const s1 = document.getElementById('bp-webchat-script');
      const s2 = document.getElementById('bp-custom-script');
      if (s1) s1.remove();
      if (s2) s2.remove();
    };
  }, []);

  return null;
};

export default BotpressChat;
