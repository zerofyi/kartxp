<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tax Invoice - #{{ $order->order_number }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;
            color: #2d3748;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
        }
        .invoice-box {
            width: 100%;
            padding: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        td {
            padding: 6px;
            vertical-align: top;
        }
        .company-title {
            font-size: 20px;
            font-weight: bold;
            color: #1a365d;
            text-transform: uppercase;
        }
        .invoice-title {
            font-size: 22px;
            font-weight: bold;
            color: #2d3748;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: right;
        }
        .meta-text {
            font-family: monospace;
            font-size: 11px;
            color: #4a5568;
        }
        .section-title {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: bold;
            letter-spacing: 0.5px;
            color: #718096;
            border-bottom: 2px solid #edf2f7;
            padding-bottom: 4px;
            margin-bottom: 6px;
        }
        .items-table {
            margin-top: 15px;
        }
        .items-table th {
            background-color: #1a365d;
            color: #ffffff;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: bold;
            padding: 8px;
            text-align: left;
        }
        .items-table td {
            border-bottom: 1px solid #edf2f7;
            padding: 8px;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .font-mono {
            font-family: monospace;
            font-size: 11px;
        }
        .totals-row td {
            padding: 4px 8px;
            font-size: 12px;
        }
        .grand-total {
            background-color: #f7fafc;
            font-weight: bold;
            font-size: 13px !important;
            color: #1a365d;
            border-top: 2px solid #1a365d;
            border-bottom: 2px solid #1a365d;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #a0aec0;
            border-top: 1px solid #edf2f7;
            padding-top: 12px;
        }
        .rupee {
            font-family: 'DejaVu Sans', sans-serif;
        }
    </style>
</head>
<body>

<div class="invoice-box">
    {{-- Header Layout --}}
    <table>
        <tr>
            <td style="width: 60%; padding: 0;">
                <div class="company-title">{{ $order->warehouse->name ?? 'Warehouse Center' }}</div>
                <div style="color: #4a5568; margin-top: 5px; font-size: 11px; line-height: 1.4;">
                    {{ $order->warehouse->address ?? 'Corporate Dispatch Facility' }}<br>
                    @if(!empty($order->warehouse->phone)) Phone: {{ $order->warehouse->phone }} @endif
                    @if(!empty($order->warehouse->gstin)) <br><strong>GSTIN:</strong> {{ strtoupper($order->warehouse->gstin) }} @endif
                </div>
            </td>
            <td style="width: 40%; text-align: right; padding: 0;">
                <div class="invoice-title">Tax Invoice</div>
                <div class="meta-text" style="margin-top: 8px;">
                    Invoice No: <strong>#INV-{{ $order->order_number }}</strong><br>
                    Date: {{ \Carbon\Carbon::parse($order->created_at)->format('d M, Y') }}<br>
                    Channel: {{ strtoupper($order->order_channel ?? 'Online') }}
                </div>
            </td>
        </tr>
    </table>

    <hr style="border: 0; border-top: 1px solid #edf2f7; margin-bottom: 15px;">

    {{-- Billing & Shipping Split Details --}}
    <table>
        <tr>
            <td style="width: 50%; padding-left: 0; padding-right: 15px;">
                <div class="section-title">Shipping Destination Address</div>
                @if($order->address_snapshot)
                    <div style="font-weight: bold; font-size: 13px; margin-bottom: 2px;">
                        {{ $order->address_snapshot['name'] ?? 'Recipient Buyer' }}
                    </div>
                    <div style="color: #4a5568; line-height: 1.4;">
                        {{ $order->address_snapshot['address_line_1'] ?? '' }}<br>
                        @if(!empty($order->address_snapshot['address_line_2']))
                            {{ $order->address_snapshot['address_line_2'] }}<br>
                        @endif
                        {{ $order->address_snapshot['city'] ?? '' }}, {{ $order->address_snapshot['state'] ?? '' }} - <strong>{{ $order->address_snapshot['pincode'] ?? '' }}</strong>
                    </div>
                    <div class="meta-text" style="margin-top: 4px;">
                        Mobile: {{ $order->address_snapshot['phone'] ?? ($order->customer->phone ?? '—') }}
                    </div>
                @else
                    <div style="font-weight: bold; font-size: 13px; margin-bottom: 2px;">{{ $order->customer->name ?? 'Walk-in Client' }}</div>
                    <div class="meta-text">Mobile: {{ $order->customer->phone ?? '—' }}</div>
                @endif
            </td>
            <td style="width: 50%; padding-right: 0; padding-left: 15px;">
                <div class="section-title">Buyer Account Context</div>
                <div style="font-weight: bold; font-size: 13px; margin-bottom: 2px;">
                    {{ $order->customer->name ?? 'Retail Customer' }}
                </div>
                <div class="meta-text">Registered Mobile: {{ $order->customer->phone ?? '—' }}</div>
                @if($order->customer && $order->customer->email)
                    <div class="meta-text">Account Email: {{ $order->customer->email }}</div>
                @endif
                <div class="meta-text" style="margin-top: 6px;">
                    Payment Method: <span style="text-transform: uppercase; font-weight: bold;">{{ str_replace('_', ' ', $order->payment_method ?? 'COD') }}</span>
                </div>
            </td>
        </tr>
    </table>

    {{-- Line Items Table Breakdown --}}
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 45%;">Items & Description</th>
                <th style="width: 15%;">SKU</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 15%; text-align: right;">Unit Rate</th>
                <th style="width: 15%; text-align: right;">Net Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->items as $item)
                <tr>
                    <td>
                        <div style="font-weight: bold; color: #2d3748;">
                            {{ $item->product_snapshot['product_name'] ?? ($item->productVariant->product->name ?? 'Inventory SKU Asset') }}
                        </div>
                        @if($item->productVariant)
                            <div style="font-size: 10px; color: #718096; margin-top: 1px;">
                                Style: {{ $item->productVariant->variant_name }}
                            </div>
                        @endif
                    </td>
                    <td class="font-mono" style="font-size: 11px; color: #4a5568;">
                        {{ $item->product_snapshot['sku'] ?? ($item->productVariant->sku ?? '—') }}
                    </td>
                    <td class="font-mono text-center">{{ $item->quantity }}</td>
                    <td class="font-mono text-right"><span class="rupee">&#8377;</span>{{ number_format($item->price, 2) }}</td>
                    <td class="font-mono text-right" style="font-weight: bold;"><span class="rupee">&#8377;</span>{{ number_format($item->total, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Financial Summary Matrix --}}
    <table style="width: 40%; margin-left: auto; margin-top: 10px;" class="totals-row">
        <tr>
            <td class="text-right text-muted-foreground">Subtotal Amount:</td>
            <td class="text-right font-mono"><span class="rupee">&#8377;</span>{{ number_format($order->subtotal, 2) }}</td>
        </tr>
        {{-- Fixed: Changed Number() to direct evaluation check --}}
        @if($order->coupon_discount > 0)
            <tr>
                <td class="text-right" style="color: #e53e3e;">Coupon Discount:</td>
                <td class="text-right font-mono" style="color: #e53e3e;">-<span class="rupee">&#8377;</span>{{ number_format($order->coupon_discount, 2) }}</td>
            </tr>
        @endif
        {{-- Fixed: Changed Number() to direct evaluation check --}}
        @if($order->discount_amount > 0)
            <tr>
                <td class="text-right" style="color: #e53e3e;">Promotional Off:</td>
                <td class="text-right font-mono" style="color: #e53e3e;">-<span class="rupee">&#8377;</span>{{ number_format($order->discount_amount, 2) }}</td>
            </tr>
        @endif
        <tr>
            <td class="text-right text-muted-foreground">Fulfillment Freight:</td>
            <td class="text-right font-mono"><span class="rupee">&#8377;</span>{{ number_format($order->shipping_charge, 2) }}</td>
        </tr>
        {{-- Fixed: Changed Number() to direct evaluation check --}}
        @if($order->tax_amount > 0)
            <tr>
                <td class="text-right text-muted-foreground">Integrated GST:</td>
                <td class="text-right font-mono"><span class="rupee">&#8377;</span>{{ number_format($order->tax_amount, 2) }}</td>
            </tr>
        @endif
        <tr class="grand-total">
            <td class="text-right">Grand Total:</td>
            <td class="text-right font-mono"><span class="rupee">&#8377;</span>{{ number_format($order->total_amount, 2) }}</td>
        </tr>
    </table>

    {{-- Footer Terms --}}
    <div class="footer">
        <p>This is a computer-generated tax document profile summary. No physical signature parameters are required.</p>
        <p style="font-size: 10px; color: #cbd5e0; margin-top: 15px;">{{ $settings['receipt_footer'] ?? 'Thank you for your business context partnership.' }}</p>
    </div>
</div>

</body>
</html>
