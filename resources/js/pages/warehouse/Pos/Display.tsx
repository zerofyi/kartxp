import { Head } from '@inertiajs/react';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
    DisplayState,
    IDLE_DISPLAY_STATE,
    POS_BROADCAST_CHANNEL
} from '@/hooks/use-pos-broadcast';
import AppLogoIcon from '@/components/app-logo-icon';
import { ShoppingBag, CheckCircle, User, Tags, Hash, Layers, Landmark, MapPin, Sparkles } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   INLINE STYLES / KEYFRAMES  (no external CSS file needed)
───────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

  :root {
    --navy:   #0B0F1A;
    --navy2:  #141926;
    --navy3:  #1C2333;
    --gold:   #D4A843;
    --gold2:  #F0C96A;
    --cream:  #F7F4EF;
    --cream2: #EDE8DF;
    --slate:  #8B95A9;
    --green:  #10B981;
    --green2: #D1FAE5;
    --red:    #EF4444;
    --white:  #FFFFFF;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; }
  body { background: var(--navy); font-family: 'Inter', sans-serif; color: var(--cream); }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(212,168,67,0.25); border-radius: 99px; }

  /* ── Welcome screen ── */
  @keyframes ambientPulse {
    0%,100% { opacity: 0.18; transform: scale(1); }
    50%      { opacity: 0.32; transform: scale(1.08); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes clockTick {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .welcome-glow {
    position: absolute;
    width: 600px; height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(212,168,67,0.18) 0%, transparent 70%);
    animation: ambientPulse 5s ease-in-out infinite;
    pointer-events: none;
  }
  .fade-up-1 { animation: fadeUp 0.7s ease forwards 0.1s; opacity: 0; }
  .fade-up-2 { animation: fadeUp 0.7s ease forwards 0.3s; opacity: 0; }
  .fade-up-3 { animation: fadeUp 0.7s ease forwards 0.5s; opacity: 0; }
  .fade-up-4 { animation: fadeUp 0.7s ease forwards 0.7s; opacity: 0; }

  /* ── Cart item flash ── */
  @keyframes rowFlash {
    0%   { background: rgba(212,168,67,0.18); }
    100% { background: transparent; }
  }
  .row-flash { animation: rowFlash 0.6s ease-out forwards; }

  /* ── Tape stripe (right border of cart) ── */
  @keyframes tapeGrow {
    from { height: 0%; }
    to   { height: 100%; }
  }

  /* ── Complete screen ── */
  @keyframes scaleIn {
    0%   { opacity: 0; transform: scale(0.5); }
    70%  { transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes circleDraw {
    from { stroke-dashoffset: 283; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes checkDraw {
    from { stroke-dashoffset: 60; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes confettiFall {
    0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  .scale-in { animation: scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }

  /* ── Receipt tape line ── */
  .tape-line {
    background: repeating-linear-gradient(
      90deg,
      var(--gold) 0px, var(--gold) 6px,
      transparent 6px, transparent 12px
    );
    height: 3px;
    opacity: 0.35;
  }

  /* ── Gold divider ── */
  .gold-rule { height: 1px; background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: 0.4; }

  /* ── Pill badge ── */
  .pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 10px; border-radius: 99px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    background: rgba(212,168,67,0.12); color: var(--gold); border: 1px solid rgba(212,168,67,0.22);
  }

  /* ── Total block glow ── */
  @keyframes totalGlow {
    0%,100% { box-shadow: 0 0 0 0 rgba(212,168,67,0); }
    50%      { box-shadow: 0 0 28px 4px rgba(212,168,67,0.18); }
  }
  .total-glow { animation: totalGlow 3s ease-in-out infinite; }

  /* ── Confetti pieces ── */
  .confetti-piece {
    position: absolute;
    width: 8px; height: 8px;
    border-radius: 2px;
    animation: confettiFall linear forwards;
  }
`;

/* ─────────────────────────────────────────────────────────────────
   INTERFACES
───────────────────────────────────────────────────────────────── */
interface Warehouse {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    gstin: string | null;
}
interface Settings {
    upi_id: string;
    receipt_footer: string;
    welcome_message: string;
}
interface Props {
    warehouse: Warehouse;
    logoUrl: string | null;
    settings: Settings;
}

/* ─────────────────────────────────────────────────────────────────
   LIVE CLOCK
───────────────────────────────────────────────────────────────── */
const LiveClock = () => {
    const [time, setTime] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--slate)', letterSpacing: '0.12em' }}>
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────
   ANIMATED CHECK CIRCLE (SVG)
───────────────────────────────────────────────────────────────── */
const AnimatedCheck = () => (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
            cx="50" cy="50" r="45"
            stroke="var(--green)" strokeWidth="4" fill="none"
            strokeDasharray="283"
            style={{ animation: 'circleDraw 0.6s ease forwards 0.2s', strokeDashoffset: 283 }}
        />
        <polyline
            points="28,52 43,67 72,36"
            stroke="var(--green)" strokeWidth="5" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="60"
            style={{ animation: 'checkDraw 0.4s ease forwards 0.8s', strokeDashoffset: 60 }}
        />
    </svg>
);

/* ─────────────────────────────────────────────────────────────────
   CONFETTI
───────────────────────────────────────────────────────────────── */
const CONFETTI_COLORS = ['#D4A843', '#10B981', '#F7F4EF', '#6366F1', '#F43F5E', '#38BDF8'];
const Confetti = () => {
    const pieces = useMemo(() =>
        Array.from({ length: 40 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 1.5,
            duration: 2.5 + Math.random() * 2,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            size: 6 + Math.random() * 8,
        })), []);

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
            {pieces.map(p => (
                <div
                    key={p.id}
                    className="confetti-piece"
                    style={{
                        left: `${p.left}%`,
                        top: -20,
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                    }}
                />
            ))}
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function Display({ warehouse, logoUrl, settings }: Props) {
    const [cart, setCart] = useState<any>(IDLE_DISPLAY_STATE);
    const [rowFlashId, setRowFlashId] = useState<number | null>(null);

    const channelRef = useRef<BroadcastChannel | null>(null);
    const prevItemsLength = useRef<number>(0);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const itemsEndRef = useRef<HTMLDivElement | null>(null);

    /* UPI QR */
    const activeQrCodeUrl = useMemo(() => {
        const upiTarget = cart.upiId || settings.upi_id;
        if (!upiTarget) return '';
        const amount = cart.totalBill > 0 ? cart.totalBill : 0;
        const name = (warehouse.name || 'Store').replace(/[^a-zA-Z0-9]/g, '');
        const upiStr = `upi://pay?pa=${encodeURIComponent(upiTarget)}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(upiStr)}`;
    }, [cart.totalBill, cart.upiId, settings.upi_id, warehouse.name]);

    /* Overall discount */
    const overallDiscountAmount = useMemo(() => {
        if (!cart.overallDiscount || cart.overallDiscount <= 0) return 0;
        if (cart.discountType === 'amount') return cart.overallDiscount;
        return ((cart.subtotalBeforeTax || 0) * cart.overallDiscount) / 100;
    }, [cart.overallDiscount, cart.discountType, cart.subtotalBeforeTax]);

    /* Broadcast channel */
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        channelRef.current = new BroadcastChannel(POS_BROADCAST_CHANNEL);
        channelRef.current.onmessage = (e: MessageEvent<DisplayState>) => {
            const d = e.data;
            setCart(d);
            if (d.items.length > prevItemsLength.current) {
                const newest = d.items[d.items.length - 1];
                if (newest) {
                    setRowFlashId(newest.id);
                    setTimeout(() => setRowFlashId(null), 700);
                    setTimeout(() => itemsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            }
            prevItemsLength.current = d.items.length;
            if (d.status === 'complete') {
                if (resetTimer.current) clearTimeout(resetTimer.current);
                resetTimer.current = setTimeout(() => {
                    setCart(IDLE_DISPLAY_STATE);
                    prevItemsLength.current = 0;
                }, 9000);
            }
        };
        return () => {
            channelRef.current?.close();
            if (resetTimer.current) clearTimeout(resetTimer.current);
        };
    }, []);

    const isIdle = cart.status === 'idle' || cart.items.length === 0;
    const isComplete = cart.status === 'complete';

    /* ════════════════════════════════════════════════════════════════
       1. WELCOME / IDLE SCREEN
    ════════════════════════════════════════════════════════════════ */
    if (isIdle) {
        return (
            <>
                <style>{GLOBAL_CSS}</style>
                <Head title={`Welcome — ${warehouse.name}`} />
                <div style={{
                    width: '100vw', height: '100vh', background: 'var(--navy)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden'
                }}>
                    {/* Ambient glow orbs */}
                    <div className="welcome-glow" style={{ top: '-150px', left: '50%', transform: 'translateX(-50%)' }} />
                    <div className="welcome-glow" style={{ bottom: '-200px', left: '30%', animationDelay: '2s' }} />

                    {/* Top bar */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '20px 36px',
                        borderBottom: '1px solid rgba(212,168,67,0.1)'
                    }}>
                        <div className="pill"><Sparkles size={9} /> Customer Display</div>
                        <LiveClock />
                    </div>

                    {/* Center content */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 28, maxWidth: 560, padding: '0 32px', position: 'relative', zIndex: 1 }}>

                        {/* Logo */}
                        <div className="fade-up-1">
                            {logoUrl ? (
                                <div style={{
                                    width: 96, height: 96, borderRadius: 24, overflow: 'hidden',
                                    border: '2px solid rgba(212,168,67,0.3)',
                                    boxShadow: '0 0 40px rgba(212,168,67,0.15)',
                                    background: 'var(--navy2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <img src={logoUrl} alt={warehouse.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                                </div>
                            ) : (
                                <div style={{
                                    width: 88, height: 88, borderRadius: 24,
                                    background: 'linear-gradient(135deg, var(--navy2) 0%, var(--navy3) 100%)',
                                    border: '2px solid rgba(212,168,67,0.25)',
                                    boxShadow: '0 0 40px rgba(212,168,67,0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <AppLogoIcon style={{ width: 44, height: 44, color: 'var(--gold)' }} />
                                </div>
                            )}
                        </div>

                        {/* Store name */}
                        <div className="fade-up-2" style={{ lineHeight: 1 }}>
                            <div style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: 'clamp(36px, 6vw, 64px)',
                                fontWeight: 900,
                                color: 'var(--cream)',
                                letterSpacing: '-0.02em',
                                lineHeight: 1.05
                            }}>
                                {warehouse.name}
                            </div>
                        </div>

                        {/* Gold rule */}
                        <div className="fade-up-3" style={{ width: '100%' }}>
                            <div className="gold-rule" />
                        </div>

                        {/* Welcome message */}
                        <div className="fade-up-3" style={{
                            fontSize: 18, fontWeight: 500, color: 'var(--slate)',
                            lineHeight: 1.6, letterSpacing: '0.01em'
                        }}>
                            {settings.welcome_message || 'Welcome! A cashier will assist you shortly.'}
                        </div>

                        {/* Address */}
                        {warehouse.address && (
                            <div className="fade-up-4" style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: 12, color: 'rgba(139,149,169,0.65)',
                                fontWeight: 600, letterSpacing: '0.04em'
                            }}>
                                <MapPin size={12} style={{ color: 'var(--gold)', opacity: 0.7 }} />
                                {warehouse.address}
                            </div>
                        )}
                    </div>

                    {/* Bottom tape stripe */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                        <div className="tape-line" />
                    </div>
                </div>
            </>
        );
    }

    /* ════════════════════════════════════════════════════════════════
       2. TRANSACTION COMPLETE
    ════════════════════════════════════════════════════════════════ */
    if (isComplete) {
        return (
            <>
                <style>{GLOBAL_CSS}</style>
                <Head title="Payment Complete" />
                <div style={{
                    width: '100vw', height: '100vh',
                    background: 'var(--navy)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <Confetti />

                    {/* Ambient gold glow */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }} />

                    <div className="scale-in" style={{
                        width: 460, background: 'var(--navy2)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: 28,
                        padding: '48px 40px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
                        boxShadow: '0 0 60px rgba(16,185,129,0.1), 0 24px 48px rgba(0,0,0,0.4)',
                        position: 'relative', zIndex: 1
                    }}>
                        {/* Top tape */}
                        <div className="tape-line" style={{ position: 'absolute', top: 0, left: 0, right: 0, borderRadius: '28px 28px 0 0', opacity: 0.2 }} />

                        {/* Animated check */}
                        <AnimatedCheck />

                        {/* Amount */}
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                                ✓ Payment Received
                            </div>
                            <div style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 'clamp(40px, 8vw, 60px)',
                                fontWeight: 700,
                                color: 'var(--cream)',
                                letterSpacing: '-0.02em',
                                lineHeight: 1
                            }}>
                                ₹{cart.totalBill.toFixed(2)}
                            </div>
                        </div>

                        {/* Invoice details */}
                        <div style={{
                            width: '100%', background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 14, padding: '14px 18px',
                            display: 'flex', flexDirection: 'column', gap: 10
                        }}>
                            {cart.invoiceNumber && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                    <span style={{ color: 'var(--slate)', fontWeight: 600 }}>Invoice No.</span>
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--cream)', fontWeight: 700, fontSize: 13 }}>{cart.invoiceNumber}</span>
                                </div>
                            )}
                            {cart.paymentMethod && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                    <span style={{ color: 'var(--slate)', fontWeight: 600 }}>Payment Mode</span>
                                    <span style={{
                                        background: 'rgba(212,168,67,0.1)', color: 'var(--gold)',
                                        border: '1px solid rgba(212,168,67,0.2)',
                                        borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                                        textTransform: 'capitalize', letterSpacing: '0.05em'
                                    }}>{cart.paymentMethod}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer message */}
                        <div style={{
                            width: '100%', textAlign: 'center',
                            padding: '16px 20px',
                            background: 'linear-gradient(135deg, rgba(212,168,67,0.06) 0%, rgba(212,168,67,0.02) 100%)',
                            border: '1px solid rgba(212,168,67,0.12)',
                            borderRadius: 14
                        }}>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: 'var(--cream)', lineHeight: 1.4 }}>
                                {settings.receipt_footer || 'Thank you for shopping with us!'}
                            </div>
                            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--slate)', fontWeight: 500 }}>
                                We hope to see you again soon.
                            </div>
                        </div>

                        {/* QR code */}
                        {activeQrCodeUrl && (
                            <div style={{
                                background: '#fff', borderRadius: 16, padding: 12,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                            }}>
                                <img src={activeQrCodeUrl} alt="UPI QR" style={{ display: 'block', width: 160, height: 160, objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    }

    /* ════════════════════════════════════════════════════════════════
       3. LIVE CART / SHOPPING BASKET
    ════════════════════════════════════════════════════════════════ */
    return (
        <>
            <style>{GLOBAL_CSS}</style>
            <Head title="Your Basket" />
            <div style={{
                width: '100vw', height: '100vh',
                background: 'var(--navy)',
                display: 'flex',
                overflow: 'hidden'
            }}>

                {/* ── LEFT: Item List ── */}
                <div style={{
                    flex: 1, minWidth: 0,
                    display: 'flex', flexDirection: 'column',
                    padding: '28px 24px 28px 32px',
                    borderRight: '1px solid rgba(212,168,67,0.1)'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        paddingBottom: 16, marginBottom: 16,
                        borderBottom: '1px solid rgba(255,255,255,0.06)'
                    }}>
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
                                Active Session
                            </div>
                            <div style={{
                                fontFamily: "'Playfair Display', serif",
                                fontSize: 26, fontWeight: 700, color: 'var(--cream)', lineHeight: 1.1
                            }}>
                                Your Basket
                            </div>
                        </div>
                        {cart.invoiceNumber && (
                            <div style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 11, fontWeight: 700, color: 'var(--slate)',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                padding: '5px 12px', borderRadius: 8, letterSpacing: '0.06em'
                            }}>
                                {cart.invoiceNumber}
                            </div>
                        )}
                    </div>

                    {/* Column headings */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr auto',
                        fontSize: 10, fontWeight: 700, color: 'var(--slate)',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        paddingBottom: 10, marginBottom: 4,
                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                    }}>
                        <span>Item</span>
                        <span>Total</span>
                    </div>

                    {/* Item rows */}
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6 }}>
                        {cart.items.map((item: any, idx: number) => (
                            <div
                                key={item.id}
                                className={rowFlashId === item.id ? 'row-flash' : ''}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '13px 10px',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    borderRadius: 10,
                                    transition: 'background 0.3s ease',
                                    gap: 12
                                }}
                            >
                                {/* Sequence number */}
                                <div style={{
                                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                                    background: 'rgba(212,168,67,0.08)',
                                    border: '1px solid rgba(212,168,67,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: 'var(--gold)'
                                }}>
                                    {String(idx + 1).padStart(2, '0')}
                                </div>

                                {/* Thumbnail */}
                                {item.img ? (
                                    <img src={item.img} alt="" style={{
                                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                                        objectFit: 'contain', background: 'var(--navy2)',
                                        border: '1px solid rgba(255,255,255,0.07)'
                                    }} />
                                ) : (
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                                        background: 'var(--navy3)', border: '1px solid rgba(255,255,255,0.07)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <ShoppingBag size={18} style={{ color: 'var(--slate)' }} />
                                    </div>
                                )}

                                {/* Name + meta */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 14, fontWeight: 700, color: 'var(--cream)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        marginBottom: 4
                                    }}>
                                        {item.name}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 600 }}>
                                            Qty <strong style={{ color: 'var(--cream)', fontFamily: "'JetBrains Mono', monospace" }}>{item.qty}</strong>
                                        </span>
                                        <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 11 }}>×</span>
                                        <span style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 600 }}>
                                            <strong style={{ color: 'var(--cream)', fontFamily: "'JetBrains Mono', monospace" }}>₹{item.rate.toFixed(2)}</strong>
                                        </span>
                                        {item.disc > 0 && (
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, color: 'var(--green)',
                                                background: 'rgba(16,185,129,0.1)',
                                                border: '1px solid rgba(16,185,129,0.2)',
                                                borderRadius: 5, padding: '1px 7px'
                                            }}>
                                                −₹{item.disc.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Line total */}
                                <div style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 15, fontWeight: 700, color: 'var(--cream)',
                                    textAlign: 'right', flexShrink: 0
                                }}>
                                    ₹{item.total.toFixed(2)}
                                </div>
                            </div>
                        ))}
                        <div ref={itemsEndRef} />
                    </div>

                    {/* Item count footer */}
                    <div style={{
                        paddingTop: 12, marginTop: 8,
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        fontSize: 11, color: 'var(--slate)', fontWeight: 600,
                        display: 'flex', gap: 16
                    }}>
                        <span><strong style={{ color: 'var(--cream)', fontFamily: "'JetBrains Mono', monospace" }}>{cart.totalItems}</strong> items</span>
                        <span><strong style={{ color: 'var(--cream)', fontFamily: "'JetBrains Mono', monospace" }}>{cart.totalQty}</strong> units</span>
                    </div>
                </div>

                {/* ── RIGHT SIDEBAR ── */}
                <div style={{
                    width: 300, flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    padding: '28px 28px 28px 24px',
                    background: 'var(--navy2)'
                }}>

                    {/* Clock */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                        <LiveClock />
                    </div>

                    {/* Customer card */}
                    {cart.customerName && cart.customerName !== 'Walk-in Customer' ? (
                        <div style={{
                            background: 'rgba(212,168,67,0.06)',
                            border: '1px solid rgba(212,168,67,0.18)',
                            borderRadius: 14, padding: '12px 14px',
                            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: 'rgba(212,168,67,0.1)',
                                border: '1px solid rgba(212,168,67,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <User size={15} style={{ color: 'var(--gold)' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                                    Customer
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {cart.customerName}
                                </div>
                                {cart.customerMobile && (
                                    <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'var(--slate)', marginTop: 2 }}>
                                        {String(cart.customerMobile).slice(0, -4).replace(/./g, 'X') + String(cart.customerMobile).slice(-4)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            border: '1px dashed rgba(255,255,255,0.08)',
                            borderRadius: 14, padding: '10px 14px',
                            display: 'flex', alignItems: 'center', gap: 10,
                            marginBottom: 16
                        }}>
                            <User size={13} style={{ color: 'var(--slate)' }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)' }}>Walk-in Customer</span>
                        </div>
                    )}

                    {/* Summary block */}
                    <div style={{
                        flex: 1, overflowY: 'auto',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 16, padding: '16px',
                        display: 'flex', flexDirection: 'column', gap: 0
                    }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--slate)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            Bill Summary
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                            {/* Unique items */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                <span style={{ color: 'var(--slate)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Layers size={11} /> Unique Items
                                </span>
                                <span style={{
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: 'var(--cream)',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                    padding: '2px 9px', borderRadius: 6
                                }}>
                                    {cart.totalItems}
                                </span>
                            </div>

                            {/* Total units */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                <span style={{ color: 'var(--slate)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Hash size={11} /> Total Units
                                </span>
                                <span style={{
                                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: 'var(--cream)',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                    padding: '2px 9px', borderRadius: 6
                                }}>
                                    {cart.totalQty}
                                </span>
                            </div>

                            {/* Subtotal — always the raw pre-discount, pre-tax sum; never changes when discounts are applied */}
                            {cart.subtotalBeforeTax !== undefined && (
                                <>
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '2px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                        <span style={{ color: 'var(--slate)', fontWeight: 600 }}>Subtotal (MRP)</span>
                                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--cream)' }}>
                                            ₹{cart.subtotalBeforeTax.toFixed(2)}
                                        </span>
                                    </div>
                                </>
                            )}

                            {/* GST */}
                            {cart.totalTaxAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                    <span style={{ color: 'var(--slate)', fontWeight: 600 }}>GST</span>
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--cream)' }}>
                                        ₹{cart.totalTaxAmount.toFixed(2)}
                                    </span>
                                </div>
                            )}

                            {/* Overall discount */}
                            {overallDiscountAmount > 0 && (
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'rgba(16,185,129,0.07)',
                                    border: '1px solid rgba(16,185,129,0.18)',
                                    borderRadius: 9, padding: '8px 10px', fontSize: 12
                                }}>
                                    <span style={{ color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Tags size={11} /> Discount
                                    </span>
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--green)' }}>
                                        −₹{overallDiscountAmount.toFixed(2)}
                                        {cart.discountType === 'percentage' && (
                                            <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 4 }}>({cart.overallDiscount}%)</span>
                                        )}
                                    </span>
                                </div>
                            )}

                            {/* Payment method */}
                            {cart.paymentMethod && cart.totalBill > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                    <span style={{ color: 'var(--slate)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Landmark size={10} /> Method
                                    </span>
                                    <span style={{
                                        background: 'rgba(212,168,67,0.08)', color: 'var(--gold)',
                                        border: '1px solid rgba(212,168,67,0.18)',
                                        borderRadius: 6, padding: '2px 9px', fontWeight: 700, fontSize: 10,
                                        textTransform: 'capitalize', letterSpacing: '0.04em'
                                    }}>
                                        {cart.paymentMethod}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* QR Code */}
                        {activeQrCodeUrl && (
                            <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', width: '100%', marginBottom: 8 }} />
                                <div style={{ background: '#fff', borderRadius: 14, padding: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                                    <img src={activeQrCodeUrl} alt="UPI QR" style={{ display: 'block', width: 130, height: 130, objectFit: 'contain' }} />
                                </div>
                                <div style={{
                                    fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                                    color: 'var(--slate)', letterSpacing: '0.05em',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    maxWidth: 160
                                }}>
                                    {cart.upiId || settings.upi_id}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Grand Total Block ── */}
                    <div className="total-glow" style={{
                        marginTop: 14,
                        background: 'linear-gradient(135deg, #1a1006 0%, #0f0a04 100%)',
                        border: '1px solid rgba(212,168,67,0.3)',
                        borderRadius: 18,
                        padding: '18px 20px',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        {/* top shimmer line */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0,
                            height: 2,
                            background: 'linear-gradient(90deg, transparent 0%, var(--gold) 40%, var(--gold2) 60%, transparent 100%)',
                            opacity: 0.7
                        }} />
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(212,168,67,0.55)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
                            Total Payable
                        </div>
                        <div style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 34, fontWeight: 700,
                            color: 'var(--gold)',
                            letterSpacing: '-0.01em', lineHeight: 1
                        }}>
                            ₹{cart.totalBill.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
