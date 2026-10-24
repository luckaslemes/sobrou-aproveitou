import React from 'react';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erro durante a renderização do aplicativo:', error, info);
  }

  render() {
    if (this.state.error) {
      const error = this.state.error;
      return (
        <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 820, margin: '40px auto', padding: 24, color: '#243126' }}>
          <h1 style={{ color: '#b42318' }}>Encontramos um erro ao abrir o aplicativo</h1>
          <p>O carregamento começou, mas um componente falhou. Esta mensagem ajuda a identificar e corrigir a causa:</p>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: '#f4f4f4', padding: 16, borderRadius: 8 }}>{error?.stack || error?.message || String(error)}</pre>
          <p>Envie esta mensagem para corrigirmos o problema.</p>
        </main>
      );
    }
    return this.props.children;
  }
}

if (!rootElement) {
  document.body.innerHTML = '<main style="font:16px system-ui;padding:32px;color:#9f1239"><h1>Não foi possível iniciar</h1><p>O index.html não contém o elemento #root.</p></main>';
} else {
  const root = createRoot(rootElement);

  root.render(
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 760, margin: '48px auto', padding: 24, color: '#243126' }}>
      <h1 style={{ color: '#146c43' }}>Sobrou, Aproveitou!</h1>
      <p>Iniciando o aplicativo…</p>
    </main>
  );

  Promise.all([import('./styles.css'), import('./App.jsx')])
    .then(([, appModule]) => {
      const App = appModule.default;
      root.render(
        <React.StrictMode>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </React.StrictMode>
      );
    })
    .catch((error) => {
      console.error('Falha ao carregar o aplicativo:', error);
      root.render(
        <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 820, margin: '40px auto', padding: 24, color: '#243126' }}>
          <h1 style={{ color: '#b42318' }}>Não foi possível carregar o aplicativo</h1>
          <p>Ocorreu um erro ao carregar os arquivos do site:</p>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: '#f4f4f4', padding: 16, borderRadius: 8 }}>{error?.stack || error?.message || String(error)}</pre>
        </main>
      );
    });
}
