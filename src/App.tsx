import { useState, useEffect } from 'react';
import { Sprout, LogIn, LogOut, User } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { FarmerSetup } from './components/FarmerSetup';
import { FarmerDashboard } from './components/FarmerDashboard';
import { BuyerMarketplace } from './components/BuyerMarketplace';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [needsFarmerSetup, setNeedsFarmerSetup] = useState(false);

  useEffect(() => {
    if (user && profile?.user_type === 'farmer') {
      checkFarmerProfile();
    }
  }, [user, profile]);

  async function checkFarmerProfile() {
    const { data } = await supabase
      .from('farmer_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();

    setNeedsFarmerSetup(!data);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Sprout className="w-16 h-16 text-green-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sprout className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">FreshLocal</span>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold text-gray-900 mb-6">
              Connect Local Farmers with <span className="text-green-600">Your Community</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              A digital marketplace that directly connects local farmers with buyers, eliminating middlemen
              and building sustainable community food networks.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition text-lg font-semibold"
            >
              Get Started
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="text-4xl mb-4">🌾</div>
              <h3 className="text-xl font-bold mb-3">For Farmers</h3>
              <p className="text-gray-600">
                Showcase your products, manage inventory, and connect directly with buyers. No middlemen,
                better profits.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="text-4xl mb-4">🛒</div>
              <h3 className="text-xl font-bold mb-3">For Buyers</h3>
              <p className="text-gray-600">
                Discover fresh, local produce from trusted farmers near you. Support your community and
                eat healthier.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold mb-3">Build Trust</h3>
              <p className="text-gray-600">
                Reviews, ratings, and direct communication create transparent relationships between
                farmers and buyers.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200">
            <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">1</span>
                </div>
                <h4 className="font-semibold mb-2">Create Profile</h4>
                <p className="text-sm text-gray-600">Sign up as a farmer or buyer</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">2</span>
                </div>
                <h4 className="font-semibold mb-2">Discover Products</h4>
                <p className="text-sm text-gray-600">Browse local farms and their offerings</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">3</span>
                </div>
                <h4 className="font-semibold mb-2">Place Orders</h4>
                <p className="text-sm text-gray-600">Choose pickup or delivery</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">4</span>
                </div>
                <h4 className="font-semibold mb-2">Enjoy Fresh Food</h4>
                <p className="text-sm text-gray-600">Support local and eat healthy</p>
              </div>
            </div>
          </div>
        </div>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  if (profile?.user_type === 'farmer' && needsFarmerSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sprout className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">FreshLocal</span>
            </div>
            <button
              onClick={signOut}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </nav>
        <FarmerSetup onComplete={() => setNeedsFarmerSetup(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sprout className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">FreshLocal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <User className="w-5 h-5" />
              <span className="font-medium">{profile?.full_name}</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                {profile?.user_type}
              </span>
            </div>
            <button
              onClick={signOut}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {profile?.user_type === 'farmer' ? <FarmerDashboard /> : <BuyerMarketplace />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
