import React, { useState } from 'react';
import { FolderOpen, Pause, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/special/scroll-area';
import { HeldInvoice } from '../Index';

interface HeldInvoicesFabProps {
    heldInvoices: HeldInvoice[];
    retrieveHeldInvoice: (inv: HeldInvoice) => void;
    deleteHeldInvoice: (id: string) => void;
}

const HeldInvoicesFab = ({ heldInvoices, retrieveHeldInvoice, deleteHeldInvoice }: HeldInvoicesFabProps) => {
    const [open, setOpen] = useState(false);

    if (heldInvoices.length === 0) return null;

    return (
        <>
            {/* Floating Action Button – bottom-right with glowing amber pulse */}
            <div className="fixed bottom-6 right-6 z-40">
                <Button
                    onClick={() => setOpen(true)}
                    className="h-14 w-14 rounded-full bg-yellow-500 text-white shadow-xl hover:bg-yellow-600 flex items-center justify-center relative border border-white/20 p-0 shadow-yellow-500/40"
                >
                    <Pause className="h-6 w-6 fill-current" />
                    <span className="absolute -top-1.5 -right-1.5 bg-destructive border-2 border-background text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow-md">
                        {heldInvoices.length}
                    </span>
                </Button>
            </div>

            {/* Modal */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[460px] rounded-lg shadow-2xl border border-border">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-yellow-600 font-bold">
                            <FolderOpen className="h-5 w-5" />
                            <DialogTitle className="text-lg font-black tracking-tight">Suspended Invoices</DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                            Select a suspended transaction to restore or delete it.
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-80 rounded-md border border-border bg-muted/30 p-1 mt-2">
                        <div className="space-y-1.5 p-1">
                            {heldInvoices.map(held => (
                                <div
                                    key={held.id}
                                    className="flex items-center justify-between bg-card p-2.5 rounded-md border border-border text-xs hover:border-yellow-500/40 transition-all"
                                >
                                    <div className="flex-1 pr-3">
                                        <div className="font-bold text-foreground text-sm truncate">
                                            {held.customerName || 'Walk-in'}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex gap-2 items-center">
                                            <span>📦 {held.items.length} Items</span>
                                            <span>⏱️ {new Date(held.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2.5 text-xs font-bold"
                                            onClick={() => { retrieveHeldInvoice(held); setOpen(false); }}
                                        >
                                            Retrieve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => deleteHeldInvoice(held.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default React.memo(HeldInvoicesFab);
