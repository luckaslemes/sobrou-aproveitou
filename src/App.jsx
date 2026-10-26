import React, { useEffect, useMemo, useState } from 'react';
import { Search, MapPin, Heart, Clock3, Store, ChevronRight, Leaf, Menu, Sparkles, RefreshCw } from 'lucide-react';
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
        <button className="merchant-link" onClick={() => setNotice('O cadastro de comerciantes será habilitado após configurar o fluxo de contas e publicação de ofertas.')}><Store size={17} /> Sou lojista</button>
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

        <section className="merchant-banner"><div className="merchant-illustration">🏪</div><div><span>VOCÊ TEM UM NEGÓCIO LOCAL?</span><h2>O que sobrou pode virar oportunidade.</h2><p>Encontre novos clientes, reduza perdas e dê uma nova chance aos seus produtos.</p></div><button onClick={() => setNotice('Em breve: cadastro de lojistas com perfil da loja e publicação de ofertas.')}>Quero anunciar <ChevronRight size={17} /></button></section>
      </main>

      <footer><a className="footer-brand" href="#"><span className="brand-mark"><Leaf size={19} /></span><strong>sobrou, aproveitou!</strong></a><p>Comprar bem. Desperdiçar menos. Fortalecer o comércio local.</p><div>Feito com 💚 em Londrina, PR</div><small>© 2026 Sobrou, Aproveitou! · Protótipo inicial</small></footer>
    </div>
  );
}