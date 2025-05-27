"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Navbar } from "@/components/navbar"
import { 
  User, 
  Mail, 
  ShoppingBag, 
  Edit, 
  Save, 
  X, 
  Package, 
  Calendar,
  DollarSign,
  Eye,
  XCircle,
  CheckCircle,
  RefreshCw
} from "lucide-react"

interface OrderItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  price: number
  image_url?: string
}

interface Order {
  id: number
  total_amount: number
  status: string
  created_at: string
  payment_intent_id: string
  item_count: number
  items: OrderItem[]
}

interface UserProfile {
  id: number
  email: string
  username: string
  role: string
}

export default function ProfileContent() {
  const { user, logout, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editingPassword, setEditingPassword] = useState(false)
  
  // Get initial tab from URL params
  const initialTab = searchParams.get('tab') || 'profile'
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    username: "",
    email: ""
  })
  
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  })

  useEffect(() => {
    console.log('Profile page effect - user:', user, 'authLoading:', authLoading)
    
    // Wait for auth context to finish loading
    if (authLoading) {
      return
    }

    // If no user after auth is done loading, redirect to login
    if (!user) {
      console.log('No user found, redirecting to login')
      router.push("/auth/login")
      return
    }
    
    // If user exists, fetch profile and orders
    console.log('User found, fetching profile and orders')
    fetchProfile()
    fetchOrders()
  }, [user, authLoading, router])

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    console.log('Getting auth headers, token exists:', !!token)
    
    if (!token) {
      console.log('No token found, redirecting to login')
      router.push("/auth/login")
      return null
    }
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  }

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile...')
      const headers = getAuthHeaders()
      if (!headers) return

      const response = await fetch("https://e-store-tau-sooty.vercel.app/auth/me", {
        headers
      })
      
      console.log('Profile response status:', response.status)
      
      if (response.ok) {
        const userData = await response.json()
        console.log('Profile data received:', userData)
        setProfile(userData)
        setProfileForm({
          username: userData.username,
          email: userData.email
        })
      } else if (response.status === 401) {
        console.log('Unauthorized, logging out')
        logout()
      } else {
        console.error('Profile fetch failed with status:', response.status)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    setOrdersLoading(true)
    try {
      console.log('Fetching orders...')
      const headers = getAuthHeaders()
      if (!headers) return

      const response = await fetch("https://e-store-tau-sooty.vercel.app/orders", {
        headers
      })
      
      console.log('Orders response status:', response.status)
      
      if (response.ok) {
        const ordersData = await response.json()
        console.log('Raw orders data received:', ordersData)
        
        // The backend now returns the correct structure
        setOrders(ordersData)
      } else if (response.status === 401) {
        console.log('Unauthorized, logging out')
        logout()
      } else {
        console.error('Orders fetch failed with status:', response.status)
        const errorText = await response.text()
        console.error('Error response:', errorText)
        toast({
          title: "Error",
          description: "Failed to load orders",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive"
      })
    } finally {
      setOrdersLoading(false)
      if (loading) setLoading(false)
    }
  }

  const updateProfile = async () => {
    try {
      const headers = getAuthHeaders()
      if (!headers) return

      const response = await fetch("https://e-store-tau-sooty.vercel.app/auth/profile", {
        method: "PUT",
        headers,
        body: JSON.stringify(profileForm)
      })
      
      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        setEditingProfile(false)
        toast({
          title: "Success",
          description: "Profile updated successfully"
        })
      } else if (response.status === 401) {
        logout()
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
        description: "Failed to update profile",
        variant: "destructive"
      })
    }
  }

  const updatePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive"
      })
      return
    }

    try {
      const headers = getAuthHeaders()
      if (!headers) return

      const response = await fetch("https://e-store-tau-sooty.vercel.app/auth/password", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      })
      
      if (response.ok) {
        setEditingPassword(false)
        setPasswordForm({
          current_password: "",
          new_password: "",
          confirm_password: ""
        })
        toast({
          title: "Success",
          description: "Password updated successfully"
        })
      } else if (response.status === 401) {
        logout()
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
        description: "Failed to update password",
        variant: "destructive"
      })
    }
  }

  const cancelOrder = async (orderId: number) => {
    try {
      const headers = getAuthHeaders()
      if (!headers) return

      const response = await fetch(`https://e-store-tau-sooty.vercel.app/orders/${orderId}/cancel`, {
        method: "PUT",
        headers
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Order cancelled successfully"
        })
        fetchOrders() // Refresh orders
      } else if (response.status === 401) {
        logout()
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

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
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

  // Show loading spinner while fetching profile data
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            My Profile
          </h1>
          <p className="text-gray-600 mt-2">Manage your account settings and view your orders</p>
        </div>

        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile Settings</TabsTrigger>
            <TabsTrigger value="orders">Order History</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Information Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProfile(!editingProfile)}
                >
                  {editingProfile ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  {editingProfile ? "Cancel" : "Edit"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    {editingProfile ? (
                      <Input
                        id="username"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded">{profile?.username}</div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    {editingProfile ? (
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded">{profile?.email}</div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {profile?.role}
                    </Badge>
                  </div>
                </div>

                {editingProfile && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={updateProfile}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditingProfile(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Password Change Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPassword(!editingPassword)}
                >
                  {editingPassword ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  {editingPassword ? "Cancel" : "Change"}
                </Button>
              </CardHeader>
              {editingPassword && (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={updatePassword}>
                      <Save className="w-4 h-4 mr-2" />
                      Update Password
                    </Button>
                    <Button variant="outline" onClick={() => setEditingPassword(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Order History</h2>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchOrders}
                  disabled={ordersLoading}
                >
                  {ordersLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh
                </Button>
                <div className="text-sm text-gray-600">
                  Total Orders: {orders.length}
                </div>
              </div>
            </div>

            {ordersLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p>Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Orders Yet</h3>
                  <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
                  <Button onClick={() => router.push("/products")}>
                    Start Shopping
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">Order #{order.id}</h3>
                            <Badge className={getStatusColor(order.status) + " text-white"}>
                              {getStatusText(order.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(order.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Package className="w-4 h-4" />
                              {order.item_count} items
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${order.total_amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/orders/${order.id}`)}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {order.status === "created" && (
                            <Button variant="destructive" size="sm" onClick={() => cancelOrder(order.id)}>
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {order.items && order.items.length > 0 && (
                        <div className="border-t pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {order.items.slice(0, 3).map((item, index) => (
                              <div key={item.id || index} className="flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                  {item.image_url ? (
                                    <img 
                                      src={item.image_url} 
                                      alt={item.product_name}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    <Package className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">{item.product_name}</div>
                                  <div className="text-gray-500">Qty: {item.quantity}</div>
                                </div>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="text-sm text-gray-500">
                                +{order.items.length - 3} more items
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}