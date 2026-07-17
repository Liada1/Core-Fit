import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Vitrine from './pages/Vitrine.jsx'
import ProdutoDetalhe from './pages/ProdutoDetalhe.jsx'
import Carrinho from './pages/Carrinho.jsx'
import Checkout from './pages/Checkout.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminPedidos from './pages/admin/AdminPedidos.jsx'
import AdminProdutoForm from './pages/admin/AdminProdutoForm.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Vitrine />} />
      <Route path="/produto/:id" element={<ProdutoDetalhe />} />
      <Route path="/carrinho" element={<Carrinho />} />
      <Route path="/checkout" element={<Checkout />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pedidos"
        element={
          <ProtectedRoute>
            <AdminPedidos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/produtos/novo"
        element={
          <ProtectedRoute>
            <AdminProdutoForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/produtos/:id"
        element={
          <ProtectedRoute>
            <AdminProdutoForm />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
