import React, { useEffect, useRef, useState } from 'react';
import { Menu, Search, User, ShoppingBag, ArrowRight, ChevronDown, Facebook, Instagram, Linkedin, X, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const loginTimeoutRef = useRef(null);
  const { login } = useAuth();
  const { sendMessage, isReady, subscribe } = useWebSocket();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (!message) return;
      if (message.type === 'LOGIN_SUCCESS') {
        if (loginTimeoutRef.current) {
          clearTimeout(loginTimeoutRef.current);
          loginTimeoutRef.current = null;
        }
        const payload = message.payload || {};
        login(payload.username || username, payload.role || 'cashier');
        setIsLoggingIn(false);
        setLoginError('');
      } else if (message.type === 'LOGIN_FAILED') {
        if (loginTimeoutRef.current) {
          clearTimeout(loginTimeoutRef.current);
          loginTimeoutRef.current = null;
        }
        setLoginError(message.payload?.message || 'Invalid credentials.');
        setIsLoggingIn(false);
      } else if (message.type === 'SERVER_ERROR' && isLoggingIn) {
        if (loginTimeoutRef.current) {
          clearTimeout(loginTimeoutRef.current);
          loginTimeoutRef.current = null;
        }
        setLoginError(message.payload?.message || 'Login failed.');
        setIsLoggingIn(false);
      }
    });
    return unsubscribe;
  }, [subscribe, login, username, isLoggingIn]);

  useEffect(() => {
    if (!isLoggingIn) return;
    if (isReady) return;
    if (loginTimeoutRef.current) {
      clearTimeout(loginTimeoutRef.current);
      loginTimeoutRef.current = null;
    }
    setIsLoggingIn(false);
    setLoginError('Server disconnected. Please try again.');
  }, [isReady, isLoggingIn]);

  useEffect(() => {
    if (!isReady) return;
    setLoginError((prev) => {
      if (!prev) return prev;
      const text = prev.toLowerCase();
      if (text.includes('server is not connected') || text.includes('server disconnected')) {
        return '';
      }
      return prev;
    });
  }, [isReady]);

  useEffect(() => {
    return () => {
      if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    if (!isReady) {
      setLoginError('Server is not connected. Please try again.');
      return;
    }
    if (!username.trim() || !password.trim()) {
      setLoginError('Username and password are required.');
      return;
    }
    setIsLoggingIn(true);
    if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);
    loginTimeoutRef.current = setTimeout(() => {
      setIsLoggingIn(false);
      setLoginError('Login request timed out. Please try again.');
      loginTimeoutRef.current = null;
    }, 10000);
    const sent = sendMessage('AUTH_LOGIN', {
      username: username.trim(),
      password
    });
    if (!sent) {
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
      setIsLoggingIn(false);
      setLoginError('Server is not connected. Please try again.');
    }
  };

  const openSearch = () => {
    setIsMobileMenuOpen(false);
    setIsCartOpen(false);
    setIsSearchOpen(true);
  };

  const closeSearch = () => setIsSearchOpen(false);

  const submitSearch = (e) => {
    e.preventDefault();
    const nextQuery = searchQuery.trim();
    setIsSearchOpen(false);
    navigate(nextQuery ? `/shop?q=${encodeURIComponent(nextQuery)}` : '/shop');
  };

  return (
    <div className="min-h-screen bg-[#F9F8E5] text-[#0C090A]">
      <header className="fixed left-0 right-0 top-0 z-40">
        <div className="w-full rounded-none bg-[#F9F8E5] text-[#0C090A] md:mx-auto md:mt-4 md:max-w-[1200px] md:rounded-full">
          <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10">
            <div className="hidden h-[82px] grid-cols-[1fr_auto_1fr] items-center pb-2 lg:grid">
              <div className="hidden items-center gap-8 text-sm font-semibold lg:flex">
                <button onClick={() => navigate('/shop')} className="hover:opacity-70">Shop.</button>
                <button onClick={() => navigate('/locations')} className="hover:opacity-70">Visit us.</button>
                <button onClick={() => navigate('/locations')} className="hover:opacity-70">Info.</button>
              </div>
              <button
                onClick={() => navigate('/')}
                aria-label="Go to home"
                className="justify-self-center font-serif text-5xl font-semibold tracking-tight md:text-6xl"
              >
                ChateauRoast.
              </button>
              <div className="hidden items-center justify-end gap-4 md:gap-6 lg:flex">
                <button aria-label="User"><User size={22} strokeWidth={2.2} /></button>
                <button aria-label="Search" onClick={openSearch}><Search size={22} strokeWidth={2.2} /></button>
                <button aria-label="Cart" onClick={() => navigate('/shop')}><ShoppingBag size={22} strokeWidth={2.2} /></button>
              </div>
            </div>
            <div className="relative flex h-[74px] items-center justify-between pb-1 lg:hidden">
              <div className="flex items-center gap-3">
                <button aria-label="Open menu" onClick={() => setIsMobileMenuOpen(true)} className="hover:opacity-70">
                  <Menu size={21} strokeWidth={2.3} />
                </button>
                <button aria-label="Search" onClick={openSearch} className="hover:opacity-70">
                  <Search size={21} strokeWidth={2.3} />
                </button>
              </div>

              <div className="pointer-events-none absolute left-[52px] right-[52px] top-1/2 -translate-y-1/2">
                <button
                  onClick={() => navigate('/')}
                  aria-label="Go to home"
                  className="pointer-events-auto block w-full text-center font-serif text-[clamp(1.8rem,8.4vw,2.5rem)] font-semibold leading-none tracking-tight"
                >
                  ChateauRoast.
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button aria-label="User"><User size={21} strokeWidth={2.3} /></button>
                <button aria-label="Cart" onClick={() => setIsCartOpen(true)} className="hover:opacity-70">
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
                onClick={() => setIsCartOpen(false)}
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
                  setIsCartOpen(false);
                }}
                className="w-full rounded-full border border-[#0C090A]/40 py-4 text-[12px] font-bold uppercase tracking-[0.22em] text-[#5b5751]"
              >
                Shop Now
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="px-4 pb-0 pt-28 md:pt-32">
        <section className="mx-auto max-w-[760px]">
          <h2 className="mb-10 text-center font-serif text-3xl font-bold">Login</h2>

          <form onSubmit={handleLogin}>
            <label className="block text-lg font-semibold">Enter Username</label>
            <input
              className="mb-8 mt-2 w-full border-b border-[#0C090A]/60 bg-transparent pb-3 text-lg focus:outline-none"
              placeholder=""
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label className="block text-lg font-semibold">Enter password</label>
            <input
              type="password"
              className="mb-8 mt-2 w-full border-b border-[#0C090A]/60 bg-transparent pb-3 text-lg focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              disabled={isLoggingIn || !isReady}
              className="mb-10 w-full rounded-full bg-black py-3 text-sm font-bold uppercase tracking-[0.24em] text-[#F9F8E5] disabled:opacity-50"
            >
              {isLoggingIn ? 'Signing In...' : !isReady ? 'Connecting Server...' : 'Login'}
            </button>
            {loginError ? (
              <p className="mb-6 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{loginError}</p>
            ) : null}
          </form>
        </section>

        <footer className="-mx-4 pt-6">
          <div className="w-full rounded-t-2xl bg-black px-5 py-10 text-[#F5F0DF] md:px-16 md:py-16">
            <div className="md:hidden">
              <h2 className="mb-6 font-serif text-[58px] font-semibold leading-[0.94]">
                Proudly serving handcrafted coffee and matcha for your daily cafe ritual.
              </h2>
              <h3 className="mb-2 font-serif text-[42px] font-semibold leading-[0.95]">Stay in the loop.</h3>
              <p className="mb-5 text-[15px] leading-relaxed text-[#d6d2c9]">
                Get menu drops, branch updates, and exclusive offers from ChateauRoast.
              </p>
              <div className="relative mb-8">
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

              <div className="border-t border-[#7c786f]">
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

              <div className="flex items-center gap-6 border-t border-[#2f2f2f] pt-6 text-[#F5F0DF]">
                <button aria-label="Facebook" onClick={() => navigate('/locations')}><Facebook size={20} /></button>
                <button aria-label="Instagram" onClick={() => navigate('/locations')}><Instagram size={20} /></button>
                <button aria-label="LinkedIn" onClick={() => navigate('/locations')}><Linkedin size={20} /></button>
              </div>
            </div>

            <div className="hidden grid-cols-1 gap-16 md:grid md:grid-cols-2">
              <h2 className="max-w-[860px] font-serif text-5xl font-semibold leading-[1.05] md:text-6xl">
                Proudly serving handcrafted coffee and matcha for your daily cafe ritual.
              </h2>
              <div className="max-w-[620px]">
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

            <div className="hidden grid-cols-1 gap-14 md:grid md:grid-cols-2">
              <div className="space-y-5 text-xs uppercase tracking-[0.22em] text-[#b7b3aa]">
                <p className="text-base font-semibold text-[#F5F0DF]">Menu.</p>
                <button onClick={() => navigate('/shop?q=espresso')} className="block hover:text-[#F5F0DF]">Espresso.</button>
                <button onClick={() => navigate('/shop?q=matcha')} className="block hover:text-[#F5F0DF]">Matcha.</button>
                <button onClick={() => navigate('/shop?q=pastry')} className="block hover:text-[#F5F0DF]">Pastries.</button>
              </div>
              <div className="space-y-5 text-xs uppercase tracking-[0.22em] text-[#b7b3aa]">
                <p className="text-base font-semibold text-[#F5F0DF]">Branches.</p>
                <button onClick={() => navigate('/locations')} className="block hover:text-[#F5F0DF]">Visit us.</button>
                <button onClick={() => navigate('/locations')} className="block hover:text-[#F5F0DF]">Store map.</button>
              </div>
            </div>

            <div className="mt-14 hidden flex-wrap items-center justify-between gap-8 text-xs uppercase tracking-[0.2em] text-[#b7b3aa] md:flex">
              <div className="flex items-center gap-8 text-[#F5F0DF]">
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
              <button className="rounded-full border border-[#8f8b82] px-6 py-3 text-base normal-case tracking-normal text-[#F5F0DF]">
                PH - PHP (₱)
              </button>
              <div className="flex items-center gap-8">
                  <span>2026</span>
                  <button onClick={() => navigate('/shop')} className="hover:text-[#F5F0DF]">Shop</button>
                  <button onClick={() => navigate('/locations')} className="hover:text-[#F5F0DF]">Locations</button>
                  <button onClick={() => navigate('/login')} className="hover:text-[#F5F0DF]">Login</button>
                </div>
              </div>
            </div>
        </footer>
      </main>
    </div>
  );
};

export default Login;
