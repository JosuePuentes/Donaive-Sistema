import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  findDocumentPayments(limit = 100, type?: 'sales' | 'purchases') {
    return this.prisma.documentPayment.findMany({
      where: {
        ...(type === 'sales' ? { invoiceId: { not: null } } : {}),
        ...(type === 'purchases' ? { purchaseId: { not: null } } : {}),
      },
      include: {
        paymentMethod: { select: { name: true, code: true, type: true } },
        bankAccount: { select: { accountName: true, currency: true } },
        invoice: { select: { id: true, number: true, documentType: true, totalUsd: true } },
        purchase: {
          select: {
            id: true,
            number: true,
            supplierInvoiceNumber: true,
            supplier: { select: { businessName: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  findSupplierPayments(limit = 100) {
    return this.prisma.supplierPayment.findMany({
      include: {
        accountPayable: {
          select: {
            purchase: {
              select: {
                number: true,
                supplierInvoiceNumber: true,
                supplier: { select: { businessName: true } },
              },
            },
          },
        },
        paymentMethod: { select: { name: true, code: true } },
        bankAccount: { select: { accountName: true, currency: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }
}
