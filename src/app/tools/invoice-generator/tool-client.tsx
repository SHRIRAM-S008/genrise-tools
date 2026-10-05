"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import DownloadButton from "@/components/DownloadButton";
import { X } from "lucide-react";
import { buildInvoicePdf, CURRENCIES, type InvoiceData } from "@/lib/invoiceGenerator";
import { useLocalDraft } from "@/lib/useLocalDraft";
import { todayInputValue } from "@/lib/dateInput";

/**
 * Form state keeps numeric fields as strings so a cleared input stays empty
 * instead of snapping to 0. Values are parsed only when they are used.
 */
interface DraftItem {
  description: string;
  quantity: string;
  price: string;
}

interface InvoiceDraft {
  businessName: string;
  businessAddress: string;
  customerName: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  items: DraftItem[];
  taxPercent: string;
  discount: string;
  currency: string;
  notes: string;
}

const emptyItem: DraftItem = { description: "", quantity: "1", price: "" };

const emptyInvoice: InvoiceDraft = {
  businessName: "",
  businessAddress: "",
  customerName: "",
  invoiceNumber: "001",
  date: "",
  dueDate: "",
  items: [{ ...emptyItem }],
  taxPercent: "0",
  discount: "0",
  currency: "$",
  notes: "",
};

/** Null for blank or non-numeric input, so callers can tell "missing" from "zero". */
function parseNum(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampDiscount(value: string): string {
  const n = parseNum(value);
  if (n === null) return value;
  if (n > 100) return "100";
  if (n < 0) return "0";
  return value;
}

export default function InvoiceGeneratorPage() {
  const { value: data, setValue: setData, clearDraft, restored } = useLocalDraft<InvoiceDraft>(
    "genrise:invoice-draft:v2",
    emptyInvoice
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof InvoiceDraft>(key: K, value: InvoiceDraft[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  }

  function updateItem(index: number, patch: Partial<DraftItem>) {
    update("items", data.items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  // Items without a description are left out of the invoice, the totals and the PDF.
  const activeItems = data.items.filter((it) => it.description.trim() !== "");
  const itemTotals = activeItems.map((it) => (parseNum(it.quantity) ?? 0) * (parseNum(it.price) ?? 0));

  const errors: string[] = [];
  if (!data.businessName.trim()) errors.push("Enter your business name.");
  if (!data.customerName.trim()) errors.push("Enter the customer name.");
  if (activeItems.length === 0) errors.push("Add at least one item with a description.");
  data.items.forEach((it, i) => {
    if (!it.description.trim()) return;
    if (parseNum(it.quantity) === null || (parseNum(it.quantity) ?? 0) < 0)
      errors.push(`Item ${i + 1}: enter a quantity of 0 or more.`);
    if (parseNum(it.price) === null || (parseNum(it.price) ?? 0) < 0)
      errors.push(`Item ${i + 1}: enter a price of 0 or more.`);
  });
  if (parseNum(data.taxPercent) === null || (parseNum(data.taxPercent) ?? 0) < 0) errors.push("Tax must be 0 or more.");
  if (parseNum(data.discount) === null) errors.push("Enter a discount between 0 and 100.");

  function toInvoiceData(): InvoiceData {
    const notes = [data.dueDate ? `Due date: ${data.dueDate}` : "", data.notes.trim()].filter(Boolean).join("\n");
    return {
      businessName: data.businessName,
      businessAddress: data.businessAddress,
      customerName: data.customerName,
      invoiceNumber: data.invoiceNumber,
      date: data.date || todayInputValue(),
      items: activeItems.map((it) => ({
        description: it.description,
        quantity: parseNum(it.quantity) ?? 0,
        price: parseNum(it.price) ?? 0,
      })),
      taxPercent: parseNum(data.taxPercent) ?? 0,
      discount: Math.min(100, Math.max(0, parseNum(data.discount) ?? 0)),
      currency: data.currency,
      notes,
    };
  }

  async function run() {
    if (errors.length) return;
    setBusy(true);
    setError(null);
    try {
      const output = await buildInvoicePdf(toInvoiceData());
      setResult(output);
    } catch {
      setError("Couldn't build the invoice PDF. Check the item values and try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "rounded-lg border border-border px-3 py-2";
  const currency = data.currency;
  const subtotal = itemTotals.reduce((sum, t) => sum + t, 0);
  const discountPct = Math.min(100, Math.max(0, parseNum(data.discount) ?? 0));
  const taxPct = Math.max(0, parseNum(data.taxPercent) ?? 0);
  const discountAmount = (subtotal * discountPct) / 100;
  const taxAmount = ((subtotal - discountAmount) * taxPct) / 100;
  const total = subtotal - discountAmount + taxAmount;
  const money = (value: number) => `${currency}${value.toFixed(2)}`;

  return (
    <ToolLayout title="Invoice Generator" description="Create a simple, professional invoice PDF for a client.">
      {restored && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm text-muted-foreground">
          Restored your last draft from this device.
          <button onClick={clearDraft} className="font-medium text-primary hover:underline">
            Start fresh
          </button>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input aria-label="Business name" placeholder="Your business name *" value={data.businessName} onChange={(e) => update("businessName", e.target.value)} className={inputClass} />
        <input aria-label="Business address" placeholder="Business address" value={data.businessAddress} onChange={(e) => update("businessAddress", e.target.value)} className={inputClass} />
        <input aria-label="Customer name" placeholder="Customer name *" value={data.customerName} onChange={(e) => update("customerName", e.target.value)} className={inputClass} />
        <input aria-label="Invoice number" placeholder="Invoice number" value={data.invoiceNumber} onChange={(e) => update("invoiceNumber", e.target.value)} className={inputClass} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Invoice date</span>
          <input type="date" value={data.date || todayInputValue()} onChange={(e) => update("date", e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Due date (optional)</span>
          <input type="date" value={data.dueDate} onChange={(e) => update("dueDate", e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Currency</span>
          <select value={currency} onChange={(e) => update("currency", e.target.value)} className={inputClass}>
            {CURRENCIES.map((c) => (
              <option key={c.code || "none"} value={c.symbol}>
                {c.code ? `${c.code} (${c.symbol.trim()})` : "No symbol"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-medium">Items</h2>
        <div className="hidden grid-cols-[1fr_70px_90px_90px_auto] gap-2 text-xs text-muted-foreground sm:grid">
          <span>Description</span>
          <span>Qty</span>
          <span>Price</span>
          <span className="text-right">Line total</span>
          <span />
        </div>
        {data.items.map((item, i) => {
          const lineTotal = (parseNum(item.quantity) ?? 0) * (parseNum(item.price) ?? 0);
          return (
            <div key={i} className="grid grid-cols-[1fr_70px_90px_90px_auto] items-center gap-2">
              <input aria-label={`Item ${i + 1} description`} placeholder="Description" value={item.description} onChange={(e) => updateItem(i, { description: e.target.value })} className={inputClass} />
              <input aria-label={`Item ${i + 1} quantity`} type="number" min={0} inputMode="decimal" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, { quantity: e.target.value })} className={inputClass} />
              <input aria-label={`Item ${i + 1} price`} type="number" min={0} step="0.01" inputMode="decimal" placeholder="Price" value={item.price} onChange={(e) => updateItem(i, { price: e.target.value })} className={inputClass} />
              <span className="text-right text-sm tabular-nums">{money(lineTotal)}</span>
              <button
                aria-label={`Remove item ${i + 1}`}
                onClick={() => update("items", data.items.filter((_, j) => j !== i))}
                disabled={data.items.length === 1}
                className="text-muted-foreground hover:text-destructive disabled:opacity-30"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
        <button onClick={() => update("items", [...data.items, { ...emptyItem }])} className="w-fit rounded-full border border-border px-4 py-2 text-sm">
          + Add item
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Tax %</span>
          <input type="number" min={0} inputMode="decimal" value={data.taxPercent} onChange={(e) => update("taxPercent", e.target.value)} className={`w-24 ${inputClass}`} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Discount % (0–100)</span>
          <input
            type="number"
            min={0}
            max={100}
            inputMode="decimal"
            value={data.discount}
            onChange={(e) => update("discount", clampDiscount(e.target.value))}
            className={`w-24 ${inputClass}`}
          />
        </label>
      </div>

      <textarea
        placeholder="Notes (payment terms, bank details…)"
        value={data.notes}
        onChange={(e) => update("notes", e.target.value)}
        rows={2}
        className={inputClass}
      />

      <dl className="grid w-fit grid-cols-[auto_auto] gap-x-6 gap-y-1 rounded-2xl border border-border p-5 text-sm">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="text-right">{money(subtotal)}</dd>
        {discountPct > 0 && (
          <>
            <dt className="text-muted-foreground">Discount ({discountPct}%)</dt>
            <dd className="text-right">-{money(discountAmount)}</dd>
          </>
        )}
        {taxPct > 0 && (
          <>
            <dt className="text-muted-foreground">Tax ({taxPct}%)</dt>
            <dd className="text-right">{money(taxAmount)}</dd>
          </>
        )}
        <dt className="font-medium">Total</dt>
        <dd className="text-right font-medium">{money(total)}</dd>
      </dl>

      <div className="flex flex-wrap gap-3">
        <button onClick={run} disabled={errors.length > 0 || busy} className="w-fit rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground disabled:opacity-50">
          {busy ? "Building…" : "Generate Invoice PDF"}
        </button>
        <button onClick={clearDraft} className="w-fit rounded-full border border-border px-6 py-3 font-medium">
          Clear form
        </button>
      </div>

      {errors.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-destructive">{error}</p>}

      {result && (
        <div className="rounded-2xl border border-border p-5">
          <DownloadButton blob={result.blob} filename={result.filename} />
        </div>
      )}
    </ToolLayout>
  );
}
