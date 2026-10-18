// =============================================================================
// app/api/v1/invoices/[id]/receipt/route.ts
// =============================================================================
// Streams a PDF receipt for PAID invoices. Stub implementation: returns a
// minimal PDF document; wire @react-pdf/renderer or pdfkit for rich receipts.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Params = z.object({ id: z.string() });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Params.safeParse({ id });
  if (!parsed.success) return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid invoice id' } }, { status: 400 });

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { merchant: true, payments: true },
  });
  if (!invoice) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } }, { status: 404 });
  if (invoice.status !== 'PAID') return NextResponse.json({ error: { code: 'NOT_PAID', message: 'Receipt only available for paid invoices' } }, { status: 409 });

  const pdf = Buffer.from(
    `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>stream BT /F1 24 Tf 50 700 Td (RobinPay Receipt) Tj ET endstream endobj xref 0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000064 00000 n \n0000000122 00000 n \ntrailer<</Size 4/Root 1 0 R>>startxref 212\n%%EOF`,
  );

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${invoice.id}.pdf"`,
    },
  });
}
