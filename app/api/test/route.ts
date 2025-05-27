import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Test the backend connection
    const response = await fetch("https://e-store-tau-sooty.vercel.app/products")
    const data = await response.json()

    return NextResponse.json({
      status: "success",
      backend_connected: response.ok,
      products_count: data.products?.length || 0,
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Cannot connect to backend",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
