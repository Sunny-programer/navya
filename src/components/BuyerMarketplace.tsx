import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Heart, ShoppingCart, MessageSquare, Map } from 'lucide-react';
import { supabase, FarmerProfile, Product } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FarmerProfileView } from './FarmerProfileView';
import { Cart } from './Cart';
import { FarmersMap } from './FarmersMap';

export function BuyerMarketplace() {
  const { user } = useAuth();
  const [farmers, setFarmers] = useState<(FarmerProfile & { products: Product[]; avgRating: number })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFarmer, setSelectedFarmer] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState<{ product: Product; quantity: number; farmer: FarmerProfile }[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);
  const [buyerLocation, setBuyerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [deliverToMeOnly, setDeliverToMeOnly] = useState(false);
  const [pickupOnly, setPickupOnly] = useState(false);

  const categories = ['All', 'Vegetables', 'Fruits', 'Dairy', 'Meat', 'Eggs', 'Honey', 'Grains', 'Herbs'];

  useEffect(() => {
    loadFarmers();
    if (user) loadFavorites();
    // try to get buyer location once
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setBuyerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, [user]);

  async function loadFarmers() {
    const { data: farmerProfiles } = await supabase
      .from('farmer_profiles')
      .select('*');

    if (!farmerProfiles) return;

    const farmersWithData = await Promise.all(
      farmerProfiles.map(async (farmer) => {
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('farmer_id', farmer.id)
          .eq('is_available', true);

        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('farmer_id', farmer.id);

        const avgRating = reviews?.length
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

        return {
          ...farmer,
          products: products || [],
          avgRating: Math.round(avgRating * 10) / 10,
        };
      })
    );

    setFarmers(farmersWithData);
  }

  async function loadFavorites() {
    const { data } = await supabase
      .from('favorites')
      .select('farmer_id')
      .eq('buyer_id', user?.id);

    if (data) {
      setFavorites(new Set(data.map(f => f.farmer_id)));
    }
  }

  function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371; // km
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  }

  async function toggleFavorite(farmerId: string) {
    if (favorites.has(farmerId)) {
      await supabase
        .from('favorites')
        .delete()
        .eq('buyer_id', user?.id)
        .eq('farmer_id', farmerId);
      setFavorites(prev => {
        const next = new Set(prev);
        next.delete(farmerId);
        return next;
      });
    } else {
      await supabase
        .from('favorites')
        .insert({ buyer_id: user?.id, farmer_id: farmerId });
      setFavorites(prev => new Set(prev).add(farmerId));

      // Notify the farmer
      const { data: farmerProfile } = await supabase
        .from('farmer_profiles')
        .select('user_id, farm_name')
        .eq('id', farmerId)
        .maybeSingle();
      if (farmerProfile?.user_id) {
        await supabase.from('notifications').insert({
          recipient_id: farmerProfile.user_id,
          type: 'favorited',
          title: 'New Favorite',
          message: `Your farm ${farmerProfile.farm_name} was added to favorites`,
          meta: { buyer_id: user?.id, farmer_id: farmerId },
        });
      }
    }
  }

  function addToCart(product: Product, farmer: FarmerProfile) {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, farmer }];
    });
  }

  const filteredFarmers = farmers.filter(farmer => {
    const matchesSearch = farmer.farm_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farmer.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' ||
      farmer.products.some(p => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());

    let matchesDelivery = true;
    if (deliverToMeOnly && buyerLocation && typeof farmer.latitude === 'number' && typeof farmer.longitude === 'number') {
      if (farmer.delivery_available && farmer.delivery_radius_km && farmer.delivery_radius_km > 0) {
        const distance = haversineKm(buyerLocation, { lat: farmer.latitude, lng: farmer.longitude });
        matchesDelivery = distance <= farmer.delivery_radius_km;
      } else {
        matchesDelivery = false;
      }
    }

    const matchesPickup = !pickupOnly || farmer.pickup_available === true;

    return matchesSearch && matchesCategory && matchesDelivery && matchesPickup;
  });

  if (selectedFarmer) {
    const farmer = farmers.find(f => f.id === selectedFarmer);
    if (farmer) {
      return (
        <FarmerProfileView
          farmer={farmer}
          onBack={() => setSelectedFarmer(null)}
          onAddToCart={addToCart}
        />
      );
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Local Food Marketplace</h1>
          <p className="text-gray-600">Discover fresh, local produce from farmers near you</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPickupOnly(v => !v)}
            className={`px-4 py-3 rounded-lg border ${pickupOnly ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Pickup available
          </button>
          <button
            onClick={() => setDeliverToMeOnly(v => !v)}
            disabled={!buyerLocation}
            className={`px-4 py-3 rounded-lg border ${deliverToMeOnly ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'} ${!buyerLocation ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={!buyerLocation ? 'Turn on location to enable this filter' : ''}
          >
            Deliver to me
          </button>
          <button
            onClick={() => setShowMap((v) => !v)}
            className={`px-4 py-3 rounded-lg border ${showMap ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'} flex items-center gap-2`}
          >
            <Map className="w-5 h-5" />
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>

          <button
            onClick={() => setShowCart(true)}
            className="relative bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            Cart
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search farmers, products..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category.toLowerCase())}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === category.toLowerCase()
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {showMap && (
        <div className="mb-6">
          <FarmersMap farmers={filteredFarmers} buyerLocation={buyerLocation} />
        </div>
      )}

      {filteredFarmers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No farmers found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFarmers.map(farmer => (
            <div
              key={farmer.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition cursor-pointer"
              onClick={() => setSelectedFarmer(farmer.id)}
            >
              <div className="h-48 bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                <div className="text-6xl">🌾</div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{farmer.farm_name}</h3>
                    {farmer.address && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-1" />
                        {farmer.address}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(farmer.id);
                    }}
                    className="text-gray-400 hover:text-red-500 transition"
                  >
                    <Heart className={`w-5 h-5 ${favorites.has(farmer.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                </div>

                {farmer.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{farmer.description}</p>
                )}

                <div className="flex items-center gap-2 mb-3">
                  {farmer.avgRating > 0 && (
                    <div className="flex items-center text-sm">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span className="font-medium">{farmer.avgRating}</span>
                    </div>
                  )}
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">{farmer.products.length} products</span>
                </div>

                {farmer.farming_practices.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {farmer.farming_practices.slice(0, 3).map(practice => (
                      <span
                        key={practice}
                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                      >
                        {practice}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {farmer.pickup_available && (
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">Pickup</span>
                  )}
                  {farmer.delivery_available && (
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded">Delivery</span>
                  )}
                  {buyerLocation && typeof farmer.latitude === 'number' && typeof farmer.longitude === 'number' && farmer.delivery_available && farmer.delivery_radius_km > 0 && (
                    (() => {
                      const dist = haversineKm(buyerLocation, { lat: farmer.latitude, lng: farmer.longitude });
                      const within = dist <= farmer.delivery_radius_km;
                      return (
                        <span className={`${within ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} px-2 py-1 rounded`}>
                          {within ? 'Can deliver to you' : `Out of range (${dist.toFixed(1)} km)`}
                        </span>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCart && (
        <Cart
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdateCart={setCart}
        />
      )}
    </div>
  );
}
