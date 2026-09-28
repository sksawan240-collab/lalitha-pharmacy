import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider, SocketProvider, ThemeProvider } from './context/AppContext';
import PublicLayout from './layouts/PublicLayout';
import { CustomerShell, AdminShell, SalesShell, Guard } from './layouts/DashLayout';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Categories from './pages/Categories';
import { Login, Register, VerifyOtp, Forgot, ResetPw } from './pages/Auth';
import { About, Services, Contact, NotFound } from './pages/Static';
import { CustHome, Shop, CartPage } from './pages/customer/C1';
import { Checkout } from './pages/customer/C2';
import { Orders, OrderDetail } from './pages/customer/C3';
import { Invoices, Wishlist, Notifs, Profile } from './pages/customer/C4';
import { AdminHome } from './pages/admin/A1';
import { ProductsAdmin } from './pages/admin/A2';
import { AdminOrders, InventoryAdmin, AdminOrderDetail } from './pages/admin/A3';
import { UsersAdmin, AnalyticsAdmin } from './pages/admin/A4';
import { MiscAdmin } from './pages/admin/A5';
import CategoriesAdmin from './pages/admin/CategoriesAdmin';
import { SalesHome, SalesOrders, SalesOrderDetail, SalesMisc } from './pages/sales/S';
import { SalesManagerShell } from './layouts/DashLayout';

export default function Router() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
          <Analytics />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="categories" element={<Categories />} />
              <Route path="about" element={<About />} />
              <Route path="services" element={<Services />} />
              <Route path="contact" element={<Contact />} />
            </Route>

            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="verify-otp" element={<VerifyOtp />} />
            <Route path="forgot-password" element={<Forgot />} />
            <Route path="reset-password" element={<ResetPw />} />

            <Route path="app" element={<Guard roles={['CUSTOMER', 'ADMIN', 'SALES_OPERATOR']}><CustomerShell /></Guard>}>
              <Route index element={<CustHome />} />
              <Route path="products" element={<Shop />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="notifications" element={<Notifs />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="admin" element={<Guard roles={['ADMIN']}><AdminShell /></Guard>}>
              <Route index element={<AdminHome />} />
              <Route path="products" element={<ProductsAdmin />} />
              <Route path="categories" element={<CategoriesAdmin />} />
              <Route path="inventory" element={<InventoryAdmin />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="customers" element={<UsersAdmin />} />
              <Route path="staff" element={<UsersAdmin />} />
              <Route path="analytics" element={<AnalyticsAdmin />} />
              <Route path="announcements" element={<MiscAdmin kind="ann" />} />
              <Route path="notifications" element={<MiscAdmin kind="notifs" />} />
              <Route path="audit" element={<MiscAdmin kind="audit" />} />
            </Route>

            <Route path="sales" element={<Guard roles={['SALES_OPERATOR', 'SALES_MANAGER', 'ADMIN']}><SalesShell /></Guard>}>
              <Route index element={<SalesHome />} />
              <Route path="orders" element={<SalesOrders />} />
              <Route path="orders/:id" element={<SalesOrderDetail />} />
              <Route path="customers" element={<SalesMisc kind="customers" />} />
              <Route path="products" element={<SalesMisc kind="products" />} />
              <Route path="inventory" element={<SalesMisc kind="low" />} />
              <Route path="notifications" element={<SalesMisc kind="notifs" />} />
            </Route>

            <Route path="sales-manager" element={<Guard roles={['SALES_MANAGER', 'ADMIN']}><SalesManagerShell /></Guard>}>
              <Route index element={<SalesHome />} />
              <Route path="orders" element={<SalesOrders />} />
              <Route path="orders/:id" element={<SalesOrderDetail />} />
              <Route path="customers" element={<SalesMisc kind="customers" />} />
              <Route path="products" element={<SalesMisc kind="products" />} />
              <Route path="inventory" element={<SalesMisc kind="low" />} />
              <Route path="notifications" element={<SalesMisc kind="notifs" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export { Navigate };
