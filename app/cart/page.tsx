"use client"

import { useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Navbar } from "@/components/navbar"
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react"

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, total, loading, fetchCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/auth/login")
      return
    }
    fetchCart()
  }, [user, isAuthenticated])

  const handleCheckout = async () => {
    if (items.length === 0) return

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/auth/login")
        return
      }

      const response = await fetch("http://localhost:8000/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payment_method: "card" }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Order placed successfully!",
          description: `Order #${data.order_id} has been created`,
        })
        fetchCart() // This will clear the cart
        router.push("/profile?tab=orders")
      } else if (response.status === 401) {
        router.push("/auth/login")
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Checkout failed")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process checkout",
        variant: "destructive",
      })
    }
  }

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeFromCart(itemId)
    } else {
      try {
        await updateQuantity(itemId, newQuantity)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update quantity",
          variant: "destructive",
        })
      }
    }
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Shopping Cart
          </h1>
          <p className="text-gray-600 mt-2">Review your items and proceed to checkout</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>Loading cart...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h3>
            <p className="text-gray-500 mb-6">Looks like you haven't added any items to your cart yet.</p>
            <Button onClick={() => router.push("/products")} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <Image
                          src={item.product.image_url || "/placeholder.svg?height=80&width=80"}
                          alt={item.product.name}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{item.product.name}</h3>
                        <p className="text-purple-600 font-medium">${item.product.price.toFixed(2)}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="h-8 w-8"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="h-8 w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-lg">${(item.product.price * item.quantity).toFixed(2)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-1"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="text-xl">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Items ({items.reduce((sum, item) => sum + item.quantity, 0)})</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>$0.00</span>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-purple-600">${total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleCheckout} 
                    className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                    size="lg"
                    disabled={items.length === 0}
                  >
                    Proceed to Checkout
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => router.push("/products")} 
                    className="w-full"
                  >
                    Continue Shopping
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
