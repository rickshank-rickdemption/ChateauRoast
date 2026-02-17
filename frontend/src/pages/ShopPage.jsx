import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  User,
  Search,
  ShoppingBag,
  FileText,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Instagram,
  Facebook,
  Linkedin,
  Plus,
  Minus
} from 'lucide-react';
import coffeeCupImg from './img/Coffee cup.png';
import matchaCupImg from './img/Matcha cup.png';
import ceremonialMatchaImg from './img/Ceremonial Matcha.png';
import matchaLatteImg from './img/Matcha Latte.png';
import croissantImg from './img/Croissant.png';
import smoresImg from './img/Smores.png';
import cookiesImg from './img/Cookies.png';
import matchaStrawberryImg from './img/Matcha Strawbbery.png';
import siopaoAsadoImg from './img/Sioapo Asado.png';
import matchaCookieImg from './img/Matcha Cookie.png';
import almondCookieImg from './img/Almond Cookie.png';
import strawberryPoptartsImg from './img/Strawberry Poptarts.png';
import doubleDoubleFrenchVanillaImg from './img/Double Double French Vanilla.png';
import classicBagelImg from './img/Classic Bagel.png';
import bostonCreamImg from './img/Boston Cream.png';
import mapelDipImg from './img/Mapel Dip.png';
import chocolateDipImg from './img/Chocolate Dip.png';
import bavarianFilledTimbitImg from './img/Bavarian Filled Timbit.png';
import strawberryFilledTimbitImg from './img/Strawberry Filled Timbit.png';
import spanishLatteImg from './img/Spanish Latte.png';
import caramelMacchiatoImg from './img/Caramel Macchiato.png';
import coldBrewRedbullCoffeeImg from './img/Cold Brew Redbull Coffee.png';
import { shopProducts } from '../data/shopProducts';
import { useWebSocket } from '../context/WebSocketContext';

gsap.registerPlugin(ScrollTrigger);

const formatPHP = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));

const toKey = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const toMergeKey = (product) =>
  `${toKey(product?.name)}|${toKey(product?.category || product?.product_type || '')}|${toKey(product?.product_type || '')}`;
const parsePeso = (value) => Number(String(value || '0').replace(/[^0-9.]/g, '')) || 0;
const normalizeShopType = (value) => {
  const raw = String(value || '').toLowerCase().trim();
  if (!raw) return 'other';
  if (raw === 'coffee' || raw === 'matcha' || raw === 'pastry') return raw;
  return raw === 'other' ? 'other' : 'other';
};
const shopTypeLabel = {
  all: 'All',
  coffee: 'Coffee',
  matcha: 'Matcha',
  pastry: 'Pastry',
  other: 'Other'
};

const categoryHeroContent = {
  all: {
    title: 'Shop.',
    description:
      'Browse our full menu lineup: coffee, matcha, and pastry items prepared for daily cafe service.'
  },
  coffee: {
    title: 'Coffee.',
    description:
      'Our coffee lineup is crafted for balance, body, and clarity, from espresso-forward classics to cold brews and signature blends.'
  },
  matcha: {
    title: 'Matcha.',
    description:
      'Our matcha comes from specially selected farms in Kyoto, thoughtfully prepared for both milk-based and traditional-style drinks.'
  },
  pastry: {
    title: 'Pastry.',
    description:
      'Fresh pastry picks designed for coffee pairing, from buttery baked staples to sweet filled treats and cookies.'
  },
  other: {
    title: 'Specials.',
    description:
      'Rotating specialty menu items and unique releases that complement the core coffee and matcha program.'
  }
};

const catalogByName = new Map(shopProducts.map((item) => [toKey(item.name), item]));

const defaultSpecs = {
  capacity: 'Single serving',
  weight: 'Prepared cup',
  material: 'Coffee or matcha blend'
};

const productImageMap = {
  croissant: croissantImg,
  smores: smoresImg,
  'classic cookie': cookiesImg,
  cookies: cookiesImg,
  'siopao asado': siopaoAsadoImg,
  'matcha cookie': matchaCookieImg,
  'almond cookie': almondCookieImg,
  'strawberry pop tarts': strawberryPoptartsImg,
  'ceremonial matcha': ceremonialMatchaImg,
  'matcha latte': matchaLatteImg,
  matcha: matchaCupImg,
  'normal matcha': matchaCupImg,
  'matcha strawberry': matchaStrawberryImg,
  'iced strawberry matcha': matchaStrawberryImg,
  'double double french vanilla': doubleDoubleFrenchVanillaImg,
  'classic bagel': classicBagelImg,
  'boston cream': bostonCreamImg,
  'mapel dip': mapelDipImg,
  'chocolate dip': chocolateDipImg,
  'bavarian filled timbit': bavarianFilledTimbitImg,
  'strawberry filled timbit': strawberryFilledTimbitImg,
  'spanish latte': spanishLatteImg,
  'caramel macchiato': caramelMacchiatoImg,
  'cold brew redbull coffee': coldBrewRedbullCoffeeImg
};

const getDisplayMeta = (product) => {
  if (product.description || product.capacity || product.weight_label || product.material) {
    return {
      name: product.name,
      desc: product.description || 'A handcrafted café drink made fresh to order.',
      specs: {
        capacity: product.capacity || defaultSpecs.capacity,
        weight: product.weight_label || defaultSpecs.weight,
        material: product.material || defaultSpecs.material
      }
    };
  }

  const exact = catalogByName.get(toKey(product.name));
  if (exact) return exact;

  const fallbackDesc =
    (product.product_type || '').toLowerCase() === 'matcha'
      ? 'A smooth and balanced matcha drink crafted for daily cafe moments.'
      : 'A handcrafted coffee drink prepared fresh with barista precision.';

  return {
    name: product.name,
    desc: fallbackDesc,
    specs: defaultSpecs
  };
};

const ProductCard = ({ item, onAdd }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTouchLike, setIsTouchLike] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(hover: none), (pointer: coarse)');
    const sync = () => setIsTouchLike(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const display = getDisplayMeta(item);
  const outOfStock = Number(item.stock_quantity || 0) <= 0;
  const mapped = productImageMap[toKey(item.name)];
  const fallbackImg =
    mapped || (String(item.product_type || '').toLowerCase() === 'matcha' ? matchaCupImg : coffeeCupImg);

  return (
    <article
      className="js-product-card rb-hover-lift group relative overflow-hidden rounded-[18px] text-center"
      onTouchStart={() => setIsTouchLike(true)}
      onClick={(event) => {
        if (!isTouchLike) return;
        if (event.target.closest('[data-add-to-cart="true"]')) return;
        setIsDetailOpen((prev) => !prev);
      }}
      onMouseLeave={() => {
        if (!isTouchLike) setIsDetailOpen(false);
      }}
    >
      <div className="mx-auto mb-6 h-[210px] w-full max-w-[250px] overflow-hidden rounded-sm bg-transparent">
        <img src={item.image_url || fallbackImg} alt={item.name} className="h-full w-full object-contain" />
      </div>
      <h3 className="mb-2 font-serif text-[44px] font-semibold leading-none md:text-[34px]">{item.name}</h3>
      <p className="mx-auto mb-3 max-w-[460px] text-[17px] leading-relaxed text-[#2e2e2c] md:text-[15px]">{display.desc}</p>
      <p className="text-[33px] font-semibold md:text-[28px]">{formatPHP(item.price)}</p>

      <div
        className={`absolute inset-0 rounded-[18px] bg-[#e9e4d6] px-5 pb-5 pt-5 text-[#1f1f1f] transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 ${
          isDetailOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="mb-6 space-y-0 text-left text-[15px]">
          <div className="flex justify-between border-y border-black/35 py-2">
            <span className="font-semibold">Capacity.</span>
            <span>{display.specs?.capacity || defaultSpecs.capacity}</span>
          </div>
          <div className="flex justify-between border-b border-black/35 py-2">
            <span className="font-semibold">Weight.</span>
            <span>{display.specs?.weight || defaultSpecs.weight}</span>
          </div>
          <div className="flex justify-between border-b border-black/35 py-2">
            <span className="font-semibold">Material.</span>
            <span>{display.specs?.material || defaultSpecs.material}</span>
          </div>
        </div>

        <h3 className="mb-2 text-center font-serif text-[34px] font-semibold leading-[0.98] md:text-[30px]">{item.name}</h3>
        <p className="mx-auto mb-3 max-w-[300px] text-center text-[14px] leading-relaxed md:text-[15px]">{display.desc}</p>
        <p className="mb-4 text-center text-[30px] font-semibold leading-none md:text-[28px]">{formatPHP(item.price)}</p>

        <button
          data-add-to-cart="true"
          onClick={(event) => {
            event.stopPropagation();
            onAdd(item);
            setIsDetailOpen(false);
          }}
          disabled={outOfStock}
          className="mx-auto block w-[88%] rounded-full bg-black py-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#F5F0DF] disabled:opacity-45"
        >
          ADD TO CART
        </button>
      </div>
    </article>
  );
};

export default function ShopPage() {
  const rootRef = useRef(null);
  const orderTimeoutRef = useRef(null);
  const [navSolid, setNavSolid] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shopCategory, setShopCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Guest Customer');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { sendMessage, lastMessage, isReady } = useWebSocket();
  const currentSearch = searchParams.get('q') || '';
  const fallbackCatalog = useMemo(
    () =>
      shopProducts.map((item) => ({
      id: `catalog-${item.id}`,
      name: item.name,
      price: parsePeso(item.price),
      category: shopTypeLabel[normalizeShopType(item.type)] || 'Other',
      product_type: normalizeShopType(item.type),
      capacity: item.specs?.capacity || '',
      weight_label: item.specs?.weight || '',
      material: item.specs?.material || '',
      description: item.desc || '',
      image_url: '',
      stock_quantity: 999
      })),
    []
  );

  const productSource = useMemo(() => {
    if (!(products || []).length) return fallbackCatalog;

    const mergedByKey = new Map();

    fallbackCatalog.forEach((item) => {
      mergedByKey.set(toMergeKey(item), item);
    });

    products.forEach((item) => {
      const key = toMergeKey(item);
      const existing = mergedByKey.get(key);
      if (existing) {
        mergedByKey.set(key, { ...existing, ...item });
      } else {
        mergedByKey.set(key, item);
      }
    });

    return Array.from(mergedByKey.values());
  }, [products, fallbackCatalog]);

  const availableCategories = useMemo(() => {
    const set = new Set(['all']);
    productSource.forEach((item) => set.add(normalizeShopType(item.product_type)));
    return Array.from(set);
  }, [productSource]);

  useEffect(() => {
    if (!isReady) return;
    sendMessage('GET_PRODUCTS');
  }, [isReady]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'PRODUCTS_LIST') {
      setProducts(lastMessage.payload || []);
      return;
    }

    if (lastMessage.type === 'ORDER_PLACED') {
      if (orderTimeoutRef.current) {
        clearTimeout(orderTimeoutRef.current);
        orderTimeoutRef.current = null;
      }
      const receipt = lastMessage.payload || null;
      setLastReceipt(receipt);
      setCart([]);
      setPlacingOrder(false);
      setPaymentMethod('cash');
      setAmountReceived('');
      setCheckoutError('');
      setIsCartOpen(false);
      setIsReceiptModalOpen(Boolean(receipt));
      return;
    }

    if (lastMessage.type === 'SERVER_ERROR') {
      if (orderTimeoutRef.current) {
        clearTimeout(orderTimeoutRef.current);
        orderTimeoutRef.current = null;
      }
      setPlacingOrder(false);
      setCheckoutError(lastMessage.payload?.message || 'Server request failed.');
    }
  }, [lastMessage]);

  useEffect(() => {
    if (!placingOrder) return;
    if (isReady) return;
    if (orderTimeoutRef.current) {
      clearTimeout(orderTimeoutRef.current);
      orderTimeoutRef.current = null;
    }
    setPlacingOrder(false);
    setCheckoutError('Server disconnected while placing order. Please try again.');
  }, [isReady, placingOrder]);

  useEffect(() => {
    if (!isReady) return;
    setCheckoutError((prev) => {
      if (!prev) return prev;
      const msg = String(prev).toLowerCase();
      if (msg.includes('server is not connected') || msg.includes('server disconnected')) {
        return '';
      }
      return prev;
    });
  }, [isReady]);

  useEffect(() => {
    return () => {
      if (orderTimeoutRef.current) clearTimeout(orderTimeoutRef.current);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = toKey(currentSearch);
    const typed = productSource.filter((item) => {
      const type = normalizeShopType(item.product_type);
      return shopCategory === 'all' ? true : type === shopCategory;
    });
    if (!query) return typed;

    return typed.filter((item) => {
      const searchable = toKey(`${item.name} ${item.category || ''} ${item.product_type || ''}`);
      return searchable.includes(query);
    });
  }, [productSource, currentSearch, shopCategory]);

  const liveSearchResults = useMemo(() => {
    const query = toKey(searchQuery);
    const typed = productSource.filter((item) => {
      const type = normalizeShopType(item.product_type);
      return shopCategory === 'all' ? true : type === shopCategory;
    });
    if (!query) return typed.slice(0, 5);

    return typed
      .filter((item) => {
        const searchable = toKey(`${item.name} ${item.category || ''} ${item.product_type || ''}`);
        return searchable.includes(query);
      })
      .slice(0, 5);
  }, [productSource, searchQuery, shopCategory]);

  const hasTypedSearch = searchQuery.trim().length > 0;

  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.js-shop-nav-shell',
        { autoAlpha: 0, y: -18 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }
      );

      gsap.fromTo(
        '.js-shop-hero-copy',
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.12, ease: 'power2.out', delay: 0.12 }
      );

      gsap.fromTo(
        '.js-product-card',
        { autoAlpha: 0, y: 42, scale: 0.98 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.js-shop-products',
            start: 'top 82%'
          }
        }
      );
    }, rootRef);

    return () => ctx.revert();
  }, [filteredProducts.length]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, qty: Math.min(item.qty + 1, Number(product.stock_quantity || 0) || item.qty + 1) }
            : item
        );
      }

      return [...prev, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const matchedProduct = productSource.find((p) => p.id === id);
          const maxQty = Number(matchedProduct?.stock_quantity || item.stock_quantity || 999);
          const nextQty = Math.max(0, Math.min(item.qty + delta, maxQty));
          return { ...item, qty: nextQty };
        })
        .filter((item) => item.qty > 0)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * item.qty, 0);
  const paidAmount = paymentMethod === 'cash' ? Number(amountReceived || 0) : subtotal;
  const changeAmount = Math.max(paidAmount - subtotal, 0);

  const placeCustomerOrder = () => {
    setCheckoutError('');
    if (!cart.length) {
      setCheckoutError('Your cart is empty.');
      return;
    }
    if (!customerName.trim()) {
      setCheckoutError('Please enter customer name.');
      return;
    }

    if (paymentMethod === 'cash' && paidAmount < subtotal) {
      setCheckoutError('Cash received must be enough to cover total amount.');
      return;
    }

    if (!isReady) {
      setCheckoutError('Server is not connected yet. Please try again.');
      return;
    }

    setPlacingOrder(true);
    if (orderTimeoutRef.current) clearTimeout(orderTimeoutRef.current);
    orderTimeoutRef.current = setTimeout(() => {
      setPlacingOrder(false);
      setCheckoutError('Order request timed out. Please try again.');
      orderTimeoutRef.current = null;
    }, 12000);

    const sent = sendMessage('PLACE_ORDER', {
      customer: customerName.trim(),
      order_mode: 'online',
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: Number(item.price || 0)
      })),
      total: subtotal,
      payment: {
        method: paymentMethod,
        amount_received: paymentMethod === 'cash' ? paidAmount : subtotal
      }
    });

    if (!sent) {
      if (orderTimeoutRef.current) {
        clearTimeout(orderTimeoutRef.current);
        orderTimeoutRef.current = null;
      }
      setPlacingOrder(false);
      setCheckoutError('Server is not connected yet. Please try again.');
    }
  };

  const openSearch = () => {
    setIsMobileMenuOpen(false);
    setIsCartOpen(false);
    setSearchQuery(currentSearch);
    setIsSearchOpen(true);
  };

  const closeSearch = () => setIsSearchOpen(false);

  const openCart = () => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setIsCartOpen(true);
  };

  const closeCart = () => setIsCartOpen(false);

  const submitSearch = (e) => {
    e.preventDefault();
    setIsSearchOpen(false);
    const nextQuery = searchQuery.trim();
    navigate(nextQuery ? `/shop?q=${encodeURIComponent(nextQuery)}` : '/shop');
  };

  const downloadReceipt = () => {
    if (!lastReceipt) return;
    const lines = [];
    lines.push('ChateauRoast Receipt');
    lines.push(`Receipt No: ${lastReceipt.receipt_number}`);
    lines.push(`Order ID: ${lastReceipt.order_id}`);
    lines.push(`Date: ${lastReceipt.time}`);
    lines.push(`Customer: ${lastReceipt.customer}`);
    lines.push('');
    lines.push('Items');
    (lastReceipt.items || []).forEach((item) => {
      lines.push(`${item.qty}x ${item.name} - ${formatPHP(Number(item.price) * Number(item.qty))}`);
    });
    lines.push('');
    lines.push(`Total: ${formatPHP(lastReceipt.total || 0)}`);
    lines.push(`Payment: ${lastReceipt.payment_method}`);
    lines.push(`Amount Received: ${formatPHP(lastReceipt.amount_received || 0)}`);
    lines.push(`Change: ${formatPHP(lastReceipt.change_amount || 0)}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${lastReceipt.receipt_number}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const openReceiptModal = () => {
    if (!lastReceipt) return;
    setIsReceiptModalOpen(true);
  };

  const closeReceiptModal = () => setIsReceiptModalOpen(false);

  return (
    <main ref={rootRef} className="min-h-screen bg-[#F9F8E5] text-[#0C090A]">
      <header className="fixed left-0 right-0 top-0 z-50">
        <div
          className={`js-shop-nav-shell transition-all duration-300 ${
            navSolid
              ? 'w-full rounded-none bg-[#F9F8E5] text-[#0C090A]'
              : 'w-full rounded-none bg-transparent text-[#0C090A] md:mx-auto md:mt-4 md:max-w-[1200px]'
          }`}
        >
          <div className={`mx-auto w-full max-w-[1400px] px-5 ${navSolid ? 'md:px-32 lg:px-52' : 'md:px-10'}`}>
            <div className="hidden h-[82px] grid-cols-[1fr_auto_1fr] items-center pb-2 lg:grid">
              <div className="hidden items-center gap-8 text-sm font-semibold tracking-normal lg:flex">
                <Link to="/shop" className="hover:opacity-70">Shop.</Link>
                <Link to="/locations" className="hover:opacity-70">Visit us.</Link>
                <Link to="/locations" className="hover:opacity-70">Info.</Link>
              </div>
              <Link to="/" className="justify-self-center font-serif text-5xl font-semibold tracking-tight md:text-6xl">
                ChateauRoast.
              </Link>
              <div className="hidden items-center justify-end gap-4 md:gap-6 lg:flex">
                <button aria-label="User" onClick={() => navigate('/login')} className="cursor-pointer hover:opacity-70">
                  <User size={22} strokeWidth={2.2} />
                </button>
                <button aria-label="Search" onClick={openSearch} className="cursor-pointer hover:opacity-70">
                  <Search size={22} strokeWidth={2.2} />
                </button>
                <button aria-label="Cart" onClick={openCart} className="cursor-pointer hover:opacity-70">
                  <ShoppingBag size={22} strokeWidth={2.2} />
                </button>
                <button
                  aria-label="View receipt"
                  onClick={openReceiptModal}
                  disabled={!lastReceipt}
                  className="cursor-pointer hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FileText size={22} strokeWidth={2.2} />
                </button>
              </div>
            </div>
            <div className="relative flex h-[74px] items-center justify-between pb-1 lg:hidden">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Open menu"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="cursor-pointer hover:opacity-70"
                >
                  <Menu size={21} strokeWidth={2.3} />
                </button>
                <button aria-label="Search" onClick={openSearch} className="cursor-pointer hover:opacity-70">
                  <Search size={21} strokeWidth={2.3} />
                </button>
              </div>
              <div className="pointer-events-none absolute left-[52px] right-[52px] top-1/2 -translate-y-1/2">
                <Link
                  to="/"
                  className="pointer-events-auto block text-center font-serif text-[clamp(1.8rem,8.4vw,2.5rem)] font-semibold leading-none tracking-tight"
                >
                  ChateauRoast.
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <button aria-label="User" onClick={() => navigate('/login')} className="cursor-pointer hover:opacity-70">
                  <User size={21} strokeWidth={2.3} />
                </button>
                <button aria-label="Cart" onClick={openCart} className="cursor-pointer hover:opacity-70">
                  <ShoppingBag size={21} strokeWidth={2.3} />
                </button>
              </div>
            </div>
          </div>
          <div className="w-full border-b border-[#0C090A]"></div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[70] bg-black/45 lg:hidden">
          <div className="h-full w-[92%] max-w-[520px] rounded-r-3xl bg-[#F9F8E5] px-5 py-4 text-[#0C090A]">
            <div className="mb-4 flex items-center justify-end border-b border-[#0C090A] pb-3">
              <button aria-label="Close menu" onClick={() => setIsMobileMenuOpen(false)} className="p-1">
                <X size={34} strokeWidth={1.8} />
              </button>
            </div>

            <div className="space-y-0">
              {[
                { label: 'Shop.', to: '/shop', chevron: true },
                { label: 'Visit us.', to: '/locations', chevron: false },
                { label: 'Info.', to: '/locations', chevron: true }
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate(item.to);
                  }}
                  className="flex w-full items-center justify-between border-b border-[#0C090A]/25 py-5 text-left text-xl font-semibold"
                >
                  <span>{item.label}</span>
                  {item.chevron && <ChevronRight size={20} />}
                </button>
              ))}
            </div>

            <div className="mt-7 flex items-center justify-center gap-8">
              <button aria-label="Facebook" className="p-1"><Facebook size={24} /></button>
              <button aria-label="Instagram" className="p-1"><Instagram size={24} /></button>
              <button aria-label="LinkedIn" className="p-1"><Linkedin size={24} /></button>
            </div>
          </div>
        </div>
      )}

      {isSearchOpen && (
        <div className="fixed inset-0 z-[80] bg-black/65 px-2 py-2 md:px-6 md:py-6">
          <div className="mx-auto h-full max-w-[950px] overflow-y-auto rounded-xl bg-black px-4 py-5 text-[#F5F0DF] md:px-7 md:py-7">
            <div className="mb-6 flex items-center justify-between border-b border-[#7f7b72]/70 pb-4">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#bbb6ac]">Search</span>
              <button onClick={closeSearch} className="text-xs font-bold uppercase tracking-[0.22em] underline underline-offset-4 text-[#c8c4bb]">
                Close
              </button>
            </div>

            <form onSubmit={submitSearch} className="mb-8 border-b border-[#7f7b72]/70 pb-5">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Start search..."
                className="w-full bg-transparent font-serif text-4xl font-semibold leading-none text-[#F5F0DF] placeholder:text-[#e4dfd4] focus:outline-none md:text-6xl"
              />
            </form>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#bbb6ac]">
                {hasTypedSearch ? 'Search Results' : 'Shop Items'}
              </p>
              {liveSearchResults.length > 0 ? (
                liveSearchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      closeSearch();
                      navigate(`/shop?q=${encodeURIComponent(item.name)}`);
                    }}
                    className="w-full rounded-lg border border-[#7f7b72]/50 px-4 py-3 text-left hover:bg-white/5"
                  >
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-[#d4cfc5]">{formatPHP(item.price)}</p>
                  </button>
                ))
              ) : (
                <p className="rounded-lg border border-[#7f7b72]/50 px-4 py-3 text-sm text-[#d4cfc5]">
                  No items matched "{searchQuery}".
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-[85] bg-black/55">
          <div className="ml-auto flex h-full w-full flex-col bg-[#F9F8E5] px-4 py-5 text-[#0C090A] md:w-[430px] md:max-w-[430px]">
            <div className="mb-4 flex items-start justify-between border-b border-[#0C090A]/25 pb-4">
              <div>
                <h3 className="font-serif text-[32px] font-semibold leading-none md:text-[40px]">Your Cart</h3>
                <p className="mt-3 text-[14px] font-semibold text-[#4c4a45] md:text-[16px]">
                  {cart.length > 0 ? `${cart.length} item line(s) in this order` : 'Your cart is currently empty.'}
                </p>
              </div>
              <button
                onClick={closeCart}
                className="pt-1 text-[12px] font-bold uppercase tracking-[0.18em] underline underline-offset-4"
              >
                Close
              </button>
            </div>

            {cart.length > 0 ? (
              <>
                <div className="mb-3 space-y-2">
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full rounded-full border border-[#0C090A]/35 bg-transparent px-4 py-2 text-sm outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="rounded-full border border-[#0C090A]/35 bg-transparent px-4 py-2 text-sm outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>
                    {paymentMethod === 'cash' ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        placeholder="Cash received"
                        className="rounded-full border border-[#0C090A]/35 bg-transparent px-4 py-2 text-sm outline-none"
                      />
                    ) : (
                      <div className="rounded-full border border-[#0C090A]/35 px-4 py-2 text-sm text-[#4c4a45]">Paid by card</div>
                    )}
                  </div>
                </div>

                <div className="mb-4 flex-1 space-y-2 overflow-y-auto border-y border-[#0C090A]/20 py-3">
                  {cart.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#0C090A]/15 bg-white/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-[#4c4a45]">{formatPHP(item.price)} each</p>
                        </div>
                        <p className="font-semibold">{formatPHP(Number(item.price) * item.qty)}</p>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#0C090A]/25 px-2 py-1">
                        <button onClick={() => updateCartQty(item.id, -1)} className="rounded-full p-1">
                          <Minus size={12} />
                        </button>
                        <span className="min-w-5 text-center text-sm font-semibold">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.id, 1)} className="rounded-full p-1">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 pb-3 text-sm">
                  <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatPHP(subtotal)}</span></div>
                  <div className="flex items-center justify-between font-semibold"><span>Total</span><span>{formatPHP(subtotal)}</span></div>
                  {paymentMethod === 'cash' ? (
                    <div className="flex items-center justify-between font-semibold"><span>Change</span><span>{formatPHP(changeAmount)}</span></div>
                  ) : null}
                </div>

                <button
                  onClick={placeCustomerOrder}
                  disabled={placingOrder || !isReady}
                  className="w-full rounded-full bg-black py-4 text-[12px] font-bold uppercase tracking-[0.22em] text-[#F5F0DF] disabled:opacity-45"
                >
                  {placingOrder ? 'Placing Order...' : !isReady ? 'Connecting Server...' : `Place Order ${formatPHP(subtotal)}`}
                </button>
                {!isReady ? (
                  <p className="mt-2 text-center text-xs font-semibold text-amber-700">Reconnecting to server...</p>
                ) : null}
                {checkoutError ? (
                  <p className="mt-2 text-center text-xs font-semibold text-red-700">{checkoutError}</p>
                ) : null}

                {lastReceipt ? (
                  <div className="mt-3 space-y-2 text-center">
                    <p className="text-xs text-[#3f3c36]">
                      Order #{lastReceipt.order_id} confirmed • Receipt {lastReceipt.receipt_number}
                    </p>
                    <button
                      onClick={openReceiptModal}
                      className="rounded-full border border-[#0C090A]/30 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]"
                    >
                      View Receipt
                    </button>
                    <button
                      onClick={downloadReceipt}
                      className="rounded-full border border-[#0C090A]/30 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]"
                    >
                      Download Receipt
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-auto border-t border-[#0C090A]/45 pt-5">
                <p className="mb-6 font-serif text-[34px] font-semibold leading-none md:text-[40px]">Your cart is currently empty.</p>
                <button
                  onClick={() => {
                    closeCart();
                    navigate('/shop');
                  }}
                  className="w-full rounded-full border border-[#0C090A]/40 py-4 text-[12px] font-bold uppercase tracking-[0.22em] text-[#5b5751]"
                >
                  Shop Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isReceiptModalOpen && lastReceipt ? (
        <div className="fixed inset-0 z-[95] bg-black/55 px-3 py-6">
          <div className="mx-auto max-h-[95vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-[#F9F8E5] p-5 text-[#0C090A]">
            <div className="mb-4 flex items-start justify-between border-b border-[#0C090A]/25 pb-3">
              <div>
                <h3 className="font-serif text-3xl font-semibold leading-none">Receipt</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#4c4a45]">
                  {lastReceipt.receipt_number}
                </p>
              </div>
              <button
                onClick={closeReceiptModal}
                className="pt-1 text-[11px] font-bold uppercase tracking-[0.16em] underline underline-offset-4"
              >
                Close
              </button>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Order ID</span><span>#{lastReceipt.order_id}</span></div>
              <div className="flex justify-between"><span>Date</span><span>{lastReceipt.time}</span></div>
              <div className="flex justify-between"><span>Customer</span><span>{lastReceipt.customer}</span></div>
              <div className="flex justify-between"><span>Payment</span><span className="uppercase">{lastReceipt.payment_method}</span></div>
            </div>

            <div className="my-4 border-y border-[#0C090A]/20 py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#4c4a45]">Items</p>
              <div className="space-y-2">
                {(lastReceipt.items || []).map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-[#4c4a45]">x{item.qty} • {formatPHP(item.price)}</p>
                    </div>
                    <p className="font-semibold">{formatPHP(Number(item.price || 0) * Number(item.qty || 0))}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPHP(lastReceipt.subtotal || 0)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatPHP(lastReceipt.total || 0)}</span></div>
              <div className="flex justify-between"><span>Amount Received</span><span>{formatPHP(lastReceipt.amount_received || 0)}</span></div>
              <div className="flex justify-between font-semibold"><span>Change</span><span>{formatPHP(lastReceipt.change_amount || 0)}</span></div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={downloadReceipt}
                className="flex-1 rounded-full border border-[#0C090A]/35 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]"
              >
                Download
              </button>
              <button
                onClick={closeReceiptModal}
                className="flex-1 rounded-full bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5F0DF]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="js-shop-section mx-auto w-full max-w-[1400px] px-5 pb-20 pt-24 md:px-10 md:pt-28">
        <div className="pt-8">
          <div className="pt-2 md:pt-4">
            <div className="js-shop-hero-copy mb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-[#252525]">
              <p>Shop</p>
              <p>ChateauRoast</p>
            </div>
            <div className="js-shop-hero-copy grid gap-10 lg:grid-cols-[380px_1fr] lg:items-start">
              <div className="flex flex-wrap gap-x-6 gap-y-2 lg:block lg:space-y-1">
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setShopCategory(category)}
                    className={`block text-left font-serif text-[34px] font-semibold leading-[0.95] transition-colors md:text-[42px] ${
                      shopCategory === category ? 'text-[#0C090A]' : 'text-[#0C090A]/20 hover:text-[#0C090A]/40'
                    }`}
                  >
                    {shopTypeLabel[category] || 'Other'}
                  </button>
                ))}
              </div>

              <div className="max-w-[760px] pt-1">
                <h1 className="font-serif text-[54px] font-semibold leading-[0.95] md:text-[72px]">
                  {categoryHeroContent[shopCategory]?.title || categoryHeroContent.all.title}
                </h1>
                <p className="mt-3 max-w-[760px] text-[18px] leading-relaxed text-[#1f1f1f] md:text-[24px]">
                  {categoryHeroContent[shopCategory]?.description || categoryHeroContent.all.description}
                </p>
              </div>
            </div>
          </div>

          <hr className="my-12 border-[#b0aca3]" />
          {currentSearch ? (
            <p className="js-shop-hero-copy mb-8 text-sm uppercase tracking-[0.2em] text-[#3d3d3d]">
              Results for "{currentSearch}" ({filteredProducts.length})
            </p>
          ) : null}

          <div className="js-shop-products grid grid-cols-1 gap-x-9 gap-y-10 md:grid-cols-3">
            {filteredProducts.map((item) => (
              <ProductCard key={item.id} item={item} onAdd={addToCart} />
            ))}
          </div>
          {filteredProducts.length === 0 ? (
            <p className="mt-10 text-lg text-[#2e2e2c]">
              No matching items found. Try a different keyword.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
