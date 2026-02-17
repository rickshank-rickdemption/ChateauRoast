import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  User,
  Search,
  ShoppingBag,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Instagram,
  Facebook,
  Linkedin
} from 'lucide-react';
import { searchShopProducts } from '../data/shopProducts';

gsap.registerPlugin(ScrollTrigger);

export default function LocationsPage() {
  const rootRef = useRef(null);
  const [navSolid, setNavSolid] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const liveSearchResults = useMemo(() => searchShopProducts(searchQuery).slice(0, 5), [searchQuery]);
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
        '.js-loc-nav-shell',
        { autoAlpha: 0, y: -18 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }
      );

      gsap.fromTo(
        '.js-loc-hero-copy',
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.12, ease: 'power2.out', delay: 0.12 }
      );

      gsap.fromTo(
        '.js-loc-search-shell',
        { autoAlpha: 0, y: 26, scale: 0.99 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.js-loc-search-shell',
            start: 'top 85%'
          }
        }
      );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const openSearch = () => {
    setIsMobileMenuOpen(false);
    setIsCartOpen(false);
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

  return (
    <main ref={rootRef} className="min-h-screen bg-[#e8e5d6] text-[#111111]">
      <header className="fixed left-0 right-0 top-0 z-50">
        <div
          className={`js-loc-nav-shell transition-all duration-300 ${
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
                    <p className="text-sm text-[#d4cfc5]">{item.price}</p>
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
                  You're only ₱40.00 away from free delivery
                </p>
              </div>
              <button
                onClick={closeCart}
                className="pt-1 text-[12px] font-bold uppercase tracking-[0.18em] underline underline-offset-4"
              >
                Close
              </button>
            </div>

            <button className="mb-8 flex w-full items-center justify-between rounded-full border border-[#0C090A]/30 px-6 py-4 text-left">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#696661]">Delivery Information</span>
              <ChevronDown size={18} className="text-[#4d4a45]" />
            </button>

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
          </div>
        </div>
      )}

      <section className="px-4 pb-16 pt-28 sm:px-8 sm:pt-32 lg:px-12">
        <div className="max-w-[620px]">
          <p className="js-loc-hero-copy mb-7 text-[11px] uppercase tracking-[0.32em] text-[#101010]">
            Find our locations
          </p>

          <h1
            className="js-loc-hero-copy mb-4 text-[58px] leading-[0.95] text-black sm:text-[66px]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Visit Us.
          </h1>

          <p className="js-loc-hero-copy mb-7 max-w-[600px] text-[16px] leading-[1.45] text-[#191919] sm:text-[17px]">
            Each of our locations are designed to play a contemporary role in the Modern Coffee
            experience, while also preserving their unique history in the community.
          </p>

          <button
            type="button"
            className="js-loc-hero-copy rb-hover-lift mb-10 inline-flex h-[46px] min-w-[220px] items-center justify-center rounded-full border border-[#0c2a3a] bg-black px-7 text-[11px] font-medium uppercase tracking-[0.32em] text-white transition hover:bg-[#141414]"
          >
            See Nearby Houses
          </button>

          <p className="js-loc-hero-copy mb-4 text-[11px] uppercase tracking-[0.34em] text-[#111111]">
            Search by post code or city
          </p>

          <div className="js-loc-search-shell relative w-full max-w-[500px]">
            <input
              type="text"
              placeholder="Enter Postcode"
              className="h-[56px] w-full rounded-full border border-[#272727] bg-transparent px-6 pr-20 text-[30px] text-[#131313] placeholder:text-[#1d1d1d] focus:outline-none sm:text-[29px]"
            />
            <button
              type="button"
              aria-label="Search by postcode"
              className="absolute right-[8px] top-1/2 flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center rounded-full bg-black text-white"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
