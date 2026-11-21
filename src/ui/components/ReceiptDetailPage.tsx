import type { Receipt } from "../../domain/types";
import { ReceiptDetail } from "./ReceiptDetail";

interface ReceiptDetailPageProps {
  receipt: Receipt;
  onBack(): void;
  onDelete(): void;
}

export function ReceiptDetailPage({ receipt, onBack, onDelete }: ReceiptDetailPageProps) {
  return (
    <div id="receipt-detail-page" className="page flex flex-col">
      <header className="list-header">
        <div className="flex min-w-0 items-center gap-2">
          <button id="back-to-history" className="icon-button" type="button" aria-label="Back to history" onClick={onBack}>
            <svg className="size-[1.125rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <h1 id="receipt-page-title" className="detail-title">Receipt</h1>
        </div>
      </header>
      <main id="screen-scroll" className="page-scroll min-h-0 flex-1">
        <ReceiptDetail receipt={receipt} onDelete={onDelete} />
      </main>
    </div>
  );
}
