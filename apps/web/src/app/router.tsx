import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar.js';
import { Footer } from '../components/layout/Footer.js';
import { CartDrawer } from '../components/cart/CartDrawer.js';

import { HomePage } from '../pages/HomePage.js';
import { SearchPage } from '../pages/SearchPage.js';
import { ProductDetailPage } from '../pages/ProductDetailPage.js';
import { CartPage } from '../pages/CartPage.js';
import { CheckoutPage } from '../pages/CheckoutPage.js';
import { OrderConfirmationPage } from '../pages/OrderConfirmationPage.js';
import { OrdersPage } from '../pages/OrdersPage.js';
import { OrderDetailPage } from '../pages/OrderDetailPage.js';
import { AuthPage } from '../pages/AuthPage.js';
import { VendorDashboardPage } from '../pages/VendorDashboardPage.js';
import { VendorApplyPage } from '../pages/VendorApplyPage.js';
import { AdminDashboardPage } from '../pages/AdminDashboardPage.js';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'products/:slug', element: <ProductDetailPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'order-confirmation/:id', element: <OrderConfirmationPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'auth', element: <AuthPage /> },
      { path: 'vendor', element: <VendorDashboardPage /> },
      { path: 'vendor/dashboard', element: <VendorDashboardPage /> },
      { path: 'vendor/apply', element: <VendorApplyPage /> },
      { path: 'admin', element: <AdminDashboardPage /> },
    ],
  },
]);

