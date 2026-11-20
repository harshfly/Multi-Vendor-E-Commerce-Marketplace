import PDFDocument from 'pdfkit';
import { prisma } from '../../lib/prisma.js';
import { formatINR } from '@haat/shared';
import { NotFoundError, ForbiddenError } from '../../middleware/error.js';

export class InvoiceService {
  async generateOrderInvoicePdf(orderId: string, userId: string, userRole: string): Promise<PDFKit.PDFDocument> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        vendorOrders: {
          include: {
            vendor: true,
            items: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundError('Order not found');

    if (userRole !== 'ADMIN' && order.userId !== userId) {
      throw new ForbiddenError('Access denied to invoice');
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Header
    doc.fillColor('#0E6B63').fontSize(24).font('Helvetica-Bold').text('HAAT MARKETPLACE', 40, 40);
    doc.fillColor('#666666').fontSize(10).font('Helvetica').text('Tax Invoice / Bill of Supply', 40, 68);

    doc.fillColor('#16202A').fontSize(11).font('Helvetica-Bold').text(`Order #: ${order.number}`, 380, 40);
    doc.font('Helvetica').fontSize(9).text(`Date: ${order.createdAt.toLocaleDateString('en-IN')}`, 380, 56);
    doc.text(`Status: ${order.status}`, 380, 70);

    doc.moveTo(40, 90).lineTo(555, 90).strokeColor('#E3E7EC').stroke();

    // Customer & Shipping Address
    const address = order.shippingAddress as any;
    doc.fillColor('#0E6B63').fontSize(11).font('Helvetica-Bold').text('Billed & Shipped To:', 40, 105);
    doc.fillColor('#16202A').fontSize(10).font('Helvetica');
    doc.text(address?.fullName || order.user.name, 40, 120);
    doc.text(address?.line1 || '', 40, 134);
    if (address?.line2) doc.text(address.line2, 40, 148);
    doc.text(`${address?.city || ''}, ${address?.state || ''} - ${address?.pincode || ''}`, 40, address?.line2 ? 162 : 148);
    doc.text(`Phone: ${address?.phone || ''}`, 40, address?.line2 ? 176 : 162);

    let y = address?.line2 ? 200 : 185;

    // Line Items Grouped by Vendor
    for (const vo of order.vendorOrders) {
      doc.fillColor('#0E6B63').fontSize(12).font('Helvetica-Bold').text(`Sold By: ${vo.vendor.storeName}`, 40, y);
      y += 18;

      // Table Header
      doc.rect(40, y, 515, 20).fill('#F6F7F9');
      doc.fillColor('#16202A').fontSize(9).font('Helvetica-Bold');
      doc.text('Item Description', 48, y + 5);
      doc.text('Qty', 320, y + 5, { width: 40, align: 'center' });
      doc.text('Unit Price', 380, y + 5, { width: 80, align: 'right' });
      doc.text('Total', 475, y + 5, { width: 75, align: 'right' });
      y += 24;

      doc.font('Helvetica').fontSize(9);
      for (const item of vo.items) {
        doc.fillColor('#16202A');
        doc.text(item.titleSnapshot, 48, y, { width: 260 });
        doc.text(String(item.quantity), 320, y, { width: 40, align: 'center' });
        doc.text(formatINR(item.unitPricePaise), 380, y, { width: 80, align: 'right' });
        doc.text(formatINR(item.unitPricePaise * item.quantity), 475, y, { width: 75, align: 'right' });
        y += 20;
      }

      doc.moveTo(40, y).lineTo(555, y).strokeColor('#E3E7EC').stroke();
      y += 10;
    }

    // Totals Box
    y += 15;
    doc.rect(340, y, 215, 95).strokeColor('#E3E7EC').stroke();
    let ty = y + 10;
    doc.fontSize(9).font('Helvetica');

    doc.text('Subtotal:', 350, ty);
    doc.text(formatINR(order.subtotalPaise), 460, ty, { width: 90, align: 'right' });
    ty += 16;

    if (order.discountPaise > 0) {
      doc.fillColor('#C23A31');
      doc.text(`Discount (${order.couponCode || 'Promo'}):`, 350, ty);
      doc.text(`- ${formatINR(order.discountPaise)}`, 460, ty, { width: 90, align: 'right' });
      doc.fillColor('#16202A');
      ty += 16;
    }

    doc.text('Shipping:', 350, ty);
    doc.text(order.shippingPaise === 0 ? 'FREE' : formatINR(order.shippingPaise), 460, ty, { width: 90, align: 'right' });
    ty += 18;

    doc.moveTo(340, ty).lineTo(555, ty).strokeColor('#E3E7EC').stroke();
    ty += 8;

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0E6B63');
    doc.text('Total Paid:', 350, ty);
    doc.text(formatINR(order.totalPaise), 460, ty, { width: 90, align: 'right' });

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#888888').text(
      'This is an electronically generated invoice. Authorized signature not required. All values in INR.',
      40,
      760,
      { align: 'center', width: 515 }
    );

    doc.end();
    return doc;
  }
}

export const invoiceService = new InvoiceService();

