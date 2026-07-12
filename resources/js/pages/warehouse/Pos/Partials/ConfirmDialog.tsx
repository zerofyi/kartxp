import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogOverlay, // Explicit overlay extraction to allow deep backdrop fine-tuning
} from '@/components/ui/alert-dialog';

export interface ConfirmOptions {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
}

interface ConfirmState extends ConfirmOptions {
    open: boolean;
}

const IDLE: ConfirmState = { open: false, title: '' };

/**
 * Promise-based drop-in replacement for window.confirm().
 * Usage:
 *   const { confirm, ConfirmDialogElement } = useConfirmDialog();
 *   const ok = await confirm({ title: 'Are you sure?', variant: 'destructive' });
 *   if (!ok) return;
 * Mount <ConfirmDialogElement /> once inside the JSX of the parent component.
 */
export function useConfirmDialog() {
    const [state, setState] = useState<ConfirmState>(IDLE);
    const resolverRef = useRef<((v: boolean) => void) | null>(null);

    const settle = useCallback((result: boolean) => {
        setState(IDLE);
        resolverRef.current?.(result);
        resolverRef.current = null;
    }, []);

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        // Resolve any stale pending dialog before opening a new one.
        resolverRef.current?.(false);
        setState({ ...opts, open: true });
        return new Promise<boolean>((resolve) => { resolverRef.current = resolve; });
    }, []);

    // Localized Keyboard Listener Layer: Catches Enter keys safely when modal opens
    useEffect(() => {
        if (!state.open) return;

        const handleModalKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                settle(true);
            }
        };

        // Capture flag guarantees interception before background listeners process events
        window.addEventListener('keydown', handleModalKeydown, true);
        return () => window.removeEventListener('keydown', handleModalKeydown, true);
    }, [state.open, settle]);

    const ConfirmDialogElement = (
        <AlertDialog open={state.open} onOpenChange={(open) => { if (!open) settle(false); }}>
            {/* Dark Tint + Glassmorphism Overlay */}
            <AlertDialogOverlay className="bg-black/60 backdrop-blur-md transition-all duration-300 z-100" />

            {/*
              Focus Override Integration:
              The onOpenAutoFocus event listener halts Radix's focus trapping on mount,
              preventing the Cancel button from turning active by default.
            */}
            <AlertDialogContent
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="z-101 shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50"
            >
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-base font-bold text-foreground">
                        {state.title}
                    </AlertDialogTitle>
                    {state.description && (
                        <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                            {state.description}
                        </AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => settle(false)}>
                        {state.cancelLabel ?? 'Cancel'}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => settle(true)}
                        className={state.variant === 'destructive'
                            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm font-semibold'
                            : 'font-semibold'}
                    >
                        {state.confirmLabel ?? 'Confirm (Enter)'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return { confirm, ConfirmDialogElement };
}
