<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Packing Slip - #{{ $order->order_number }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;
            color: #2b2d42;
            font-size: 13px;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            padding: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        th, td {
            padding: 10px;
            text-align: left;
            vertical-align: top;
        }
        .header-table td {
            padding: 0;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #1d3557;
        }
        .meta-text {
            font-family: monospace;
            font-size: 12px;
            color: #4a5568;
        }
        .section-title {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
            letter-spacing: 0.5px;
            color: #718096;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 5px;
            margin-bottom: 8px;
        }
        .data-table {
            margin-top: 15px;
        }
        .data-table th {
            background-color: #f7fafc;
            border-bottom: 2px solid #cbd5e0;
            color: #4a5568;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
            padding: 8px 10px;
        }
        .data-table td {
            border-bottom: 1px solid #e2e8f0;
            padding: 10px;
        }
        .font-mono {
            font-family: monospace;
            font-size: 12px;
        }
        .text-center {
            text-align: center;
        }
        .footer-note {
            margin-top: 50px;
            border-top: 1px dashed #cbd5e0;
            padding-top: 15px;
            font-size: 11px;
            color: #718096;
            text-align: center;
        }
        .badge {
            background-color: #edf2f7;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
        }
    </style>
</head>
<body>

<div class="container">
    {{-- Header Band Section --}}
    <table class="header-table">
        <tr>
            <td>
                <div class="title">Packing Slip</div>
                <div class="meta-text" style="margin-top: 5px;">
                    Order Reference: <strong>#{{ $order->order_number }}</strong>
                </div>
                <div class="meta-text">
                    Fulfillment Date: {{ now()->format('d M, Y h:i A') }}
                </div>
            </td>
            <td style="text-align: right;">
                <div style="font-weight: bold; font-size: 15px; color: #1d3557;">
                    {{ $order->warehouse->name ?? 'Main Dispatch Facility' }}
                </div>
                <div class="meta-text" style="margin-top: 3px;">
                    Channel Route: <span class="badge">{{ strtoupper($order->order_channel ?? 'Online') }}</span>
                </div>
            </td>
        </tr>
    </table>

    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 25px;">

    {{-- Address Stack Block Row --}}
    <table class="header-table">
        <tr>
            <td style="width: 50%; padding-right: 20px;">
                <div class="section-title">Consignee Shipping Destination</div>
                @if($order->address_snapshot)
                    <div style="font-weight: bold; font-size: 14px; margin-bottom: 3px;">
                        {{ $order->address_snapshot['name'] ?? 'Recipient Operator' }}
                    </div>
                    <div style="color: #4a5568; line-height: 1.4;">
                        {{ $order->address_snapshot['address_line_1'] ?? '' }}<br>
                        @if(!empty($order->address_snapshot['address_line_2']))
                            {{ $order->address_snapshot['address_line_2'] }}<br>
                        @endif
                        {{ $order->address_snapshot['city'] ?? '' }}, {{ $order->address_snapshot['state'] ?? '' }} - <strong>{{ $order->address_snapshot['pincode'] ?? '' }}</strong>
                    </div>
                    <div class="meta-text" style="margin-top: 5px;">
                        Contact Line: {{ $order->address_snapshot['phone'] ?? ($order->customer->phone ?? '—') }}
                    </div>
                @else
                    {{-- Deep fallback check if address snapshot is entirely missing --}}
                    <div style="font-weight: bold; font-size: 14px; margin-bottom: 3px;">
                        {{ $order->customer->name ?? 'Guest Checkout Profile' }}
                    </div>
                    <div class="meta-text">Primary Phone: {{ $order->customer->phone ?? '—' }}</div>
                @endif
            </td>
            <td style="width: 50%; padding-left: 20px;">
                <div class="section-title">Customer Account Context</div>
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 3px;">
                    {{ $order->customer->name ?? 'Guest Account Line' }}
                </div>

                {{-- Null safe operator chaining checks added here --}}
                <div class="meta-text">Primary Phone: {{ $order->customer->phone ?? '—' }}</div>
                @if($order->customer && $order->customer->email)
                    <div class="meta-text">Account Email: {{ $order->customer->email }}</div>
                @endif

                @if($order->notes)
                    <div style="margin-top: 12px; padding: 8px; background-color: #fffaf0; border: 1px solid #feebc8; border-radius: 6px; font-size: 12px; color: #c05621;">
                        <strong>Dispatch Note:</strong> "{{ $order->notes }}"
                    </div>
                @endif
            </td>
        </tr>
    </table>

    {{-- Itemized Allocation Listing Grid --}}
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 50%;">Product SKU Description Mapping</th>
                <th style="width: 25%;">Warehouse Part SKU</th>
                <th style="width: 25%; text-align: center;">Allocated Quantity</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->items as $item)
                <tr>
                    <td>
                        <div style="font-weight: bold; color: #2d3748;">
                            {{ $item->product_snapshot['product_name'] ?? ($item->productVariant->product->name ?? 'Unknown Inventory Product') }}
                        </div>
                        @if($item->productVariant)
                            <div style="font-size: 11px; color: #718096; margin-top: 2px;">
                                Configuration: {{ $item->productVariant->variant_name }}
                            </div>
                        @endif
                    </td>
                    <td class="font-mono text-muted">
                        {{ $item->product_snapshot['sku'] ?? ($item->productVariant->sku ?? '—') }}
                    </td>
                    <td class="font-mono text-center" style="font-size: 14px; font-weight: bold; color: #1a202c;">
                        {{ $item->quantity }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- System Verification Bounds Signature Band --}}
    <div class="footer-note">
        <p>Please audit physical package container counts against values present on this allocation document signature path line prior to vehicle container loading runs.</p>
        <div style="margin-top: 40px; text-align: right; padding-right: 20px;">
            <div style="display: inline-block; width: 180px; border-bottom: 1px solid #cbd5e0; margin-bottom: 5px;"></div>
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #a0aec0; padding-right: 25px;">Authorized Dispatch Signature</div>
        </div>
        <p style="font-size: 10px; color: #cbd5e0; margin-top: 30px;">System Automated Allocation Log Entry · {{ $settings['receipt_footer'] ?? '' }}</p>
    </div>
</div>

</body>
</html>
