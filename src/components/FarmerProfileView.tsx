import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Clock, Star, MessageSquare, ShoppingCart } from 'lucide-react';
import { FarmerProfile, Product } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FarmerProfileViewProps {
  farmer: FarmerProfile & { products: Product[]; avgRating: number };
  onBack: () => void;
  onAddToCart: (product: Product, farmer: FarmerProfile) => void;
}

export function FarmerProfileView({ farmer, onBack, onAddToCart }: FarmerProfileViewProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*, buyer:profiles!reviews_buyer_id_fkey(full_name)')
      .eq('farmer_id', farmer.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setReviews(data);
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      alert('Please sign in to leave a review.');
      return;
    }
    if (rating < 1 || rating > 5) {
      alert('Please select a rating between 1 and 5.');
      return;
    }

    try {
      setSubmittingReview(true);
      await supabase.from('reviews').insert({
        farmer_id: farmer.id,
        buyer_id: user.id,
        rating,
        comment: reviewComment.trim() || null,
      });
      setRating(0);
      setHoverRating(0);
      setReviewComment('');
      await loadReviews();
      alert('Thank you for your review!');
    } finally {
      setSubmittingReview(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    await supabase.from('messages').insert({
      sender_id: user?.id,
      recipient_id: farmer.user_id,
      content: message,
    });

    setMessage('');
    setShowMessageForm(false);
    alert('Message sent successfully!');
  }

  const groupedProducts = farmer.products.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Marketplace
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="h-64 bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
          <div className="text-9xl">🌾</div>
        </div>

        <div className="p-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{farmer.farm_name}</h1>
              {farmer.address && (
                <div className="flex items-center text-gray-600 mb-2">
                  <MapPin className="w-5 h-5 mr-2" />
                  {farmer.address}
                </div>
              )}
              {farmer.avgRating > 0 && (
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mr-1" />
                  <span className="font-semibold text-lg">{farmer.avgRating}</span>
                  <span className="text-gray-600 ml-2">({reviews.length} reviews)</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowMessageForm(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Contact Farmer
            </button>
          </div>

          {farmer.description && (
            <p className="text-gray-700 mb-6 text-lg">{farmer.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {farmer.farm_size && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Farm Size</p>
                <p className="font-semibold">{farmer.farm_size}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Delivery Radius</p>
              <p className="font-semibold">{farmer.delivery_radius_km} km</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Pickup</p>
              <p className="font-semibold">{farmer.pickup_available ? 'Available' : 'Not Available'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Delivery</p>
              <p className="font-semibold">{farmer.delivery_available ? 'Available' : 'Not Available'}</p>
            </div>
          </div>

          {farmer.farming_practices.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Farming Practices</h3>
              <div className="flex flex-wrap gap-2">
                {farmer.farming_practices.map(practice => (
                  <span
                    key={practice}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-full font-medium"
                  >
                    {practice}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Products</h2>
        {Object.keys(groupedProducts).length === 0 ? (
          <p className="text-gray-500">No products available at the moment</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedProducts).map(([category, products]) => (
              <div key={category}>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 capitalize">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map(product => (
                    <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h4 className="font-semibold text-lg mb-1">{product.name}</h4>
                      {product.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xl font-bold text-green-600">
                          ${product.price_per_unit} / {product.unit}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Available: {product.available_quantity} {product.unit}
                      </p>
                      <button
                        onClick={() => onAddToCart(product, farmer)}
                        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave a Review */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Leave a Review</h2>
        <form onSubmit={submitReview} className="space-y-4">
          <div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const value = i + 1;
                const filled = (hoverRating || rating) >= value;
                return (
                  <button
                    key={value}
                    type="button"
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(value)}
                    className="p-1"
                    aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                  >
                    <Star className={`w-6 h-6 ${filled ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                  </button>
                );
              })}
              {rating > 0 && <span className="ml-2 text-sm text-gray-600">{rating} / 5</span>}
            </div>
          </div>

          <div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share details about your experience (optional)"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submittingReview}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-60"
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>

      {reviews.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{review.buyer?.full_name || 'Anonymous'}</span>
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-gray-700">{review.comment}</p>}
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showMessageForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Contact {farmer.farm_name}</h3>
            <form onSubmit={sendMessage}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4"
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowMessageForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
