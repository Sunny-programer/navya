import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Package } from 'lucide-react';
import { supabase, Product } from '../lib/supabase';

interface ProductManagerProps {
  farmerId: string;
  products: Product[];
  onUpdate: () => void;
  openSignal?: number;
}

export function ProductManager({ farmerId, products, onUpdate, openSignal }: ProductManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'vegetables',
    price_per_unit: 0,
    unit: 'kg',
    available_quantity: 0,
    min_order_quantity: 1,
    image_url: '',
  });

  const categories = ['Vegetables', 'Fruits', 'Dairy', 'Meat', 'Eggs', 'Honey', 'Grains', 'Herbs', 'Other'];
  const units = ['kg', 'lb', 'bunch', 'dozen', 'jar', 'bottle', 'bag', 'piece'];

  // Open the form when an external signal is received
  // This lets parent components trigger the "Add Product" modal
  useEffect(() => {
    if (openSignal && openSignal > 0) {
      openForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  function openForm(product?: Product) {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        category: product.category,
        price_per_unit: product.price_per_unit,
        unit: product.unit,
        available_quantity: product.available_quantity,
        min_order_quantity: product.min_order_quantity,
        image_url: product.image_url || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        category: 'vegetables',
        price_per_unit: 0,
        unit: 'kg',
        available_quantity: 0,
        min_order_quantity: 1,
        image_url: '',
      });
    }
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingProduct) {
      await supabase
        .from('products')
        .update(formData)
        .eq('id', editingProduct.id);
    } else {
      await supabase
        .from('products')
        .insert({ ...formData, farmer_id: farmerId });
    }

    setShowForm(false);
    onUpdate();
  }

  async function handleDelete(productId: string) {
    if (confirm('Are you sure you want to delete this product?')) {
      await supabase.from('products').delete().eq('id', productId);
      onUpdate();
    }
  }

  async function toggleAvailability(product: Product) {
    await supabase
      .from('products')
      .update({ is_available: !product.is_available })
      .eq('id', product.id);
    onUpdate();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Product Catalog</h3>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No products yet</p>
          <button
            onClick={() => openForm()}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Add your first product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
              )}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-lg">{product.name}</h4>
                  <p className="text-sm text-gray-500 capitalize">{product.category}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openForm(product)}
                    className="text-gray-400 hover:text-green-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-bold text-green-600">
                  ${product.price_per_unit} / {product.unit}
                </span>
                <span className="text-sm text-gray-600">
                  Stock: {product.available_quantity} {product.unit}
                </span>
              </div>

              <button
                onClick={() => toggleAvailability(product)}
                className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                  product.is_available
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {product.is_available ? 'Available' : 'Unavailable'}
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_per_unit}
                    onChange={(e) => setFormData({ ...formData, price_per_unit: parseFloat(e.target.value) })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.available_quantity}
                    onChange={(e) => setFormData({ ...formData, available_quantity: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.min_order_quantity}
                    onChange={(e) => setFormData({ ...formData, min_order_quantity: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
