import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function PurchaseForm() {
  const [vendor, setVendor] = useState({
    mobile: '',
    name: '',
    category: ''
  });

  const [products, setProducts] = useState([
    {
      id: 1,
      name: '',
      variant_name: '',
      unit: '',
      qty: '',
      purchase_rate: '',
      sale_rate: '',
      mrp: '',
      barcode: ''
    }
  ]);

  const addNewRow = () => {
    const newProduct = {
      id: Date.now(),
      name: '',
      variant_name: '',
      unit: '',
      qty: '',
      purchase_rate: '',
      sale_rate: '',
      mrp: '',
      barcode: ''
    };
    setProducts([...products, newProduct]);
  };

  const deleteRow = (id: number) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const updateProduct = (id: number, field: string, value: string) => {
    setProducts(products.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const updateVendor = (field: string, value: string) => {
    setVendor({ ...vendor, [field]: value });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Purchase Entry</h1>

        {/* Vendor Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Vendor Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor Mobile
              </label>
              <input
                type="tel"
                value={vendor.mobile}
                onChange={(e) => updateVendor('mobile', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter mobile number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor Name
              </label>
              <input
                type="text"
                value={vendor.name}
                onChange={(e) => updateVendor('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter vendor name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Category
              </label>
              <input
                type="text"
                value={vendor.category}
                onChange={(e) => updateVendor('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter category"
              />
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Products</h2>
            <button
              onClick={addNewRow}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">Product Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">Variant</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">Unit</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">Qty</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">Purchase Rate</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">Sale Rate</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">MRP</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">Barcode</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={product.variant_name}
                        onChange={(e) => updateProduct(product.id, 'variant_name', e.target.value)}
                        className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={product.unit}
                        onChange={(e) => updateProduct(product.id, 'unit', e.target.value)}
                        className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="kg/pcs"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={product.qty}
                        onChange={(e) => updateProduct(product.id, 'qty', e.target.value)}
                        className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={product.purchase_rate}
                        onChange={(e) => updateProduct(product.id, 'purchase_rate', e.target.value)}
                        className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={product.sale_rate}
                        onChange={(e) => updateProduct(product.id, 'sale_rate', e.target.value)}
                        className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="number"
                        value={product.mrp}
                        onChange={(e) => updateProduct(product.id, 'mrp', e.target.value)}
                        className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        value={product.barcode}
                        onChange={(e) => updateProduct(product.id, 'barcode', e.target.value)}
                        className="w-full px-2 py-1 border-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <button
                        onClick={() => deleteRow(product.id)}
                        disabled={products.length === 1}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors font-medium">
              Save Purchase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
