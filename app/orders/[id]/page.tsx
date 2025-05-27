// app/orders/[id]/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Navbar } from "@/components/navbar"
import { 
  ArrowLeft,
  Package, 
  Calendar,
  DollarSign,
  MapPin,
  CreditCard,
  User,
  XCircle
} from "lucide-react"
import Image from "next/image"

interface OrderItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  price: number
  image_url?: string
}

interface OrderDetails {
  id: number
  total_amount: number
  status: string
  created_at: string
  payment_intent_id: string
  items: OrderItem[]
}

// Fix the params type for Next.js 15
export default function OrderDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [orderId, setOrderId] = useState<string>("")

  useEffect(() => {
    // Resolve params first
    const resolveParams = async () => {
      const resolvedParams = await params
      setOrderId(resolvedParams.id)
    }
    
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    
    if (orderId) {
      fetchOrderDetails()
    }
  }, [user, orderId])

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/auth/login")
      return null
    }
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  }

  const fetchOrderDetails = async () => {
    try {
      const headers = getAuthHeaders()
      if (!headers) return

      console.log(`Fetching order details for order ID: ${orderId}`)
      
      const response = await fetch(`/api/orders/${orderId}`, {
        headers
      })
      
      console.log('Order details response status:', response.status)
      
      if (response.ok) {
        const orderData = await response.json()
        console.log('Order details received:', orderData)
        setOrder(orderData)
      } else if (response.status === 401) {
        logout()
      } else if (response.status === 404) {
        toast({
          title: "Order not found",
          description: "The order you're looking for doesn't exist or you don't have permission to view it.",
          variant: "destructive"
        })
        router.push("/profile?tab=orders")
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "Error",
          description: errorData.detail || "Failed to load order details",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching order details:", error)
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const cancelOrder = async () => {
    if (!order) return
    
    setCancelling(true)
    try {
      const headers = getAuthHeaders()
      if (!headers) return

      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "PUT",
        headers
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Order cancelled successfully"
        })
        // Refresh order details
        fetchOrderDetails()
      } else if (response.status === 401) {
        logout()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.detail || "Failed to cancel order",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive"
      })
    } finally {
      setCancelling(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "created": return "bg-blue-500"
      case "confirmed": return "bg-green-500"
      case "shipped": return "bg-purple-500"
      case "delivered": return "bg-emerald-500"
      case "cancelled": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "created": return "Order Placed"
      case "confirmed": return "Confirmed"
      case "shipped": return "Shipped"
      case "delivered": return "Delivered"
      case "cancelled": return "Cancelled"
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600 mb-2">Order Not Found</h2>
            <p className="text-gray-500 mb-4">The order you're looking for doesn't exist.</p>
            <Button onClick={() => router.push("/profile?tab=orders")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push("/profile?tab=orders")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Order #{order.id}
              </h1>
              <p className="text-gray-600 mt-1">Order details and tracking information</p>
            </div>
          </div>
          
          {order.status === "created" && (
            <Button 
              variant="destructive" 
              onClick={cancelOrder}
              disabled={cancelling}
            >
              {cancelling ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Cancel Order
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Status</span>
                  <Badge className={getStatusColor(order.status) + " text-white"}>
                    {getStatusText(order.status)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="font-medium">Order Date</div>
                      <div className="text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="font-medium">Items</div>
                      <div className="text-gray-600">{order.items.length} items</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="font-medium">Total</div>
                      <div className="text-gray-600">${order.total_amount.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="font-medium">Payment ID</div>
                      <div className="text-gray-600 text-xs">{order.payment_intent_id}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
                <CardDescription>Items in this order</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={item.id || index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.product_name}
                            width={64}
                            height={64}
                            className="object-cover"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.product_name}</h3>
                        <div className="text-sm text-gray-600">
                          Product ID: {item.product_id}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${item.price.toFixed(2)}</div>
                        <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                      </div>
                      <div className="text-right font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={item.id || index} className="flex justify-between text-sm">
                      <span>{item.product_name} (x{item.quantity})</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  If you have any questions about your order, please contact our support team.
                </p>
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}