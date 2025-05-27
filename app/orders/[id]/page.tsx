"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Navbar } from "@/components/navbar"
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  DollarSign, 
  CreditCard,
  XCircle,
  CheckCircle
} from "lucide-react"

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

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      router.push("/auth/login")
      return
    }
    
    fetchOrderDetails()
  }, [user, authLoading, params.id])

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
      console.log('Fetching order details for ID:', params.id)
      const headers = getAuthHeaders()
      if (!headers) return

      const response = await fetch(`http://localhost:8000/orders/${params.id}`, {
        headers
      })
      
      console.log('Order details response status:', response.status)
      
      if (response.ok) {
        const orderData = await response.json()
        console.log('Order details received:', orderData)
        setOrder(orderData)
      } else if (response.status === 401) {
        router.push("/auth/login")
      } else if (response.status === 404) {
        toast({
          title: "Error",
          description: "Order not found",
          variant: "destructive"
        })
        router.push("/profile?tab=orders")
      } else {
        const errorText = await response.text()
        console.error('Order fetch error:', errorText)
        toast({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching order:", error)
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
    try {
      const headers = getAuthHeaders()
      if (!headers) return

      const response = await fetch(`http://localhost:8000/orders/${params.id}/cancel`, {
        method: "PUT",
        headers
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Order cancelled successfully"
        })
        fetchOrderDetails() // Refresh order details
      } else if (response.status === 401) {
        router.push("/auth/login")
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.detail,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive"
      })
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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return <CheckCircle className="w-4 h-4" />
      case "cancelled":
        return <XCircle className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  if (authLoading || loading) {
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
          <div className="text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">The order you're looking for doesn't exist or you don't have permission to view it.</p>
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
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/profile?tab=orders")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Order #{order.id}
              </h1>
              <p className="text-gray-600 mt-2">Order details and tracking information</p>
            </div>
            
            {order.status === "created" && (
              <Button variant="destructive" onClick={cancelOrder}>
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Order
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Order Date</div>
                      <div className="font-medium">{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded text-white ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Status</div>
                      <Badge className={getStatusColor(order.status) + " text-white capitalize"}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Payment ID</div>
                      <div className="font-medium text-sm">{order.payment_intent_id}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Total Amount</div>
                      <div className="font-bold text-lg">${order.total_amount.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items ({order.items?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 relative">
                        {item.image_url ? (
                          <Image 
                            src={item.image_url} 
                            alt={item.product_name}
                            fill
                            className="object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium">{item.product_name}</h3>
                        <div className="text-sm text-gray-600">
                          Quantity: {item.quantity}
                        </div>
                        <div className="text-sm text-gray-600">
                          Price: ${item.price.toFixed(2)} each
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>${order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Timeline */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">Order Placed</div>
                      <div className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {order.status === "cancelled" ? (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">Order Cancelled</div>
                        <div className="text-sm text-gray-600">Order has been cancelled</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${order.status !== "created" ? "bg-green-500" : "bg-gray-300"}`}></div>
                        <div>
                          <div className="font-medium">Order Confirmed</div>
                          <div className="text-sm text-gray-600">
                            {order.status !== "created" ? "Confirmed" : "Pending confirmation"}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${["shipped", "delivered"].includes(order.status) ? "bg-purple-500" : "bg-gray-300"}`}></div>
                        <div>
                          <div className="font-medium">Order Shipped</div>
                          <div className="text-sm text-gray-600">
                            {["shipped", "delivered"].includes(order.status) ? "Shipped" : "Pending shipment"}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${order.status === "delivered" ? "bg-emerald-500" : "bg-gray-300"}`}></div>
                        <div>
                          <div className="font-medium">Order Delivered</div>
                          <div className="text-sm text-gray-600">
                            {order.status === "delivered" ? "Delivered" : "Pending delivery"}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}