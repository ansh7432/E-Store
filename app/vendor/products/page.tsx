"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Navbar } from "@/components/navbar"
import { Plus, Edit, Trash2, Package } from "lucide-react"

interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  category: string
  image_url?: string
  vendor_id: number
}

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    image_url: "",
  })

  useEffect(() => {
    console.log('Vendor page - user:', user, 'authLoading:', authLoading, 'isAuthenticated:', isAuthenticated)
    
    // Wait for auth to finish loading
    if (authLoading) return

    if (!isAuthenticated || !user) {
      console.log('Not authenticated, redirecting to login')
      router.push("/auth/login")
      return
    }
    
    if (user.role !== "vendor" && user.role !== "admin") {
      console.log('User role not vendor/admin:', user.role)
      toast({
        title: "Access Denied",
        description: "You need vendor access to view this page",
        variant: "destructive"
      })
      router.push("/")
      return
    }
    
    console.log('User is vendor/admin, fetching products')
    fetchProducts()
  }, [user, authLoading, isAuthenticated])

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token") // Changed from "access_token" to "token"
    console.log('Getting auth headers, token exists:', !!token)
    
    if (!token) {
      router.push("/auth/login")
      return null
    }
    
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  }

  const fetchProducts = async () => {
    try {
      console.log('Fetching vendor products...')
      const headers = getAuthHeaders()
      if (!headers) return

      const response = await fetch("https://e-store-tau-sooty.vercel.app/products", {
        headers: {
          "Authorization": headers.Authorization
        }
      })
      
      console.log('Products fetch response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Products data received:', data)
        
        // Filter products by current vendor
        const vendorProducts = data.products.filter((product: Product) => 
          product.vendor_id === user?.id
        )
        console.log('Filtered vendor products:', vendorProducts)
        setProducts(vendorProducts)
      } else if (response.status === 401) {
        console.log('Unauthorized, redirecting to login')
        router.push("/auth/login")
      } else {
        console.error('Failed to fetch products, status:', response.status)
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error("Failed to fetch products")
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    try {
      console.log('Submitting product form...', formData)
      const headers = getAuthHeaders()
      if (!headers) return

      const url = editingProduct
        ? `https://e-store-tau-sooty.vercel.app/vendor/products/${editingProduct.id}`
        : "https://e-store-tau-sooty.vercel.app/vendor/products"

      const method = editingProduct ? "PUT" : "POST"

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
      }

      console.log('Sending product data:', productData)
      console.log('Request URL:', url)
      console.log('Request method:', method)

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(productData),
      })

      console.log('Product submission response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Product saved successfully:', result)
        toast({
          title: "Success",
          description: editingProduct ? "Product updated successfully" : "Product created successfully",
        })
        setIsDialogOpen(false)
        resetForm()
        fetchProducts()
      } else {
        const errorData = await response.json()
        console.error('Product submission error:', errorData)
        throw new Error(errorData.detail || "Failed to save product")
      }
    } catch (error) {
      console.error("Error saving product:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save product",
        variant: "destructive",
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return
    }

    try {
      console.log('Deleting product:', productId)
      const headers = getAuthHeaders()
      if (!headers) return

      const response = await fetch(`https://e-store-tau-sooty.vercel.app/vendor/products/${productId}`, {
        method: "DELETE",
        headers: {
          "Authorization": headers.Authorization
        }
      })

      console.log('Delete response status:', response.status)

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product deleted successfully",
        })
        fetchProducts()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to delete product")
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      stock: "",
      category: "",
      image_url: "",
    })
    setEditingProduct(null)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      image_url: product.image_url || "",
    })
    setIsDialogOpen(true)
  }

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated or not vendor
  if (!isAuthenticated || !user || (user.role !== "vendor" && user.role !== "admin")) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              My Products
            </h1>
            <p className="text-gray-600 mt-2">Manage your product inventory</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={resetForm}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Update your product details" : "Create a new product for your store"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="books">Books</SelectItem>
                      <SelectItem value="home">Home & Garden</SelectItem>
                      <SelectItem value="sports">Sports & Outdoors</SelectItem>
                      <SelectItem value="beauty">Beauty & Personal Care</SelectItem>
                      <SelectItem value="toys">Toys & Games</SelectItem>
                      <SelectItem value="food">Food & Beverages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="image_url">Image URL (optional)</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitLoading}>
                  {submitLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingProduct ? "Updating..." : "Creating..."}
                    </div>
                  ) : (
                    editingProduct ? "Update Product" : "Create Product"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>Loading products...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="p-0">
                  <div className="aspect-square relative">
                    <Image
                      src={product.image_url || "/placeholder.svg?height=300&width=300"}
                      alt={product.name}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-lg mb-2 line-clamp-2">{product.name}</CardTitle>
                  <CardDescription className="text-sm mb-2 line-clamp-2">{product.description}</CardDescription>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-purple-600">${product.price.toFixed(2)}</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      product.stock > 10 ? 'bg-green-100 text-green-800' : 
                      product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      Stock: {product.stock}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openEditDialog(product)} 
                      className="flex-1"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {products.length === 0 && !loading && (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Products Yet</h3>
              <p className="text-gray-500 mb-4">You haven't created any products yet. Start building your inventory!</p>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Product
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
