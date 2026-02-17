import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShoppingBag, Search, User, ArrowRight, Coffee, MapPin, Smile, Menu, X, ChevronRight, ChevronDown, Instagram, Facebook, Linkedin } from 'lucide-react';
import coffeeCupImg from './img/Coffee cup.png';
import { searchShopProducts } from '../data/shopProducts';

gsap.registerPlugin(ScrollTrigger);

const LandingPage = () => {
  const WHEEL_SCROLL_MULTIPLIER = 0.62;
  const MIN_WHEEL_STEP = 6;
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const cardsScrollRef = useRef(null);
  const houseFavScrollRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const isFavDraggingRef = useRef(false);
  const favDragStartXRef = useRef(0);
  const favDragScrollLeftRef = useRef(0);
  const [navSolid, setNavSolid] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [favProgress, setFavProgress] = useState(0);
  const featuresScrollRef = useRef(null);
  const navSolidRef = useRef(false);
  const liveSearchResults = useMemo(() => searchShopProducts(searchQuery).slice(0, 5), [searchQuery]);
  const hasTypedSearch = searchQuery.trim().length > 0;
  const features = [
    {
      icon: <MapPin strokeWidth={1} size={36} />,
      title: 'Globally sourced. Locally crafted.',
      desc: 'Cupped, tested, developed and roasted at our Coffee Lab right here in the Philippines.'
    },
    {
      icon: <Coffee strokeWidth={1} size={36} />,
      title: 'Modern Coffee. Holistic approach.',
      desc: 'It encapsulates the attention to detail, creativity, and focus on provenance and quality.'
    },
    {
      icon: <Smile strokeWidth={1} size={36} />,
      title: 'No two Houses the same.',
      desc: 'Each of our locations are designed to play a contemporary role in the Modern Coffee experience.'
    }
  ];

  const handleCardsWheel = (e) => {
    const el = cardsScrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      const scaledDelta = e.deltaY * WHEEL_SCROLL_MULTIPLIER;
      const direction = Math.sign(scaledDelta);
      const adjustedDelta = direction * Math.max(Math.abs(scaledDelta), MIN_WHEEL_STEP);
      el.scrollLeft += adjustedDelta;
    }
  };

  const handleCardsMouseDown = (e) => {
    const el = cardsScrollRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.pageX;
    dragScrollLeftRef.current = el.scrollLeft;
    el.style.cursor = 'grabbing';
  };

  const handleCardsMouseMove = (e) => {
    const el = cardsScrollRef.current;
    if (!el || !isDraggingRef.current) return;
    e.preventDefault();
    const deltaX = e.pageX - dragStartXRef.current;
    el.scrollLeft = dragScrollLeftRef.current - deltaX;
  };

  const handleCardsMouseUp = () => {
    const el = cardsScrollRef.current;
    isDraggingRef.current = false;
    if (el) el.style.cursor = 'grab';
  };

  const handleFavWheel = (e) => {
    const el = houseFavScrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      const scaledDelta = e.deltaY * WHEEL_SCROLL_MULTIPLIER;
      const direction = Math.sign(scaledDelta);
      const adjustedDelta = direction * Math.max(Math.abs(scaledDelta), MIN_WHEEL_STEP);
      el.scrollLeft += adjustedDelta;
    }
  };

  const handleFavMouseDown = (e) => {
    const el = houseFavScrollRef.current;
    if (!el) return;
    isFavDraggingRef.current = true;
    favDragStartXRef.current = e.pageX;
    favDragScrollLeftRef.current = el.scrollLeft;
    el.style.cursor = 'grabbing';
  };

  const handleFavMouseMove = (e) => {
    const el = houseFavScrollRef.current;
    if (!el || !isFavDraggingRef.current) return;
    e.preventDefault();
    const deltaX = e.pageX - favDragStartXRef.current;
    el.scrollLeft = favDragScrollLeftRef.current - deltaX;
  };

  const handleFavMouseUp = () => {
    const el = houseFavScrollRef.current;
    isFavDraggingRef.current = false;
    if (el) el.style.cursor = 'grab';
  };

  const handleFavScroll = () => {
    const el = houseFavScrollRef.current;
    if (!el) return;
    const maxScrollable = el.scrollWidth - el.clientWidth;
    if (maxScrollable <= 0) {
      setFavProgress(0);
      return;
    }
    setFavProgress(el.scrollLeft / maxScrollable);
  };

  const openSearch = () => {
    setIsMobileMenuOpen(false);
    setIsCartOpen(false);
    setIsSearchOpen(true);
  };

  const closeSearch = () => setIsSearchOpen(false);
  const scrollToFeature = (index) => {
    const el = featuresScrollRef.current;
    if (!el) return;
    const card = el.querySelector('.js-feature-card');
    const step = card ? card.clientWidth : el.clientWidth;
    el.scrollTo({ left: step * index, behavior: 'smooth' });
    setActiveFeatureIndex(index);
  };
  const handleFeaturesScroll = () => {
    const el = featuresScrollRef.current;
    if (!el) return;
    const card = el.querySelector('.js-feature-card');
    const step = card ? card.clientWidth : el.clientWidth;
    if (!step) return;
    const idx = Math.round(el.scrollLeft / step);
    setActiveFeatureIndex(Math.max(0, Math.min(features.length - 1, idx)));
  };
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

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.js-nav-shell',
        { autoAlpha: 0, y: -20, backgroundColor: 'rgba(249,248,229,0)', boxShadow: '0 0 0 rgba(0,0,0,0)' },
        { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );

      ScrollTrigger.normalizeScroll({ allowNestedScroll: true });

      ScrollTrigger.create({
        trigger: '.js-hero',
        start: 'top top',
        end: 'bottom top',
        onUpdate: (self) => {
          const solid = self.progress > 0.08;
          if (solid === navSolidRef.current) return;
          navSolidRef.current = solid;
          setNavSolid(solid);
          gsap.to('.js-nav-shell', {
            backgroundColor: solid ? 'rgb(249,248,229)' : 'rgba(249,248,229,0)',
            boxShadow: solid ? '0 8px 24px rgba(26,26,26,0.10)' : '0 0 0 rgba(0,0,0,0)',
            duration: 0.35,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        }
      });

      gsap.fromTo(
        '.js-hero-copy',
        { autoAlpha: 0, y: 36 },
        { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.15, delay: 0.2 }
      );

      gsap.fromTo(
        '.js-hero-media',
        { scale: 1.1 },
        {
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.js-hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true
          }
        }
      );

      gsap.utils.toArray('.js-reveal-section').forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 50 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 80%'
            }
          }
        );
      });

      gsap.utils.toArray('.js-stagger-grid').forEach((grid) => {
        const cards = grid.querySelectorAll('.js-stagger-item');
        gsap.fromTo(
          cards,
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: grid,
              start: 'top 80%'
            }
          }
        );
      });

      gsap.utils.toArray('.js-journal-grid').forEach((grid) => {
        const cards = grid.querySelectorAll('.js-journal-card');
        gsap.fromTo(
          cards,
          { autoAlpha: 0, y: 36, scale: 0.98 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.85,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: grid,
              start: 'top 78%'
            }
          }
        );
      });

      gsap.utils.toArray('.js-footer-grid').forEach((grid) => {
        const blocks = grid.querySelectorAll('.js-footer-item');
        gsap.fromTo(
          blocks,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: grid,
              start: 'top bottom',
              once: true
            }
          }
        );
      });

      gsap.utils.toArray('.js-parallax').forEach((el) => {
        gsap.fromTo(
          el,
          { yPercent: -8 },
          {
            yPercent: 8,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          }
        );
      });

      gsap.utils.toArray('.js-story-line').forEach((line, index) => {
        gsap.to(line, {
          color: '#f8f5ea',
          scrollTrigger: {
            trigger: '.js-story-section',
            start: 'top 75%',
            end: 'bottom 35%',
            scrub: true,
            toggleActions: 'play none none reverse'
          },
          ease: 'none',
          delay: index * 0.02
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="overflow-x-hidden bg-[#F9F8E5] font-sans text-wh-black antialiased">
      <header className="fixed left-0 right-0 top-0 z-50">
        <div
          className={`js-nav-shell transition-all duration-300 ${
            navSolid
              ? 'w-full rounded-none bg-[#F9F8E5] text-[#0C090A]'
              : 'w-full rounded-none bg-transparent text-[#F9F8E5] md:mx-auto md:mt-4 md:max-w-[1200px]'
          }`}
        >
          <div className={`mx-auto w-full max-w-[1400px] px-5 ${navSolid ? 'md:px-32 lg:px-52' : 'md:px-10'}`}>
            <nav className="hidden h-[82px] grid-cols-[1fr_auto_1fr] items-center pb-2 lg:grid">
              <div className="hidden items-center gap-8 text-sm font-semibold tracking-normal lg:flex">
                <Link to="/shop" className="hover:opacity-70">Shop.</Link>
                <Link to="/locations" className="hover:opacity-70">Visit us.</Link>
                <Link to="/locations" className="hover:opacity-70">Info.</Link>
              </div>
              <div className="justify-self-center">
                <Link to="/" aria-label="Go to home" className="font-serif text-5xl font-semibold tracking-tight md:text-6xl">
                  ChateauRoast.
                </Link>
              </div>

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
              <div className="flex items-center justify-end space-x-4 lg:hidden">
                <button aria-label="User" onClick={() => navigate('/login')} className="cursor-pointer hover:opacity-70">
                  <User size={22} strokeWidth={2.4} />
                </button>
                <button aria-label="Cart" onClick={openCart} className="cursor-pointer hover:opacity-70">
                  <ShoppingBag size={22} strokeWidth={2.4} />
                </button>
              </div>
            </nav>
            <nav className="relative flex h-[74px] items-center justify-between pb-1 lg:hidden">
              <div className="flex items-center gap-3">
                <button aria-label="Open menu" onClick={() => setIsMobileMenuOpen(true)} className="cursor-pointer hover:opacity-70">
                  <Menu size={21} strokeWidth={2.3} />
                </button>
                <button aria-label="Search" onClick={openSearch} className="cursor-pointer hover:opacity-70">
                  <Search size={21} strokeWidth={2.3} />
                </button>
              </div>

              <div className="pointer-events-none absolute left-[52px] right-[52px] top-1/2 -translate-y-1/2">
                <Link
                  to="/"
                  aria-label="Go to home"
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
            </nav>
          </div>

          {navSolid ? (
            <div className="w-full border-b border-[#0C090A]"></div>
          ) : (
            <div className="w-full border-b border-[#F9F8E5]/70"></div>
          )}
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
              </div>
              <button
                onClick={closeCart}
                className="pt-1 text-[12px] font-bold uppercase tracking-[0.18em] underline underline-offset-4"
              >
                Close
              </button>
            </div>

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

      <header className="js-hero relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <video
            className="js-hero-media h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            src="https://www.pexels.com/download/video/11836118/"
            poster="hhttps://images.pexels.com/photos/28544853/pexels-photo-28544853.jpeg?auto=format&fit=crop&q=80&w=2200"
          >
            <source src="https://www.pexels.com/download/video/2849996/" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[#2b1d0f]/38"></div>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white">
          <h2 className="js-hero-copy mb-6 font-serif text-6xl font-bold leading-tight md:text-8xl">Modern Coffee.</h2>
          <p className="js-hero-copy mb-10 max-w-lg text-lg font-light md:text-xl">
            Pourers of the world's best coffees and providers of the tools and techniques from our
            House to yours.
          </p>
          <button
            className="js-hero-copy liquid-btn rounded-full px-10 py-4 text-xs font-bold uppercase tracking-widest"
            onClick={() => navigate('/shop')}
          >
            <span>Shop Now</span>
          </button>
        </div>
      </header>

      <section className="js-reveal-section bg-[#F5F0DF] py-5 md:min-h-[170px] md:py-9">
        <div className="mx-auto max-w-7xl px-8 md:hidden">
          <div
            ref={featuresScrollRef}
            onScroll={handleFeaturesScroll}
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]"
          >
            {features.map((item, idx) => (
              <div key={idx} className="js-feature-card min-w-full snap-start">
                <div className="flex items-start gap-4">
                  <div className="mt-2 shrink-0">{item.icon}</div>
                  <div>
                    <h3 className="mb-1.5 font-serif text-[23px] font-black leading-[1.05]">{item.title}</h3>
                    <p className="text-[12px] leading-relaxed text-gray-600">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            {features.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Go to feature ${idx + 1}`}
                onClick={() => scrollToFeature(idx)}
                className={`h-[2px] rounded-full transition-all ${
                  activeFeatureIndex === idx ? 'w-6 bg-[#0C090A]' : 'w-4 bg-[#9b968b]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="js-stagger-grid mx-auto hidden max-w-7xl grid-cols-3 gap-9 px-8 md:grid">
          {features.map((item, idx) => (
            <div key={idx} className="js-stagger-item flex items-start gap-4">
              <div className="mt-2 shrink-0">{item.icon}</div>
              <div>
                <h3 className="mb-2 font-serif text-xl font-black">{item.title}</h3>
                <p className="text-[13px] leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="js-reveal-section bg-[#F9F8E5] px-4 py-20 md:px-8">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-10 md:flex-row">
          <div className="pt-4 md:w-[300px] md:shrink-0 md:pr-6">
            <h2 className="mb-6 font-serif text-6xl font-bold leading-[0.95]">Brew with us.</h2>
            <p className="mb-8 text-lg leading-relaxed text-[#2C2C2C]">
              ChateauRoast. Your Cafe.
              <br />
              Modern coffee crafted for busy mornings and smooth daily service.
              <br />
              <br />
              Build your go-to cup lineup for every customer.
            </p>
            <div className="mb-8 flex items-center gap-4">
              <span className="font-serif text-2xl font-semibold">Coffee</span>
              <div className="relative h-8 w-16 cursor-pointer rounded-full border border-[#3A352F]">
                <div className="absolute left-1 top-1 h-6 w-6 rounded-full bg-black"></div>
              </div>
              <span className="font-serif text-2xl font-semibold text-[#2C2C2C]">Tea</span>
            </div>
          </div>

          <div
            ref={cardsScrollRef}
            onWheel={handleCardsWheel}
            onMouseDown={handleCardsMouseDown}
            onMouseMove={handleCardsMouseMove}
            onMouseUp={handleCardsMouseUp}
            onMouseLeave={handleCardsMouseUp}
            className="no-scrollbar cursor-grab select-none overflow-x-auto overflow-y-visible pb-4 md:flex-1 [scrollbar-width:none] [-ms-overflow-style:none]"
          >
            <div className="js-stagger-grid flex min-w-max snap-x snap-mandatory gap-7 pr-20">
              <div className="js-stagger-item snap-start shrink-0 relative flex min-h-[620px] w-[350px] flex-col justify-between rounded-[20px] bg-[#DCC6AE] p-6">
                <div className="-mt-10 mb-6 w-full overflow-hidden rounded-[18px] bg-[#D5C7B0]">
                  <div className="grid grid-cols-[1fr_auto_1fr]">
                    <div className="h-[76px] bg-[#BFA786]"></div>
                    <div className="flex h-[76px] min-w-[162px] flex-col items-center justify-center bg-[#927557] px-3 text-[#1B140C]">
                      <span className="text-[16px] font-black uppercase tracking-[0.08em]">Philippines</span>
                      <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em]">Aroma nativo, papayo</span>
                    </div>
                    <div className="h-[76px] bg-[#BFA786]"></div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 font-serif text-3xl font-bold leading-tight">House Espresso.</h3>
                  <p className="mb-4 text-base leading-relaxed text-[#2C2C2C]">Our signature cafeteria espresso blend for milk-based drinks. Roasted for balanced sweetness and a smooth finish, ideal for daily service from opening to closing.</p>
                  <p className="mb-5 text-2xl font-medium">₱190.00</p>
                  <hr className="mb-5 border-black/35" />
                  <p className="mb-4 text-lg font-semibold">Why customers love it.</p>
                  <ul className="mb-8 space-y-3 text-base">
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs">✓</div> Smooth taste for espresso and latte.</li>
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs">✓</div> Consistent quality in every cup.</li>
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs">✓</div> Perfect for dine-in and takeaway orders.</li>
                  </ul>
                </div>
                <button className="w-full rounded-full bg-[#F5F0DF] py-3 text-xs font-bold uppercase tracking-[0.25em]">Buy Now</button>
              </div>

              <div className="js-stagger-item snap-start shrink-0 flex min-h-[620px] w-[350px] flex-col justify-between rounded-[20px] bg-[#D4BDA1] p-6">
                <div className="-mt-10 mb-6 w-full overflow-hidden rounded-[18px] bg-[#D7CCBC]">
                  <div className="grid grid-cols-[1fr_auto_1fr]">
                    <div className="h-[76px] bg-[#B9AB96]"></div>
                    <div className="flex h-[76px] min-w-[162px] flex-col items-center justify-center bg-[#887663] px-3 text-[#1B140C]">
                      <span className="text-[16px] font-black uppercase tracking-[0.08em]">Philippines</span>
                      <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em]">Aroma nativo, papayo</span>
                    </div>
                    <div className="h-[76px] bg-[#B9AB96]"></div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 font-serif text-3xl font-bold leading-tight">Daily Brew Blend.</h3>
                  <p className="mb-4 text-base leading-relaxed text-[#2C2C2C]">A smooth, everyday coffee profile crafted for busy cafeteria service and reliable cup quality all day.</p>
                  <p className="mb-5 text-2xl font-medium">₱220.00</p>
                  <hr className="mb-5 border-black/35" />
                  <p className="mb-4 text-lg font-semibold">Perfect for your cafe.</p>
                  <ul className="mb-8 space-y-3 text-base">
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs">✓</div> Fast workflow for peak hours.</li>
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs">✓</div> Great taste at an affordable price.</li>
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs">✓</div> Ideal for hot and iced coffee menu items.</li>
                  </ul>
                </div>
                <button className="w-full rounded-full bg-[#F5F0DF] py-3 text-xs font-bold uppercase tracking-[0.25em]">Order Now</button>
              </div>

              <div className="js-stagger-item snap-start shrink-0 flex min-h-[620px] w-[350px] flex-col justify-between rounded-[20px] bg-[#8C9095] p-6 text-white">
                <div className="-mt-10 mb-6 w-full overflow-hidden rounded-[18px] bg-[#DDD2C2]">
                  <div className="grid grid-cols-[1fr_auto_1fr]">
                    <div className="h-[76px] bg-[#C8B79F]"></div>
                    <div className="flex h-[76px] min-w-[162px] flex-col items-center justify-center bg-[#9D8669] px-3 text-[#1B140C]">
                      <span className="text-[16px] font-black uppercase tracking-[0.08em]">Philippines</span>
                      <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em]">Aroma nativo, papayo</span>
                    </div>
                    <div className="h-[76px] bg-[#C8B79F]"></div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 font-serif text-3xl font-bold leading-tight">Bold Roast Reserve.</h3>
                  <p className="mb-4 text-base leading-relaxed text-gray-100">A deeper roast profile for guests who prefer rich, strong coffee flavor in every cup.</p>
                  <p className="mb-5 text-2xl font-medium">₱250.00</p>
                  <hr className="mb-5 border-white/35" />
                  <p className="mb-4 text-lg font-semibold">Built for coffee bars.</p>
                  <ul className="mb-8 space-y-3 text-base text-gray-100">
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-xs">✓</div> Strong profile for espresso shots.</li>
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-xs">✓</div> Consistent extraction for daily operations.</li>
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-xs">✓</div> Great base for signature cafe drinks.</li>
                  </ul>
                </div>
                <button className="w-full rounded-full bg-[#F5F0DF] py-3 text-xs font-bold uppercase tracking-[0.25em] text-black">Order Now</button>
              </div>

              <div className="js-stagger-item snap-start shrink-0 flex min-h-[620px] w-[350px] flex-col justify-between rounded-[20px] bg-[#EFE9D8] p-6">
                <div className="-mt-10 mb-6 w-full overflow-hidden rounded-[18px] bg-[#D9CFBC]">
                  <div className="grid grid-cols-[1fr_auto_1fr]">
                    <div className="h-[76px] bg-[#C9B296]"></div>
                    <div className="flex h-[76px] min-w-[162px] flex-col items-center justify-center bg-[#A98E6E] px-3 text-[#1B140C]">
                      <span className="text-[16px] font-black uppercase tracking-[0.08em]">Philippines</span>
                      <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em]">Aroma nativo, papayo</span>
                    </div>
                    <div className="h-[76px] bg-[#C9B296]"></div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 font-serif text-3xl font-bold leading-tight">Cafe Reserve Selection.</h3>
                  <p className="mb-4 text-base leading-relaxed text-[#2C2C2C]">A rotating house selection featuring seasonal beans for customers who want new flavor experiences every visit.</p>
                  <p className="mb-5 text-2xl font-medium">₱280.00</p>
                  <hr className="mb-5 border-black/35" />
                  <p className="mb-4 text-lg font-semibold">Best for your menu.</p>
                  <ul className="mb-8 space-y-3 text-base">
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs">✓</div> Rotating profile keeps the menu exciting.</li>
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs">✓</div> Great for limited-time featured drinks.</li>
                    <li className="flex items-center gap-3"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-xs">✓</div> Appeals to regulars and specialty coffee fans.</li>
                  </ul>
                </div>
                <button className="w-full rounded-full bg-[#F5F0DF] py-3 text-xs font-bold uppercase tracking-[0.25em]">Order Now</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="js-reveal-section relative bg-[#F9F8E5] py-24">
        <div className="mx-auto max-w-[1240px] px-0 md:px-8">
          <div className="mb-14 flex flex-col items-start gap-4 px-6 md:flex-row md:items-end md:justify-between md:px-0">
            <h2 className="font-serif text-5xl font-bold md:text-6xl">House favourites.</h2>
            <button
              onClick={() => navigate('/shop')}
              className="liquid-btn whitespace-nowrap rounded-full px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] md:px-8 md:text-xs md:tracking-[0.25em]"
            >
              <span>Shop Now</span>
            </button>
          </div>

          <div
            ref={houseFavScrollRef}
            onScroll={handleFavScroll}
            onWheel={handleFavWheel}
            onMouseDown={handleFavMouseDown}
            onMouseMove={handleFavMouseMove}
            onMouseUp={handleFavMouseUp}
            onMouseLeave={handleFavMouseUp}
            className="no-scrollbar touch-pan-x select-none overflow-x-auto pb-2 md:cursor-grab [scrollbar-width:none] [-ms-overflow-style:none]"
          >
            <div className="js-stagger-grid flex w-full snap-x snap-mandatory gap-0 md:mx-auto md:w-max md:gap-12">
            {[
              {
                name: 'House Cappuccino.',
                desc: 'A creamy cappuccino with balanced espresso, silky milk, and a smooth foam cap in every cup.',
                price: '₱190.00',
                img: coffeeCupImg,
                specs: { capacity: '360ml / 12oz', weight: '281g', material: '18-8 stainless steel' }
              },
              {
                name: 'Signature Espresso.',
                desc: 'A bold, concentrated espresso shot with rich body, caramel sweetness, and a clean finish.',
                price: '₱220.00',
                img: coffeeCupImg,
                specs: { capacity: '2 cups + tumbler', weight: '610g', material: 'ceramic + stainless' }
              },
              {
                name: 'Cafe Latte.',
                desc: 'A mellow latte combining espresso and steamed milk for a creamy, comforting cup.',
                price: '₱250.00',
                img: coffeeCupImg,
                specs: { capacity: '220ml mug', weight: '420g', material: 'ceramic + coffee beans' }
              }
            ].map((prod, idx) => (
              <article key={idx} className="js-stagger-item js-fav-card snap-start shrink-0 w-full min-w-full px-6 text-center md:min-w-[390px] md:w-[390px] md:px-0">
                <div className="group relative mx-auto w-full max-w-[360px] md:max-w-[390px]">
                  <div className="mb-6 flex h-[220px] items-center justify-center overflow-hidden rounded-xl bg-transparent">
                    <img
                      src={prod.img}
                      alt={prod.name}
                      className="js-parallax h-full w-full object-contain p-2 transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <h3 className="mx-auto mb-2 max-w-[440px] font-serif text-3xl font-bold leading-tight">{prod.name}</h3>
                  <p className="mx-auto mb-3 max-w-[440px] text-lg leading-relaxed text-[#474747]">{prod.desc}</p>
                  <p className="text-2xl font-bold">{prod.price}</p>

                  <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[#F5F0DF] px-6 pb-7 pt-6 text-[#1f1f1f] opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100">
                    <div className="mb-6 space-y-3 text-sm">
                      <div className="flex justify-between border-y border-black/30 py-3">
                        <span className="font-semibold">Capacity.</span>
                        <span>{prod.specs.capacity}</span>
                      </div>
                      <div className="flex justify-between border-b border-black/30 pb-3">
                        <span className="font-semibold">Weight.</span>
                        <span>{prod.specs.weight}</span>
                      </div>
                      <div className="flex justify-between border-b border-black/30 pb-3">
                        <span className="font-semibold">Material.</span>
                        <span>{prod.specs.material}</span>
                      </div>
                    </div>

                    <h3 className="mb-2 font-serif text-3xl font-bold">{prod.name}</h3>
                    <p className="mx-auto mb-2 max-w-[320px] text-base leading-relaxed">{prod.desc}</p>
                    <p className="mb-6 text-2xl font-bold">{prod.price}</p>

                    <button
                      onClick={() => navigate('/shop')}
                      className="w-full rounded-full bg-black py-3 text-xs font-bold uppercase tracking-[0.22em] text-[#F5F0DF]"
                    >
                      Buy Now
                    </button>
                    <button
                      onClick={() => navigate('/shop')}
                      className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] underline underline-offset-4"
                    >
                      Read More
                    </button>
                  </div>
                </div>
              </article>
            ))}
            </div>
          </div>

          <div className="mt-16 flex justify-center px-6 md:px-0">
            <div className="relative h-[2px] w-[120px] overflow-hidden rounded-full bg-[#9f9b92]">
              <span
                aria-hidden="true"
                className="absolute left-0 top-0 h-[2px] w-[36px] rounded-full bg-[#0C090A] transition-transform duration-150"
                style={{ transform: `translateX(${favProgress * 84}px)` }}
              ></span>
            </div>
          </div>
        </div>
      </section>

      <section className="js-reveal-section relative bg-[#F9F8E5] py-24">
        <div className="mx-auto max-w-[1460px] px-8">
          <div className="mb-14 grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-6xl font-bold leading-[0.95] md:text-7xl">
                Brewed fresh.
                <br />
                Ready when you are.
              </h2>
            </div>
            <div className="pt-2">
              <p className="mb-7 max-w-[760px] text-lg leading-relaxed text-[#3e3e3e]">
                Our house coffee is selected for balance, sweetness, and body so every cup tastes
                consistent from the first order to the last. We roast for daily service and craft
                each batch to pair beautifully with milk or stand strong on its own.
              </p>
              <p className="mb-7 max-w-[760px] text-lg leading-relaxed text-[#3e3e3e]">
                Every drink is prepared with precision for a smooth finish, clean flavor, and a
                cafe experience that feels warm, fast, and reliable.
              </p>
              <button
                onClick={() => navigate('/shop')}
                className="liquid-btn rounded-full px-8 py-3 text-xs font-bold uppercase tracking-[0.25em]"
              >
                <span>Buy Now</span>
              </button>
            </div>
          </div>

          <div className="h-2"></div>
        </div>
      </section>

      <section className="js-story-section relative overflow-hidden py-4">
        <div className="relative h-[710px] w-full overflow-hidden">
          <img
            src="https://images.pexels.com/photos/12008029/pexels-photo-12008029.jpeg?auto=format&fit=crop&q=80&w=1800"
            className="h-full w-full object-cover"
            alt="ChateauRoast exterior"
          />
          <div className="absolute inset-0 bg-black/28"></div>
          <div className="absolute inset-0 mx-auto flex max-w-[1280px] items-center justify-center px-8">
            <p className="max-w-[1220px] text-center font-serif text-5xl font-semibold leading-[1.08] md:text-6xl">
              <span className="js-story-line text-[#f8f5ea]/90">ChateauRoast is a slow take on instant </span>
              <span className="js-story-line text-[#f8f5ea]/40">gratification. Thoughtful pours, rare </span>
              <span className="js-story-line text-[#f8f5ea]/40">flavour profiles and paraphernalia for </span>
              <span className="js-story-line text-[#f8f5ea]/40">your daily cup.</span>
            </p>
          </div>
        </div>
      </section>

      <section className="js-reveal-section bg-[#F9F8E5] py-14 md:py-20">
        <div className="js-journal-grid mx-auto max-w-[900px] px-4 md:hidden">
          <h2 className="mb-5 font-serif text-[50px] font-bold leading-[0.95] text-[#0C090A] md:text-6xl">The journal.</h2>
          <p className="mb-6 max-w-[760px] text-[17px] leading-[1.45] text-[#313131] md:text-[24px]">
            ChateauRoast started as a small neighborhood coffee bar built around careful sourcing,
            precise brewing, and warm service. What began as one humble counter has grown into a
            daily ritual for guests who value quality in every cup.
          </p>
          <button className="liquid-btn mb-9 rounded-full border border-black/55 px-9 py-3 text-xs font-bold uppercase tracking-[0.25em] text-black/75">
            <span>Explore Journal</span>
          </button>

          <article className="js-journal-card mb-7">
            <div className="relative overflow-hidden rounded-[26px]">
              <img
                src="https://images.pexels.com/photos/8936985/pexels-photo-8936985.jpeg?auto=format&fit=crop&q=80&w=1300"
                alt="ChateauRoast festival collaboration"
                className="h-[520px] w-full object-cover md:h-[620px]"
              />
              <div className="absolute inset-0 bg-black/16"></div>
              <h3 className="absolute inset-x-0 bottom-8 px-6 text-center font-serif text-[38px] font-semibold leading-none text-[#f4ecde] md:text-5xl">
                ChateauRoast x Kape Isla.
              </h3>
            </div>
            <hr className="my-3 border-black/35" />
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <p className="font-serif text-[28px] font-bold leading-none md:text-[38px]">Spotlight.</p>
              <p className="text-[18px] leading-[1.34] text-[#2f2f2f] md:text-[35px]">
                A local guest roaster meets our house profile in one limited collaboration crafted
                for the season in the Philippines...
              </p>
            </div>
          </article>

          <article className="js-journal-card mb-7">
            <div className="overflow-hidden rounded-[26px]">
              <img
                src="https://images.pexels.com/photos/32488208/pexels-photo-32488208.jpeg?auto=format&fit=crop&q=80&w=1200"
                alt="Introducing matcha drinks"
                className="h-[520px] w-full object-cover md:h-[620px]"
              />
            </div>
            <hr className="my-3 border-black/35" />
            <p className="mb-6 font-serif text-[28px] font-bold leading-none md:text-[38px]">Spotlight.</p>
            <hr className="mb-4 border-black/20" />
            <h4 className="mb-3 font-serif text-[30px] font-bold leading-none md:text-[41px]">Introducing: matcha.</h4>
            <p className="mb-3 text-[18px] leading-[1.34] text-[#2f2f2f] md:text-[35px]">
              Three drinks. Two matchas. No shortcuts. At ChateauRoast, every ingredient we serve
              is carefully chosen for balance, texture, and clean flavor...
            </p>
            <button className="font-serif text-[20px] font-bold md:text-[28px]">Read more.</button>
          </article>

          <article className="js-journal-card">
            <div className="overflow-hidden rounded-[26px]">
              <img
                src="https://images.pexels.com/photos/6932291/pexels-photo-6932291.jpeg?auto=format&fit=crop&q=80&w=1200"
                alt="Origin Philippines coffee farms"
                className="h-[520px] w-full object-cover md:h-[620px]"
              />
            </div>
            <hr className="my-3 border-black/35" />
            <p className="mb-6 font-serif text-[28px] font-bold leading-none md:text-[38px]">Spotlight.</p>
            <hr className="mb-4 border-black/20" />
            <h4 className="mb-3 font-serif text-[30px] font-bold leading-none md:text-[41px]">Origin: Philippines.</h4>
            <p className="mb-3 text-[18px] leading-[1.34] text-[#2f2f2f] md:text-[35px]">
              Think of world-class coffee and the Philippines belongs in that conversation. Its
              dramatic landscapes and diverse microclimates produce remarkable cups...
            </p>
            <button className="font-serif text-[20px] font-bold md:text-[28px]">Read more.</button>
          </article>
        </div>

        <div className="js-journal-grid mx-auto hidden max-w-[1460px] grid-cols-1 gap-8 px-8 lg:grid lg:grid-cols-[1.35fr_0.65fr_0.65fr]">
          <div className="js-journal-card">
            <h2 className="mb-8 font-serif text-5xl font-bold leading-none md:text-6xl">The journal.</h2>
            <article className="overflow-hidden rounded-3xl">
              <div className="relative">
                <img
                  src="https://images.pexels.com/photos/8936985/pexels-photo-8936985.jpeg?auto=format&fit=crop&q=80&w=1300"
                  alt="ChateauRoast festival collaboration"
                  className="h-[840px] w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/18"></div>
                <div className="absolute inset-0 flex items-center justify-center px-12 text-center">
                  <h3 className="font-serif text-4xl font-semibold leading-tight text-[#f4ecde] md:text-5xl">
                    ChateauRoast x
                    <br />
                    Kape Isla.
                  </h3>
                </div>
              </div>
            </article>
          </div>

          <div className="js-journal-card space-y-6 pt-16">
            <p className="text-base leading-relaxed text-[#323232]">
              ChateauRoast started as a small neighborhood coffee bar built around careful
              sourcing, precise brewing, and warm service. What began as one humble counter has
              grown into a daily ritual for guests who value quality in every cup.
            </p>
            <button className="liquid-btn rounded-full border border-black/55 px-8 py-3 text-xs font-bold uppercase tracking-[0.25em] text-black/75">
              <span>Explore Journal</span>
            </button>

            <div className="pt-4">
              <hr className="mb-3 border-black/35" />
              <p className="font-serif text-2xl font-bold">Spotlight.</p>
            </div>

            <div className="pt-24">
              <hr className="mb-3 border-black/20" />
              <h4 className="mb-3 font-serif text-2xl font-bold">Introducing: matcha.</h4>
              <p className="mb-3 text-base leading-relaxed text-[#3e3e3e]">
                Three drinks. Two matchas. No shortcuts. At ChateauRoast, every ingredient we
                serve is carefully chosen for balance, texture, and clean flavor...
              </p>
              <button className="font-serif text-xl font-bold">Read more.</button>
            </div>
          </div>

          <div className="js-journal-card space-y-8 pt-16">
            <article>
              <div className="overflow-hidden rounded-3xl">
                <img
                  src="https://images.pexels.com/photos/32488208/pexels-photo-32488208.jpeg?auto=format&fit=crop&q=80&w=900"
                  alt="Introducing matcha drinks"
                  className="h-[420px] w-full object-cover"
                />
              </div>
              <hr className="my-4 border-black/35" />
              <p className="font-serif text-2xl font-bold">Spotlight: Matcha Bar.</p>
            </article>

            <article>
              <div className="overflow-hidden rounded-3xl">
                <img
                  src="https://images.pexels.com/photos/6932291/pexels-photo-6932291.jpeg?auto=format&fit=crop&q=80&w=900"
                  alt="Origin Philippines coffee farms"
                  className="h-[340px] w-full object-cover"
                />
              </div>
              <hr className="my-4 border-black/20" />
              <h4 className="mb-3 font-serif text-2xl font-bold">Origin: Philippines.</h4>
              <p className="mb-3 text-base leading-relaxed text-[#3e3e3e]">
                Think of world-class coffee and the Philippines belongs in that conversation. Its
                dramatic landscapes and diverse microclimates produce remarkable cups...
              </p>
              <button className="font-serif text-xl font-bold">Read more.</button>
            </article>
          </div>
        </div>
      </section>

      <footer className="js-reveal-section pt-6">
        <div className="w-full rounded-t-2xl bg-black px-5 py-10 text-[#F5F0DF] md:px-16 md:py-16">
          <div className="js-footer-grid md:hidden">
            <h2 className="js-footer-item mb-6 font-serif text-[58px] font-semibold leading-[0.94]">
              Proudly serving handcrafted coffee and matcha for your daily cafe ritual.
            </h2>
            <h3 className="js-footer-item mb-2 font-serif text-[42px] font-semibold leading-[0.95]">Stay in the loop.</h3>
            <p className="js-footer-item mb-5 text-[15px] leading-relaxed text-[#d6d2c9]">
              Get menu drops, branch updates, and exclusive offers from ChateauRoast.
            </p>
            <div className="js-footer-item relative mb-8">
              <input
                type="email"
                placeholder="Enter your email address."
                className="w-full rounded-full border border-[#8f8b82] bg-[#1f1f1f] px-5 py-3 text-[15px] text-white placeholder:text-[#c0bdb6] focus:outline-none"
              />
              <button
                aria-label="Submit email"
                onClick={() => navigate('/subscribe')}
                className="absolute right-1.5 top-1.5 rounded-full bg-[#F5F0DF] p-2 text-black"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="js-footer-item border-t border-[#7c786f]">
                {[
                  { label: 'Menu.', to: '/shop' },
                  { label: 'Branches.', to: '/locations' }
                ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.to)}
                  className="flex w-full items-center justify-between border-b border-[#2f2f2f] py-5 text-left"
                >
                  <span className="text-[30px] font-semibold leading-none">{item.label}</span>
                  <ChevronDown size={20} className="text-[#c8c4bb]" />
                </button>
              ))}
            </div>

            <div className="js-footer-item flex items-center gap-6 border-t border-[#2f2f2f] pt-6 text-[#F5F0DF]">
              <button aria-label="Facebook" onClick={() => navigate('/locations')}><Facebook size={20} /></button>
              <button aria-label="Instagram" onClick={() => navigate('/locations')}><Instagram size={20} /></button>
              <button aria-label="LinkedIn" onClick={() => navigate('/locations')}><Linkedin size={20} /></button>
            </div>
          </div>

          <div className="js-footer-grid hidden grid-cols-1 gap-16 md:grid md:grid-cols-2">
            <h2 className="js-footer-item max-w-[860px] font-serif text-5xl font-semibold leading-[1.05] md:text-6xl">
              Proudly serving handcrafted coffee and matcha for your daily cafe ritual.
            </h2>
            <div className="js-footer-item max-w-[620px]">
              <h3 className="mb-3 font-serif text-3xl font-semibold">Stay in the loop.</h3>
              <p className="mb-6 text-base leading-relaxed text-[#d6d2c9]">
                Get menu drops, branch updates, and exclusive offers from ChateauRoast.
              </p>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Enter your email address."
                    className="w-full rounded-full border border-[#8f8b82] bg-[#1f1f1f] px-7 py-4 text-base text-white placeholder:text-[#c0bdb6] focus:outline-none"
                  />
                <button onClick={() => navigate('/subscribe')} className="absolute right-2 top-2 rounded-full bg-[#F5F0DF] p-2 text-black">
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>

          <hr className="my-14 hidden border-[#7c786f] md:block" />

          <div className="js-footer-grid hidden grid-cols-1 gap-14 md:grid md:grid-cols-2">
            <div className="js-footer-item space-y-5 text-xs uppercase tracking-[0.22em] text-[#b7b3aa]">
              <p className="text-base font-semibold text-[#F5F0DF]">Menu.</p>
              <button onClick={() => navigate('/shop?q=espresso')} className="block hover:text-[#F5F0DF]">Espresso.</button>
              <button onClick={() => navigate('/shop?q=matcha')} className="block hover:text-[#F5F0DF]">Matcha.</button>
              <button onClick={() => navigate('/shop?q=pastry')} className="block hover:text-[#F5F0DF]">Pastries.</button>
            </div>
            <div className="js-footer-item space-y-5 text-xs uppercase tracking-[0.22em] text-[#b7b3aa]">
              <p className="text-base font-semibold text-[#F5F0DF]">Branches.</p>
              <button onClick={() => navigate('/locations')} className="block hover:text-[#F5F0DF]">Visit us.</button>
              <button onClick={() => navigate('/locations')} className="block hover:text-[#F5F0DF]">Store map.</button>
            </div>
          </div>

          <div className="js-footer-grid mt-14 hidden flex-wrap items-center justify-between gap-8 text-xs uppercase tracking-[0.2em] text-[#b7b3aa] md:flex">
            <div className="js-footer-item flex items-center gap-8 text-[#F5F0DF]">
              <button aria-label="Facebook" onClick={() => navigate('/locations')} className="hover:opacity-70">
                <Facebook size={26} />
              </button>
              <button aria-label="Instagram" onClick={() => navigate('/locations')} className="hover:opacity-70">
                <Instagram size={26} />
              </button>
              <button aria-label="LinkedIn" onClick={() => navigate('/locations')} className="hover:opacity-70">
                <Linkedin size={26} />
              </button>
            </div>
            <button className="js-footer-item rounded-full border border-[#8f8b82] px-6 py-3 text-base normal-case tracking-normal text-[#F5F0DF]">
              PH - PHP (₱)
            </button>
            <div className="js-footer-item flex items-center gap-8">
              <span>2026</span>
              <button onClick={() => navigate('/shop')} className="hover:text-[#F5F0DF]">Shop</button>
              <button onClick={() => navigate('/locations')} className="hover:text-[#F5F0DF]">Locations</button>
              <button onClick={() => navigate('/login')} className="hover:text-[#F5F0DF]">Login</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
