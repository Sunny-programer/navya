import { useState } from 'react';
import { Order } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface OrderManagerProps {
  orders: Order[];
  onUpdate: () => void;
}

export function OrderManager({ orders, onUpdate }: OrderManagerProps) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Order['status']>('all');

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  async function updateOrderStatus(orderId: string, status: Order['status']) {
    await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    // Load order to notify buyer
    const { data: order } = await supabase
      .from('orders')
      .select('buyer_id, farmer_id')
      .eq('id', orderId)
      .maybeSingle();

    if (order?.buyer_id) {
      await supabase.from('order_events').insert({
        order_id: orderId,
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: 'status_change',
        status,
      });
      await supabase.from('notifications').insert({
        recipient_id: order.buyer_id,
        type: 'order_status_changed',
        title: 'Order update',
        message: `Your order ${orderId.slice(0, 8)} is now ${status}`,
        meta: { order_id: orderId, status },
      });
    }
    onUpdate();
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        {['all', 'pending', 'confirmed', 'ready', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === status
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="border border-gray-200 rounded-lg">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold">Order #{order.id.slice(0, 8)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString()} • {order.delivery_method}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-green-600">
                    ${order.total_amount.toFixed(2)}
                  </span>
                  {expandedOrder === order.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedOrder === order.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Delivery Method</p>
                      <p className="font-medium capitalize">{order.delivery_method}</p>
                    </div>
                    {order.delivery_address && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Delivery Address</p>
                        <p className="font-medium">{order.delivery_address}</p>
                      </div>
                    )}
                    {order.delivery_date && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Delivery Date</p>
                        <p className="font-medium">{new Date(order.delivery_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {order.notes && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 mb-1">Notes</p>
                        <p className="font-medium">{order.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mr-2">Update Status:</p>
                    {['pending', 'confirmed', 'ready', 'completed'].map(status => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(order.id, status as Order['status'])}
                        disabled={order.status === status}
                        className={`px-3 py-1 rounded text-sm font-medium transition ${
                          order.status === status
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      disabled={order.status === 'cancelled' || order.status === 'completed'}
                      className="px-3 py-1 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
