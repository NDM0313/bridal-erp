import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Eye,
  ArrowUpDown,
  Save,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '../../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

// Initial Mock Data
const INITIAL_PRODUCTS = [
  { id: 1, name: "Wireless Headphones", sku: "WH-001", category: "Electronics", price: 129.00, stock: 45, status: "In Stock" },
  { id: 2, name: "Smart Watch Gen 5", sku: "SW-005", category: "Electronics", price: 249.50, stock: 12, status: "Low Stock" },
  { id: 3, name: "Running Shoes", sku: "RS-102", category: "Apparel", price: 85.00, stock: 89, status: "In Stock" },
  { id: 4, name: "Leather Bag", sku: "LB-003", category: "Accessories", price: 150.00, stock: 0, status: "Out of Stock" },
  { id: 5, name: "Sunglasses", sku: "SG-022", category: "Accessories", price: 45.00, stock: 23, status: "In Stock" },
  { id: 6, name: "Mechanical Keyboard", sku: "MK-009", category: "Electronics", price: 180.00, stock: 5, status: "Low Stock" },
  { id: 7, name: "Coffee Mug", sku: "CM-055", category: "Home", price: 12.50, stock: 120, status: "In Stock" },
  { id: 8, name: "Notebook", sku: "NB-012", category: "Stationery", price: 5.00, stock: 200, status: "In Stock" },
];

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: string;
}

export function ProductList() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
    stock: "",
    status: "In Stock"
  });

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku,
        category: product.category,
        price: product.price.toString(),
        stock: product.stock.toString(),
        status: product.status
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        sku: "",
        category: "Electronics",
        price: "",
        stock: "",
        status: "In Stock"
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      // Update existing
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        status: formData.status
      } : p));
    } else {
      // Add new
      const newProduct: Product = {
        id: Math.max(...products.map(p => p.id)) + 1,
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        status: formData.status
      };
      setProducts(prev => [newProduct, ...prev]);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Management</h1>
          <p className="text-slate-400">Manage your catalog, stock levels, and prices.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300">
            <Download className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]"
            onClick={() => handleOpenDialog()}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <Input 
            type="text" 
            placeholder="Search by name, SKU, or category..." 
            className="w-full bg-slate-950 border-slate-800 pl-10 text-slate-200 focus-visible:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <select className="appearance-none bg-slate-950 border border-slate-800 rounded-lg pl-4 pr-10 py-2 text-slate-300 focus:outline-none focus:border-blue-500 h-10 text-sm">
              <option>All Categories</option>
              <option>Electronics</option>
              <option>Apparel</option>
              <option>Accessories</option>
              <option>Home</option>
              <option>Stationery</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
          </div>
          <div className="relative">
             <select className="appearance-none bg-slate-950 border border-slate-800 rounded-lg pl-4 pr-10 py-2 text-slate-300 focus:outline-none focus:border-blue-500 h-10 text-sm">
              <option>Status</option>
              <option>In Stock</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 text-sm">
                <th className="p-4 font-medium whitespace-nowrap">Product Name</th>
                <th className="p-4 font-medium whitespace-nowrap">SKU</th>
                <th className="p-4 font-medium whitespace-nowrap">Category</th>
                <th className="p-4 font-medium whitespace-nowrap">Price</th>
                <th className="p-4 font-medium whitespace-nowrap">Stock</th>
                <th className="p-4 font-medium whitespace-nowrap">Status</th>
                <th className="p-4 font-medium whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 text-sm divide-y divide-slate-800/50">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-4 font-medium text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs text-slate-500">
                          {product.name.substring(0, 2).toUpperCase()}
                        </div>
                        {product.name}
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">{product.sku}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-md bg-slate-800 text-xs text-slate-400 border border-slate-700">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4 font-mono">${product.price.toFixed(2)}</td>
                    <td className="p-4">{product.stock}</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium border",
                        product.status === "In Stock" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        product.status === "Low Stock" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        product.status === "Out of Stock" && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                      )}>
                        {product.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-400 hover:bg-slate-800">
                          <Eye size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                          onClick={() => handleOpenDialog(product)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="p-4 border-t border-slate-800/50 flex items-center justify-between text-sm text-slate-500">
          <span>Showing {filteredProducts.length} products</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 border-slate-800 text-slate-400 hover:text-white" disabled>Previous</Button>
            <Button variant="outline" size="sm" className="h-8 border-slate-800 text-slate-400 hover:text-white" disabled>Next</Button>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingProduct ? "Update product details below." : "Enter the details for the new product."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-slate-300">Name</Label>
              <Input 
                id="name" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="col-span-3 bg-slate-950 border-slate-800 text-slate-200" 
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sku" className="text-right text-slate-300">SKU</Label>
              <Input 
                id="sku" 
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                className="col-span-3 bg-slate-950 border-slate-800 text-slate-200" 
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right text-slate-300">Category</Label>
              <select 
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="col-span-3 bg-slate-950 border border-slate-800 rounded-md h-9 px-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option>Electronics</option>
                <option>Apparel</option>
                <option>Accessories</option>
                <option>Home</option>
                <option>Stationery</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right text-slate-300">Price</Label>
              <Input 
                id="price" 
                type="number" 
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="col-span-3 bg-slate-950 border-slate-800 text-slate-200" 
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right text-slate-300">Stock</Label>
              <Input 
                id="stock" 
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
                className="col-span-3 bg-slate-950 border-slate-800 text-slate-200" 
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right text-slate-300">Status</Label>
              <select 
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="col-span-3 bg-slate-950 border border-slate-800 rounded-md h-9 px-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
              </select>
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white">
                {editingProduct ? "Save Changes" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
