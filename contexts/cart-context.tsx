"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface CartItem {
  id: number
  product_id: number
  quantity: number
  product: {
    id: number
    name: string
    price: number
    image_url?: string
  }
}

interface CartContextType {
  items: CartItem[]
  itemCount: number
  total: number
  addToCart: (productId: number, quantity: number) => Promise<void>
  removeFromCart: (itemId: number) => Promise<void>
  updateQuantity: (itemId: number, quantity: number) => Promise<void>
  clearCart: () => void
  loading: boolean
  fetchCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const { toast } = useToast()

  // Fetch cart when user logs in
  useEffect(() => {
    console.log('Cart context - user changed:', { user: !!user, isAuthenticated })
    if (isAuthenticated && user) {
      console.log('User authenticated, fetching cart')
      fetchCart()
    } else {
      console.log('User not authenticated, clearing cart')
      setItems([])
    }
  }, [isAuthenticated, user])

  const getAuthHeaders = () => {
    // Check for token in the correct key (the auth context uses "token")
    const token = localStorage.getItem("token")
    console.log('Cart - Getting auth headers, token exists:', !!token)
    
    if (!token) {
      throw new Error("Please login to continue")
    }
    
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  }

  const fetchCart = async () => {
    if (!isAuthenticated || !user) {
      console.log('Not authenticated, skipping cart fetch')
      return
    }

    try {
      console.log('Fetching cart...')
      const headers = getAuthHeaders()
      
      const response = await fetch("http://localhost:8000/cart", {
        headers
      })

      console.log('Cart fetch response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Cart data received:', data)
        setItems(data.items || [])
      } else if (response.status === 401) {
        console.log('Unauthorized cart access, logging out')
        logout()
        toast({
          title: "Session expired",
          description: "Please login again",
          variant: "destructive"
        })
      } else {
        console.error('Failed to fetch cart, status:', response.status)
        const errorData = await response.json()
        console.error('Cart fetch error:', errorData)
      }
    } catch (error) {
      console.error("Error fetching cart:", error)
      toast({
        title: "Error",
        description: "Failed to load cart",
        variant: "destructive"
      })
    }
  }

  const addToCart = async (productId: number, quantity: number = 1) => {
    if (!isAuthenticated || !user) {
      throw new Error("Please login to add items to cart")
    }

    setLoading(true)
    try {
      console.log('Adding to cart:', { productId, quantity })
      const headers = getAuthHeaders()

      const response = await fetch("http://localhost:8000/cart/items", {
        method: "POST",
        headers,
        body: JSON.stringify({
          product_id: productId,
          quantity: quantity
        })
      })

      console.log('Add to cart response status:', response.status)

      if (response.ok) {
        console.log('Successfully added to cart')
        await fetchCart() // Refresh cart after adding
        toast({
          title: "Success",
          description: "Item added to cart"
        })
      } else if (response.status === 401) {
        console.log('Unauthorized add to cart, logging out')
        logout()
        throw new Error("Please login to continue")
      } else {
        const errorData = await response.json()
        console.error('Add to cart error:', errorData)
        throw new Error(errorData.detail || "Failed to add item to cart")
      }
    } catch (error) {
      console.error("Error adding to cart:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const removeFromCart = async (itemId: number) => {
    if (!isAuthenticated) {
      throw new Error("Please login to continue")
    }

    try {
      console.log('Removing from cart:', itemId)
      const headers = getAuthHeaders()

      const response = await fetch(`http://localhost:8000/cart/items/${itemId}`, {
        method: "DELETE",
        headers
      })

      console.log('Remove from cart response status:', response.status)

      if (response.ok) {
        console.log('Successfully removed from cart')
        await fetchCart() // Refresh cart after removing
        toast({
          title: "Success",
          description: "Item removed from cart"
        })
      } else if (response.status === 401) {
        logout()
        throw new Error("Please login to continue")
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to remove item from cart")
      }
    } catch (error) {
      console.error("Error removing from cart:", error)
      throw error
    }
  }

  const updateQuantity = async (itemId: number, quantity: number) => {
    if (!isAuthenticated) {
      throw new Error("Please login to continue")
    }

    try {
      console.log('Updating cart quantity:', { itemId, quantity })
      const headers = getAuthHeaders()

      const response = await fetch(`http://localhost:8000/cart/items/${itemId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ quantity })
      })

      console.log('Update quantity response status:', response.status)

      if (response.ok) {
        console.log('Successfully updated quantity')
        await fetchCart() // Refresh cart after updating
      } else if (response.status === 401) {
        logout()
        throw new Error("Please login to continue")
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to update quantity")
      }
    } catch (error) {
      console.error("Error updating quantity:", error)
      throw error
    }
  }

  const clearCart = () => {
    console.log('Clearing cart')
    setItems([])
  }

  const itemCount = items.reduce((total, item) => total + item.quantity, 0)
  const total = items.reduce((total, item) => total + (item.product.price * item.quantity), 0)

  const value = {
    items,
    itemCount,
    total,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    loading,
    fetchCart
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
