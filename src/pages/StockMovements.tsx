import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ArrowUpDown } from 'lucide-react';

interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: string;
  notes: string;
  created_at: string;
  products: {
    name: string;
    sku: string;
  };
}

export function StockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 0,
    movement_type: 'adjustment',
    notes: '',
  });

  useEffect(() => {
    fetchStockMovements();
    fetchProducts();
  }, []);

  const fetchStockMovements = async () => {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        products (
          name,
          sku
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching stock movements:', error);
      return;
    }

    setMovements(data || []);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .order('name');
    
    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    setProducts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert([formData]);

    if (movementError) {
      console.error('Error creating stock movement:', movementError);
      return;
    }

    // Update product stock quantity
    const { error: updateError } = await supabase
      .from('products')
      .update({
        stock_quantity: supabase.rpc('increment', { x: formData.quantity })
      })
      .eq('id', formData.product_id);

    if (updateError) {
      console.error('Error updating product stock:', updateError);
      return;
    }

    setIsModalOpen(false);
    setFormData({
      product_id: '',
      quantity: 0,
      movement_type: 'adjustment',
      notes: '',
    });
    fetchStockMovements();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Stock Movements</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
        >
          <ArrowUpDown className="w-4 h-4 mr-2" />
          Record Movement
        </button>
      </div>

      {/* Stock Movements Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(movement.created_at), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {movement.products.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {movement.products.sku}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${movement.quantity > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'}`}
                  >
                    {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {movement.movement_type}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {movement.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Record Stock Movement</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity (use negative for removals)
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Movement Type
                </label>
                <select
                  value={formData.movement_type}
                  onChange={(e) => setFormData({ ...formData, movement_type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="adjustment">Adjustment</option>
                  <option value="purchase">Purchase</option>
                  <option value="return">Return</option>
                  <option value="loss">Loss/Damage</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}