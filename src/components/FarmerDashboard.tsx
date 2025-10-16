import { useState, useEffect } from 'react';
import { Package, ShoppingBag, MessageSquare, TrendingUp, Plus } from 'lucide-react';
import { supabase, FarmerProfile, Product, Order } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ProductManager } from './ProductManager';
import { OrderManager } from './OrderManager';
import { MessagingPanel } from './MessagingPanel';

export function FarmerDashboard() {
  const { user } = useAuth();
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ totalProducts: 0, activeOrders: 0, totalRevenue: 0, avgRating: 0 });
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'messages'>('overview');
  const [openProductFormSignal, setOpenProductFormSignal] = useState(0);

  useEffect(() => {
    if (user) {
      loadFarmerData();
    }
  }, [user]);

  async function loadFarmerData() {
    const { data: profile } = await supabase
      .from('farmer_profiles')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (profile) {
      setFarmerProfile(profile);
      loadProducts(profile.id);
      loadOrders(profile.id);
      loadStats(profile.id);
    }
  }

  async function loadProducts(farmerId: string) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (data) setProducts(data);
  }

  async function loadOrders(farmerId: string) {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
  }

  async function loadStats(farmerId: string) {
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('farmer_id', farmerId);

    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, status')
      .eq('farmer_id', farmerId);

    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('farmer_id', farmerId);

    const activeOrders = orders?.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length || 0;
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const avgRating = reviews?.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    setStats({
      totalProducts: products?.length || 0,
      activeOrders,
      totalRevenue,
      avgRating: Math.round(avgRating * 10) / 10,
    });
  }

  if (!farmerProfile) return null;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{farmerProfile.farm_name}</h1>
        <p className="text-gray-600">Manage your farm, products, and orders</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold">{stats.totalProducts}</span>
          </div>
          <p className="text-gray-600 text-sm">Total Products</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold">{stats.activeOrders}</span>
          </div>
          <p className="text-gray-600 text-sm">Active Orders</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
            <span className="text-2xl font-bold">${stats.totalRevenue.toFixed(0)}</span>
          </div>
          <p className="text-gray-600 text-sm">Total Revenue</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">⭐</span>
            <span className="text-2xl font-bold">{stats.avgRating || 'N/A'}</span>
          </div>
          <p className="text-gray-600 text-sm">Average Rating</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'products', label: 'Products' },
              { id: 'orders', label: 'Orders' },
              { id: 'messages', label: 'Messages' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 font-medium transition ${
                  activeTab === tab.id
                    ? 'border-b-2 border-green-600 text-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
                {orders.slice(0, 5).length === 0 ? (
                  <p className="text-gray-500">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${order.total_amount.toFixed(2)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <button
                  onClick={() => {
                    setActiveTab('products');
                    setOpenProductFormSignal(Date.now());
                  }}
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  Add Product
                </button>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <ProductManager
              farmerId={farmerProfile.id}
              products={products}
              onUpdate={loadFarmerData}
              openSignal={openProductFormSignal}
            />
          )}

          {activeTab === 'orders' && (
            <OrderManager orders={orders} onUpdate={loadFarmerData} />
          )}

          {activeTab === 'messages' && (
            <MessagingPanel />
          )}
        </div>
      </div>
    </div>
  );
}
