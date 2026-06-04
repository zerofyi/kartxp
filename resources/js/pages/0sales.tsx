import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Barcode,
    DollarSign,
    Minus,
    Package,
    Pause,
    Percent,
    Play,
    Plus,
    Search,
    ShoppingCart,
    X,
} from 'lucide-react';
import { useState } from 'react';

const SalesPOS = () => {
    const [discountType, setDiscountType] = useState('percentage');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Sample data
    const categories = [
        { id: 'all', name: 'All', icon: '📦' },
        { id: 'beverages', name: 'Beverages', icon: '🥤' },
        { id: 'snacks', name: 'Snacks', icon: '🍟' },
        { id: 'dairy', name: 'Dairy', icon: '🥛' },
        { id: 'bakery', name: 'Bakery', icon: '🍞' },
        { id: 'frozen', name: 'Frozen', icon: '🍦' },
        { id: 'canned', name: 'Canned', icon: '🥫' },
        { id: 'personal', name: 'Personal', icon: '🧴' },
    ];

    const products = [
        {
            id: 1,
            name: 'Coca Cola 330ml Can',
            price: 45,
            qty: 120,
            img: '🥤',
            category: 'beverages',
            barcode: '8901234567890',
        },
        {
            id: 2,
            name: 'Lays Classic Chips 52g',
            price: 20,
            qty: 85,
            img: '🍟',
            category: 'snacks',
            barcode: '8901234567891',
        },
        {
            id: 3,
            name: 'Amul Taaza Milk 1L',
            price: 65,
            qty: 45,
            img: '🥛',
            category: 'dairy',
            barcode: '8901234567892',
        },
        {
            id: 4,
            name: 'Modern Bread Loaf',
            price: 35,
            qty: 30,
            img: '🍞',
            category: 'bakery',
            barcode: '8901234567893',
        },
        {
            id: 5,
            name: 'Kwality Walls Ice Cream',
            price: 120,
            qty: 25,
            img: '🍦',
            category: 'frozen',
            barcode: '8901234567894',
        },
        {
            id: 6,
            name: 'Sprite 330ml Can',
            price: 45,
            qty: 95,
            img: '🥤',
            category: 'beverages',
            barcode: '8901234567895',
        },
        {
            id: 7,
            name: 'Kurkure Masala Munch',
            price: 20,
            qty: 70,
            img: '🌶️',
            category: 'snacks',
            barcode: '8901234567896',
        },
        {
            id: 8,
            name: 'Amul Lassi Cup 200ml',
            price: 25,
            qty: 55,
            img: '🥛',
            category: 'dairy',
            barcode: '8901234567897',
        },
        {
            id: 9,
            name: 'Britannia Cake 250g',
            price: 80,
            qty: 20,
            img: '🍰',
            category: 'bakery',
            barcode: '8901234567898',
        },
        {
            id: 10,
            name: 'McCain French Fries',
            price: 250,
            qty: 15,
            img: '🍕',
            category: 'frozen',
            barcode: '8901234567899',
        },
        {
            id: 11,
            name: 'Heinz Baked Beans',
            price: 55,
            qty: 40,
            img: '🥫',
            category: 'canned',
            barcode: '8901234567800',
        },
        {
            id: 12,
            name: 'Tuna Chunks Can',
            price: 85,
            qty: 35,
            img: '🥫',
            category: 'canned',
            barcode: '8901234567801',
        },
        {
            id: 13,
            name: 'Pepsi 330ml Can',
            price: 45,
            qty: 110,
            img: '🥤',
            category: 'beverages',
            barcode: '8901234567802',
        },
        {
            id: 14,
            name: 'Bingo Mad Angles',
            price: 20,
            qty: 65,
            img: '🍟',
            category: 'snacks',
            barcode: '8901234567803',
        },
        {
            id: 15,
            name: 'Dettol Handwash 200ml',
            price: 75,
            qty: 50,
            img: '🧴',
            category: 'personal',
            barcode: '8901234567804',
        },
        {
            id: 16,
            name: 'Colgate Toothpaste',
            price: 95,
            qty: 60,
            img: '🪥',
            category: 'personal',
            barcode: '8901234567805',
        },
        {
            id: 17,
            name: 'Parle-G Biscuits 376g',
            price: 40,
            qty: 90,
            img: '🍪',
            category: 'snacks',
            barcode: '8901234567806',
        },
        {
            id: 18,
            name: 'Nestle Maggi 280g',
            price: 48,
            qty: 75,
            img: '🍜',
            category: 'canned',
            barcode: '8901234567807',
        },
    ];

    const invoiceItems = [
        {
            id: 1,
            name: 'Coca Cola 330ml Can',
            barcode: '8901234567890',
            qty: 2,
            rate: 45,
            mrp: 50,
            disc: 0,
            total: 90,
        },
        {
            id: 2,
            name: 'Lays Classic Chips 52g',
            barcode: '8901234567891',
            qty: 1,
            rate: 20,
            mrp: 25,
            disc: 5,
            total: 15,
        },
        {
            id: 3,
            name: 'Amul Taaza Milk 1L',
            barcode: '8901234567892',
            qty: 3,
            rate: 65,
            mrp: 68,
            disc: 0,
            total: 195,
        },
    ];

    const filteredProducts = products.filter(
        (p) =>
            (selectedCategory === 'all' || p.category === selectedCategory) &&
            (searchQuery === '' ||
                p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    return (
        <div className="flex h-screen flex-col bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Top Section - 20% - Customer & Invoice Info */}
            <div className="h-[20vh] bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-xl">
                <div className="grid h-full grid-cols-3 gap-4 p-4">
                    <div className="rounded-lg border-l-4 border-emerald-500 bg-white/95 p-4 shadow-lg backdrop-blur">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold tracking-wide text-emerald-800 uppercase">
                                Customer
                            </h3>
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                Walk-in
                            </Badge>
                        </div>
                        <Input
                            placeholder="Search or scan customer..."
                            className="mb-2 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <div className="space-y-1 text-xs text-gray-700">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Name:</span>
                                <span className="font-semibold">
                                    Walk-in Customer
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Phone:</span>
                                <span className="font-semibold">-</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border-l-4 border-amber-500 bg-white/95 p-4 shadow-lg backdrop-blur">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold tracking-wide text-emerald-800 uppercase">
                                Invoice
                            </h3>
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                Active
                            </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-gray-700">
                            <div className="flex justify-between">
                                <span className="text-gray-500">
                                    Invoice #:
                                </span>
                                <span className="font-bold text-emerald-700">
                                    INV-2026-0001
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Date:</span>
                                <span className="font-semibold">
                                    {new Date().toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Time:</span>
                                <span className="font-semibold">
                                    {new Date().toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border-l-4 border-blue-500 bg-white/95 p-4 shadow-lg backdrop-blur">
                        <h3 className="mb-3 text-sm font-bold tracking-wide text-emerald-800 uppercase">
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                size="sm"
                                className="bg-emerald-600 text-white shadow-md hover:bg-emerald-700"
                            >
                                <ShoppingCart className="mr-1 h-4 w-4" />
                                New
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-2 border-emerald-500 text-emerald-700 shadow-md hover:bg-emerald-50"
                            >
                                <Package className="mr-1 h-4 w-4" />
                                Return
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="col-span-2 border-2 border-amber-500 text-amber-700 shadow-md hover:bg-amber-50"
                            >
                                <Pause className="mr-1 h-4 w-4" />
                                View Held Invoices
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section - 80% - Main POS */}
            <div className="flex h-[80vh] shadow-inner">
                {/* Left Section - 30% - Invoice Items */}
                <div className="flex w-[30%] flex-col border-r-4 border-emerald-600 bg-white shadow-xl">
                    {/* Top - Barcode & Buttons */}
                    <div className="space-y-3 border-b-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 p-4">
                        <div>
                            <Label className="mb-2 text-xs font-bold tracking-wide text-emerald-800 uppercase">
                                Barcode Scanner
                            </Label>
                            <div className="relative">
                                <Barcode className="absolute top-3 left-3 h-5 w-5 text-emerald-600" />
                                <Input
                                    placeholder="Scan or enter barcode..."
                                    className="h-11 border-2 border-emerald-300 pl-10 text-base font-medium focus:border-emerald-600 focus:ring-emerald-600"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="lg"
                                variant="outline"
                                className="flex-1 border-2 border-amber-500 font-semibold text-amber-700 shadow-md hover:bg-amber-50"
                            >
                                <Pause className="mr-2 h-4 w-4" />
                                Hold
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="flex-1 border-2 border-emerald-500 font-semibold text-emerald-700 shadow-md hover:bg-emerald-50"
                            >
                                <Play className="mr-2 h-4 w-4" />
                                Unhold
                            </Button>
                        </div>
                    </div>

                    {/* Middle - Invoice Items Table */}
                    <div className="flex-1 overflow-y-auto bg-gray-50">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md">
                                <tr>
                                    <th className="p-3 text-left font-bold tracking-wide uppercase">
                                        Product
                                    </th>
                                    <th className="w-16 p-3 text-center font-bold uppercase">
                                        Qty
                                    </th>
                                    <th className="w-16 p-3 text-right font-bold uppercase">
                                        Rate
                                    </th>
                                    <th className="w-16 p-3 text-right font-bold uppercase">
                                        MRP
                                    </th>
                                    <th className="w-16 p-3 text-right font-bold uppercase">
                                        Disc
                                    </th>
                                    <th className="w-20 p-3 text-right font-bold uppercase">
                                        Total
                                    </th>
                                    <th className="w-8 p-3"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {invoiceItems.map((item, idx) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-gray-200 transition-colors hover:bg-emerald-50/50"
                                    >
                                        <td className="p-3">
                                            <div className="text-sm font-semibold text-gray-800">
                                                {item.name}
                                            </div>
                                            <div className="font-mono text-xs text-gray-500">
                                                {item.barcode}
                                            </div>
                                        </td>
                                        <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0 hover:bg-emerald-100"
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    value={item.qty}
                                                    className="h-7 w-12 border-emerald-300 p-1 text-center font-semibold"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0 hover:bg-emerald-100"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="p-2 text-right">
                                            <Input
                                                type="number"
                                                value={item.rate}
                                                className="h-7 w-14 border-emerald-300 p-1 text-right font-semibold"
                                            />
                                        </td>
                                        <td className="p-2 text-right">
                                            <Input
                                                type="number"
                                                value={item.mrp}
                                                className="h-7 w-14 border-emerald-300 p-1 text-right font-semibold"
                                            />
                                        </td>
                                        <td className="p-2 text-right">
                                            <Input
                                                type="number"
                                                value={item.disc}
                                                className="h-7 w-14 border-emerald-300 p-1 text-right font-semibold"
                                            />
                                        </td>
                                        <td className="p-3 text-right text-sm font-bold text-emerald-700">
                                            ₹{item.total}
                                        </td>
                                        <td className="p-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom - Totals & Payment */}
                    <div className="space-y-3 border-t-4 border-emerald-600 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-inner">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded-lg border-l-4 border-blue-500 bg-white p-3 shadow-md">
                                <div className="text-[10px] font-semibold tracking-wide text-gray-600 uppercase">
                                    Items
                                </div>
                                <div className="mt-1 text-xl font-bold text-blue-700">
                                    3
                                </div>
                            </div>
                            <div className="rounded-lg border-l-4 border-purple-500 bg-white p-3 shadow-md">
                                <div className="text-[10px] font-semibold tracking-wide text-gray-600 uppercase">
                                    Qty
                                </div>
                                <div className="mt-1 text-xl font-bold text-purple-700">
                                    6
                                </div>
                            </div>
                            <div className="rounded-lg border-l-4 border-red-500 bg-white p-3 shadow-md">
                                <div className="text-[10px] font-semibold tracking-wide text-gray-600 uppercase">
                                    Disc
                                </div>
                                <div className="mt-1 text-xl font-bold text-red-600">
                                    ₹5
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-800 p-4 text-white shadow-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-semibold tracking-wide uppercase opacity-90">
                                        Grand Total
                                    </div>
                                    <div className="mt-1 text-3xl font-bold">
                                        ₹300.00
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs opacity-90">
                                        Tax (GST 5%)
                                    </div>
                                    <div className="text-lg font-bold">
                                        ₹14.29
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1 space-y-2">
                                <Label className="text-xs font-bold tracking-wide text-emerald-800 uppercase">
                                    Overall Discount
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="flex-1 border-2 border-emerald-300 font-semibold focus:border-emerald-600"
                                    />
                                    <div className="flex items-center gap-2 rounded-md border-2 border-emerald-300 bg-white px-3 shadow-sm">
                                        <Percent
                                            className={`h-4 w-4 transition-colors ${discountType === 'percentage' ? 'text-emerald-600' : 'text-gray-400'}`}
                                        />
                                        <Switch
                                            checked={discountType === 'amount'}
                                            onCheckedChange={(checked) =>
                                                setDiscountType(
                                                    checked
                                                        ? 'amount'
                                                        : 'percentage',
                                                )
                                            }
                                            className="data-[state=checked]:bg-emerald-600"
                                        />
                                        <DollarSign
                                            className={`h-4 w-4 transition-colors ${discountType === 'amount' ? 'text-emerald-600' : 'text-gray-400'}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button className="h-14 w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-lg font-bold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl">
                            <ShoppingCart className="mr-2 h-5 w-5" />
                            QUICK PAY
                        </Button>
                    </div>
                </div>

                {/* Center Section - 10% - Categories */}
                <div className="w-[10%] overflow-y-auto bg-gradient-to-b from-gray-100 to-gray-200 shadow-lg">
                    <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-700 to-emerald-800 p-2 shadow-md">
                        <Select
                            value={selectedCategory}
                            onValueChange={setSelectedCategory}
                        >
                            <SelectTrigger className="h-9 border-2 border-emerald-500 bg-white text-xs font-bold shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Categories
                                </SelectItem>
                                <SelectItem value="recent">
                                    Recently Added
                                </SelectItem>
                                <SelectItem value="popular">
                                    Most Popular
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 p-2">
                        {categories.map((cat) => (
                            <Button
                                key={cat.id}
                                variant={
                                    selectedCategory === cat.id
                                        ? 'default'
                                        : 'outline'
                                }
                                className={`flex h-auto w-full flex-col items-center justify-center px-2 py-4 text-xs shadow-md transition-all ${
                                    selectedCategory === cat.id
                                        ? 'scale-105 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg hover:from-emerald-700 hover:to-emerald-800'
                                        : 'border-2 border-emerald-300 bg-white text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50'
                                }`}
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                <div className="mb-1 text-2xl">{cat.icon}</div>
                                <div className="text-center leading-tight font-semibold break-words">
                                    {cat.name}
                                </div>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Right Section - 60% - Products Grid */}
                <div className="flex w-[60%] flex-col bg-gray-50">
                    {/* Search & Filter */}
                    <div className="border-b-2 border-emerald-200 bg-white p-4 shadow-md">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute top-3 left-3 h-5 w-5 text-emerald-600" />
                                <Input
                                    placeholder="Search products by name, barcode..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="h-11 border-2 border-emerald-300 pl-10 text-base font-medium focus:border-emerald-600 focus:ring-emerald-600"
                                />
                            </div>
                            <Select>
                                <SelectTrigger className="h-11 w-40 border-2 border-emerald-300 font-semibold shadow-sm">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">
                                        Name (A-Z)
                                    </SelectItem>
                                    <SelectItem value="price-low">
                                        Price: Low to High
                                    </SelectItem>
                                    <SelectItem value="price-high">
                                        Price: High to Low
                                    </SelectItem>
                                    <SelectItem value="stock">
                                        Stock Quantity
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Products Grid - 6 columns */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-6 gap-3">
                            {filteredProducts.map((product) => (
                                <Card
                                    key={product.id}
                                    className="group cursor-pointer overflow-hidden border-2 border-emerald-200 bg-white transition-all hover:border-emerald-500 hover:shadow-2xl active:scale-95"
                                >
                                    <div className="flex h-full flex-col p-3">
                                        <div className="mb-2 text-center text-5xl transition-transform group-hover:scale-110">
                                            {product.img}
                                        </div>
                                        <div className="mb-2 line-clamp-2 h-8 text-center text-xs leading-tight font-bold text-gray-800">
                                            {product.name}
                                        </div>
                                        <div className="mt-auto space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium text-gray-500">
                                                    Stock:
                                                </span>
                                                <Badge
                                                    variant={
                                                        product.qty > 50
                                                            ? 'default'
                                                            : 'destructive'
                                                    }
                                                    className={
                                                        product.qty > 50
                                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                                            : ''
                                                    }
                                                >
                                                    {product.qty}
                                                </Badge>
                                            </div>
                                            <div className="rounded-md bg-gradient-to-r from-emerald-600 to-emerald-700 py-2 text-center text-sm font-bold text-white shadow-md">
                                                ₹{product.price}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesPOS;
