import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Trade } from '@/lib/api';

type SimpleColumn<T> = {
  key: keyof T | string;
  title: string;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
};

export const columns: SimpleColumn<Trade>[] = [
  {
    key: 'timestamp',
    title: 'Date & Time',
    render: (value) => {
      try {
        return new Date(value as any).toLocaleString();
      } catch {
        return String(value ?? '');
      }
    },
  },
  {
    key: 'pair',
    title: 'Pair',
  },
  {
    key: 'side',
    title: 'Side',
    render: (value) => {
      const side = String(value ?? '');
      const isBuy = side === 'buy' || side === 'long';
      return (
        <div className="flex items-center">
          {isBuy ? (
            <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`font-medium ${isBuy ? 'text-green-500' : 'text-red-500'}`}>
            {side.toUpperCase()}
          </span>
        </div>
      );
    },
  },
  {
    key: 'price',
    title: 'Price',
    className: 'text-right',
    render: (value) => {
      const amount = Number(value ?? 0);
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      }).format(Number.isFinite(amount) ? amount : 0);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    key: 'amount',
    title: 'Amount',
    className: 'text-right',
    render: (value) => {
      const amount = Number(value ?? 0);
      return <div className="text-right">{Number.isFinite(amount) ? amount.toFixed(8) : '0.00000000'}</div>;
    },
  },
  {
    key: 'value',
    title: 'Value',
    className: 'text-right',
    render: (value) => {
      const amount = Number(value ?? 0);
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number.isFinite(amount) ? amount : 0);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    key: 'pnl',
    title: 'PnL',
    className: 'text-right',
    render: (pnl, item) => {
      const pnlValue = Number(pnl);
      const pnlPercentage = (item as Trade).pnlPercentage;
      if (!Number.isFinite(pnlValue) || pnlPercentage == null) {
        return <div className="text-right">-</div>;
      }
      const isPositive = pnlValue >= 0;
      const formattedPnl = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(pnlValue);
      return (
        <div className={`text-right font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {formattedPnl} ({isPositive ? '+' : ''}{Number(pnlPercentage).toFixed(2)}%)
        </div>
      );
    },
  },
  {
    key: 'tags',
    title: 'Source',
    render: (value, item) => {
      const tags = Array.isArray(value) ? value as string[] : (Array.isArray((item as any)?.tags) ? (item as any).tags as string[] : []);
      const isTest = tags.includes('test');
      const isLive = tags.includes('live');
      const label = isTest ? 'Test' : isLive ? 'Live' : 'Unknown';
      const cls = isTest
        ? 'bg-yellow-100 text-yellow-800'
        : isLive
        ? 'bg-blue-100 text-blue-800'
        : 'bg-gray-100 text-gray-800';
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
          {label}
        </span>
      );
    },
  },
  {
    key: 'status',
    title: 'Status',
    render: (value) => {
      const status = String(value ?? '');
      const statusMap: Record<string, { label: string; className: string }> = {
        open: { label: 'Open', className: 'bg-blue-100 text-blue-800' },
        closed: { label: 'Closed', className: 'bg-green-100 text-green-800' },
        canceled: { label: 'Canceled', className: 'bg-gray-100 text-gray-800' },
        liquidated: { label: 'Liquidated', className: 'bg-red-100 text-red-800' },
      };
      const statusInfo = statusMap[status.toLowerCase()] || { label: status, className: 'bg-gray-100 text-gray-800' };
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      );
    },
  },
];
