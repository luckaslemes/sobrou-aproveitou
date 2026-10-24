import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<main style="font-family:system-ui;padding:32px;color:#9f1239"><h1>Não foi possível iniciar o site</h1><p>O elemento #root não foi encontrado no index.html.</p></main>';
} else {
  const root = createRoot(rootElement);

  import('./App.jsx')
    .then(({ default: App }) => {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    })
    .catch((error) => {
      console.error('Falha ao carregar o aplicativo:', error);
      rootElement.innerHTML = `
        <main style="max-width:760px;margin:48px auto;padding:24px;font-family:system-ui;color:#202820">
          <h1 style="color:#b42318">Não foi possível carregar o Sobrou, Aproveitou!</h1>
          <p>O navegador encontrou um erro ao iniciar o aplicativo. Copie a mensagem abaixo e envie para corrigirmos.</p>
          <pre style="white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f4f4;padding:16px;border-radius:8px"></pre>
          <p>Depois de corrigir, recarregue a página com Ctrl + Shift + R.</p>
        </main>
      `;
      const errorBox = rootElement.querySelector('pre');
      if (errorBox) errorBox.textContent = error?.stack || error?.message || String(error);
    });
}
