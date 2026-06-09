import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Barcode,
    Minus,
    Pause,
    Play,
    Plus,
    Search,
    ShoppingCart,
    X,
} from 'lucide-react';
import React from 'react';

/**
 * Brand-focused POS layout
 * - Calm, professional, not crowded
 * - Strong focus on barcode, invoice, and pay
 * - Adaptive (works even if not fullscreen)
 */
const Sales: React.FC = () => {
    return (
        <div className="flex h-screen flex-col bg-neutral-100">
            {/* TOP BAR (compact, neutral) */}
            <div className="shrink-0 border-b bg-white">
                <div className="grid grid-cols-4 gap-4 p-4">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                            Customer
                        </Label>
                        <Input placeholder="Walk-in customer" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                            Invoice
                        </Label>
                        <Input value="#AUTO" disabled />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                            Date
                        </Label>
                        <Input type="date" />
                    </div>
                    <div className="flex items-end gap-2">
                        <Button variant="outline" className="flex-1">
                            <Pause className="mr-1 h-4 w-4" /> Hold
                        </Button>
                        <Button variant="outline" className="flex-1">
                            <Play className="mr-1 h-4 w-4" /> Resume
                        </Button>
                    </div>
                </div>
            </div>

            {/* MAIN POS */}
            <div className="flex min-h-0 flex-1">
                {/* LEFT — INVOICE */}
                <div className="flex w-[32%] min-w-[380px] flex-col border-r bg-white">
                    {/* Barcode */}
                    <div className="space-y-2 border-b p-3">
                        <Label className="text-xs font-semibold text-emerald-700">
                            Barcode
                        </Label>
                        <div className="relative">
                            <Barcode className="absolute top-3 left-3 h-4 w-4 text-emerald-600" />
                            <Input
                                className="h-11 pl-9"
                                placeholder="Scan barcode"
                            />
                        </div>
                    </div>

                    {/* Invoice Table */}
                    <div className="min-h-0 flex-1 overflow-auto">
                        <Table className="text-xs">
                            <TableHeader className="sticky top-0 bg-emerald-600 text-white">
                                <TableRow>
                                    <TableHead className="text-white">
                                        Item
                                    </TableHead>
                                    <TableHead className="w-16 text-center text-white">
                                        Qty
                                    </TableHead>
                                    <TableHead className="w-16 text-right text-white">
                                        Rate
                                    </TableHead>
                                    <TableHead className="w-16 text-right text-white">
                                        Disc
                                    </TableHead>
                                    <TableHead className="w-20 text-right text-white">
                                        Total
                                    </TableHead>
                                    <TableHead className="w-6" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[1, 2, 3]?.map((i) => (
                                    <TableRow
                                        key={i}
                                        className="hover:bg-emerald-50"
                                    >
                                        <TableCell>
                                            <div className="font-medium">
                                                Product Name
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                890123456
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6"
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <Input
                                                    className="h-7 w-10 text-center"
                                                    value={1}
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                className="h-7 w-14 text-right"
                                                value={100}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                className="h-7 w-14 text-right"
                                                value={0}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-emerald-700">
                                            100
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-red-500"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Totals (compact, focused) */}
                    <div className="space-y-3 border-t bg-neutral-50 p-3">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Total</span>
                            <span className="text-lg font-bold text-emerald-700">
                                ₹300.00
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <Input placeholder="Discount" className="flex-1" />
                            <div className="flex items-center gap-2 rounded-md border bg-white px-2">
                                <span className="text-xs">%</span>
                                <Switch />
                                <span className="text-xs">₹</span>
                            </div>
                        </div>

                        <Button className="h-12 w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-lg font-bold hover:from-emerald-700 hover:to-emerald-800">
                            <ShoppingCart className="mr-2 h-5 w-5" /> Quick Pay
                        </Button>
                    </div>
                </div>

                {/* CENTER — CATEGORIES */}
                <div className="flex w-[10%] min-w-[120px] flex-col border-r bg-neutral-100">
                    <div className="border-b bg-white p-2">
                        <Select>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="popular">Popular</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 space-y-2 overflow-auto p-2">
                        {Array.from({ length: 8 })?.map((_, i) => (
                            <Button
                                key={i}
                                variant={i === 0 ? 'default' : 'outline'}
                                className="h-12 w-full text-xs"
                            >
                                Category {i + 1}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* RIGHT — PRODUCTS */}
                <div className="flex flex-1 flex-col bg-neutral-50">
                    <div className="flex gap-2 border-b bg-white p-3">
                        <div className="relative flex-1">
                            <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                placeholder="Search products or barcode"
                            />
                        </div>
                        <Select>
                            <SelectTrigger className="w-36">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="price">Price</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        <div className="grid grid-cols-4 gap-3 lg:grid-cols-6">
                            {Array.from({ length: 24 })?.map((_, i) => (
                                <Card
                                    key={i}
                                    className="cursor-pointer hover:border-emerald-600"
                                >
                                    <CardContent className="space-y-2 p-3">
                                        <div className="line-clamp-2 text-xs font-medium">
                                            Product Name
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Stock: 20</span>
                                            <span className="font-semibold text-emerald-700">
                                                ₹99
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sales;
