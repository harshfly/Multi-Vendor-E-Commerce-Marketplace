import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api.js';
import { toast } from 'sonner';

export interface CartLine {
  productId: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    slug: string;
    pricePaise: number;
    mrpPaise: number | null;
    stock: number;
    inStock: boolean;
    imageUrl: string;
    vendor: {
      id: string;
      storeName: string;
      slug: string;
      commissionBps: number;
    };
  };
  itemTotalPaise: number;
}

export interface VendorCartGroup {
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  lines: CartLine[];
  vendorSubtotalPaise: number;
}

export interface CartState {
  lines: CartLine[];
  vendors: VendorCartGroup[];
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  appliedCoupon: {
    code: string;
    type: string;
    value: number;
    discountPaise: number;
  } | null;
  itemCount: number;
}

interface CartContextType {
  cart: CartState;
  isLoading: boolean;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const initialCart: CartState = {
  lines: [],
  vendors: [],
  subtotalPaise: 0,
  discountPaise: 0,
  shippingPaise: 0,
  totalPaise: 0,
  appliedCoupon: null,
  itemCount: 0,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartState>(initialCart);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Guest id persistent tracking
  useEffect(() => {
    let guestId = localStorage.getItem('haat_guest_id');
    if (!guestId) {
      guestId = `guest_${Math.random().toString(36).substring(2, 12)}`;
      localStorage.setItem('haat_guest_id', guestId);
    }
    api.defaults.headers.common['x-guest-id'] = guestId;
    refreshCart();
  }, []);

  const refreshCart = async () => {
    try {
      const { data } = await api.get('/cart');
      setCart(data.cart);
    } catch {
      // Ignore initial load failure if offline
    }
  };

  const addItem = async (productId: string, quantity = 1) => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/cart/items', { productId, quantity });
      setCart(data.cart);
      toast.success('Added to cart');
      setIsDrawerOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to add item to cart');
    } finally {
      setIsLoading(false);
    }
  };

  const updateItem = async (productId: string, quantity: number) => {
    try {
      const { data } = await api.patch(`/cart/items/${productId}`, { quantity });
      setCart(data.cart);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update quantity');
    }
  };

  const removeItem = async (productId: string) => {
    try {
      const { data } = await api.delete(`/cart/items/${productId}`);
      setCart(data.cart);
      toast.info('Item removed from cart');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to remove item');
    }
  };

  const applyCoupon = async (code: string) => {
    try {
      const { data } = await api.post('/cart/coupon', { code });
      setCart(data.cart);
      toast.success(`Coupon ${code} applied successfully!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Invalid coupon code');
      throw err;
    }
  };

  const removeCoupon = async () => {
    try {
      const { data } = await api.delete('/cart/coupon');
      setCart(data.cart);
      toast.info('Coupon removed');
    } catch (err: any) {
      toast.error('Failed to remove coupon');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        isDrawerOpen,
        setIsDrawerOpen,
        addItem,
        updateItem,
        removeItem,
        applyCoupon,
        removeCoupon,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

