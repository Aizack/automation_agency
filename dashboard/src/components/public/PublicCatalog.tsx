import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Search,
  MapPin,
  Plus,
  Minus,
  CheckCircle2,
  X,
  Send
} from 'lucide-react';
import { UI_UX_PRO_MAX } from '../../utils/uiUxProMaxCatalog';

interface Branch {
  id: string;
  name: string;
  branch_name: string;
  address: string;
  phone: string;
  is_main_branch: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  promo_discount: number;
  final_price: number;
  stock: number;
  image_url: string | null;
  gallery_images: string[];
  brand: string | null;
  material: string | null;
  style: string | null;
  color: string | null;
  is_featured: boolean;
  category_name?: string;
}

interface CatalogData {
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    banner_url: string | null;
    primary_color: string;
    catalog_description: string | null;
    phone: string | null;
    agent_phone: string | null;
    address: string | null;
    category: string;
  };
  branches: Branch[];
  categories: Array<{ id: string; name: string }>;
  products: Product[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

export function PublicCatalog() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Formulario de envío
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'domicilio' | 'pickup'>('domicilio');

  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  // Modal de detalle / foto ampliada
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  const getSlugFromUrl = () => {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2 && (parts[0] === 'c' || parts[0] === 'catalogo' || parts[0] === 'tienda')) {
      return parts[1];
    }
    if (parts.length === 1 && parts[0] !== 'menu' && parts[0] !== 'login' && parts[0] !== 'landing') {
      return parts[0];
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('c') || params.get('slug') || 'client_001';
  };

  useEffect(() => {
    const slug = getSlugFromUrl();
    fetchCatalog(slug);
  }, []);

  const fetchCatalog = async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/catalog/${slug}`);
      const json = await res.json();
      if (json.success) {
        setCatalog(json.data);
        if (json.data.branches && json.data.branches.length > 0) {
          const main = json.data.branches.find((b: Branch) => b.is_main_branch) || json.data.branches[0];
          setSelectedBranch(main);
        }
      } else {
        setError(json.message || 'Catálogo no disponible');
      }
    } catch (err: any) {
      setError('Error al cargar el catálogo web.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(product.stock, item.quantity + 1) }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: Math.min(item.product.stock, newQty) } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.product.final_price * item.quantity, 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckoutSubmit = async (mode: 'whatsapp' | 'direct') => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Por favor ingrese su nombre y número de teléfono.');
      return;
    }

    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const slug = catalog?.tenant.slug || getSlugFromUrl();
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        branch_id: selectedBranch?.id,
        delivery_method: deliveryMethod,
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity }))
      };

      const res = await fetch(`/api/public/catalog/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        setOrderSuccess(json.data);
        setCart([]);
        setIsCheckoutOpen(false);

        if (mode === 'whatsapp' && json.data.whatsapp_url) {
          window.open(json.data.whatsapp_url, '_blank');
        }
      } else {
        alert(json.error || 'No se pudo registrar la orden.');
      }
    } catch (err) {
      alert('Error al enviar la orden.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = (catalog?.products || []).filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.brand || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || product.category_name === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#161616] flex flex-col items-center justify-center p-4 font-sans">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-3 border-[#161616] border-t-transparent rounded-full mb-4"
        />
        <p className="text-[#6B6862] font-bold text-xs uppercase tracking-widest animate-pulse font-mono">
          Cargando catálogo digital...
        </p>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#161616] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-14 h-14 bg-[#FEE2E2] text-[#DC2626] rounded-full flex items-center justify-center mb-4 text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold mb-2">Catálogo No Disponible</h2>
        <p className="text-[#6B6862] max-w-md text-sm mb-6">{error || 'El catálogo web no existe o está inactivo.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-[#161616] hover:bg-[#D9381E] text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#161616] font-sans pb-28 selection:bg-[#161616] selection:text-white">
      {/* HEADER PRINCIPAL MINIMALISTA LIMPIDO Y DE ALTO CONTRASTE */}
      <header className="bg-white border-b border-[#E2DFD7] shadow-xs">
        {catalog.tenant.banner_url ? (
          <div
            className="h-40 w-full bg-cover bg-center border-b border-[#E2DFD7]"
            style={{ backgroundImage: `url(${catalog.tenant.banner_url})` }}
          />
        ) : (
          <div className="h-2.5 w-full bg-[#161616]" />
        )}

        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {catalog.tenant.logo_url ? (
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={catalog.tenant.logo_url}
                alt={catalog.tenant.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-contain border border-[#E2DFD7] shadow-xs bg-[#FAF8F5] p-1.5"
              />
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-[#161616] shadow-xs flex items-center justify-center font-bold text-2xl text-white bg-[#161616] uppercase tracking-wider shrink-0"
              >
                {catalog.tenant.name.substring(0, 2)}
              </motion.div>
            )}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#161616] tracking-tight">{catalog.tenant.name}</h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-[#161616] text-white font-bold uppercase tracking-wider">
                  {catalog.tenant.category}
                </span>
              </div>
              {catalog.tenant.catalog_description && (
                <p className="text-xs text-[#6B6862] mt-1 max-w-xl font-medium">{catalog.tenant.catalog_description}</p>
              )}
            </div>
          </div>

          {/* SELECTOR DE SEDES */}
          {catalog.branches.length > 0 && (
            <div className="w-full sm:w-auto bg-[#FAF8F5] p-3 rounded-xl border border-[#E2DFD7]">
              <label className="text-[10px] text-[#6B6862] block font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#161616]" /> Sede de Despacho:
              </label>
              <select
                value={selectedBranch?.id || ''}
                onChange={e => {
                  const b = catalog.branches.find(x => x.id === e.target.value);
                  if (b) setSelectedBranch(b);
                }}
                className="w-full bg-white text-[#161616] text-xs font-bold rounded-lg px-3 py-2 border border-[#E2DFD7] focus:outline-none focus:border-[#161616] cursor-pointer"
              >
                {catalog.branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name} {branch.is_main_branch ? '(Principal)' : ''}
                  </option>
                ))}
              </select>
              {selectedBranch?.address && (
                <p className="text-[11px] text-[#6B6862] mt-1 flex items-center gap-1 font-medium">
                  <span>🏠</span> {selectedBranch.address}
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* BUSCADOR Y CATEGORÍAS */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8E8B85] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por producto, marca o característica..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E2DFD7] text-[#161616] text-xs font-medium rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#161616] transition shadow-xs placeholder-[#8E8B85]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#161616] text-white shadow-xs'
                  : 'bg-white text-[#6B6862] hover:text-[#161616] border border-[#E2DFD7] hover:border-[#161616]'
              }`}
            >
              Todos ({catalog.products.length})
            </button>
            {catalog.categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.name
                    ? 'bg-[#161616] text-white shadow-xs'
                    : 'bg-white text-[#6B6862] hover:text-[#161616] border border-[#E2DFD7] hover:border-[#161616]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* GRILLA CON ANIMACIONES DE MOTION-PRIMITIVES */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-[#E2DFD7] rounded-2xl p-12 text-center my-8 shadow-xs">
            <ShoppingBag className="w-12 h-12 text-[#8E8B85] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#161616] mb-1">Sin productos en esta sección</h3>
            <p className="text-[#6B6862] text-xs">Prueba buscar con otro término o selecciona otra categoría.</p>
          </div>
        ) : (
          <motion.div
            variants={UI_UX_PRO_MAX.motion.container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
          >
            {filteredProducts.map(product => (
              <motion.div
                key={product.id}
                variants={UI_UX_PRO_MAX.motion.item}
                whileHover={{ y: -3 }}
                className="bg-white border border-[#E2DFD7] hover:border-[#161616] rounded-xl overflow-hidden flex flex-col justify-between group shadow-xs hover:shadow-md transition-all duration-300"
              >
                <div
                  className="relative bg-[#FAF8F5] aspect-square overflow-hidden cursor-pointer border-b border-[#E2DFD7]"
                  onClick={() => setPreviewProduct(product)}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#161616] text-4xl opacity-80">👓</div>
                  )}

                  {product.promo_discount > 0 && (
                    <span className="absolute top-2.5 left-2.5 bg-[#D9381E] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-xs">
                      -{product.promo_discount}% DESC
                    </span>
                  )}

                  {product.stock <= 0 ? (
                    <span className="absolute top-2.5 right-2.5 bg-[#E2DFD7] text-[#6B6862] text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                      Agotado
                    </span>
                  ) : product.stock <= 3 ? (
                    <span className="absolute top-2.5 right-2.5 bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                      ¡Últimas {product.stock}!
                    </span>
                  ) : null}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    {product.brand && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8B85] block mb-1">
                        {product.brand}
                      </span>
                    )}
                    <h3 className="font-bold text-[#161616] text-sm leading-snug group-hover:text-[#D9381E] transition mb-1">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-[#6B6862] text-xs line-clamp-2 mb-3 font-normal">{product.description}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2DFD7] flex items-center justify-between gap-2">
                    <div>
                      {product.promo_discount > 0 && (
                        <span className="text-xs text-[#8E8B85] line-through block font-medium">
                          ${product.price.toLocaleString('es-CO')}
                        </span>
                      )}
                      <span className="text-base font-black text-[#161616]">
                        ${product.final_price.toLocaleString('es-CO')}
                        <span className="text-[10px] font-normal text-[#6B6862] ml-1">COP</span>
                      </span>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        product.stock > 0
                          ? 'bg-[#161616] hover:bg-[#D9381E] text-white shadow-xs'
                          : 'bg-[#FAF8F5] text-[#8E8B85] border border-[#E2DFD7] cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* CARRITO FLOTANTE */}
      <AnimatePresence>
        {cartItemCount > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-[#161616] hover:bg-[#262626] text-white px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-3 border border-[#161616] transition-all cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-white" />
                <span className="absolute -top-2 -right-2 bg-[#D9381E] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-[#A3A3A3] block font-bold uppercase tracking-wider">Mi Carrito</span>
                <span className="font-black text-xs">${cartTotal.toLocaleString('es-CO')} COP</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DRAWER LATERAL DE CARRITO */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-md bg-white border-l border-[#E2DFD7] h-full flex flex-col justify-between shadow-2xl text-[#161616]"
            >
              <div className="p-4 border-b border-[#E2DFD7] flex items-center justify-between bg-[#FAF8F5]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#161616]" />
                  <h2 className="font-bold text-base text-[#161616]">Tu Carrito de Compras</h2>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-[#6B6862] hover:text-[#161616] p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-[#8E8B85]">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    Tu carrito está vacío
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="bg-[#FAF8F5] border border-[#E2DFD7] p-3 rounded-xl flex items-center gap-3">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} alt={item.product.name} className="w-14 h-14 object-cover rounded-lg bg-white border border-[#E2DFD7]" />
                      ) : (
                        <div className="w-14 h-14 bg-white border border-[#E2DFD7] rounded-lg flex items-center justify-center text-xl">👓</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#161616] truncate">{item.product.name}</h4>
                        <p className="text-xs text-[#161616] font-black mt-0.5">${item.product.final_price.toLocaleString('es-CO')} COP</p>
                      </div>

                      <div className="flex items-center gap-1 bg-white border border-[#E2DFD7] rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-[#161616] hover:bg-[#FAF8F5] font-bold rounded cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-[#161616] w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-[#161616] hover:bg-[#FAF8F5] font-bold rounded cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-4 border-t border-[#E2DFD7] bg-[#FAF8F5] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6B6862]">Unidades:</span>
                    <span className="font-bold text-[#161616]">{cartItemCount} items</span>
                  </div>
                  <div className="flex items-center justify-between text-base">
                    <span className="font-bold text-[#161616]">Total Pedido:</span>
                    <span className="font-black text-[#161616]">${cartTotal.toLocaleString('es-CO')} COP</span>
                  </div>

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full py-3 bg-[#161616] hover:bg-[#D9381E] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🚀</span> Continuar al Checkout
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CHECKOUT */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E2DFD7] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-[#161616]"
            >
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="absolute top-4 right-4 text-[#6B6862] hover:text-[#161616]"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-[#161616] mb-1 flex items-center gap-2">
                <span>📋</span> Confirmar Pedido
              </h3>
              <p className="text-xs text-[#6B6862] mb-5">Ingresa tus datos de contacto para finalizar tu pedido.</p>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-[#161616] block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    placeholder="Ej: María Rodríguez"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-lg px-3 py-2 text-xs font-medium text-[#161616] focus:outline-none focus:border-[#161616] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#161616] block mb-1">Teléfono / WhatsApp *</label>
                  <input
                    type="tel"
                    placeholder="Ej: 3001234567"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-lg px-3 py-2 text-xs font-medium text-[#161616] focus:outline-none focus:border-[#161616] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#161616] block mb-1">Modalidad de Entrega</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('domicilio')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        deliveryMethod === 'domicilio'
                          ? 'bg-[#161616] text-white'
                          : 'bg-[#FAF8F5] text-[#6B6862] border border-[#E2DFD7]'
                      }`}
                    >
                      <span>🚚</span> Domicilio
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        deliveryMethod === 'pickup'
                          ? 'bg-[#161616] text-white'
                          : 'bg-[#FAF8F5] text-[#6B6862] border border-[#E2DFD7]'
                      }`}
                    >
                      <span>🏬</span> Retiro en Tienda
                    </button>
                  </div>
                </div>

                {deliveryMethod === 'domicilio' && (
                  <div>
                    <label className="text-xs font-bold text-[#161616] block mb-1">Dirección de Entrega</label>
                    <input
                      type="text"
                      placeholder="Ej: Calle 45 # 12-34 Barrio Centro"
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-lg px-3 py-2 text-xs font-medium text-[#161616] focus:outline-none focus:border-[#161616] focus:bg-white"
                    />
                  </div>
                )}

                <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E2DFD7] mt-3 flex items-center justify-between">
                  <span className="text-xs text-[#6B6862]">Total ({cartItemCount} ítems):</span>
                  <span className="text-base font-black text-[#161616]">${cartTotal.toLocaleString('es-CO')} COP</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleCheckoutSubmit('whatsapp')}
                    className="py-2.5 px-4 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Pedir por WhatsApp
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleCheckoutSubmit('direct')}
                    className="py-2.5 px-4 bg-[#161616] hover:bg-[#D9381E] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmar Orden ERP
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL ÉXITO */}
      <AnimatePresence>
        {orderSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border border-[#E2DFD7] rounded-2xl max-w-md w-full p-6 text-center shadow-2xl text-[#161616]"
            >
              <div className="w-14 h-14 bg-[#E6F4EA] text-[#059669] rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold text-[#161616] mb-1">¡Pedido Registrado con Éxito!</h3>
              <p className="text-xs text-[#6B6862] mb-4">
                Orden consecutivo: <span className="font-bold text-[#161616]">{orderSuccess.invoice_number}</span>
              </p>

              <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E2DFD7] text-left text-xs space-y-2 mb-5">
                <div className="flex justify-between">
                  <span className="text-[#6B6862]">Total Pedido:</span>
                  <span className="font-bold text-[#161616]">${orderSuccess.total_amount.toLocaleString('es-CO')} COP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6862]">Estado:</span>
                  <span className="font-bold text-[#D97706]">Pendiente de Confirmación</span>
                </div>
              </div>

              {orderSuccess.whatsapp_url && (
                <a
                  href={orderSuccess.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-xs transition mb-2.5"
                >
                  <Send className="w-4 h-4" /> Abrir Resumen en WhatsApp
                </a>
              )}

              <button
                onClick={() => setOrderSuccess(null)}
                className="w-full py-2 bg-white border border-[#E2DFD7] text-[#161616] hover:bg-[#FAF8F5] font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Volver al Catálogo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PREVIEW DE PRODUCTO */}
      <AnimatePresence>
        {previewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E2DFD7] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative text-[#161616]"
            >
              <button
                onClick={() => setPreviewProduct(null)}
                className="absolute top-3 right-3 z-10 bg-white/90 text-[#161616] hover:bg-[#161616] hover:text-white w-8 h-8 rounded-full flex items-center justify-center border border-[#E2DFD7] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="bg-[#FAF8F5] aspect-video overflow-hidden border-b border-[#E2DFD7]">
                {previewProduct.image_url ? (
                  <img src={previewProduct.image_url} alt={previewProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">👓</div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-base text-[#161616] mb-1">{previewProduct.name}</h3>
                {previewProduct.description && <p className="text-[#6B6862] text-xs mb-4">{previewProduct.description}</p>}
                <div className="flex items-center justify-between pt-3 border-t border-[#E2DFD7]">
                  <span className="text-lg font-black text-[#161616]">${previewProduct.final_price.toLocaleString('es-CO')} COP</span>
                  <button
                    onClick={() => {
                      addToCart(previewProduct);
                      setPreviewProduct(null);
                    }}
                    className="px-4 py-2 bg-[#161616] hover:bg-[#D9381E] text-white font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Agregar al Carrito
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
