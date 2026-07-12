import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/special/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
    Barcode,
    IndianRupee,
    Pause,
    Percent,
    ShoppingCart,
    Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';

const sales = () => {
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
        <div className="flex h-screen flex-col bg-neutral-100">
            {/* TOP SECTION */}
            <div className="h-[15vh] shrink-0 border-b bg-white">
                <div className="grid h-full grid-cols-2 gap-4 p-4">
                    {/* <div className="rounded-lg border border-emerald-500 bg-white/95 p-4 backdrop-blur">
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

                    <div className="rounded-lg border border-amber-500 bg-white/95 p-4 backdrop-blur">
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

                    <div className="rounded-lg border border-emerald-500 bg-white/95 p-4 backdrop-blur">
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
                    </div> */}
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Customer Name"
                                className="w-full border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                            <Input
                                placeholder="Customer Mobile"
                                className="w-full border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>
                        <Input
                            placeholder="Customer Address"
                            className="w-full border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="GBINVOICE-2026-0001"
                            className="w-full border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <Input
                            type="date"
                            className="w-full border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                    </div>
                </div>
            </div>

            {/* MAIN POS SECTION */}
            <div className="flex h-[85vh] min-h-0 flex-1">
                <div className="flex w-[35%] flex-col border-r bg-white">
                    <div className="flex gap-4 border-b p-4">
                        <InputGroup>
                            <InputGroupInput
                                placeholder="Scan the barcode"
                                autoFocus
                            />
                            <InputGroupAddon>
                                <Barcode />
                            </InputGroupAddon>
                        </InputGroup>
                        <Button className="bg-yellow-500 text-white hover:bg-yellow-600">
                            <Pause /> Hold
                        </Button>
                        {/* <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                            <Play /> Resume
                        </Button> */}
                    </div>
                    <ScrollArea className="flex-1">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-linear-to-r from-emerald-700 to-emerald-800 text-white">
                                <tr>
                                    <th className="w-50 border-y py-2 pl-4 text-left">
                                        Product
                                    </th>
                                    <th className="w-5 border px-1 text-center">
                                        Qty
                                    </th>
                                    <th className="w-10 border px-1 text-center">
                                        Rate
                                    </th>
                                    <th className="w-10 border px-1 text-center">
                                        MRP
                                    </th>
                                    <th className="w-5 border px-1 text-center">
                                        Disc
                                    </th>
                                    <th className="w-15 border px-1 text-center">
                                        Total
                                    </th>
                                    <th className="w-5 border-y px-1">/</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="transition-colors hover:bg-emerald-50/50"
                                    >
                                        <td className="w-40 border-y py-1 pl-4">
                                            <div className="text-sm">
                                                {item.name}
                                            </div>
                                            <div className="text-[10px]">
                                                {item.barcode}
                                            </div>
                                        </td>
                                        <td className="border">
                                            <Input
                                                className="rounded-none border-0 p-0 text-center"
                                                value={item.qty}
                                            />
                                        </td>
                                        <td className="border">
                                            <Input
                                                className="rounded-none border-0 p-0 text-center"
                                                value={item.rate}
                                            />
                                        </td>
                                        <td className="border">
                                            <Input
                                                className="rounded-none border-0 p-0 text-center"
                                                value={item.mrp}
                                            />
                                        </td>
                                        <td className="border">
                                            <Input
                                                className="rounded-none border-0 p-0 text-center"
                                                value={item.disc}
                                            />
                                        </td>
                                        <td className="border">
                                            <Input
                                                className="rounded-none border-0 p-0 text-center"
                                                value={item.total}
                                            />
                                        </td>
                                        <td className="border-y text-center">
                                            <Button
                                                variant="ghost"
                                                className="rounded-1 text-red-400 hover:text-red-800"
                                            >
                                                <Trash2Icon />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ScrollArea>
                    <div className="">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-linear-to-r from-emerald-700 to-emerald-800 text-white">
                                <tr>
                                    <th className="w-15 border-y py-2 pl-4 text-left">
                                        ITEMS
                                    </th>
                                    <th className="w-15 border px-1 text-center">
                                        QTY
                                    </th>
                                    <th className="w-15 border px-1 text-center">
                                        DISCOUNT
                                    </th>
                                    <th className="w-15 border px-1 text-center">
                                        TAX
                                    </th>
                                    <th className="w-20 border px-1 text-center">
                                        TOTAL MRP
                                    </th>
                                    <th className="w-20 border-y px-1 text-center">
                                        TOTAL BILL
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <td className="border-y">
                                    <Input
                                        className="rounded-none border-0 p-0 text-center"
                                        value="999"
                                    />
                                </td>
                                <td className="border">
                                    <Input
                                        className="rounded-none border-0 p-0 text-center"
                                        value="999"
                                    />
                                </td>
                                <td className="border">
                                    <Input
                                        className="rounded-none border-0 p-0 text-center"
                                        value="999"
                                    />
                                </td>
                                <td className="border">
                                    <Input
                                        className="rounded-none border-0 p-0 text-center"
                                        value="999"
                                    />
                                </td>
                                <td className="border">
                                    <Input
                                        className="rounded-none border-0 p-0 text-center"
                                        value="999"
                                    />
                                </td>
                                <td className="border-y">
                                    <Input
                                        className="rounded-none border-0 p-0 text-center"
                                        value="999"
                                    />
                                </td>
                            </tbody>
                        </table>

                        <div className="grid grid-cols-2 gap-4 p-4">
                            <div className="space-y-2">
                                <Label className="text-s text-gray-700">
                                    Overall Discount on Invoice
                                </Label>
                                <div className="flex gap-2">
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
                                        <IndianRupee
                                            className={`h-4 w-4 transition-colors ${discountType === 'amount' ? 'text-emerald-600' : 'text-gray-400'}`}
                                        />
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="flex-1 border-2 border-emerald-300 font-semibold focus:border-emerald-600"
                                    />
                                </div>
                            </div>
                            <Button className="h-14 bg-linear-to-r from-emerald-600 to-emerald-700 text-lg font-bold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-emerald-800 hover:shadow-xl">
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                QUICK PAY
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex w-[10%] flex-col border-r bg-neutral-100">
                    <ScrollArea>
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
                                            ? 'scale-105 bg-linear-to-r from-emerald-600 to-emerald-700 text-white shadow-lg hover:from-emerald-700 hover:to-emerald-800'
                                            : 'border-2 border-emerald-300 bg-white text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50'
                                    }`}
                                    onClick={() => setSelectedCategory(cat.id)}
                                >
                                    {/* <div className="mb-1 text-2xl">
                                        {cat.icon}
                                    </div> */}
                                    <div className="text-center leading-tight font-semibold wrap-break-word">
                                        {cat.name}
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                <div className="flex flex-1 flex-col bg-neutral-100">
                    <ScrollArea>
                        <div className="flex-1 p-4">
                            <div className="grid grid-cols-6 gap-2">
                                {filteredProducts.map((product) => (
                                    <Card
                                        key={product.id}
                                        className="group cursor-pointer overflow-hidden border border-emerald-200 bg-white transition-all hover:border-emerald-500 hover:shadow-2xl active:scale-95"
                                    >
                                        <div className="flex h-full flex-col p-2">
                                            <div className="mb-3 text-center text-5xl transition-transform group-hover:scale-110">
                                                {product.img}
                                            </div>
                                            <div className="mb-2 line-clamp-2 h-8 text-left text-xs leading-tight text-gray-800">
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
                                                <div className="rounded-md bg-linear-to-r from-emerald-600 to-emerald-700 py-2 text-center text-sm font-bold text-white shadow-md">
                                                    ₹{product.price}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
};

export default sales;
