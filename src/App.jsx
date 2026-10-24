import React, { useMemo, useState } from 'react';
import { Search, MapPin, Heart, Clock3, Store, ChevronRight, Leaf, Menu, Tag, Sparkles } from 'lucide-react';

const offers = [
  { id: 1, shop: 'Padaria Pão da Vila', category: 'Padaria', title: 'Kit de pães do fim do dia', description: 'Pães fresquinhos para aproveitar hoje.', oldPrice: 18, price: 9.9, discount: 45, time: 'Até 19h', area: 'Centro', emoji: '🥖', color: 'peach' },
  { id: 2, shop: 'Horta da Praça', category: 'Hortifruti', title: 'Sacola surpresa de frutas', description: 'Frutas da estação selecionadas.', oldPrice: 25, price: 12.5, discount: 50, time: 'Até 18h', area: 'Gleba Palhano', emoji: '🥑', color: 'green' },
  { id: 3, shop: 'Doce Encanto', category: 'Doces', title: 'Caixa de doces artesanais', description: 'Últimas unidades produzidas hoje.', oldPrice: 30, price: 18, discount: 40, time: 'Até 20h', area: 'Vila Ipiranga', emoji: '🧁', color: 'pink' },
  { id: 4, shop: 'Sabor Caseiro', category: 'Refeições', title: 'Marmita do dia', description: 'Comida caseira feita com carinho.', oldPrice: 28, price: 19.9, discount: 29, time: 'Até 14h', area: 'Jardim Quebec', emoji: '🍱', color: 'yellow' },
  { id: 5, shop: 'Café Manhã Boa', category: 'Cafeteria', title: 'Combo café + salgado', description: 'Uma pausa gostosa por um preço especial.', oldPrice: 16, price: 10, discount: 38, time: 'Até 17h', area: 'Centro', emoji: '☕', color: 'coffee' },
  { id: 6, shop: 'Verde Vivo', category: 'Hortifruti', title: 'Mix de legumes para a semana', description: 'Legumes selecionados para evitar desperdício.', oldPrice: 22, price: 13.9, discount: 37, time: 'Até 19h', area: 'Lago Igapó', emoji: '🥦', color: 'mint' }
];

const categories = ['Todas', 'Padaria', 'Hortifruti', 'Refeições', 'Doces', 'Cafeteria'];
const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function App() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [notice, setNotice] = useState('');

  const visibleOffers = useMemo(() => offers.filter(offer => {
    const matchesCategory = category === 'Todas' || offer.category === category;
    const matchesSearch = [offer.title, offer.shop, offer.category, offer.area].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesFavorites = !showFavorites || favorites.includes(offer.id);
    return matchesCategory && matchesSearch && matchesFavorites;
  }), [search, category, favorites, showFavorites]);

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
        <button className="merchant-link" onClick={() => setNotice('Cadastro de lojistas será a próxima etapa do projeto!')}><Store size={17} /> Sou lojista</button>
        <button className="mobile-menu" aria-label="Menu" onClick={() => setNotice('Menu em construção.')}><Menu /></button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow"><Sparkles size={15} /> BOM PARA VOCÊ. MELHOR PARA O PLANETA.</div>
            <h1>Boas ofertas.<br /><span>Menos desperdício.</span></h1>
            <p>Descubra produtos deliciosos pertinho de você por preços que dão gosto de aproveitar.</p>
            <div className="search-box"><Search size={20} /><input aria-label="Buscar ofertas" placeholder="Busque por produto, loja ou bairro..." value={search} onChange={e => setSearch(e.target.value)} /><button onClick={() => document.querySelector('.offers-section')?.scrollIntoView({ behavior: 'smooth' })}>Buscar</button></div>
            <div className="hero-foot"><span><span className="pulse-dot" /> Ofertas locais perto de você</span><span>♻️ Evite desperdício e economize</span></div>
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
          <div className="category-row">{categories.map(item => <button key={item} onClick={() => setCategory(item)} className={category === item ? 'category-chip selected' : 'category-chip'}>{item}</button>)}</div>
          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso">×</button></div>}
          {visibleOffers.length ? <div className="offer-grid">{visibleOffers.map(offer => <article className="offer-card" key={offer.id}><div className={'offer-visual ' + offer.color}><span className="discount-badge">-{offer.discount}%</span><button className={favorites.includes(offer.id) ? 'heart-button saved' : 'heart-button'} onClick={() => toggleFavorite(offer.id)} aria-label={favorites.includes(offer.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Heart size={18} fill={favorites.includes(offer.id) ? 'currentColor' : 'none'} /></button><span className="food-emoji">{offer.emoji}</span><span className="visual-caption">RESGATE LOCAL</span></div><div className="offer-info"><div className="store-name"><Store size={13} /> {offer.shop}</div><h3>{offer.title}</h3><p className="offer-description">{offer.description}</p><div className="offer-meta"><span><MapPin size={13} /> {offer.area}</span><span><Clock3 size={13} /> {offer.time}</span></div><div className="price-row"><div><del>{money(offer.oldPrice)}</del><strong>{money(offer.price)}</strong></div><button className="details-button" onClick={() => setNotice('Detalhes e reserva da oferta serão conectados na próxima etapa.')}>Ver oferta <ChevronRight size={16} /></button></div></div></article>)}</div> : <div className="empty-state"><span>🔎</span><h3>Nenhuma oferta encontrada</h3><p>Tente outra busca ou escolha uma categoria diferente.</p><button onClick={() => { setSearch(''); setCategory('Todas'); setShowFavorites(false); }}>Limpar filtros</button></div>}
          <div className="demo-note"><Tag size={15} /> Estas são ofertas demonstrativas para a primeira versão do site.</div>
        </section>

        <section className="merchant-banner"><div className="merchant-illustration">🏪</div><div><span>VOCÊ TEM UM NEGÓCIO LOCAL?</span><h2>O que sobrou pode virar oportunidade.</h2><p>Encontre novos clientes, reduza perdas e dê uma nova chance aos seus produtos.</p></div><button onClick={() => setNotice('Em breve: cadastro de lojistas com perfil da loja e publicação de ofertas.')}>Quero anunciar <ChevronRight size={17} /></button></section>
      </main>

      <footer><a className="footer-brand" href="#"><span className="brand-mark"><Leaf size={19} /></span><strong>sobrou, aproveitou!</strong></a><p>Comprar bem. Desperdiçar menos. Fortalecer o comércio local.</p><div>Feito com 💚 em Londrina, PR</div><small>© 2026 Sobrou, Aproveitou! · Protótipo inicial</small></footer>
    </div>
  );
}