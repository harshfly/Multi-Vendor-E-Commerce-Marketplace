import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Haat Multi-Vendor Marketplace database...');

  // Clean existing data
  await prisma.review.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.orderStatusEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.vendorOrder.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.order.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Demo@1234', 10);

  // 1. Users & Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@haat.test',
      passwordHash,
      name: 'Haat Admin',
      role: 'ADMIN',
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@haat.test',
      passwordHash,
      name: 'Rohan Sharma',
      role: 'CUSTOMER',
      addresses: {
        create: [
          {
            fullName: 'Rohan Sharma',
            phone: '9876543210',
            line1: '402, Sunshine Apartments, Linking Road',
            line2: 'Bandra West',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400050',
            isDefault: true,
          },
          {
            fullName: 'Rohan Sharma (Office)',
            phone: '9876543210',
            line1: 'Tower B, 7th Floor, Cyber Hub',
            city: 'Gurugram',
            state: 'Haryana',
            pincode: '122002',
            isDefault: false,
          },
        ],
      },
    },
  });

  // More customers
  const customerNames = [
    'Priya Patel',
    'Arjun Nair',
    'Ananya Sen',
    'Vikram Malhotra',
    'Neha Gupta',
    'Kabir Singh',
    'Pooja Verma',
    'Aditya Joshi',
    'Sneha Iyer',
  ];

  const customers = [customerUser];
  for (let i = 0; i < customerNames.length; i++) {
    const c = await prisma.user.create({
      data: {
        email: `customer${i + 2}@haat.test`,
        passwordHash,
        name: customerNames[i],
        role: 'CUSTOMER',
        addresses: {
          create: {
            fullName: customerNames[i],
            phone: `987000100${i}`,
            line1: `${10 + i * 5}, MG Road`,
            city: i % 2 === 0 ? 'Bengaluru' : 'Delhi',
            state: i % 2 === 0 ? 'Karnataka' : 'Delhi',
            pincode: i % 2 === 0 ? '560001' : '110001',
            isDefault: true,
          },
        },
      },
    });
    customers.push(c);
  }

  // 2. Vendors
  const vendorData = [
    {
      name: 'Kavita Textiles & Crafts',
      slug: 'kavita-textiles',
      email: 'vendor1@haat.test',
      status: 'APPROVED' as const,
      commissionBps: 1000, // 10%
      gatewayAccountId: 'acc_rzp_kavita1',
      description: 'Handwoven cotton, pure linen sarees, and artisanal block-printed fabrics.',
      logoUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Zenith Audio & Tech',
      slug: 'zenith-tech',
      email: 'vendor2@haat.test',
      status: 'APPROVED' as const,
      commissionBps: 800, // 8%
      gatewayAccountId: 'acc_rzp_zenith2',
      description: 'High fidelity audio equipment, mechanical keyboards, and workspace gadgets.',
      logoUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Clay & Copper Pottery',
      slug: 'clay-and-copper',
      email: 'vendor3@haat.test',
      status: 'APPROVED' as const,
      commissionBps: 1200, // 12%
      gatewayAccountId: 'acc_rzp_clay3',
      description: 'Hand-thrown terracotta dinnerware, hammered copper drinkware, and home vessels.',
      logoUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Organic Roots Spices',
      slug: 'organic-roots',
      email: 'vendor.pending@haat.test',
      status: 'PENDING' as const,
      commissionBps: 1000,
      gatewayAccountId: null,
      description: 'Single-origin spices harvested organically from Kerala and Meghalaya.',
      logoUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Retro Leatherworks',
      slug: 'retro-leather',
      email: 'vendor.suspended@haat.test',
      status: 'SUSPENDED' as const,
      commissionBps: 1000,
      gatewayAccountId: 'acc_rzp_retro5',
      description: 'Handcrafted full-grain leather bags, wallets, and journal covers.',
      logoUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&auto=format&fit=crop&q=80',
    },
  ];

  const vendors: any[] = [];
  for (const vd of vendorData) {
    const user = await prisma.user.create({
      data: {
        email: vd.email,
        passwordHash,
        name: vd.name,
        role: vd.status === 'APPROVED' ? 'VENDOR' : 'CUSTOMER',
      },
    });

    const vendor = await prisma.vendor.create({
      data: {
        userId: user.id,
        storeName: vd.name,
        slug: vd.slug,
        description: vd.description,
        logoUrl: vd.logoUrl,
        status: vd.status,
        commissionBps: vd.commissionBps,
        gatewayAccountId: vd.gatewayAccountId,
      },
    });
    vendors.push(vendor);
  }

  // 3. Categories (Hierarchy)
  const catTree = [
    {
      name: 'Electronics & Audio',
      slug: 'electronics',
      children: [
        { name: 'Headphones & Audio', slug: 'headphones' },
        { name: 'Keyboards & Peripherals', slug: 'peripherals' },
      ],
    },
    {
      name: 'Apparel & Textiles',
      slug: 'apparel',
      children: [
        { name: 'Handloom Sarees', slug: 'sarees' },
        { name: 'Kurtas & Tunics', slug: 'kurtas' },
      ],
    },
    {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      children: [
        { name: 'Pottery & Ceramics', slug: 'ceramics' },
        { name: 'Copper & Brassware', slug: 'copperware' },
      ],
    },
    {
      name: 'Artisan Crafts',
      slug: 'artisan-crafts',
      children: [
        { name: 'Woodwork & Decor', slug: 'woodwork' },
        { name: 'Handmade Journals', slug: 'journals' },
      ],
    },
  ];

  const categoryMap = new Map<string, any>();
  for (const parent of catTree) {
    const pCat = await prisma.category.create({
      data: { name: parent.name, slug: parent.slug },
    });
    categoryMap.set(parent.slug, pCat);

    for (const child of parent.children) {
      const cCat = await prisma.category.create({
        data: { name: child.name, slug: child.slug, parentId: pCat.id },
      });
      categoryMap.set(child.slug, cCat);
    }
  }

  // 4. Products across approved vendors
  const productsCatalog = [
    // Vendor 1: Kavita Textiles
    {
      vendorIdx: 0,
      catSlug: 'sarees',
      title: 'Handloom Chanderi Silk Saree with Zari Border',
      slug: 'chanderi-silk-saree-zari',
      description: 'Exquisite authentic handwoven Chanderi silk cotton saree featuring intricate golden zari craftsmanship. Lightweight and breathable for festivities.',
      pricePaise: 449900,
      mrpPaise: 649900,
      stock: 18,
      ratingAvg: 4.8,
      ratingCount: 24,
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      vendorIdx: 0,
      catSlug: 'kurtas',
      title: 'Pure Indigo Bagru Block Printed Linen Kurta',
      slug: 'indigo-bagru-linen-kurta',
      description: 'Crafted using centuries-old wooden block printing techniques with natural vegetable dyes in Bagru, Rajasthan. Relaxed regular fit with wooden button details.',
      pricePaise: 189900,
      mrpPaise: 249900,
      stock: 35,
      ratingAvg: 4.6,
      ratingCount: 19,
      images: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      vendorIdx: 0,
      catSlug: 'sarees',
      title: 'Mulmul Cotton Handblock Floral Saree',
      slug: 'mulmul-cotton-floral-saree',
      description: 'Feather-light pure mulmul cotton saree with soothing pastel botanical prints. Ideal for everyday elegance and warm tropical days.',
      pricePaise: 129900,
      mrpPaise: 179900,
      stock: 42,
      ratingAvg: 4.7,
      ratingCount: 15,
      images: [
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&auto=format&fit=crop&q=80',
      ],
    },

    // Vendor 2: Zenith Tech
    {
      vendorIdx: 1,
      catSlug: 'headphones',
      title: 'Zenith Studio Wireless ANC Over-Ear Headphones',
      slug: 'zenith-studio-wireless-anc',
      description: 'Flagship studio acoustics with custom 45mm neodymium drivers, active noise cancellation up to 42dB, lossless LDAC codec, and 50-hour battery life.',
      pricePaise: 899900,
      mrpPaise: 1299900,
      stock: 25,
      ratingAvg: 4.9,
      ratingCount: 68,
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      vendorIdx: 1,
      catSlug: 'peripherals',
      title: 'Zenith Custom 75% Mechanical Keyboard (Gateron Brown)',
      slug: 'zenith-75-mechanical-keyboard',
      description: 'Hot-swappable gasket-mounted mechanical keyboard with south-facing RGB, CNC anodized aluminum frame, PBT dye-sub keycaps, and triple mode connectivity.',
      pricePaise: 649900,
      mrpPaise: 849900,
      stock: 14,
      ratingAvg: 4.8,
      ratingCount: 32,
      images: [
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      vendorIdx: 1,
      catSlug: 'headphones',
      title: 'Zenith Pocket Hi-Fi DAC & Headphone Amplifier',
      slug: 'zenith-pocket-hifi-dac',
      description: 'Ultra-portable dual ES9038Q2M DAC dongle delivering clean 32-bit/768kHz PCM and native DSD512 decode for discerning audiophiles.',
      pricePaise: 349900,
      mrpPaise: 499900,
      stock: 28,
      ratingAvg: 4.7,
      ratingCount: 11,
      images: [
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
      ],
    },

    // Vendor 3: Clay & Copper Pottery
    {
      vendorIdx: 2,
      catSlug: 'ceramics',
      title: 'Artisan Speckled Ceramic Ramen & Salad Bowls (Set of 2)',
      slug: 'speckled-ceramic-ramen-bowls',
      description: 'Wheel-thrown stoneware glazed in matte slate white with rustic reactive speckles. Microwave and dishwasher safe, crafted by master potters.',
      pricePaise: 149900,
      mrpPaise: 199900,
      stock: 20,
      ratingAvg: 4.9,
      ratingCount: 41,
      images: [
        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      vendorIdx: 2,
      catSlug: 'copperware',
      title: 'Hand-Hammered Pure Copper Water Carafe & Tumbler Set',
      slug: 'hammered-copper-carafe-tumbler',
      description: 'Heavy gauge 99.8% pure virgin copper carafe (1000ml) with matching glasses. Naturally balances pH and preserves ancient Ayurvedic wellness traditions.',
      pricePaise: 229900,
      mrpPaise: 299900,
      stock: 15,
      ratingAvg: 4.8,
      ratingCount: 29,
      images: [
        'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      vendorIdx: 2,
      catSlug: 'ceramics',
      title: 'Terracotta Handcrafted Pour-Over Coffee Dripper with Mug',
      slug: 'terracotta-pour-over-coffee-dripper',
      description: 'Slow-drip clay brewer designed for pure flavor extraction, paired with a matching handleless tactile coffee mug.',
      pricePaise: 99900,
      mrpPaise: 149900,
      stock: 30,
      ratingAvg: 4.6,
      ratingCount: 16,
      images: [
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
      ],
    },
    {
      vendorIdx: 2,
      catSlug: 'woodwork',
      title: 'Hand-Carved Walnut Wood Catchall Valet Tray',
      slug: 'walnut-wood-catchall-valet-tray',
      description: 'Carved from single-slab solid Himalayan walnut wood with chamfered edges and polished with organic beeswax.',
      pricePaise: 119900,
      mrpPaise: 159900,
      stock: 22,
      ratingAvg: 4.9,
      ratingCount: 12,
      images: [
        'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
      ],
    },
  ];

  const createdProducts: any[] = [];
  for (const item of productsCatalog) {
    const vendor = vendors[item.vendorIdx];
    const category = categoryMap.get(item.catSlug)!;

    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        categoryId: category.id,
        title: item.title,
        slug: item.slug,
        description: item.description,
        pricePaise: item.pricePaise,
        mrpPaise: item.mrpPaise,
        stock: item.stock,
        status: 'ACTIVE',
        ratingAvg: item.ratingAvg,
        ratingCount: item.ratingCount,
        images: {
          create: item.images.map((url, idx) => ({
            url,
            key: `products/${vendor.id}/${item.slug}-${idx}`,
            position: idx,
          })),
        },
      },
      include: { images: true },
    });
    createdProducts.push(product);
  }

  // 5. Coupons
  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME10',
        type: 'PERCENT',
        value: 10,
        maxDiscountPaise: 100000, // ₹1,000 max
        minOrderPaise: 99900,     // ₹999 min
        startsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        active: true,
      },
      {
        code: 'FLAT500',
        type: 'FLAT',
        value: 50000,             // ₹500
        minOrderPaise: 299900,    // ₹2,999 min
        startsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        active: true,
      },
      {
        code: 'POTTERY15',
        type: 'PERCENT',
        value: 15,
        vendorId: vendors[2].id,  // Clay & Copper only
        maxDiscountPaise: 50000,
        minOrderPaise: 100000,
        startsAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        active: true,
      },
    ],
  });

  // 6. Realistic Seed Orders across the last 30 days
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 15; i++) {
    const cust = customers[i % customers.length];
    const p1 = createdProducts[i % createdProducts.length];
    const p2 = createdProducts[(i + 3) % createdProducts.length];

    const isMultiVendor = p1.vendorId !== p2.vendorId;
    const items = [
      { product: p1, qty: 1, unitPrice: p1.pricePaise },
      ...(isMultiVendor ? [{ product: p2, qty: 1, unitPrice: p2.pricePaise }] : []),
    ];

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const orderDate = new Date(now - (15 - i) * dayMs * 1.5);
    const orderNum = `HAAT-2026-000${100 + i}`;

    const order = await prisma.order.create({
      data: {
        number: orderNum,
        userId: cust.id,
        status: 'PAID',
        subtotalPaise: subtotal,
        discountPaise: 0,
        shippingPaise: 0,
        totalPaise: subtotal,
        shippingAddress: {
          fullName: cust.name,
          phone: '9876543210',
          line1: '123 Market Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
        createdAt: orderDate,
        payments: {
          create: {
            provider: 'fake',
            providerOrderId: `order_fake_${orderNum}`,
            providerPaymentId: `pay_fake_${orderNum}`,
            amountPaise: subtotal,
            status: 'CAPTURED',
            createdAt: orderDate,
          },
        },
      },
    });

    // Create VendorOrders
    const vendorGroup = new Map<string, typeof items>();
    for (const it of items) {
      const vId = it.product.vendorId;
      if (!vendorGroup.has(vId)) vendorGroup.set(vId, []);
      vendorGroup.get(vId)!.push(it);
    }

    for (const [vId, vItems] of vendorGroup.entries()) {
      const vSubtotal = vItems.reduce((s, it) => s + it.unitPrice * it.qty, 0);
      const commission = Math.round((vSubtotal * 1000) / 10000);
      const payout = vSubtotal - commission;
      const fulfilmentStatus = i < 8 ? 'DELIVERED' : i < 12 ? 'SHIPPED' : 'PACKED';

      const vo = await prisma.vendorOrder.create({
        data: {
          orderId: order.id,
          vendorId: vId,
          status: fulfilmentStatus,
          subtotalPaise: vSubtotal,
          commissionPaise: commission,
          vendorPayoutPaise: payout,
          trackingNumber: `DTDC${890000 + i}`,
          items: {
            create: vItems.map((it) => ({
              productId: it.product.id,
              titleSnapshot: it.product.title,
              imageSnapshot: it.product.images[0]?.url,
              unitPricePaise: it.unitPrice,
              quantity: it.qty,
            })),
          },
          statusHistory: {
            createMany: {
              data: [
                { status: 'PLACED', note: 'Order placed', createdAt: orderDate },
                { status: 'PACKED', note: 'Ready for shipping', createdAt: new Date(orderDate.getTime() + 6 * 3600 * 1000) },
                ...(fulfilmentStatus !== 'PACKED'
                  ? [
                      {
                        status: 'SHIPPED' as const,
                        note: `Dispatched with DTDC${890000 + i}`,
                        createdAt: new Date(orderDate.getTime() + 24 * 3600 * 1000),
                      },
                    ]
                  : []),
                ...(fulfilmentStatus === 'DELIVERED'
                  ? [
                      {
                        status: 'DELIVERED' as const,
                        note: 'Delivered to customer',
                        createdAt: new Date(orderDate.getTime() + 72 * 3600 * 1000),
                      },
                    ]
                  : []),
              ],
            },
          },
          payout: {
            create: {
              amountPaise: payout,
              status: 'PROCESSED',
              providerTransferId: `trf_seed_${i}_${vId.slice(-4)}`,
            },
          },
        },
      });

      // 7. Verified Reviews for delivered orders
      if (fulfilmentStatus === 'DELIVERED') {
        for (const it of vItems) {
          const alreadyReviewed = await prisma.review.findUnique({
            where: {
              productId_userId: {
                productId: it.product.id,
                userId: cust.id,
              },
            },
          });

          if (!alreadyReviewed) {
            await prisma.review.create({
              data: {
                productId: it.product.id,
                userId: cust.id,
                rating: 5,
                title: 'Exceptional quality and fast delivery!',
                body: 'Absolutely loved the authentic finish and careful packaging. Will definitely buy more from this seller.',
                verifiedPurchase: true,
                createdAt: new Date(orderDate.getTime() + 80 * 3600 * 1000),
              },
            });
          }
        }
      }
    }
  }

  console.log('✅ Seeding completed successfully!');
  console.log('Demo Credentials:');
  console.log('  Admin:    admin@haat.test / Demo@1234');
  console.log('  Vendor:   vendor1@haat.test / Demo@1234');
  console.log('  Customer: customer@haat.test / Demo@1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

