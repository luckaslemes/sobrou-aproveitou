import React from 'react';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<main style="font:16px system-ui;padding:32px;color:#9f1239"><h1>Não foi possível iniciar</h1><p>O index.html não contém o elemento #root.</p></main>';
} else {
  const root = createRoot(rootElement);

  // Render something immediately so startup failures never leave a silent white page.
  root.render(
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 760, margin: '48px auto', padding: 24, color: '#243126' }}>
      <h1 style={{ color: '#146c43' }}>Sobrou, Aproveitou!</h1>
      <p id="startup-status">Iniciando o aplicativo…</p>
    </main>
  );

  Promise.all([
    import('./styles.css'),
    import('./App.jsx')
  ]).then(([, appModule]) => {
    const App = appModule.default;
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }).catch((error) => {
    console.error('Erro ao iniciar Sobrou, Aproveitou:', error);
    root.render(
      <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 760, margin: '48px auto', padding: 24, color: '#243126' }}>
        <h1 style={{ color: '#b42318' }}>O aplicativo não conseguiu iniciar</h1>
        <p>Copie esta mensagem de erro e envie para que possamos corrigir:</p>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: '#f4f4f4', padding: 16, borderRadius: 8 }}>{error?.stack || error?.message || String(error)}</pre>
      </main>
    );
  });
}
