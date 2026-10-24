import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Leaf, LogOut, Store, Users, MessageCircle, Settings, RefreshCw, Send, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
import './admin.css';

const tabs = [
  { id: 'overview', label: 'Visão geral', icon: ShieldCheck },
  { id: 'stores', label: 'Comércios', icon: Store },
  { id: 'users', label: 'Contas', icon: Users },
  { id: 'support', label: 'Central de suporte', icon: MessageCircle },
  { id: 'settings', label: 'Aparência e contato', icon: Settings },
];

function ErrorNotice({ children }) {
  return <div className="admin-alert"><AlertTriangle size={18} /><span>{children}</span></div>;
}

export default function AdminApp() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [stores, setStores] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [settings, setSettings] = useState({ brand_name: 'Sobrou, Aproveitou!', primary_color: '#176b45', logo_url: '', support_whatsapp: '' });

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data, error: authError }) => {
      if (!alive) return;
      if (authError) setError(authError.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfile(null);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session || !supabase) { setProfile(null); return; }
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      const { data, error: profileError } = await supabase.from('profiles').select('id,email,display_name,role,created_at').eq('id', session.user.id).maybeSingle();
      if (!alive) return;
      if (profileError) setError('Não foi possível verificar seu perfil. Confira a migração SQL no Supabase. ' + profileError.message);
      else if (!data || !['admin', 'support'].includes(data.role)) {
        setError('Este usuário não tem permissão para acessar a área administrativa. Peça ao administrador Master para atribuir a função correta.');
        await supabase.auth.signOut();
      } else setProfile(data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [session]);

  async function refreshData() {
    if (!supabase || !profile) return;
    setBusy(true); setError(''); setMessage('');
    const requests = await Promise.all([
      supabase.from('stores').select('id,name,category,city,status,owner_id,created_at').order('created_at', { ascending: false }).limit(100),
      profile.role === 'admin'
        ? supabase.from('profiles').select('id,email,display_name,role,created_at').order('created_at', { ascending: false }).limit(100)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('support_conversations').select('id,subject,status,store_id,created_by,assigned_to,created_at,updated_at').order('updated_at', { ascending: false }).limit(100),
      supabase.from('app_settings').select('key,value'),
    ]);
    const [storeResult, profileResult, conversationResult, settingResult] = requests;
    const firstError = [storeResult.error, profileResult.error, conversationResult.error, settingResult.error].find(Boolean);
    if (firstError) setError('Alguns dados não puderam ser carregados: ' + firstError.message);
    setStores(storeResult.data || []);
    setProfiles(profileResult.data || []);
    setConversations(conversationResult.data || []);
    if (settingResult.data?.length) {
      setSettings(current => ({ ...current, ...Object.fromEntries(settingResult.data.map(row => [row.key, row.value])) }));
    }
    setBusy(false);
  }

  useEffect(() => { if (profile) refreshData(); }, [profile?.id]);

  async function signIn(event) {
    event.preventDefault(); setBusy(true); setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) setError('Não foi possível entrar: ' + signInError.message);
    setBusy(false);
  }

  async function openConversation(conversation) {
    setSelectedConversation(conversation); setChatMessages([]); setError('');
    const { data, error: queryError } = await supabase.from('support_messages').select('id,conversation_id,sender_id,body,created_at').eq('conversation_id', conversation.id).order('created_at', { ascending: true }).limit(300);
    if (queryError) setError('Não foi possível abrir o histórico: ' + queryError.message);
    setChatMessages(data || []);
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!reply.trim() || !selectedConversation || !supabase) return;
    setBusy(true); setError('');
    const { error: insertError } = await supabase.from('support_messages').insert({ conversation_id: selectedConversation.id, sender_id: session.user.id, body: reply.trim() });
    if (insertError) setError('Não foi possível enviar a mensagem: ' + insertError.message);
    else { setReply(''); await openConversation(selectedConversation); }
    setBusy(false);
  }

  async function updateConversationStatus(conversation, status) {
    const { error: updateError } = await supabase.from('support_conversations').update({ status, updated_at: new Date().toISOString() }).eq('id', conversation.id);
    if (updateError) setError(updateError.message);
    else { setMessage('Atendimento atualizado.'); await refreshData(); }
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (profile?.role !== 'admin') return;
    setBusy(true); setError(''); setMessage('');
    const entries = Object.entries(settings).map(([key, value]) => ({ key, value: String(value ?? ''), updated_by: session.user.id }));
    const { error: saveError } = await supabase.from('app_settings').upsert(entries, { onConflict: 'key' });
    if (saveError) setError('Não foi possível salvar as configurações: ' + saveError.message);
    else setMessage('Configurações salvas.');
    setBusy(false);
  }

  if (!isSupabaseConfigured) return <div className="admin-page"><div className="admin-login-card"><div className="admin-logo"><Leaf /></div><h1>Configurar acesso Master</h1><p>A área administrativa foi adicionada ao projeto, mas ainda não está conectada ao Supabase.</p><ErrorNotice>Crie um arquivo <code>.env.local</code> com <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>. Use somente a chave publicável no frontend — nunca a secret/service_role.</ErrorNotice><a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Abrir Supabase <ExternalLink size={15} /></a></div></div>;

  if (loading) return <div className="admin-page"><div className="admin-loading">Carregando painel seguro…</div></div>;

  if (!session) return <div className="admin-page"><form className="admin-login-card" onSubmit={signIn}><div className="admin-logo"><Leaf /></div><span className="admin-eyebrow">ÁREA RESTRITA</span><h1>Painel administrativo</h1><p>Sobrou, Aproveitou! · Acesso para equipe autorizada</p>{error && <ErrorNotice>{error}</ErrorNotice>}<label>E-mail<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label><label>Senha<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label><button className="admin-primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar com segurança'}</button><small>O acesso depende de uma conta criada no Supabase e de uma função autorizada no banco de dados.</small></form></div>;

  if (!profile) return <div className="admin-page"><div className="admin-login-card"><h1>Acesso não autorizado</h1>{error && <ErrorNotice>{error}</ErrorNotice>}<button className="admin-primary" onClick={() => supabase.auth.signOut()}>Voltar ao login</button></div></div>;

  return <div className="admin-layout">
    <aside className="admin-sidebar"><a className="admin-brand" href="/"><span className="admin-logo small"><Leaf /></span><span><strong>Sobrou,</strong><b>Aproveitou!</b><small>Painel de controle</small></span></a><div className="admin-nav-label">PLATAFORMA</div>{tabs.map(item => { const Icon = item.icon; if (item.id === 'users' && profile.role !== 'admin') return null; if (item.id === 'settings' && profile.role !== 'admin') return null; return <button key={item.id} className={tab === item.id ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => { setTab(item.id); setError(''); setMessage(''); }}><Icon size={18} />{item.label}</button>; })}<div className="admin-sidebar-bottom"><span className="admin-role">{profile.role === 'admin' ? 'MASTER' : 'SUPORTE'}</span><span>{profile.email || session.user.email}</span><button onClick={() => supabase.auth.signOut()}><LogOut size={16} /> Sair</button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div><span className="admin-eyebrow">CENTRAL DE OPERAÇÕES</span><h1>{tabs.find(item => item.id === tab)?.label}</h1></div><div className="admin-top-actions"><span className="admin-user-pill"><span className="admin-online-dot" />{profile.display_name || profile.email || session.user.email}</span><button title="Atualizar dados" onClick={refreshData} disabled={busy}><RefreshCw size={17} /></button></div></header>
      {error && <ErrorNotice>{error}</ErrorNotice>}{message && <div className="admin-success">{message}</div>}
      {tab === 'overview' && <><div className="admin-welcome"><div><h2>Olá, {profile.display_name || 'equipe'} 👋</h2><p>Resumo operacional da plataforma.</p></div><span className="admin-secure-label"><ShieldCheck size={17} /> Sessão autenticada</span></div><div className="admin-stat-grid"><article><span>Comércios cadastrados</span><strong>{stores.length}</strong><small>Registros acessíveis ao seu perfil</small></article><article><span>Contas de usuários</span><strong>{profile.role === 'admin' ? profiles.length : '—'}</strong><small>{profile.role === 'admin' ? 'Contas cadastradas' : 'Restrito ao Master'}</small></article><article><span>Atendimentos</span><strong>{conversations.length}</strong><small>Conversas recentes</small></article><article><span>Em andamento</span><strong>{conversations.filter(item => item.status === 'open' || item.status === 'in_progress').length}</strong><small>Precisam de acompanhamento</small></article></div><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Atendimentos recentes</h2><p>Converse com os lojistas pela central de suporte.</p></div><button onClick={() => setTab('support')}>Abrir central <MessageCircle size={16} /></button></div><ConversationList conversations={conversations.slice(0,5)} onOpen={openConversation} /></section></>}
      {tab === 'stores' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Comércios</h2><p>Dados exibidos conforme suas permissões de acesso.</p></div><span className="admin-count">{stores.length} registros</span></div><div className="admin-table-wrap"><table><thead><tr><th>Estabelecimento</th><th>Categoria</th><th>Cidade</th><th>Status</th><th>Cadastro</th></tr></thead><tbody>{stores.map(store => <tr key={store.id}><td><strong>{store.name}</strong><small>{store.id}</small></td><td>{store.category || '—'}</td><td>{store.city || '—'}</td><td><span className={'status-pill ' + (store.status || 'pending')}>{store.status || 'pending'}</span></td><td>{store.created_at ? new Date(store.created_at).toLocaleDateString('pt-BR') : '—'}</td></tr>)}</tbody></table>{!stores.length && <p className="admin-empty">Nenhum comércio cadastrado no banco ainda.</p>}</div></section>}
      {tab === 'users' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Contas</h2><p>Consulta de perfis. A função de cada conta é definida no banco, nunca pelo próprio usuário.</p></div><span className="admin-count">{profiles.length} registros</span></div><div className="admin-table-wrap"><table><thead><tr><th>Nome / e-mail</th><th>Função</th><th>Data de cadastro</th></tr></thead><tbody>{profiles.map(person => <tr key={person.id}><td><strong>{person.display_name || 'Sem nome'}</strong><small>{person.email || person.id}</small></td><td><span className="status-pill">{person.role}</span></td><td>{person.created_at ? new Date(person.created_at).toLocaleDateString('pt-BR') : '—'}</td></tr>)}</tbody></table>{!profiles.length && <p className="admin-empty">Nenhuma conta encontrada.</p>}</div></section>}
      {tab === 'support' && <div className="admin-support-layout"><section className="admin-panel admin-inbox"><div className="admin-panel-heading"><div><h2>Caixa de entrada</h2><p>Selecione uma conversa para consultar o histórico.</p></div></div><ConversationList conversations={conversations} onOpen={openConversation} selected={selectedConversation?.id} /></section><section className="admin-panel admin-chat"><div className="admin-panel-heading"><div><h2>{selectedConversation?.subject || 'Atendimento'}</h2><p>{selectedConversation ? 'Conversa #' + selectedConversation.id.slice(0,8) : 'Escolha um atendimento na caixa de entrada.'}</p></div>{selectedConversation && <select value={selectedConversation.status} onChange={event => updateConversationStatus(selectedConversation, event.target.value)}><option value="open">Aberto</option><option value="in_progress">Em atendimento</option><option value="resolved">Resolvido</option></select>}</div>{selectedConversation ? <><div className="admin-chat-messages">{chatMessages.map(item => <article key={item.id} className={item.sender_id === session.user.id ? 'admin-chat-message mine' : 'admin-chat-message'}><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString('pt-BR')}</small></article>)}{!chatMessages.length && <p className="admin-empty">Ainda não há mensagens nesta conversa.</p>}</div><form className="admin-reply" onSubmit={sendReply}><input value={reply} onChange={event => setReply(event.target.value)} placeholder="Escreva uma resposta ao comércio…" aria-label="Resposta" required /><button className="admin-primary" disabled={busy}><Send size={16} /> Enviar</button></form></> : <div className="admin-chat-placeholder"><MessageCircle size={34} /><p>O histórico do atendimento aparecerá aqui.</p></div>}</section></div>}
      {tab === 'settings' && <section className="admin-panel admin-settings"><div className="admin-panel-heading"><div><h2>Identidade visual e contato</h2><p>As configurações são salvas no banco e podem ser usadas pelo site público após a integração.</p></div></div><form onSubmit={saveSettings}><label>Nome da plataforma<input value={settings.brand_name} onChange={event => setSettings({...settings, brand_name: event.target.value})} required /></label><label>Cor principal<input type="color" value={settings.primary_color} onChange={event => setSettings({...settings, primary_color: event.target.value})} /></label><label>URL pública do logotipo<input type="url" placeholder="https://…" value={settings.logo_url} onChange={event => setSettings({...settings, logo_url: event.target.value})} /></label><label>WhatsApp do suporte (com DDI e DDD, só números)<input inputMode="numeric" placeholder="5543999999999" value={settings.support_whatsapp} onChange={event => setSettings({...settings, support_whatsapp: event.target.value.replace(/\D/g, '')})} /></label><button className="admin-primary" disabled={busy}>Salvar configurações</button><p className="admin-hint">A integração atual salva os valores. Aplicar a logo e a cor automaticamente ao site público será uma etapa seguinte.</p>{settings.support_whatsapp && <a className="admin-whatsapp-link" href={'https://wa.me/' + settings.support_whatsapp} target="_blank" rel="noreferrer">Testar contato pelo WhatsApp <ExternalLink size={15} /></a>}</form></section>}
    </main>
  </div>;
}

function ConversationList({ conversations, onOpen, selected }) {
  if (!conversations.length) return <p className="admin-empty">Nenhum atendimento ainda. As conversas aparecerão aqui quando forem criadas no banco.</p>;
  return <div className="admin-conversation-list">{conversations.map(item => <button key={item.id} onClick={() => onOpen(item)} className={'admin-conversation-item ' + (selected === item.id ? 'selected' : '')}><span className="admin-conversation-icon"><MessageCircle size={17} /></span><span className="admin-conversation-copy"><strong>{item.subject || 'Atendimento sem título'}</strong><small>{item.status || 'open'} · {new Date(item.updated_at || item.created_at).toLocaleString('pt-BR')}</small></span><span className={'status-dot ' + (item.status || 'open')} /></button>)}</div>;
}
