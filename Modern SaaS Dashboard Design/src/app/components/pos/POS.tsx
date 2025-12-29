import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  PauseCircle, 
  XCircle, 
  QrCode,
  Tag,
  User,
  ShoppingCart
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';

import { toast } from 'sonner';

// Mock Products
const MOCK_PRODUCTS = [
  { id: 1, name: "Wireless Headphones", price: 129.00, category: "Electronics", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80" },
  { id: 2, name: "Smart Watch", price: 249.50, category: "Electronics", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80" },
  { id: 3, name: "Running Shoes", price: 85.00, category: "Apparel", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80" },
  { id: 4, name: "Leather Bag", price: 150.00, category: "Accessories", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80" },
  { id: 5, name: "Sunglasses", price: 45.00, category: "Accessories", image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80" },
  { id: 6, name: "Mechanical Keyboard", price: 180.00, category: "Electronics", image: "https://images.unsplash.com/photo-1587829741301-dc798b91a603?w=400&q=80" },
  { id: 7, name: "Coffee Mug", price: 12.50, category: "Home", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&q=80" },
  { id: 8, name: "Notebook", price: 5.00, category: "Stationery", image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&q=80" },
];

const CATEGORIES = ["All", "Electronics", "Apparel", "Accessories", "Home", "Stationery"];

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showMobileCart, setShowMobileCart] = useState(false);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const filteredProducts = MOCK_PRODUCTS.filter(p => 
    (activeCategory === "All" || p.category === activeCategory) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax mock
  const total = subtotal + tax;

  const handlePayment = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    toast.success(`Payment of $${total.toFixed(2)} processed successfully!`);
    setCart([]);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex gap-6 relative">
      {/* Products Area - Left Side */}
      <div className={cn(
        "flex-1 flex flex-col bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/50 overflow-hidden transition-all",
        showMobileCart ? "hidden lg:flex" : "flex"
      )}>
        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-800/50 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Scan barcode or search products..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="ghost" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
              <QrCode size={20} />
            </Button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border",
                  activeCategory === cat 
                    ? "bg-blue-600 border-blue-500 text-white" 
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <motion.div
                layout
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(product)}
                className="group cursor-pointer bg-slate-950/50 border border-slate-800/50 rounded-xl overflow-hidden hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur text-white text-xs px-2 py-1 rounded-md font-bold">
                    ${product.price}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-slate-200 line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-slate-500">{product.category}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Area - Right Side */}
      <div className={cn(
        "w-full lg:w-[400px] flex flex-col bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800/50 overflow-hidden shadow-2xl transition-all absolute lg:relative inset-0 lg:inset-auto z-20",
        showMobileCart ? "flex" : "hidden lg:flex"
      )}>
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Current Order</h2>
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-400" onClick={() => setCart([])}>
              <Trash2 size={18} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-slate-400"
              onClick={() => setShowMobileCart(false)}
            >
              <XCircle size={18} />
            </Button>
          </div>
        </div>

        {/* Customer Select */}
        <div className="p-3 bg-slate-950/50 border-b border-slate-800/50">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors">
            <User size={18} />
            <span className="text-sm flex-1">Walk-in Customer</span>
            <Plus size={16} />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
              <CreditCard size={48} className="mb-4" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50"
                >
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-slate-800" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-medium text-slate-200 line-clamp-1">{item.name}</h4>
                      <p className="text-sm font-bold text-white">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Totals & Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-10">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Tax (10%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-slate-800">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
             <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300">
                <PauseCircle className="mr-2 h-4 w-4" /> Hold
             </Button>
             <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300">
                <Tag className="mr-2 h-4 w-4" /> Discount
             </Button>
          </div>
          <Button 
            onClick={handlePayment}
            className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)]">
            Pay Now <span className="ml-2 opacity-80">${total.toFixed(2)}</span>
          </Button>
        </div>
      </div>

      {/* Mobile Cart Toggle Floating Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-30">
        <Button 
          onClick={() => setShowMobileCart(!showMobileCart)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 p-0 flex items-center justify-center relative"
        >
          <ShoppingCart size={24} />
          {cart.length > 0 && (
             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-950">
               {cart.reduce((a, b) => a + b.quantity, 0)}
             </span>
          )}
        </Button>
      </div>
    </div>
  );
}
