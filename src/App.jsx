import React, { useEffect, useMemo, useState } from 'react';
import { Search, MapPin, Heart, Clock3, Store, ChevronRight, Leaf, Menu, Sparkles, RefreshCw, X, LogIn, PlusCircle, LogOut } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';

const offers = [];
const publishedStatuses = new Set(['published', 'active', 'approved', 'aprovada', 'publicada', 'ativo']);
const firstValue = (row, keys, fallback = '') => {
  for (const key of keys) if (row?.[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  return fallback;
};
const normalizeOffer = row => {
  const oldPrice = Number(firstValue(row, ['original_price', 'old_price', 'price_before', 'regular_price'], 0));
  const price = Number(firstValue(row, ['price', 'sale_price', 'discount_price', 'promotional_price'], 0));
  const store = row.stores || row.store || {};
  const expiry = firstValue(row, ['expires_at', 'ends_at', 'valid_until', 'available_until'], '');
  return {
    id: row.id,
    shop: firstValue(row, ['store_name', 'shop_name', 'merchant_name'], firstValue(store, ['name', 'business_name'], 'Comércio local')),
    category: firstValue(row, ['category', 'category_name'], 'Outros'),
    title: firstValue(row, ['title', 'name', 'product_name'], 'Oferta'),
    description: firstValue(row, ['description', 'details'], 'Oferta publicada pelo comércio local.'),
    oldPrice, price,
    discount: oldPrice > price && oldPrice > 0 ? Math.round((1 - price / oldPrice) * 100) : 0,
    time: expiry ? 'Até ' + new Date(expiry).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Consulte a loja',
    area: firstValue(row, ['neighborhood', 'district', 'area', 'city'], firstValue(store, ['neighborhood', 'city'], 'Londrina, PR')),
    emoji: '♻️', color: 'green', image: firstValue(row, ['image_url', 'photo_url', 'image'], '')
  };
};

const categories = ['Todas', 'Padaria', 'Hortifruti', 'Refeições', 'Doces', 'Cafeteria'];
const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function App() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [notice, setNotice] = useState('');
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offersError, setOffersError] = useState('');
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [merchantMode, setMerchantMode] = useState('signup');
  const [merchantBusy, setMerchantBusy] = useState(false);
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantPassword, setMerchantPassword] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [merchantDocument, setMerchantDocument] = useState('');
  const [merchantPhone, setMerchantPhone] = useState('');
  const [merchantAddress, setMerchantAddress] = useState('');
  const [merchantCoupon, setMerchantCoupon] = useState('');
  const [merchantCoupons, setMerchantCoupons] = useState([]);
  const [merchantStore, setMerchantStore] = useState(null);
  const [merchantOffers, setMerchantOffers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOffers, setAdminOffers] = useState([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDescription, setNewCouponDescription] = useState('');
  const [merchantSession, setMerchantSession] = useState(null);
  const [offerForm, setOfferForm] = useState({ title: '', description: '', category: 'Outros', original_price: '', price: '', neighborhood: 'Centro', expires_at: '' });

  async function loadAvailableCoupons() {
    if (!supabase) return;
    const { data, error } = await supabase.from('merchant_coupons').select('id,code,description').eq('is_active', true).order('code');
    if (error) { setMerchantCoupons([]); setNotice('Não foi possível carregar os cupons autorizados. A administração precisa conferir as permissões do Supabase.'); return; }
    setMerchantCoupons(data || []);
  }

  useEffect(() => {
    if (!supabase) return;
    loadAvailableCoupons();
    supabase.auth.getSession().then(async ({ data }) => { setMerchantSession(data.session); if (data.session) { await loadMerchantStore(data.session); setMerchantMode('dashboard'); } });
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => { setMerchantSession(session); if (session) { await loadMerchantStore(session); setMerchantMode('dashboard'); } else { setMerchantStore(null); setMerchantOffers([]); } });
    return () => data.subscription.unsubscribe();
  }, []);

  async function loadMerchantStore(session) {
    if (!supabase || !session?.user) return;
    const { data: roleRow } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
    const admin = roleRow?.role === 'admin'; setIsAdmin(admin);
    if (admin) { const { data: allOffers } = await supabase.from('offers').select('*').order('created_at', { ascending: false }).limit(200); setAdminOffers(allOffers || []); }
    const { data: coupons } = await supabase.from('merchant_coupons').select('id,code,description').eq('is_active', true).order('code');
    setMerchantCoupons(coupons || []);
    const { data: stores } = await supabase.from('stores').select('*').eq('owner_id', session.user.id).order('created_at', { ascending: false }).limit(1);
    const store = stores?.[0] || null; setMerchantStore(store);
    const meta = session.user.user_metadata || {};
    setMerchantName(store?.name || meta.store_name || ''); setOwnerName(store?.owner_name || meta.owner_name || meta.display_name || '');
    setMerchantDocument(store?.document_number || meta.document_number || ''); setMerchantPhone(store?.phone || meta.phone || '');
    setMerchantAddress(store?.address || meta.address || ''); setMerchantCoupon(store?.coupon_code || meta.coupon_code || '');
    const { data: mine } = await supabase.from('offers').select('*').eq('owner_id', session.user.id).order('created_at', { ascending: false }).limit(50);
    setMerchantOffers(mine || []);
  }

  async function saveMerchantProfile(event) {
    event.preventDefault();
    if (!supabase || !merchantSession || !merchantCoupon) { setNotice('Selecione um cupom disponibilizado pela administração.'); return; }
    setMerchantBusy(true); setNotice('');
    const values = { owner_id: merchantSession.user.id, name: merchantName.trim(), owner_name: ownerName.trim(), document_number: merchantDocument.replace(/[^0-9]/g, ''), phone: merchantPhone.trim(), address: merchantAddress.trim(), coupon_code: merchantCoupon.toUpperCase().trim(), category: 'Comércio local', city: 'Londrina', status: 'pending' };
    const result = merchantStore?.id
      ? await supabase.from('stores').update(values).eq('id', merchantStore.id).eq('owner_id', merchantSession.user.id).select().single()
      : await supabase.from('stores').insert(values).select().single();
    if (result.error) setNotice('Não foi possível salvar. Confira se a migração de lojistas foi executada e se o cupom está ativo. Detalhe: ' + result.error.message);
    else { setMerchantStore(result.data); setNotice('Cadastro enviado com sucesso! Seu perfil ficará identificado como pendente, mas isso não impede a publicação das suas ofertas.'); await loadMerchantStore(merchantSession); }
    setMerchantBusy(false);
  }

  async function submitMerchantAuth(event) {
    event.preventDefault();
    if (!supabase) { setNotice('Conexão com Supabase não configurada.'); return; }
    setMerchantBusy(true); setNotice('');
    let result;
    if (merchantMode === 'signup') {
      result = await supabase.auth.signUp({ email: merchantEmail.trim(), password: merchantPassword, options: { data: { display_name: ownerName.trim(), owner_name: ownerName.trim(), store_name: merchantName.trim(), document_number: merchantDocument.replace(/[^0-9]/g, ''), phone: merchantPhone.trim(), address: merchantAddress.trim(), coupon_code: merchantCoupon.toUpperCase().trim(), role: 'merchant' }, emailRedirectTo: window.location.origin } });
    } else {
      result = await supabase.auth.signInWithPassword({ email: merchantEmail.trim(), password: merchantPassword });
    }
    if (result.error) setNotice((merchantMode === 'signup' ? 'Cadastro não concluído: ' : 'Falha no login: ') + result.error.message);
    else if (merchantMode === 'signup' && !result.data.session) setNotice('Cadastro iniciado! Abra o e-mail enviado pelo sistema e confirme seu endereço. Depois volte aqui e faça login para concluir o perfil da loja.');
    else { setMerchantSession(result.data.session); await loadMerchantStore(result.data.session); setMerchantMode('dashboard'); setNotice(merchantMode === 'signup' ? 'Conta criada com sucesso! Confira e complete o perfil da sua loja.' : 'Login realizado com sucesso. Bem-vindo à área do lojista!'); }
    setMerchantBusy(false);
  }

  async function createAdminCoupon(event) {
    event.preventDefault();
    if (!supabase || !isAdmin) return;
    const code = newCouponCode.trim().toUpperCase().replace(/\\s+/g, '-');
    if (code.length < 3) { setNotice('O cupom precisa ter pelo menos 3 caracteres.'); return; }
    setMerchantBusy(true); setNotice('');
    const { error } = await supabase.from('merchant_coupons').insert({ code, description: newCouponDescription.trim(), is_active: true });
    if (error) setNotice('Não foi possível criar o cupom: ' + error.message);
    else { setNotice('Cupom autorizado criado com sucesso.'); setNewCouponCode(''); setNewCouponDescription(''); await loadAvailableCoupons(); }
    setMerchantBusy(false);
  }

  async function updateAdminOffer(id, status, is_active) {
    if (!supabase || !isAdmin) return;
    const { error } = await supabase.from('offers').update({ status, is_active }).eq('id', id);
    if (error) setNotice('Não foi possível atualizar a oferta: ' + error.message);
    else { setNotice('Oferta atualizada.'); const { data } = await supabase.from('offers').select('*').order('created_at', { ascending: false }).limit(200); setAdminOffers(data || []); await loadOffers(); }
  }

  async function submitOffer(event) {
    event.preventDefault();
    if (!supabase || !merchantSession) { setNotice('Entre na sua conta para publicar uma oferta.'); return; }
    if (!merchantStore?.id) { setNotice('Salve primeiro o perfil da loja e selecione um cupom autorizado.'); return; }
    if (offerForm.original_price && Number(offerForm.original_price) < Number(offerForm.price)) { setNotice('O preço normal precisa ser maior ou igual ao preço promocional.'); return; }
    setMerchantBusy(true); setNotice('');
    const payload = { title: offerForm.title.trim(), description: offerForm.description.trim(), category: offerForm.category, store_id: merchantStore.id, store_name: merchantName.trim() || merchantSession.user.user_metadata?.display_name || merchantEmail.split('@')[0], neighborhood: offerForm.neighborhood.trim() || 'Londrina', city: 'Londrina', original_price: offerForm.original_price ? Number(offerForm.original_price) : null, price: Number(offerForm.price), status: 'published', is_active: true, owner_id: merchantSession.user.id, expires_at: offerForm.expires_at || null };
    const { error } = await supabase.from('offers').insert(payload);
    if (error) setNotice('Oferta não salva: ' + error.message + '. Confira se executou a migração de permissões para lojistas.');
    else { setNotice('Oferta publicada com sucesso! Ela já pode aparecer na página inicial.'); await loadMerchantStore(merchantSession); setOfferForm({ title: '', description: '', category: 'Outros', original_price: '', price: '', neighborhood: 'Centro', expires_at: '' }); await loadOffers(); }
    setMerchantBusy(false);
  }

  async function signOutMerchant() { await supabase?.auth.signOut(); setMerchantSession(null); setMerchantStore(null); setMerchantOffers([]); setMerchantMode('login'); setNotice('Você saiu da sua conta.'); }

  async function loadOffers() {
    setLoadingOffers(true);
    setOffersError('');
    if (!isSupabaseConfigured || !supabase) {
      setOffers([]);
      setOffersError('O aplicativo ainda não está conectado ao Supabase. Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
      setLoadingOffers(false);
      return;
    }
    const { data, error } = await supabase.from('offers').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) {
      setOffers([]);
      setOffersError('Não foi possível carregar ofertas reais do Supabase. Confira se a tabela offers existe e permite leitura pública apenas de ofertas publicadas. Detalhe: ' + error.message);
    } else {
      const rows = (data || []).filter(row => {
        const status = String(firstValue(row, ['status', 'publication_status'], '')).toLowerCase();
        return publishedStatuses.has(status) && row.is_active !== false && row.is_published !== false;
      });
      setOffers(rows.map(normalizeOffer).filter(offer => offer.id && offer.title && Number.isFinite(offer.price)));
    }
    setLoadingOffers(false);
  }

  useEffect(() => { loadOffers(); }, []);

  const visibleOffers = useMemo(() => offers.filter(offer => {
    const matchesCategory = category === 'Todas' || offer.category === category;
    const matchesSearch = [offer.title, offer.shop, offer.category, offer.area].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesFavorites = !showFavorites || favorites.includes(offer.id);
    return matchesCategory && matchesSearch && matchesFavorites;
  }), [offers, search, category, favorites, showFavorites]);

  function toggleFavorite(id) {
    setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Sobrou, Aproveitou, início">
          <span className="brand-mark"><Leaf size={23} strokeWidth={2.5} /></span>
          <span className="brand-copy"><strong>sobrou<span>,</span></strong><b>aproveitou!</b></span>
        </a>
        <div className="location"><MapPin size={17} /><span><small>Você está vendo ofertas em</small><strong>Londrina, PR</strong></span><ChevronRight size={16} /></div>
        <button className="merchant-link" onClick={() => { setMerchantOpen(true); setMerchantMode(merchantSession ? 'dashboard' : 'signup'); loadAvailableCoupons(); }}><Store size={17} /> Sou lojista</button>
        <button className="mobile-menu" aria-label="Menu" onClick={() => setNotice('Menu em construção.')}><Menu /></button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow"><Sparkles size={15} /> BOM PARA VOCÊ. MELHOR PARA O PLANETA.</div>
            <h1>Boas ofertas.<br /><span>Menos desperdício.</span></h1>
            <p>Descubra produtos deliciosos pertinho de você por preços que dão gosto de aproveitar.</p>
            <div className="search-box"><Search size={20} /><input aria-label="Buscar ofertas" placeholder="Busque por produto, loja ou bairro..." value={search} onChange={e => setSearch(e.target.value)} /><button onClick={() => document.querySelector('.offers-section')?.scrollIntoView({ behavior: 'smooth' })}>Buscar</button></div>
            <div className="hero-foot"><span><span className="pulse-dot" /> Ofertas reais publicadas por lojas</span><span>♻️ Evite desperdício e economize</span></div>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="sun-disc"></div><div className="hero-emoji">🥑</div><div className="floating-card card-one">🌱 <span>Consumo consciente</span></div><div className="floating-card card-two"><strong>Até 50%</strong><span>de economia</span></div><div className="leaf-shape leaf-a"></div><div className="leaf-shape leaf-b"></div></div>
        </section>

        <section className="impact-strip">
          <div><span className="impact-icon">💚</span><span><strong>Economize de verdade</strong><small>Preços especiais todo dia</small></span></div>
          <div><span className="impact-icon">♻️</span><span><strong>Menos desperdício</strong><small>Mais valor para os alimentos</small></span></div>
          <div><span className="impact-icon">📍</span><span><strong>Valorize o comércio local</strong><small>Descubra lojas do seu bairro</small></span></div>
        </section>

        <section className="offers-section">
          <div className="section-heading"><div><span className="section-kicker">ACHADOS DE HOJE</span><h2>Ofertas para aproveitar</h2><p>Oportunidades especiais perto de você.</p></div><button className={showFavorites ? 'favorites-button active' : 'favorites-button'} onClick={() => setShowFavorites(!showFavorites)}><Heart size={17} fill={showFavorites ? 'currentColor' : 'none'} /> {showFavorites ? 'Ver todas' : 'Meus favoritos'}</button></div>
          <div className="category-row">{['Todas', ...new Set(offers.map(offer => offer.category).filter(Boolean))].map(item => <button key={item} onClick={() => setCategory(item)} className={category === item ? 'category-chip selected' : 'category-chip'}>{item}</button>)}</div>
          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso">×</button></div>}
          {loadingOffers ? <div className="empty-state"><span>⏳</span><h3>Carregando ofertas...</h3><p>Buscando ofertas publicadas pelos comércios.</p></div> : offersError ? <div className="empty-state"><span>⚠️</span><h3>Não foi possível carregar as ofertas</h3><p>{offersError}</p><button onClick={loadOffers}><RefreshCw size={15} /> Tentar novamente</button></div> : visibleOffers.length ? <div className="offer-grid">{visibleOffers.map(offer => <article className="offer-card" key={offer.id}><div className={'offer-visual ' + offer.color}>{offer.image ? <img src={offer.image} alt={offer.title} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <span className="food-emoji">{offer.emoji}</span>}{offer.discount > 0 && <span className="discount-badge">-{offer.discount}%</span>}<button className={favorites.includes(offer.id) ? 'heart-button saved' : 'heart-button'} onClick={() => toggleFavorite(offer.id)} aria-label={favorites.includes(offer.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Heart size={18} fill={favorites.includes(offer.id) ? 'currentColor' : 'none'} /></button><span className="visual-caption">RESGATE LOCAL</span></div><div className="offer-info"><div className="store-name"><Store size={13} /> {offer.shop}</div><h3>{offer.title}</h3><p className="offer-description">{offer.description}</p><div className="offer-meta"><span><MapPin size={13} /> {offer.area}</span><span><Clock3 size={13} /> {offer.time}</span></div><div className="price-row"><div>{offer.oldPrice > offer.price && <del>{money(offer.oldPrice)}</del>}<strong>{money(offer.price)}</strong></div><button className="details-button" onClick={() => setNotice('Consulte o comércio responsável para confirmar disponibilidade e resgate desta oferta.')}>Ver oferta <ChevronRight size={16} /></button></div></div></article>)}</div> : <div className="empty-state"><span>♻️</span><h3>{showFavorites ? 'Você ainda não favoritou nenhuma oferta' : 'Ainda não há ofertas publicadas'}</h3><p>{showFavorites ? 'Toque no coração de uma oferta para salvá-la aqui.' : 'Quando os comércios publicarem ofertas reais, elas aparecerão aqui.'}</p>{showFavorites && <button onClick={() => setShowFavorites(false)}>Ver todas as ofertas</button>}</div>}
        </section>

        <section className="merchant-banner"><div className="merchant-illustration">🏪</div><div><span>VOCÊ TEM UM NEGÓCIO LOCAL?</span><h2>O que sobrou pode virar oportunidade.</h2><p>Encontre novos clientes, reduza perdas e dê uma nova chance aos seus produtos.</p></div><button onClick={() => { setMerchantOpen(true); setMerchantMode(merchantSession ? 'dashboard' : 'signup'); loadAvailableCoupons(); }}>Quero anunciar <ChevronRight size={17} /></button></section>
      </main>

      {merchantOpen && <div className="merchant-modal-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) setMerchantOpen(false); }}>
        <section className="merchant-modal" role="dialog" aria-modal="true" aria-labelledby="merchant-modal-title">
          <button className="merchant-modal-close" onClick={() => setMerchantOpen(false)} aria-label="Fechar"><X size={20} /></button>
          <div className="merchant-modal-brand"><Store size={22} /></div>
          <h2 id="merchant-modal-title">{merchantMode === 'dashboard' ? 'Painel do lojista' : merchantMode === 'login' ? 'Entrar como lojista' : 'Cadastre seu comércio'}</h2>
          {notice && <div className="merchant-notice" role="status">{notice}</div>}
          {!isSupabaseConfigured ? <p>O Supabase não está configurado neste ambiente. Confira as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.</p> : merchantMode === 'dashboard' && merchantSession && isAdmin ? <>
            <p>Conectado como administrador: <strong>{merchantSession.user.email}</strong></p>
            <h3 className="merchant-section-title">Painel administrativo</h3>
            <p>Gerencie cupons de cadastro e modere ofertas. A publicação dos lojistas não depende de aprovação prévia.</p>
            <form className="merchant-form" onSubmit={createAdminCoupon}>
              <label>Código do cupom autorizado<input required minLength={3} maxLength={40} value={newCouponCode} onChange={e => setNewCouponCode(e.target.value)} placeholder="Ex.: LOJISTA2026" /></label>
              <label>Descrição do cupom<input value={newCouponDescription} onChange={e => setNewCouponDescription(e.target.value)} placeholder="Descrição opcional" /></label>
              <button className="merchant-submit" disabled={merchantBusy} type="submit">{merchantBusy ? 'Criando...' : 'Criar cupom'}</button>
            </form>
            <h3 className="merchant-section-title">Ofertas cadastradas ({adminOffers.length})</h3>
            {adminOffers.length ? <div className="merchant-offer-list">{adminOffers.map(o => <div className="merchant-offer-row" key={o.id}><span><strong>{o.title}</strong><small>{o.store_name || 'Loja'} · {money(Number(o.price) || 0)} · {o.status}</small></span><span className="admin-offer-actions"><button type="button" onClick={() => updateAdminOffer(o.id, 'published', true)}>Publicar</button><button type="button" onClick={() => updateAdminOffer(o.id, 'paused', false)}>Pausar</button></span></div>)}</div> : <p>Nenhuma oferta cadastrada.</p>}
            <button className="merchant-secondary" onClick={signOutMerchant}><LogOut size={16} /> Sair da conta</button>
          </> : merchantMode === 'dashboard' && merchantSession ? <>
            <p>Conectado como <strong>{merchantSession.user.email}</strong>. Gerencie os dados e acompanhe a situação do seu comércio.</p>
            <div className="merchant-status-card"><span className={'merchant-status-dot ' + (['approved','active'].includes(merchantStore?.status) ? 'is-approved' : '')}></span><div><strong>{['approved','active'].includes(merchantStore?.status) ? 'Loja aprovada' : merchantStore ? 'Cadastro em análise' : 'Complete o cadastro da loja'}</strong><small>{['approved','active'].includes(merchantStore?.status) ? 'Seu cadastro está aprovado.' : 'Você pode publicar ofertas sem aguardar aprovação administrativa.'}</small></div></div>
            <h3 className="merchant-section-title">Dados do responsável e da loja</h3>
            <form className="merchant-form" onSubmit={saveMerchantProfile}>
              <label>Nome completo do responsável<input required value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Nome do dono ou responsável" /></label>
              <label>Nome da loja<input required value={merchantName} onChange={e => setMerchantName(e.target.value)} placeholder="Nome comercial" /></label>
              <label>CPF ou CNPJ<input required inputMode="numeric" minLength={11} maxLength={18} value={merchantDocument} onChange={e => setMerchantDocument(e.target.value)} placeholder="CPF ou CNPJ" /></label>
              <label>Telefone / WhatsApp<input required type="tel" value={merchantPhone} onChange={e => setMerchantPhone(e.target.value)} placeholder="(43) 99999-9999" /></label>
              <label>Endereço da loja<input required value={merchantAddress} onChange={e => setMerchantAddress(e.target.value)} placeholder="Rua, número e bairro" /></label>
              <label>Cupom de cadastro<select required value={merchantCoupon} onChange={e => setMerchantCoupon(e.target.value)}><option value="">Selecione um cupom disponível</option>{merchantCoupons.map(c => <option key={c.id} value={c.code}>{c.code}{c.description ? ' — ' + c.description : ''}</option>)}</select></label>
              <button className="merchant-submit" disabled={merchantBusy} type="submit"><Store size={17} /> {merchantBusy ? 'Salvando...' : 'Salvar dados da loja'}</button>
            </form>
            {merchantStore && <div className="merchant-review-note">Situação do cadastro: <strong>{merchantStore.status === 'approved' || merchantStore.status === 'active' ? 'Aprovado' : merchantStore.status === 'rejected' ? 'Precisa de ajustes' : merchantStore.status === 'blocked' ? 'Bloqueado' : 'Pendente de aprovação'}</strong></div>}
            <h3 className="merchant-section-title">Cadastrar uma oferta</h3>
            {!merchantStore ? <div className="merchant-locked"><strong>Complete o perfil da loja</strong><p>Salve os dados da loja e o cupom autorizado. Depois você poderá publicar ofertas sem aprovação prévia.</p></div> : <form className="merchant-form" onSubmit={submitOffer}>
              <label>Nome da oferta<input required value={offerForm.title} onChange={e => setOfferForm({ ...offerForm, title: e.target.value })} placeholder="Ex.: Kit de pães" /></label>
              <label>Descrição<textarea value={offerForm.description} onChange={e => setOfferForm({ ...offerForm, description: e.target.value })} placeholder="Descreva o produto" /></label>
              <label>Categoria<select value={offerForm.category} onChange={e => setOfferForm({ ...offerForm, category: e.target.value })}>{['Outros','Padaria','Hortifruti','Refeições','Doces','Cafeteria','Mercado'].map(x => <option key={x}>{x}</option>)}</select></label>
              <div className="merchant-form-row"><label>Preço normal (R$)<input type="number" min="0" step="0.01" value={offerForm.original_price} onChange={e => setOfferForm({ ...offerForm, original_price: e.target.value })} /></label><label>Preço oferta (R$)<input required type="number" min="0.01" step="0.01" value={offerForm.price} onChange={e => setOfferForm({ ...offerForm, price: e.target.value })} /></label></div>
              <label>Bairro<input value={offerForm.neighborhood} onChange={e => setOfferForm({ ...offerForm, neighborhood: e.target.value })} /></label>
              <label>Validade (opcional)<input type="datetime-local" value={offerForm.expires_at} onChange={e => setOfferForm({ ...offerForm, expires_at: e.target.value ? new Date(e.target.value).toISOString() : '' })} /></label>
              <button className="merchant-submit" disabled={merchantBusy} type="submit"><PlusCircle size={17} /> {merchantBusy ? 'Salvando...' : 'Publicar oferta agora'}</button>
            </form>}
            <h3 className="merchant-section-title">Minhas ofertas</h3>
            {merchantOffers.length ? <div className="merchant-offer-list">{merchantOffers.map(o => <div className="merchant-offer-row" key={o.id}><span><strong>{o.title}</strong><small>{money(Number(o.price) || 0)}</small></span><em className={'offer-status status-' + o.status}>{o.status === 'published' ? 'Publicada' : o.status === 'paused' ? 'Pausada' : o.status === 'expired' ? 'Expirada' : 'Em revisão'}</em></div>)}</div> : <p>Você ainda não publicou ofertas.</p>}
            <button className="merchant-secondary" onClick={signOutMerchant}><LogOut size={16} /> Sair da conta</button>
          </> : <>
            <p>{merchantMode === 'login' ? 'Entre para gerenciar seu comércio e cadastrar ofertas.' : 'Crie sua conta para começar a enviar ofertas para revisão.'}</p>
            {merchantMode === 'signup' && merchantCoupons.length === 0 && <div className="merchant-locked"><strong>Nenhum cupom disponível</strong><p>A administração precisa criar e ativar um cupom antes do cadastro de novos lojistas.</p></div>}
            <form className="merchant-form" onSubmit={submitMerchantAuth}>
              {merchantMode === 'signup' && <><label>Nome completo do responsável<input required value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Nome do dono ou responsável" /></label><label>Nome da loja<input required value={merchantName} onChange={e => setMerchantName(e.target.value)} placeholder="Nome comercial" /></label><label>CPF ou CNPJ<input required inputMode="numeric" minLength={11} maxLength={18} value={merchantDocument} onChange={e => setMerchantDocument(e.target.value)} placeholder="CPF ou CNPJ" /></label><label>Telefone / WhatsApp<input required type="tel" value={merchantPhone} onChange={e => setMerchantPhone(e.target.value)} placeholder="(43) 99999-9999" /></label><label>Endereço da loja<input required value={merchantAddress} onChange={e => setMerchantAddress(e.target.value)} placeholder="Rua, número e bairro" /></label><label>Cupom da administração<select required value={merchantCoupon} onChange={e => setMerchantCoupon(e.target.value)}><option value="">Selecione um cupom disponível</option>{merchantCoupons.map(c => <option key={c.id} value={c.code}>{c.code}{c.description ? ' — ' + c.description : ''}</option>)}</select></label></>}
              <label>E-mail<input required type="email" autoComplete="email" value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} placeholder="voce@loja.com.br" /></label>
              <label>Senha<input required type="password" minLength={6} autoComplete={merchantMode === 'login' ? 'current-password' : 'new-password'} value={merchantPassword} onChange={e => setMerchantPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" /></label>
              <button className="merchant-submit" disabled={merchantBusy || (merchantMode === 'signup' && merchantCoupons.length === 0)} type="submit"><LogIn size={17} /> {merchantBusy ? 'Aguarde...' : merchantMode === 'login' ? 'Entrar' : 'Criar conta'}</button>
            </form>
            <button className="merchant-secondary" onClick={() => setMerchantMode(merchantMode === 'login' ? 'signup' : 'login')}>{merchantMode === 'login' ? 'Ainda não tenho conta — cadastrar' : 'Já tenho conta — entrar'}</button>
          </>}
        </section>
      </div>}
      <footer><a className="footer-brand" href="#"><span className="brand-mark"><Leaf size={19} /></span><strong>sobrou, aproveitou!</strong></a><p>Comprar bem. Desperdiçar menos. Fortalecer o comércio local.</p><div>Feito com 💚 em Londrina, PR</div><small>© 2026 Sobrou, Aproveitou! · Protótipo inicial</small></footer>
    </div>
  );
}