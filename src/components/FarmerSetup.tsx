import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FarmerSetupProps {
  onComplete: () => void;
}

export function FarmerSetup({ onComplete }: FarmerSetupProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    farm_name: '',
    description: '',
    farm_size: '',
    address: '',
    delivery_radius_km: 10,
    pickup_available: true,
    delivery_available: false,
  });
  const [practices, setPractices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const practiceOptions = ['Organic', 'Sustainable', 'Pesticide-Free', 'GMO-Free', 'Regenerative'];

  function togglePractice(practice: string) {
    setPractices(prev =>
      prev.includes(practice)
        ? prev.filter(p => p !== practice)
        : [...prev, practice]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('farmer_profiles').insert({
        user_id: user.id,
        ...formData,
        farming_practices: practices,
      });

      if (insertError) throw insertError;
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to create farmer profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Complete Your Farm Profile</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Farm Name *
          </label>
          <input
            type="text"
            value={formData.farm_name}
            onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Tell buyers about your farm..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Farm Size
            </label>
            <input
              type="text"
              value={formData.farm_size}
              onChange={(e) => setFormData({ ...formData, farm_size: e.target.value })}
              placeholder="e.g., 50 acres"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Radius (km)
            </label>
            <input
              type="number"
              value={formData.delivery_radius_km}
              onChange={(e) => setFormData({ ...formData, delivery_radius_km: parseInt(e.target.value) })}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Farm address or general location"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Farming Practices
          </label>
          <div className="flex flex-wrap gap-2">
            {practiceOptions.map(practice => (
              <button
                key={practice}
                type="button"
                onClick={() => togglePractice(practice)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  practices.includes(practice)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {practice}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.pickup_available}
              onChange={(e) => setFormData({ ...formData, pickup_available: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Pickup Available</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.delivery_available}
              onChange={(e) => setFormData({ ...formData, delivery_available: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Delivery Available</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
        >
          {loading ? 'Creating Profile...' : 'Complete Setup'}
        </button>
      </form>
    </div>
  );
}
