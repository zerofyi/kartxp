import React, { useState } from 'react';
import { Search, Barcode, Pause, Play, ShoppingCart, CreditCard, Percent, DollarSign, X, Plus, Minus, ArrowUpDown } from 'lucide-react';

// Shadcn UI Imports
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/special/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SalesPOS = () => {
  const [discountType, setDiscountType] = useState('percentage');
  const primaryGreen = "#008b45"; // Deep Sprite Green

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden text-slate-900">

      {/* --- TOP SECTION (20%) --- */}
      <header className="h-[20%] min-h-[140px] bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm relative z-20">
        <div className="flex gap-6 h-full items-center">
          {/* Brand/Store Logo placeholder */}
          <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-lg">S</div>

          <div className="h-full w-[1px] bg-slate-200" />

          {/* Customer Info */}
          <div className="space-y-1.5 min-w-[200px]">
            <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Customer</Label>
            <div className="flex gap-2">
                <Input placeholder="Search Customer..." className="h-9 text-sm focus-visible:ring-emerald-600" />
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Walk-in</Badge>
            </div>
          </div>

          {/* Invoice Info */}
          <div className="space-y-1 h-full flex flex-col justify-center border-l pl-6">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Invoice Details</span>
            <div className="text-sm font-bold flex items-center gap-2">
                <span className="text-emerald-700 font-mono">#INV-2026-001</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-medium">18-Jan-2026</span>
            </div>
          </div>
        </div>

        {/* Dynamic Grand Total Display */}
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Payable</div>
          <div className="text-5xl font-black tracking-tighter text-emerald-700 drop-shadow-sm leading-none">
            ₹1,250.00
          </div>
        </div>
      </header>

      {/* --- MAIN POS AREA (80%) --- */}
      <main className="flex-1 flex overflow-hidden">

        {/* LEFT: Cart Section (30%) */}
        <section className="w-[30%] min-w-[380px] flex flex-col bg-white border-r shadow-2xl relative z-10">

          {/* Scanner Area */}
          <div className="p-4 bg-slate-50/80 border-b space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600" />
                <Input placeholder="Barcode / Product Name" className="pl-10 h-10 border-slate-200 focus-visible:ring-emerald-600" />
              </div>
              <div className="flex gap-1 h-10">
                <Button variant="outline" size="icon" className="text-amber-600 border-amber-200 hover:bg-amber-50">
                  <Pause className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader className="bg-emerald-700 hover:bg-emerald-700 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-white text-[10px] font-bold uppercase h-10">Item</TableHead>
                  <TableHead className="text-white text-[10px] font-bold uppercase h-10 text-center">Qty</TableHead>
                  <TableHead className="text-white text-[10px] font-bold uppercase h-10 text-right">Price</TableHead>
                  <TableHead className="text-white text-[10px] font-bold uppercase h-10 text-right">Total</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3]?.map((i) => (
                  <TableRow key={i} className="group hover:bg-emerald-50/50">
                    <TableCell className="py-3">
                      <div className="text-xs font-bold truncate max-w-[120px]">Coca Cola 330ml Can</div>
                      <div className="text-[10px] text-slate-400 font-mono">890123...</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full"><Minus size={12}/></Button>
                        <span className="text-xs font-bold w-4 text-center">2</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full"><Plus size={12}/></Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">₹45.00</TableCell>
                    <TableCell className="text-right text-xs font-bold text-emerald-700">₹90.00</TableCell>
                    <TableCell className="p-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={14}/></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Summary Section */}
          <footer className="p-4 bg-slate-50 border-t space-y-4">
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-2 rounded border border-slate-200 text-center shadow-sm">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Total Items</div>
                    <div className="text-sm font-bold">12</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 text-center shadow-sm">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Total Qty</div>
                    <div className="text-sm font-bold">15</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 text-center shadow-sm">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Tax</div>
                    <div className="text-sm font-bold">₹24.00</div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Input placeholder="Add Overall Discount" className="h-10 text-xs pr-20" />
                    <div className="absolute right-1 top-1.5 flex items-center bg-slate-100 rounded px-1.5 py-0.5 scale-90">
                        <Percent size={10} className={discountType === 'percentage' ? 'text-emerald-600' : 'text-slate-400'} />
                        <Switch className="mx-1 h-4 w-7 data-[state=checked]:bg-emerald-600" onCheckedChange={(c) => setDiscountType(c ? 'amount' : 'percentage')} />
                        <DollarSign size={10} className={discountType === 'amount' ? 'text-emerald-600' : 'text-slate-400'} />
                    </div>
                </div>
            </div>

            <Button className="w-full h-14 text-lg font-black shadow-lg shadow-emerald-900/20 gap-3 transition-transform active:scale-[0.98] bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800">
                <CreditCard className="w-6 h-6" /> QUICK PAY
            </Button>
          </footer>
        </section>

        {/* CENTER: Categories (10%) */}
        <section className="w-[10%] min-w-[100px] flex flex-col bg-slate-50 border-r">
          <div className="h-10 flex items-center justify-center border-b bg-white">
            <ArrowUpDown size={14} className="text-slate-400" />
          </div>
          <ScrollArea className="flex-1 px-2 py-3">
            <div className="space-y-2">
              {['All', 'Snacks', 'Drinks', 'Dairy', 'Bakery', 'Frozen', 'Health']?.map((cat) => (
                <Button key={cat} variant="ghost" className={`w-full h-auto py-4 flex flex-col gap-2 rounded-xl text-[10px] font-bold uppercase transition-all border-2 ${cat === 'All' ? 'bg-white border-emerald-500 text-emerald-700 shadow-md' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}>
                  <div className={`h-8 w-8 rounded-lg ${cat === 'All' ? 'bg-emerald-100' : 'bg-slate-200'}`} />
                  {cat}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </section>

        {/* RIGHT: Product Grid (60%) */}
        <section className="flex-1 flex flex-col bg-slate-100/50">
          <div className="p-4 bg-white border-b flex items-center gap-4 shadow-sm relative z-10">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search catalog..." className="pl-10 h-10 rounded-full border-none bg-slate-100 focus-visible:ring-emerald-600" />
            </div>
            <Button variant="outline" className="rounded-full h-10 gap-2 text-xs font-bold text-slate-600">
                Sort: Default
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 content-start pb-10">
              {Array.from({ length: 32 })?.map((_, i) => (
                <Card key={i} className="group cursor-pointer border-none shadow-sm hover:ring-2 hover:ring-emerald-500 transition-all active:scale-95 bg-white overflow-hidden">
                  <div className="aspect-square bg-slate-100 relative">
                     {/* Placeholder for Img */}
                     <div className="absolute inset-0 flex items-center justify-center opacity-10 font-bold text-4xl">P</div>
                     <Badge className="absolute top-1 right-1 bg-black/70 text-[8px] h-4">Stock: 40</Badge>
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-[10px] font-bold leading-tight truncate">Britannia Tiger Biscuits</p>
                    <div className="text-xs font-black text-emerald-700">₹25.00</div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </section>

      </main>
    </div>
  );
};

export default SalesPOS;
