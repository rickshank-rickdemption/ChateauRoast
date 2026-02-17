import React, { useEffect, useMemo, useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import RoleSidebar from '../components/RoleSidebar';
import { FileText, Coffee, Users, Leaf, Clock3, CheckCircle2, AlertTriangle, House, Plus, Sparkles, Search, Download, Filter } from 'lucide-react';

const ROLES = ['admin', 'kitchen'];
const todayDate = new Date().toISOString().slice(0, 10);
const MAX_LOCAL_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1080;
const TARGET_IMAGE_BYTES = 350 * 1024;
const TARGET_ALPHA_IMAGE_BYTES = 700 * 1024;
const MATCHA_KEYWORDS = ['matcha', 'green tea', 'uji', 'ceremonial'];
const COFFEE_KEYWORDS = ['coffee', 'espresso', 'latte', 'cappuccino', 'americano', 'mocha', 'brew', 'macchiato', 'affogato'];
const PASTRY_KEYWORDS = ['cookie', 'croissant', 'bagel', 'donut', 'timbit', 'smores', 'pop tart', 'siopao', 'pastry'];
const MENU_ITEMS_PER_PAGE = 9;
const formatPHP = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));
const PRODUCT_MUTATION_TIMEOUT_MS = 12000;

const toText = (value) => String(value ?? '').trim();
const toNum = (value) => Number(value ?? 0);
const toInt = (value) => parseInt(String(value ?? '0'), 10) || 0;

const doesProductMatchPatch = (product, patch) => {
  if (!product || !patch) return false;
  return (
    toText(product.name) === toText(patch.name) &&
    toNum(product.price) === toNum(patch.price) &&
    toText(product.category) === toText(patch.category) &&
    toText(product.product_type) === toText(patch.product_type) &&
    toText(product.capacity) === toText(patch.capacity) &&
    toText(product.weight_label) === toText(patch.weight_label) &&
    toText(product.material) === toText(patch.material) &&
    toText(product.description) === toText(patch.description) &&
    toText(product.image_url) === toText(patch.image_url) &&
    toInt(product.stock_quantity) === toInt(patch.stock_quantity)
  );
};

const getOrderStatusBadgeClass = (statusValue) => {
  const status = String(statusValue || '').toLowerCase();
  if (status === 'pending') return 'bg-amber-100 text-amber-800';
  if (status === 'preparing') return 'bg-indigo-100 text-indigo-800';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'cancelled') return 'bg-rose-100 text-rose-800';
  return 'bg-black/10 text-black/70';
};

function classifyDrinkType(name, category = '', productType = '') {
  const explicit = String(productType || '').toLowerCase().trim();
  if (explicit === 'coffee' || explicit === 'matcha' || explicit === 'pastry' || explicit === 'other') return explicit;
  const haystack = `${String(name || '').toLowerCase()} ${String(category || '').toLowerCase()}`;
  if (MATCHA_KEYWORDS.some((keyword) => haystack.includes(keyword))) return 'matcha';
  if (COFFEE_KEYWORDS.some((keyword) => haystack.includes(keyword))) return 'coffee';
  if (PASTRY_KEYWORDS.some((keyword) => haystack.includes(keyword))) return 'pastry';
  return 'other';
}

function normalizeProductType(product = {}) {
  const explicit = String(product.product_type || '').toLowerCase().trim();
  if (explicit === 'coffee' || explicit === 'matcha' || explicit === 'pastry' || explicit === 'other') return explicit;
  return classifyDrinkType(product.name, product.category, explicit);
}

function renderCategoryFallbackIcon(product) {
  const type = normalizeProductType(product);

  if (type === 'coffee') {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-900/20 bg-amber-50 text-amber-900/80">
        <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" aria-hidden="true">
          <path d="M15 20h14v9a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-9Z" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M29 22h2.5a3.5 3.5 0 1 1 0 7H29" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M19 15c0-1.3 1-2.3 2.3-2.3M24 15c0-1.3 1-2.3 2.3-2.3" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (type === 'matcha') {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-900/20 bg-emerald-50 text-emerald-900/80">
        <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" aria-hidden="true">
          <path d="M24 33c7.2 0 13-5.8 13-13-7.2 0-13 5.8-13 13Z" stroke="currentColor" strokeWidth="2.6" />
          <path d="M24 33c-7.2 0-13-5.8-13-13 7.2 0 13 5.8 13 13Z" stroke="currentColor" strokeWidth="2.6" />
          <path d="M24 19v15" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (type === 'pastry') {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-rose-900/20 bg-rose-50 text-rose-900/80">
        <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" aria-hidden="true">
          <path d="M11 29a13 13 0 0 1 26 0c0 4.6-2.5 7-6.2 7H17.2C13.5 36 11 33.6 11 29Z" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M17 26h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-900/20 bg-slate-50 text-slate-900/80">
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" aria-hidden="true">
        <rect x="12" y="12" width="24" height="24" rx="7" stroke="currentColor" strokeWidth="2.6" />
        <path d="M24 18v12M18 24h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

const estimateDataUrlBytes = (dataUrl) => {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
};

export default function AdminDashboard() {
  const { isReady, lastMessage, sendMessage } = useWebSocket();
  const { logout, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('kitchen');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productType, setProductType] = useState('coffee');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productCapacity, setProductCapacity] = useState('');
  const [productWeightLabel, setProductWeightLabel] = useState('');
  const [productMaterial, setProductMaterial] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [reportFromDate, setReportFromDate] = useState(todayDate);
  const [reportToDate, setReportToDate] = useState(todayDate);
  const [reportSearch, setReportSearch] = useState('');
  const [reportFilter, setReportFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [menuSearch, setMenuSearch] = useState('');
  const [menuTypeFilter, setMenuTypeFilter] = useState('all');
  const [menuPage, setMenuPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [salesSummary, setSalesSummary] = useState({
    today_orders: 0,
    today_revenue: 0,
    today_sales: 0,
    completed_today_revenue: 0,
    pending_count: 0,
    preparing_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    recent_orders: []
  });
  const [error, setError] = useState('');
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [reportLoaded, setReportLoaded] = useState(false);
  const [pendingProductUpdates, setPendingProductUpdates] = useState({});
  const [pendingProductDeletes, setPendingProductDeletes] = useState({});
  const [localProductEdits, setLocalProductEdits] = useState({});
  const [pendingQuickDownload, setPendingQuickDownload] = useState(null);
  const [quickGenerateLoading, setQuickGenerateLoading] = useState('');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isManageItemModalOpen, setIsManageItemModalOpen] = useState(false);
  const [userPasswordDrafts, setUserPasswordDrafts] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewSearch, setOverviewSearch] = useState('');
  const [reportData, setReportData] = useState({
    from_date: todayDate,
    to_date: todayDate,
    summary: {
      total_orders: 0,
      total_sales: 0,
      completed_revenue: 0,
      pending_count: 0,
      preparing_count: 0,
      completed_count: 0,
      cancelled_count: 0
    },
    orders: [],
    top_products: [],
    inventory: []
  });

  const productByName = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      map.set(String(product.name || '').trim().toLowerCase(), product);
    });
    return map;
  }, [products]);

  const overviewStats = useMemo(() => {
    const split = {
      coffee: { qty: 0, revenue: 0 },
      matcha: { qty: 0, revenue: 0 },
      pastry: { qty: 0, revenue: 0 },
      other: { qty: 0, revenue: 0 }
    };

    (reportData.top_products || []).forEach((item) => {
      const name = String(item.product_name || '').trim();
      const matched = productByName.get(name.toLowerCase());
      const type = classifyDrinkType(name, matched?.category, matched?.product_type);
      split[type].qty += Number(item.qty_sold || 0);
      split[type].revenue += Number(item.sales_amount || 0);
    });

    const inventory = {
      coffee: { total: 0, lowStock: 0 },
      matcha: { total: 0, lowStock: 0 }
    };

    products.forEach((product) => {
      const type = classifyDrinkType(product.name, product.category, product.product_type);
      if (type !== 'coffee' && type !== 'matcha') return;
      inventory[type].total += 1;
      if (Number(product.stock_quantity || 0) <= 10) {
        inventory[type].lowStock += 1;
      }
    });

    const pending = Number(salesSummary.pending_count ?? reportData.summary?.pending_count ?? 0);
    const preparing = Number(salesSummary.preparing_count ?? reportData.summary?.preparing_count ?? 0);
    const completed = Number(reportData.summary?.completed_count ?? salesSummary.completed_count ?? 0);
    const activeLeads = pending + preparing;

    return {
      split,
      inventory,
      pending,
      preparing,
      completed,
      activeLeads
    };
  }, [products, reportData, salesSummary, productByName]);

  useEffect(() => {
    if (!isReady) return;
    sendMessage('GET_USERS');
    sendMessage('GET_PRODUCTS');
    sendMessage('GET_SALES_SUMMARY');
    sendMessage('GET_REPORT', { from_date: todayDate, to_date: todayDate });
  }, [isReady, sendMessage]);

  useEffect(() => {
    if (!isReady) return;
    const interval = setInterval(() => {
      sendMessage('GET_SALES_SUMMARY');
      if (activeTab === 'overview' || activeTab === 'report') {
        sendMessage('GET_REPORT', { from_date: reportFromDate, to_date: reportToDate });
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [isReady, activeTab, reportFromDate, reportToDate, sendMessage]);

  useEffect(() => {
    if (isReady) return;
    setUsersLoaded(false);
    setProductsLoaded(false);
    setSummaryLoaded(false);
    setReportLoaded(false);
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    if (usersLoaded && productsLoaded && summaryLoaded && reportLoaded) return;

    const requestMissing = () => {
      if (!usersLoaded) sendMessage('GET_USERS');
      if (!productsLoaded) sendMessage('GET_PRODUCTS');
      if (!summaryLoaded) sendMessage('GET_SALES_SUMMARY');
      if (!reportLoaded) sendMessage('GET_REPORT', { from_date: todayDate, to_date: todayDate });
    };

    requestMissing();
    const interval = setInterval(requestMissing, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 10000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isReady, usersLoaded, productsLoaded, summaryLoaded, reportLoaded, sendMessage]);

  useEffect(() => {
    if (!isReady) return;
    if (activeTab !== 'menu') return;
    sendMessage('GET_PRODUCTS');
  }, [isReady, activeTab, sendMessage]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'USERS_LIST') {
      setUsers(lastMessage.payload || []);
      setUsersLoaded(true);
      setError('');
    }

    if (lastMessage.type === 'PRODUCTS_LIST') {
      const incomingList = lastMessage.payload || [];
      const now = Date.now();

      setProducts((prevProducts) => {
        const prevById = new Map(prevProducts.map((p) => [Number(p.id), p]));

        let next = incomingList
          .filter((product) => !pendingProductDeletes[Number(product.id)])
          .map((product) => {
            const id = Number(product.id);
            const pending = pendingProductUpdates[id];
            const localEdit = localProductEdits[id];
            if (!pending) return localEdit ? { ...product, ...localEdit } : product;
            if (doesProductMatchPatch(product, pending.patch)) {
              return localEdit ? { ...product, ...localEdit } : product;
            }
            const previous = prevById.get(id);
            const optimistic = previous ? { ...product, ...previous } : { ...product, ...pending.patch };
            return localEdit ? { ...optimistic, ...localEdit } : optimistic;
          });

        Object.entries(pendingProductDeletes).forEach(([idText, meta]) => {
          const id = Number(idText);
          if (now - Number(meta?.startedAt || 0) < PRODUCT_MUTATION_TIMEOUT_MS) {
            next = next.filter((p) => Number(p.id) !== id);
          }
        });

        return next;
      });

      setPendingProductUpdates((prev) => {
        const next = { ...prev };
        const byId = new Map(incomingList.map((p) => [Number(p.id), p]));
        Object.entries(next).forEach(([idText, meta]) => {
          const id = Number(idText);
          const product = byId.get(id);
          if (!product) {
            delete next[idText];
            return;
          }
          if (doesProductMatchPatch(product, meta.patch)) {
            delete next[idText];
            return;
          }
          if (now - Number(meta.startedAt || 0) >= PRODUCT_MUTATION_TIMEOUT_MS) {
            delete next[idText];
            setError(`Save timed out for product #${id}. Please try again.`);
          }
        });
        return next;
      });

      setPendingProductDeletes((prev) => {
        const next = { ...prev };
        const ids = new Set(incomingList.map((p) => Number(p.id)));
        Object.entries(next).forEach(([idText, meta]) => {
          const id = Number(idText);
          if (!ids.has(id)) {
            delete next[idText];
            return;
          }
          if (now - Number(meta.startedAt || 0) >= PRODUCT_MUTATION_TIMEOUT_MS) {
            delete next[idText];
            setError(`Delete timed out for product #${id}. Please try again.`);
          }
        });
        return next;
      });

      setProductsLoaded(true);
      setError('');
    }

    if (lastMessage.type === 'SALES_SUMMARY') {
      setSalesSummary(lastMessage.payload || {});
      setSummaryLoaded(true);
      setError('');
    }

    if (lastMessage.type === 'REPORT_DATA') {
      const payload = lastMessage.payload || {};
      setReportData(payload);
      setReportLoaded(true);
      setError('');
      if (
        pendingQuickDownload &&
        String(payload.from_date || '') === String(pendingQuickDownload.from_date || '') &&
        String(payload.to_date || '') === String(pendingQuickDownload.to_date || '')
      ) {
        const actionMap = {
          'sales-summary': downloadSalesSummaryCsv,
          'top-products': downloadTopProductsCsv,
          'order-extract': downloadOrderExtractCsv,
          'inventory-snapshot': downloadInventorySnapshotCsv
        };
        const action = actionMap[pendingQuickDownload.template];
        if (action) {
          action(payload, payload.from_date || reportFromDate, payload.to_date || reportToDate);
        }
        setPendingQuickDownload(null);
        setQuickGenerateLoading('');
      }
    }

    if (lastMessage.type === 'NEW_ORDER' || lastMessage.type === 'STATUS_UPDATED') {
      sendMessage('GET_SALES_SUMMARY');
      sendMessage('GET_REPORT', {
        from_date: reportFromDate,
        to_date: reportToDate
      });
      sendMessage('GET_PRODUCTS');
      setError('');
    }

    if (lastMessage.type === 'SERVER_ERROR') {
      setError(lastMessage.payload?.message || 'Server request failed.');
      setPendingProductUpdates({});
      setPendingProductDeletes({});
      setPendingQuickDownload(null);
      setQuickGenerateLoading('');
    }
  }, [lastMessage, reportFromDate, reportToDate, sendMessage, pendingProductUpdates, pendingProductDeletes, localProductEdits, pendingQuickDownload]);

  const createUser = (e) => {
    e.preventDefault();
    if (!isReady) {
      setError('Server is not connected. Please restart WebSocket server.');
      return;
    }
    const sent = sendMessage('CREATE_USER', { username, password, role, auth_username: user?.username || '' });
    if (!sent) {
      setError('Request failed. WebSocket is not connected.');
      return;
    }
    setUsername('');
    setPassword('');
    setRole('kitchen');
  };

  const updateRole = (id, nextRole) => {
    const sent = sendMessage('UPDATE_USER_ROLE', { id, role: nextRole, auth_username: user?.username || '' });
    if (!sent) setError('Request failed. WebSocket is not connected.');
  };

  const updateUserPassword = (id) => {
    const nextPassword = String(userPasswordDrafts[id] || '').trim();
    if (!nextPassword) {
      setError('Enter a new password first.');
      return;
    }
    if (nextPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    const sent = sendMessage('UPDATE_USER_PASSWORD', { id, password: nextPassword, auth_username: user?.username || '' });
    if (!sent) {
      setError('Request failed. WebSocket is not connected.');
      return;
    }
    setUserPasswordDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setError('');
  };

  const deleteUser = (id) => {
    const sent = sendMessage('DELETE_USER', { id, auth_username: user?.username || '' });
    if (!sent) setError('Request failed. WebSocket is not connected.');
  };

  const createProduct = () => {
    if (!isReady) {
      setError('Server is not connected. Please restart WebSocket server.');
      return;
    }
    const name = String(productName || '').trim();
    const normalizedPriceInput = String(productPrice || '').trim().replace(',', '.');
    const normalizedStockInput = String(productStock || '').trim();
    const price = parseFloat(normalizedPriceInput || '0');
    const stock = normalizedStockInput === '' ? 0 : parseInt(normalizedStockInput, 10);
    if (!name) {
      setError('Product name is required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Enter a valid product price.');
      return;
    }
    if (!Number.isFinite(stock) || Number.isNaN(stock) || stock < 0) {
      setError('Enter a valid stock quantity.');
      return;
    }
    const sent = sendMessage('CREATE_PRODUCT', {
      auth_username: user?.username || '',
      name,
      price,
      category: String(productCategory || '').trim(),
      product_type: productType,
      capacity: String(productCapacity || '').trim(),
      weight_label: String(productWeightLabel || '').trim(),
      material: String(productMaterial || '').trim(),
      description: String(productDescription || '').trim(),
      image_url: String(productImageUrl || '').trim(),
      stock_quantity: Math.floor(stock)
    });
    if (!sent) {
      setError('Request failed. WebSocket is not connected.');
      return;
    }
    setError('');
    sendMessage('GET_PRODUCTS');
    setProductName('');
    setProductPrice('');
    setProductCategory('');
    setProductType('coffee');
    setProductCapacity('');
    setProductWeightLabel('');
    setProductMaterial('');
    setProductDescription('');
    setProductImageUrl('');
    setProductStock('');
    setIsAddItemModalOpen(false);
  };

  const updateProduct = (product) => {
    if (!isReady) {
      setError('Server is not connected. Please restart WebSocket server.');
      return;
    }
    const patch = {
      id: Number(product.id),
      name: product.name,
      price: Number(product.price),
      category: product.category || '',
      product_type: product.product_type || 'other',
      capacity: product.capacity || '',
      weight_label: product.weight_label || '',
      material: product.material || '',
      description: product.description || '',
      image_url: product.image_url || '',
      stock_quantity: Number(product.stock_quantity || 0)
    };
    setPendingProductUpdates((prev) => ({
      ...prev,
      [Number(product.id)]: { patch, startedAt: Date.now() }
    }));
    setLocalProductEdits((prev) => {
      const next = { ...prev };
      delete next[Number(product.id)];
      return next;
    });
    const sent = sendMessage('UPDATE_PRODUCT', {
      auth_username: user?.username || '',
      ...patch
    });
    if (!sent) {
      setError('Request failed. WebSocket is not connected.');
      setPendingProductUpdates((prev) => {
        const next = { ...prev };
        delete next[Number(product.id)];
        return next;
      });
      return;
    }
  };

  const deleteProduct = (id) => {
    if (!isReady) {
      setError('Server is not connected. Please restart WebSocket server.');
      return;
    }
    setPendingProductDeletes((prev) => ({
      ...prev,
      [Number(id)]: { startedAt: Date.now() }
    }));
    setProducts((prev) => prev.filter((p) => Number(p.id) !== Number(id)));
    setLocalProductEdits((prev) => {
      const next = { ...prev };
      delete next[Number(id)];
      return next;
    });
    const sent = sendMessage('DELETE_PRODUCT', { id, auth_username: user?.username || '' });
    if (!sent) {
      setError('Request failed. WebSocket is not connected.');
      setPendingProductDeletes((prev) => {
        const next = { ...prev };
        delete next[Number(id)];
        return next;
      });
      return;
    }
    setSelectedProductId(null);
  };

  const adjustStock = (id, delta) => {
    if (!isReady) {
      setError('Server is not connected. Please restart WebSocket server.');
      return;
    }
    setProducts((prev) =>
      prev.map((item) => {
        if (Number(item.id) !== Number(id)) return item;
        const current = Number(item.stock_quantity || 0);
        return { ...item, stock_quantity: Math.max(0, current + Number(delta || 0)) };
      })
    );
    setLocalProductEdits((prev) => {
      const next = { ...prev };
      const current = Number((next[Number(id)]?.stock_quantity ?? products.find((item) => Number(item.id) === Number(id))?.stock_quantity) || 0);
      next[Number(id)] = { ...(next[Number(id)] || {}), stock_quantity: Math.max(0, current + Number(delta || 0)) };
      return next;
    });
    const sent = sendMessage('ADJUST_STOCK', { id, delta, auth_username: user?.username || '' });
    if (!sent) {
      setError('Request failed. WebSocket is not connected.');
      return;
    }
  };

  const updateProductField = (id, key, value) => {
    let nextValue = value;
    if (key === 'stock_quantity') {
      if (String(value) === '') {
        nextValue = '';
      } else {
        const parsed = parseInt(String(value), 10);
        nextValue = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
      }
    }
    setProducts((prev) =>
      prev.map((item) => (Number(item.id) === Number(id) ? { ...item, [key]: nextValue } : item))
    );
    setLocalProductEdits((prev) => ({
      ...prev,
      [Number(id)]: {
        ...(prev[Number(id)] || {}),
        [key]: nextValue
      }
    }));
  };

  const generateReport = () => {
    sendMessage('GET_REPORT', {
      auth_username: user?.username || '',
      from_date: reportFromDate,
      to_date: reportToDate
    });
  };

  const updateOrderStatus = (id, status) => {
    sendMessage('UPDATE_STATUS', { id, status, auth_username: user?.username || '' });
  };

  const quickGenerateRange = (mode, template = '') => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const startDate = new Date(now);
    if (mode === 'week') startDate.setDate(now.getDate() - 6);
    if (mode === 'month') startDate.setDate(now.getDate() - 29);
    if (mode === 'quarter') startDate.setDate(now.getDate() - 89);
    const start = startDate.toISOString().slice(0, 10);
    setReportFromDate(start);
    setReportToDate(end);
    const sent = sendMessage('GET_REPORT', { from_date: start, to_date: end, auth_username: user?.username || '' });
    if (!sent) {
      setError('Request failed. WebSocket is not connected.');
      return;
    }
    if (template) {
      setPendingQuickDownload({ template, from_date: start, to_date: end });
      setQuickGenerateLoading(template);
    }
  };

  const downloadCsvFile = (filename, lines) => {
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleLocalImageUpload = (file, onValue) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }
    if (file.size > MAX_LOCAL_IMAGE_BYTES) {
      setError('Image is too large. Maximum size is 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result || '');
      if (!source) {
        setError('Failed to read selected image file.');
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSide = Math.max(img.width || 1, img.height || 1);
        const scale = maxSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / maxSide : 1;
        const width = Math.max(1, Math.round((img.width || 1) * scale));
        const height = Math.max(1, Math.round((img.height || 1) * scale));
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Image processing is not supported in this browser.');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const sourceMime = String(file.type || '').toLowerCase();
        const keepAlpha = sourceMime === 'image/png' || sourceMime === 'image/webp';
        const outputMime = keepAlpha ? 'image/webp' : 'image/jpeg';
        const targetBytes = keepAlpha ? TARGET_ALPHA_IMAGE_BYTES : TARGET_IMAGE_BYTES;

        let quality = keepAlpha ? 0.9 : 0.88;
        let output = canvas.toDataURL(outputMime, quality);
        while (estimateDataUrlBytes(output) > targetBytes && quality > 0.35) {
          quality -= 0.08;
          output = canvas.toDataURL(outputMime, quality);
        }

        if (estimateDataUrlBytes(output) > targetBytes) {
          setError('Image is still too large after compression. Use a smaller image.');
          return;
        }

        onValue(output);
        setError('');
      };
      img.onerror = () => setError('Failed to process selected image file.');
      img.src = source;
    };
    reader.onerror = () => setError('Failed to read selected image file.');
    reader.readAsDataURL(file);
  };

  const downloadReportCsv = (data = reportData, fromDate = reportFromDate, toDate = reportToDate) => {
    const lines = [];
    lines.push(`Report From,${data.from_date || fromDate}`);
    lines.push(`Report To,${data.to_date || toDate}`);
    lines.push('');
    lines.push('Summary');
    lines.push(`Total Orders,${data.summary?.total_orders || 0}`);
    lines.push(`Total Sales (Completed),"${formatPHP(data.summary?.total_sales || data.summary?.completed_revenue || 0)}"`);
    lines.push(`Completed Revenue,"${formatPHP(data.summary?.completed_revenue || 0)}"`);
    lines.push(`Pending Count,${data.summary?.pending_count || 0}`);
    lines.push(`Preparing Count,${data.summary?.preparing_count || 0}`);
    lines.push(`Completed Count,${data.summary?.completed_count || 0}`);
    lines.push(`Cancelled Count,${data.summary?.cancelled_count || 0}`);
    lines.push('');
    lines.push('Top Products');
    lines.push('Product,Qty Sold,Sales Amount');
    (data.top_products || []).forEach((item) => {
      lines.push(`${item.product_name},${item.qty_sold},"${formatPHP(item.sales_amount || 0)}"`);
    });
    lines.push('');
    lines.push('Orders');
    lines.push('Order ID,Customer,Subtotal,Total,Status,Created At');
    (data.orders || []).forEach((order) => {
      lines.push(
        `${order.id},${order.customer_name || ''},"${formatPHP(order.subtotal_amount || order.total || 0)}","${formatPHP(order.total || 0)}",${order.status},${order.created_at}`
      );
    });
    lines.push('');
    lines.push('Inventory Snapshot');
    lines.push('Product ID,Product,Category,Type,Stock,Price');
    (data.inventory || []).forEach((item) => {
      lines.push(`${item.id},${item.name},${item.category || ''},${item.product_type || 'other'},${item.stock_quantity},"${formatPHP(item.price || 0)}"`);
    });

    downloadCsvFile(`coffee-report-${fromDate}-to-${toDate}.csv`, lines);
  };

  const downloadSalesSummaryCsv = (data = reportData, fromDate = reportFromDate, toDate = reportToDate) => {
    const lines = [];
    lines.push(`Report From,${data.from_date || fromDate}`);
    lines.push(`Report To,${data.to_date || toDate}`);
    lines.push('');
    lines.push('Summary');
    lines.push(`Total Orders,${data.summary?.total_orders || 0}`);
    lines.push(`Total Sales (Completed),"${formatPHP(data.summary?.total_sales || data.summary?.completed_revenue || 0)}"`);
    lines.push(`Completed Revenue,"${formatPHP(data.summary?.completed_revenue || 0)}"`);
    lines.push(`Pending Count,${data.summary?.pending_count || 0}`);
    lines.push(`Preparing Count,${data.summary?.preparing_count || 0}`);
    lines.push(`Completed Count,${data.summary?.completed_count || 0}`);
    lines.push(`Cancelled Count,${data.summary?.cancelled_count || 0}`);
    downloadCsvFile(`sales-summary-${fromDate}-to-${toDate}.csv`, lines);
  };

  const downloadTopProductsCsv = (data = reportData, fromDate = reportFromDate, toDate = reportToDate) => {
    const lines = [];
    lines.push(`Report From,${data.from_date || fromDate}`);
    lines.push(`Report To,${data.to_date || toDate}`);
    lines.push('');
    lines.push('Top Products');
    lines.push('Product,Qty Sold,Sales Amount');
    (data.top_products || []).forEach((item) => {
      lines.push(`${item.product_name},${item.qty_sold},"${formatPHP(item.sales_amount || 0)}"`);
    });
    downloadCsvFile(`top-products-${fromDate}-to-${toDate}.csv`, lines);
  };

  const downloadOrderExtractCsv = (data = reportData, fromDate = reportFromDate, toDate = reportToDate) => {
    const lines = [];
    lines.push(`Report From,${data.from_date || fromDate}`);
    lines.push(`Report To,${data.to_date || toDate}`);
    lines.push('');
    lines.push('Orders');
    lines.push('Order ID,Customer,Subtotal,Total,Status,Created At');
    (data.orders || []).forEach((order) => {
      lines.push(
        `${order.id},${order.customer_name || ''},"${formatPHP(order.subtotal_amount || order.total || 0)}","${formatPHP(order.total || 0)}",${order.status},${order.created_at}`
      );
    });
    downloadCsvFile(`orders-${fromDate}-to-${toDate}.csv`, lines);
  };

  const downloadInventorySnapshotCsv = (data = reportData, _fromDate = reportFromDate, toDate = reportToDate) => {
    const lines = [];
    lines.push('Inventory Snapshot');
    lines.push('Product ID,Product,Category,Type,Stock,Price');
    (data.inventory || []).forEach((item) => {
      lines.push(`${item.id},${item.name},${item.category || ''},${item.product_type || 'other'},${item.stock_quantity},"${formatPHP(item.price || 0)}"`);
    });
    downloadCsvFile(`inventory-snapshot-${toDate}.csv`, lines);
  };

  const coffeeRevenue = overviewStats.split.coffee.revenue;
  const matchaRevenue = overviewStats.split.matcha.revenue;
  const pastryRevenue = overviewStats.split.pastry.revenue;
  const combinedRevenue = coffeeRevenue + matchaRevenue + pastryRevenue;
  const lowStockTotal = overviewStats.inventory.coffee.lowStock + overviewStats.inventory.matcha.lowStock;
  const topProduct = reportData.top_products?.[0] || null;

  const generatedReports = useMemo(() => {
    const rangeLabel = `${reportData.from_date || reportFromDate} to ${reportData.to_date || reportToDate}`;
    return [
      {
        id: 'sales-summary',
        name: 'Sales Summary',
        type: 'income',
        format: 'CSV',
        generatedOn: reportData.to_date || reportToDate,
        status: 'ready',
        details: `${reportData.summary?.total_orders || 0} orders • Revenue ${formatPHP(reportData.summary?.completed_revenue || reportData.summary?.total_sales || 0)}`,
        action: downloadSalesSummaryCsv
      },
      {
        id: 'top-products',
        name: 'Top Products',
        type: 'forecast',
        format: 'CSV',
        generatedOn: reportData.to_date || reportToDate,
        status: reportData.top_products?.length ? 'ready' : 'scheduled',
        details: `${reportData.top_products?.length || 0} products tracked (${rangeLabel})`,
        action: downloadTopProductsCsv
      },
      {
        id: 'order-extract',
        name: 'Order Detail Extract',
        type: 'expense',
        format: 'CSV',
        generatedOn: reportData.to_date || reportToDate,
        status: reportData.orders?.length ? 'ready' : 'scheduled',
        details: `${reportData.orders?.length || 0} orders in selected range`,
        action: downloadOrderExtractCsv
      },
      {
        id: 'inventory-snapshot',
        name: 'Inventory Snapshot',
        type: 'income',
        format: 'CSV',
        generatedOn: reportData.to_date || reportToDate,
        status: 'ready',
        details: `${reportData.inventory?.length || 0} items • ${lowStockTotal} low stock`,
        action: downloadInventorySnapshotCsv
      }
    ];
  }, [reportData, reportFromDate, reportToDate, lowStockTotal]);

  const filteredGeneratedReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return generatedReports.filter((item) => {
      const matchFilter = reportFilter === 'all' ? true : item.status === reportFilter;
      const matchQuery = query
        ? `${item.name} ${item.type} ${item.details} ${item.generatedOn}`.toLowerCase().includes(query)
        : true;
      return matchFilter && matchQuery;
    });
  }, [generatedReports, reportSearch, reportFilter]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      const roleMatch = userRoleFilter === 'all' ? true : user.role === userRoleFilter;
      const queryMatch = query
        ? `${user.username} ${user.role} ${user.id}`.toLowerCase().includes(query)
        : true;
      return roleMatch && queryMatch;
    });
  }, [users, userSearch, userRoleFilter]);

  const filteredMenuProducts = useMemo(() => {
    const query = menuSearch.trim().toLowerCase();
    return products.filter((product) => {
      const type = normalizeProductType(product);
      const passType = menuTypeFilter === 'all' ? true : type === menuTypeFilter;
      const passQuery = query
        ? `${product.name} ${product.category || ''} ${type}`.toLowerCase().includes(query)
        : true;
      return passType && passQuery;
    });
  }, [products, menuSearch, menuTypeFilter]);

  const menuTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredMenuProducts.length / MENU_ITEMS_PER_PAGE)),
    [filteredMenuProducts.length]
  );

  const paginatedMenuProducts = useMemo(() => {
    const startIndex = (menuPage - 1) * MENU_ITEMS_PER_PAGE;
    return filteredMenuProducts.slice(startIndex, startIndex + MENU_ITEMS_PER_PAGE);
  }, [filteredMenuProducts, menuPage]);

  const overviewOrders = useMemo(() => {
    const query = overviewSearch.trim().toLowerCase();
    const sourceOrders = (salesSummary.recent_orders || []).length
      ? (salesSummary.recent_orders || [])
      : (reportData.orders || []);
    return sourceOrders
      .filter((order) => {
        if (!query) return true;
        return `${order.id} ${order.customer_name || ''} ${order.status || ''}`.toLowerCase().includes(query);
      })
      .slice(0, 12);
  }, [salesSummary.recent_orders, reportData.orders, overviewSearch]);

  const selectedProduct = products.find((product) => Number(product.id) === Number(selectedProductId)) || null;

  useEffect(() => {
    if (!products.length) {
      setSelectedProductId(null);
      return;
    }
    if (!selectedProductId || !products.some((item) => Number(item.id) === Number(selectedProductId))) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    setMenuPage(1);
  }, [menuSearch, menuTypeFilter]);

  useEffect(() => {
    if (menuPage > menuTotalPages) setMenuPage(menuTotalPages);
  }, [menuPage, menuTotalPages]);

  useEffect(() => {
    if (!isAddItemModalOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsAddItemModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAddItemModalOpen]);

  useEffect(() => {
    if (!isManageItemModalOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsManageItemModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isManageItemModalOpen]);

  useEffect(() => {
    if (!pendingQuickDownload) return;
    const timeout = setTimeout(() => {
      setError('Quick report request timed out. Please try again.');
      setPendingQuickDownload(null);
      setQuickGenerateLoading('');
    }, 15000);
    return () => clearTimeout(timeout);
  }, [pendingQuickDownload]);

  return (
    <main className="role-page">
      <div className="role-layout">
      <RoleSidebar
        role="admin"
        onLogout={logout}
        className="admin-sidebar-offset"
        activeItem={activeTab}
        items={[
          { id: 'overview', label: 'Overview', icon: House, onClick: () => setActiveTab('overview') },
          { id: 'report', label: 'Report Generation', icon: FileText, onClick: () => setActiveTab('report') },
          { id: 'menu', label: 'Menu & Price', icon: Coffee, onClick: () => setActiveTab('menu') },
          { id: 'users', label: 'Users', icon: Users, onClick: () => setActiveTab('users') }
        ]}
      />
      <div className="role-main">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Admin Workspace</h1>
        </div>
      </header>
      {error ? (
        <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {activeTab === 'overview' ? (
        <section className="mx-auto w-full max-w-[1240px] space-y-4">
          <div className="role-panel p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Overview Dashboard</h2>
                <p className="text-sm text-black/60">Live metrics for coffee and matcha operations.</p>
              </div>
              <div className="flex w-full items-center gap-2 rounded-full border border-black/15 bg-[#fafafa] px-4 py-2 sm:w-auto">
                <input
                  value={overviewSearch}
                  onChange={(e) => setOverviewSearch(e.target.value)}
                  placeholder="Search orders, customer, status"
                  className="min-w-0 w-full bg-transparent text-sm outline-none sm:w-[240px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-[#efdfc8] bg-[#f7ecdc] p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/55">Coffee SKUs</p>
                    <span className="rounded-xl bg-black/10 p-3 text-black/70">
                      <Coffee size={24} />
                    </span>
                  </div>
                  <p className="mt-1 text-4xl font-semibold leading-none sm:text-5xl">{overviewStats.inventory.coffee.total}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-black/60">
                    <AlertTriangle size={13} className="text-amber-700" />
                    Low stock: {overviewStats.inventory.coffee.lowStock}
                  </p>
                </article>

                <article className="rounded-2xl border border-[#e2e2e2] bg-[#f8f8f8] p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/55">Matcha SKUs</p>
                    <span className="rounded-xl bg-black/10 p-3 text-black/70">
                      <Leaf size={24} />
                    </span>
                  </div>
                  <p className="mt-1 text-4xl font-semibold leading-none sm:text-5xl">{overviewStats.inventory.matcha.total}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-black/60">
                    <AlertTriangle size={13} className="text-amber-700" />
                    Low stock: {overviewStats.inventory.matcha.lowStock}
                  </p>
                </article>

                <article className="rounded-2xl border border-[#ddd9ee] bg-[#f0ebfa] p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/55">Active Orders</p>
                    <span className="rounded-xl bg-black/10 p-3 text-black/70">
                      <Clock3 size={24} />
                    </span>
                  </div>
                  <p className="mt-1 text-4xl font-semibold leading-none sm:text-5xl">{overviewStats.activeLeads}</p>
                  <p className="mt-2 text-xs font-semibold text-black/60">Pending + Preparing</p>
                </article>

                <article className="rounded-2xl border border-[#d9ead7] bg-[#eaf5e9] p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/55">Completed</p>
                    <span className="rounded-xl bg-black/10 p-3 text-black/70">
                      <CheckCircle2 size={24} />
                    </span>
                  </div>
                  <p className="mt-1 text-4xl font-semibold leading-none sm:text-5xl">{overviewStats.completed}</p>
                  <p className="mt-2 text-xs font-semibold text-black/60">Current report window</p>
                </article>
              </div>

              <aside className="overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-[#f9f8e5] xl:h-full">
                <div className="flex h-full flex-col justify-between p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/70">Top Seller</p>
                    <p className="mt-2 font-serif text-2xl font-semibold">
                      {topProduct?.product_name || 'No sales yet'}
                    </p>
                    <p className="mt-2 text-sm text-white/80">
                      {topProduct
                        ? `${topProduct.qty_sold} cups sold • ${formatPHP(topProduct.sales_amount || 0)}`
                        : 'Sales data will populate once orders are placed.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('report')}
                    className="mt-4 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:bg-white/10"
                  >
                    View Report
                  </button>
                </div>
              </aside>
            </div>
          </div>

          <div className="role-panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-full border border-black/15 bg-[#f9f9f9] px-3 py-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/70">Revenue Breakdown</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <article className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-black/55">Total Revenue</p>
                <p className="mt-2 text-3xl font-semibold">{formatPHP(combinedRevenue)}</p>
              </article>
              <article className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-black/55">Coffee</p>
                <p className="mt-2 text-3xl font-semibold">{formatPHP(coffeeRevenue)}</p>
              </article>
              <article className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-black/55">Matcha</p>
                <p className="mt-2 text-3xl font-semibold">{formatPHP(matchaRevenue)}</p>
              </article>
              <article className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-black/55">Pastry</p>
                <p className="mt-2 text-3xl font-semibold">{formatPHP(pastryRevenue)}</p>
              </article>
            </div>
          </div>

          <div className="role-panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-serif text-2xl font-semibold">Order Status Control</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="role-table w-full border-collapse">
                <thead>
                  <tr className="border-b text-left text-sm">
                    <th className="py-2">Order</th>
                    <th className="py-2">Customer</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewOrders.map((order) => {
                    const status = String(order.status || '').toLowerCase();
                    return (
                      <tr key={order.id} className="text-sm">
                        <td className="py-2">#{order.id}</td>
                        <td className="py-2">{order.customer_name || '-'}</td>
                        <td className="py-2">{formatPHP(order.total || 0)}</td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${getOrderStatusBadgeClass(status)}`}>
                            {status || '-'}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, 'preparing')}
                              disabled={status === 'preparing'}
                              className="rounded-full border border-black/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] disabled:opacity-40"
                            >
                              Preparing
                            </button>
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, 'completed')}
                              disabled={status === 'completed'}
                              className="rounded-full border border-black/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] disabled:opacity-40"
                            >
                              Completed
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {overviewOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-sm text-black/55">No matching orders for this filter.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

        </section>
      ) : null}

      <section className={`role-panel mt-4 p-4 ${activeTab === 'sales' ? '' : 'hidden'}`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold">Real-Time Sales Tracking</h2>
          <button
            onClick={() => sendMessage('GET_SALES_SUMMARY')}
            className="role-btn role-btn-ghost"
          >
            Refresh
          </button>
        </div>
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Today Orders</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{salesSummary.today_orders || 0}</p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Today Sales</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatPHP(salesSummary.today_sales || salesSummary.today_revenue || 0)}</p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Today Completed Sales</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatPHP(salesSummary.completed_today_revenue || 0)}</p>
          </div>
        </div>
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-700">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-800">{salesSummary.pending_count || 0}</p>
          </div>
          <div className="rounded-lg border border-blue-300 bg-blue-50 p-4">
            <p className="text-xs uppercase tracking-wide text-blue-700">Preparing</p>
            <p className="mt-1 text-2xl font-bold text-blue-800">{salesSummary.preparing_count || 0}</p>
          </div>
          <div className="rounded-lg border border-green-300 bg-green-50 p-4">
            <p className="text-xs uppercase tracking-wide text-green-700">Completed</p>
            <p className="mt-1 text-2xl font-bold text-green-800">{salesSummary.completed_count || 0}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="role-table w-full border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Order ID</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Total</th>
                <th className="py-2">Status</th>
                <th className="py-2">Created At</th>
              </tr>
            </thead>
            <tbody>
              {(salesSummary.recent_orders || []).map((order) => (
                <tr key={order.id}>
                  <td className="py-2">#{order.id}</td>
                  <td className="py-2">{order.customer_name || '-'}</td>
                  <td className="py-2">{formatPHP(order.total || 0)}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${getOrderStatusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2">{order.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`mt-4 space-y-4 ${activeTab === 'report' ? '' : 'hidden'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-3xl font-semibold leading-none sm:text-4xl">Reports</h2>
            <p className="mt-1 text-sm text-black/60">Generate, review, and export detailed coffee and matcha reports.</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <button onClick={downloadReportCsv} className="role-btn role-btn-primary inline-flex items-center gap-1.5">
              <Sparkles size={14} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1.1fr]">
          <div className="role-panel p-4">
            <h3 className="mb-3 font-serif text-2xl font-semibold">Quick Generate</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-black/10 bg-[#fafafa] p-3">
                <p className="font-semibold">Daily Sales Statement</p>
                <p className="text-xs text-black/60">Revenue and order summary for today</p>
                <button
                  onClick={() => quickGenerateRange('today', 'sales-summary')}
                  disabled={quickGenerateLoading === 'sales-summary'}
                  className="role-btn role-btn-ghost mt-3 w-full disabled:opacity-50"
                >
                  {quickGenerateLoading === 'sales-summary' ? 'Generating...' : 'Generate'}
                </button>
              </article>
              <article className="rounded-xl border border-black/10 bg-[#fafafa] p-3">
                <p className="font-semibold">Weekly Product Mix</p>
                <p className="text-xs text-black/60">Coffee vs matcha sales mix overview</p>
                <button
                  onClick={() => quickGenerateRange('week', 'top-products')}
                  disabled={quickGenerateLoading === 'top-products'}
                  className="role-btn role-btn-ghost mt-3 w-full disabled:opacity-50"
                >
                  {quickGenerateLoading === 'top-products' ? 'Generating...' : 'Generate'}
                </button>
              </article>
              <article className="rounded-xl border border-black/10 bg-[#fafafa] p-3">
                <p className="font-semibold">Monthly Cash Movement</p>
                <p className="text-xs text-black/60">Gross, completed, and pending status flow</p>
                <button
                  onClick={() => quickGenerateRange('month', 'order-extract')}
                  disabled={quickGenerateLoading === 'order-extract'}
                  className="role-btn role-btn-ghost mt-3 w-full disabled:opacity-50"
                >
                  {quickGenerateLoading === 'order-extract' ? 'Generating...' : 'Generate'}
                </button>
              </article>
              <article className="rounded-xl border border-black/10 bg-[#fafafa] p-3">
                <p className="font-semibold">Quarterly Inventory Review</p>
                <p className="text-xs text-black/60">Stock levels and low-stock risk indicators</p>
                <button
                  onClick={() => quickGenerateRange('quarter', 'inventory-snapshot')}
                  disabled={quickGenerateLoading === 'inventory-snapshot'}
                  className="role-btn role-btn-ghost mt-3 w-full disabled:opacity-50"
                >
                  {quickGenerateLoading === 'inventory-snapshot' ? 'Generating...' : 'Generate'}
                </button>
              </article>
            </div>

          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <article className="role-panel p-4">
              <p className="text-xs text-black/60">Total Reports</p>
              <p className="mt-2 text-4xl font-semibold">{generatedReports.length}</p>
              <p className="text-xs text-black/55">Templates available</p>
            </article>
            <article className="role-panel p-4">
              <p className="text-xs text-black/60">Orders In Range</p>
              <p className="mt-2 text-4xl font-semibold">{reportData.summary?.total_orders || 0}</p>
              <p className="text-xs text-black/55">From selected date range</p>
            </article>
            <article className="role-panel p-4">
              <p className="text-xs text-black/60">Low-Stock Alerts</p>
              <p className="mt-2 text-4xl font-semibold">{lowStockTotal}</p>
              <p className="text-xs text-black/55">Coffee and matcha items</p>
            </article>
            <article className="role-panel p-4">
              <p className="text-xs text-black/60">Last Generated</p>
              <p className="mt-2 text-3xl font-semibold">{reportData.to_date || reportToDate}</p>
              <p className="text-xs text-black/55">Current report date</p>
            </article>
          </div>
        </div>

        <div className="role-panel p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-serif text-2xl font-semibold">Generated Reports</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex w-full items-center gap-1 rounded-full border border-black/15 px-3 py-1.5 sm:w-auto">
                <Search size={14} className="text-black/45" />
                <input
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder="Search reports..."
                  className="min-w-0 w-full bg-transparent text-sm outline-none sm:w-[160px]"
                />
              </div>
              <button
                onClick={downloadReportCsv}
                className="role-btn role-btn-ghost inline-flex items-center gap-1.5"
              >
                <Download size={14} />
                Export
              </button>
              <button
                onClick={() => setReportFilter((prev) => (prev === 'all' ? 'ready' : prev === 'ready' ? 'scheduled' : 'all'))}
                className="role-btn role-btn-ghost inline-flex items-center gap-1.5"
              >
                <Filter size={14} />
                {reportFilter === 'all' ? 'All' : reportFilter}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="role-table w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-sm">
                  <th className="py-2">Report Name</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Format</th>
                  <th className="py-2">Generated On</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredGeneratedReports.map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="py-2">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-black/55">{item.details}</p>
                    </td>
                    <td className="py-2 capitalize">{item.type}</td>
                    <td className="py-2">{item.format}</td>
                    <td className="py-2">{item.generatedOn}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2">
                      <button onClick={item.action} className="role-btn role-btn-ghost">Open</button>
                    </td>
                  </tr>
                ))}
                {filteredGeneratedReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-sm text-black/55">No reports match your filter.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={`mt-2 ${activeTab === 'menu' ? '' : 'hidden'}`}>
        <div className="role-panel p-4">
          <h2 className="mb-3 font-serif text-2xl font-semibold sm:text-3xl">Menu and Price Management</h2>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-emerald-900/20 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex w-full items-center gap-2 rounded-full border border-emerald-900/35 bg-white px-3 py-2 sm:w-auto">
                  <Search size={15} className="text-emerald-900/70" />
                  <input
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search menu items..."
                    className="min-w-0 w-full bg-transparent text-sm outline-none sm:w-[250px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMenuTypeFilter('all')}
                  className={`rounded-full border border-black/30 px-3 py-1 text-xs font-semibold ${menuTypeFilter === 'all' ? 'bg-[#0C090A] text-white' : 'bg-white text-black/70'}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setMenuTypeFilter('coffee')}
                  className={`rounded-full border border-black/30 px-3 py-1 text-xs font-semibold ${menuTypeFilter === 'coffee' ? 'bg-[#0C090A] text-white' : 'bg-white text-black/70'}`}
                >
                  Coffee
                </button>
                <button
                  type="button"
                  onClick={() => setMenuTypeFilter('matcha')}
                  className={`rounded-full border border-black/30 px-3 py-1 text-xs font-semibold ${menuTypeFilter === 'matcha' ? 'bg-[#0C090A] text-white' : 'bg-white text-black/70'}`}
                >
                  Matcha
                </button>
                <button
                  type="button"
                  onClick={() => setMenuTypeFilter('pastry')}
                  className={`rounded-full border border-black/30 px-3 py-1 text-xs font-semibold ${menuTypeFilter === 'pastry' ? 'bg-[#0C090A] text-white' : 'bg-white text-black/70'}`}
                >
                  Pastry
                </button>
                <button
                  type="button"
                  onClick={() => selectedProduct && setIsManageItemModalOpen(true)}
                  disabled={!selectedProduct}
                  className="xl:hidden rounded-full border border-black/30 px-3 py-1 text-xs font-semibold text-black/70 disabled:opacity-40"
                >
                  Edit Selected
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="xl:hidden rounded-full border border-black/30 bg-[#0C090A] px-3 py-1 text-xs font-semibold text-white"
                >
                  + Add Item
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedMenuProducts.map((product) => (
                  <article
                    key={product.id}
                    onClick={() => {
                      setSelectedProductId(Number(product.id));
                      if (typeof window !== 'undefined' && window.innerWidth < 1280) {
                        setIsManageItemModalOpen(true);
                      }
                    }}
                    className={`rounded-2xl border p-3 transition ${
                      Number(selectedProductId) === Number(product.id)
                        ? 'border-black bg-white shadow-md'
                        : 'border-black/20 bg-white/85'
                    } cursor-pointer`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        Number(product.stock_quantity) <= 10
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {Number(product.stock_quantity) <= 10 ? 'Low Stock' : 'Available'}
                      </span>
                    </div>
                    <div className="mb-2 flex h-24 items-center justify-center overflow-hidden rounded-xl bg-[#f4f6ef]">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-contain" />
                      ) : (
                        renderCategoryFallbackIcon(product)
                      )}
                    </div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-black/65">{formatPHP(product.price)}</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-black/45">
                      {normalizeProductType(product)} • stock {Number(product.stock_quantity || 0)}
                    </p>
                  </article>
                ))}
                {filteredMenuProducts.length === 0 ? (
                  <p className="text-sm text-black/60">No products match your filter.</p>
                ) : null}
              </div>
              {filteredMenuProducts.length > MENU_ITEMS_PER_PAGE ? (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMenuPage((prev) => Math.max(1, prev - 1))}
                    disabled={menuPage === 1}
                    className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold disabled:opacity-40"
                  >
                    Prev
                  </button>
                  {Array.from({ length: menuTotalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setMenuPage(page)}
                      className={`h-8 min-w-8 rounded-full border px-2 text-xs font-semibold ${
                        menuPage === page ? 'border-[#0C090A] bg-[#0C090A] text-white' : 'border-black/20 text-black/70'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMenuPage((prev) => Math.min(menuTotalPages, prev + 1))}
                    disabled={menuPage === menuTotalPages}
                    className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>

            <aside className="hidden rounded-2xl border border-emerald-900/25 bg-white p-4 xl:block">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-serif text-2xl font-semibold">Manage Item</h3>
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/20 bg-white text-black transition hover:bg-black hover:text-white"
                  aria-label="Add new item"
                  title="Add new item"
                >
                  <Plus size={16} />
                </button>
              </div>
              {selectedProduct ? (
                <div className="mt-3 space-y-3">
                  <input
                    value={selectedProduct.name}
                    onChange={(e) => updateProductField(selectedProduct.id, 'name', e.target.value)}
                    className="role-input"
                    placeholder="Product name"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={selectedProduct.price}
                    onChange={(e) => updateProductField(selectedProduct.id, 'price', e.target.value)}
                    className="role-input"
                    placeholder="Price"
                  />
                  <input
                    value={selectedProduct.category || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'category', e.target.value)}
                    className="role-input"
                    placeholder="Category"
                  />
                  <select
                    value={normalizeProductType(selectedProduct)}
                    onChange={(e) => updateProductField(selectedProduct.id, 'product_type', e.target.value)}
                    className="role-input"
                  >
                    <option value="coffee">Coffee</option>
                    <option value="matcha">Matcha</option>
                    <option value="pastry">Pastry</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    value={selectedProduct.capacity || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'capacity', e.target.value)}
                    className="role-input"
                    placeholder="Capacity (e.g. 240ml cup)"
                  />
                  <input
                    value={selectedProduct.weight_label || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'weight_label', e.target.value)}
                    className="role-input"
                    placeholder="Weight (e.g. Single serving)"
                  />
                  <input
                    value={selectedProduct.material || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'material', e.target.value)}
                    className="role-input"
                    placeholder="Material (e.g. Espresso + steamed milk + foam)"
                  />
                  <textarea
                    value={selectedProduct.description || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'description', e.target.value)}
                    className="role-input !rounded-2xl !py-2.5 !leading-relaxed"
                    placeholder="Description"
                    rows={3}
                  />
                  <input
                    value={selectedProduct.image_url || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'image_url', e.target.value)}
                    className="role-input"
                    placeholder="Image URL"
                  />
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-black/55">
                    Upload from PC
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleLocalImageUpload(file, (encoded) =>
                        updateProductField(selectedProduct.id, 'image_url', encoded)
                      );
                    }}
                    className="role-input !rounded-xl !px-3 !py-2 text-sm"
                  />
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={selectedProduct.stock_quantity ?? 0}
                      onChange={(e) => updateProductField(selectedProduct.id, 'stock_quantity', e.target.value)}
                      className="role-input"
                      placeholder="Stock"
                    />
                    <button type="button" onClick={() => adjustStock(selectedProduct.id, -1)} className="role-btn role-btn-ghost">-1</button>
                    <button type="button" onClick={() => adjustStock(selectedProduct.id, 1)} className="role-btn role-btn-ghost">+1</button>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateProduct(selectedProduct)} className="role-btn role-btn-primary flex-1">Save</button>
                    <button type="button" onClick={() => deleteProduct(selectedProduct.id)} className="role-btn role-btn-danger flex-1">Delete</button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-black/60">Select an item from the left to manage.</p>
              )}
            </aside>
          </div>
        </div>
      </section>

      {isManageItemModalOpen ? (
        <div
          className="fixed inset-0 z-[92] bg-black/45 p-3 sm:p-6 xl:hidden"
          onClick={() => setIsManageItemModalOpen(false)}
        >
          <div
            className="mx-auto mt-3 flex max-h-[calc(100vh-1.5rem)] w-full max-w-[640px] flex-col rounded-2xl border border-black/10 bg-white shadow-2xl sm:mt-6 sm:max-h-[calc(100vh-3rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 sm:px-5">
              <h4 className="font-serif text-2xl font-semibold">Manage Item</h4>
              <button
                type="button"
                onClick={() => setIsManageItemModalOpen(false)}
                className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-black/70"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5">
              {selectedProduct ? (
                <div className="space-y-3">
                  <input
                    value={selectedProduct.name}
                    onChange={(e) => updateProductField(selectedProduct.id, 'name', e.target.value)}
                    className="role-input"
                    placeholder="Product name"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={selectedProduct.price}
                    onChange={(e) => updateProductField(selectedProduct.id, 'price', e.target.value)}
                    className="role-input"
                    placeholder="Price"
                  />
                  <input
                    value={selectedProduct.category || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'category', e.target.value)}
                    className="role-input"
                    placeholder="Category"
                  />
                  <select
                    value={normalizeProductType(selectedProduct)}
                    onChange={(e) => updateProductField(selectedProduct.id, 'product_type', e.target.value)}
                    className="role-input"
                  >
                    <option value="coffee">Coffee</option>
                    <option value="matcha">Matcha</option>
                    <option value="pastry">Pastry</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    value={selectedProduct.capacity || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'capacity', e.target.value)}
                    className="role-input"
                    placeholder="Capacity (e.g. 240ml cup)"
                  />
                  <input
                    value={selectedProduct.weight_label || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'weight_label', e.target.value)}
                    className="role-input"
                    placeholder="Weight (e.g. Single serving)"
                  />
                  <input
                    value={selectedProduct.material || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'material', e.target.value)}
                    className="role-input"
                    placeholder="Material (e.g. Espresso + steamed milk + foam)"
                  />
                  <textarea
                    value={selectedProduct.description || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'description', e.target.value)}
                    className="role-input !rounded-2xl !py-2.5 !leading-relaxed"
                    placeholder="Description"
                    rows={3}
                  />
                  <input
                    value={selectedProduct.image_url || ''}
                    onChange={(e) => updateProductField(selectedProduct.id, 'image_url', e.target.value)}
                    className="role-input"
                    placeholder="Image URL"
                  />
                  <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-black/55">
                    Upload from PC
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleLocalImageUpload(file, (encoded) =>
                        updateProductField(selectedProduct.id, 'image_url', encoded)
                      );
                    }}
                    className="role-input !rounded-xl !px-3 !py-2 text-sm"
                  />
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={selectedProduct.stock_quantity ?? 0}
                      onChange={(e) => updateProductField(selectedProduct.id, 'stock_quantity', e.target.value)}
                      className="role-input"
                      placeholder="Stock"
                    />
                    <button type="button" onClick={() => adjustStock(selectedProduct.id, -1)} className="role-btn role-btn-ghost">-1</button>
                    <button type="button" onClick={() => adjustStock(selectedProduct.id, 1)} className="role-btn role-btn-ghost">+1</button>
                  </div>
                  <div className="sticky bottom-0 bg-white pb-1 pt-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => updateProduct(selectedProduct)} className="role-btn role-btn-primary flex-1">Save</button>
                      <button type="button" onClick={() => deleteProduct(selectedProduct.id)} className="role-btn role-btn-danger flex-1">Delete</button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-black/60">Select an item first to manage.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isAddItemModalOpen ? (
        <div
          className="fixed inset-0 z-[90] bg-black/45 p-3 sm:p-6"
          onClick={() => setIsAddItemModalOpen(false)}
        >
          <div
            className="mx-auto mt-3 flex max-h-[calc(100vh-1.5rem)] w-full max-w-[640px] flex-col rounded-2xl border border-black/10 bg-white shadow-2xl sm:mt-6 sm:max-h-[calc(100vh-3rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 sm:px-5">
              <h4 className="font-serif text-2xl font-semibold">Add New Item</h4>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-black/70"
              >
                Close
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createProduct();
              }}
              noValidate
              className="flex-1 space-y-2 overflow-y-auto px-4 py-3 sm:px-5"
            >
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Product name"
                className="role-input !py-2 !text-sm"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="Price"
                className="role-input !py-2 !text-sm"
              />
              <input
                type="text"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="Category"
                className="role-input !py-2 !text-sm"
              />
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="role-input !py-2 !text-sm"
              >
                <option value="coffee">Coffee</option>
                <option value="matcha">Matcha</option>
                <option value="pastry">Pastry</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                value={productCapacity}
                onChange={(e) => setProductCapacity(e.target.value)}
                placeholder="Capacity (e.g. 240ml cup)"
                className="role-input !py-2 !text-sm"
              />
              <input
                type="text"
                value={productWeightLabel}
                onChange={(e) => setProductWeightLabel(e.target.value)}
                placeholder="Weight (e.g. Single serving)"
                className="role-input !py-2 !text-sm"
              />
              <input
                type="text"
                value={productMaterial}
                onChange={(e) => setProductMaterial(e.target.value)}
                placeholder="Material (e.g. Espresso + steamed milk + foam)"
                className="role-input !py-2 !text-sm"
              />
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Description"
                className="role-input !rounded-2xl !py-2.5 !text-sm !leading-relaxed"
                rows={3}
              />
              <input
                type="text"
                value={productImageUrl}
                onChange={(e) => setProductImageUrl(e.target.value)}
                placeholder="Image URL"
                className="role-input !py-2 !text-sm"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleLocalImageUpload(file, (encoded) => setProductImageUrl(encoded));
                }}
                className="role-input !rounded-xl !px-3 !py-2 text-sm"
              />
              <input
                type="number"
                min="0"
                step="1"
                value={productStock}
                onChange={(e) => setProductStock(e.target.value)}
                placeholder="Stock"
                className="role-input !py-2 !text-sm"
              />
              <div className="sticky bottom-0 bg-white pb-1 pt-2">
                <button
                  type="button"
                  onClick={() => createProduct()}
                  className="role-btn role-btn-primary w-full !py-2.5 !text-[11px]"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <section className={`mt-2 space-y-4 ${activeTab === 'users' ? '' : 'hidden'}`}>
        <div className="role-panel p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Users Management</h2>
              <p className="text-sm text-black/60">Create and manage admin and kitchen accounts.</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-black/10 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-black/55">Total users</p>
              <p className="mt-2 text-4xl font-semibold">{users.length}</p>
              <p className="text-xs text-black/55">All registered accounts</p>
            </article>
            <article className="rounded-xl border border-black/10 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-black/55">Admin users</p>
              <p className="mt-2 text-4xl font-semibold">{users.filter((u) => u.role === 'admin').length}</p>
              <p className="text-xs text-black/55">System administrators</p>
            </article>
            <article className="rounded-xl border border-black/10 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-black/55">Staff users</p>
              <p className="mt-2 text-4xl font-semibold">{users.filter((u) => u.role !== 'admin').length}</p>
              <p className="text-xs text-black/55">Kitchen accounts</p>
            </article>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">User List</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex w-full items-center gap-1 rounded-full border border-black/15 px-3 py-1.5 sm:w-auto">
                    <Search size={14} className="text-black/45" />
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search for user"
                      className="min-w-0 w-full bg-transparent text-sm outline-none sm:w-[170px]"
                    />
                  </div>
                  <button
                    onClick={() => setUserRoleFilter('all')}
                    className={`rounded-full border border-black/20 px-3 py-1 text-xs font-semibold ${userRoleFilter === 'all' ? 'bg-[#0C090A] text-white' : 'bg-white text-black/70'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('admin')}
                    className={`rounded-full border border-black/20 px-3 py-1 text-xs font-semibold ${userRoleFilter === 'admin' ? 'bg-[#0C090A] text-white' : 'bg-white text-black/70'}`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('kitchen')}
                    className={`rounded-full border border-black/20 px-3 py-1 text-xs font-semibold ${userRoleFilter === 'kitchen' ? 'bg-[#0C090A] text-white' : 'bg-white text-black/70'}`}
                  >
                    Kitchen
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="role-table w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left text-sm">
                      <th className="py-2">ID</th>
                      <th className="py-2">User</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 min-w-[360px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((account) => (
                      <tr key={account.id} className="text-sm">
                        <td className="py-2">#{account.id}</td>
                        <td className="py-2">{account.username}</td>
                        <td className="py-2 capitalize">{account.role}</td>
                        <td className="py-2">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Active
                          </span>
                        </td>
                        <td className="py-2 min-w-[360px]">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_minmax(140px,1fr)_auto_auto] sm:items-center">
                            <select
                              value={ROLES.includes(account.role) ? account.role : 'kitchen'}
                              onChange={(e) => updateRole(account.id, e.target.value)}
                              className="role-input !w-full !py-1.5 !text-xs sm:!w-[120px]"
                            >
                              {ROLES.map((entry) => (
                                <option key={entry} value={entry}>
                                  {entry}
                                </option>
                              ))}
                            </select>
                            <input
                              type="password"
                              value={userPasswordDrafts[account.id] || ''}
                              onChange={(e) =>
                                setUserPasswordDrafts((prev) => ({
                                  ...prev,
                                  [account.id]: e.target.value
                                }))
                              }
                              placeholder="New password"
                              className="role-input !w-full !py-1.5 !text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => updateUserPassword(account.id)}
                              className="role-btn role-btn-ghost !w-full !px-3 !py-1.5 !text-[11px] sm:!w-auto whitespace-nowrap"
                            >
                              Update PW
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteUser(account.id)}
                              className="role-btn role-btn-danger !w-full !px-3 !py-1.5 !text-[11px] sm:!w-auto whitespace-nowrap"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-sm text-black/55">No users match your search/filter.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-white p-4">
              <h3 className="mb-3 font-semibold uppercase tracking-[0.12em] text-black/55">Create User</h3>
              <form onSubmit={createUser} className="space-y-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="role-input !py-2 !text-sm"
                  required
                />
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="role-input !py-2 !text-sm"
                  required
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="role-input !py-2 !text-sm"
                >
                  {ROLES.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
                <button type="submit" className="role-btn role-btn-primary w-full !py-2 !text-[11px]">
                  Add User
                </button>
              </form>
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
          </div>
        </div>
      </section>
      </div>
      </div>
    </main>
  );
}
