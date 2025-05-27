// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = "https://e-store-tau-sooty.vercel.app"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const backendUrl = new URL(`${BACKEND_URL}/products`)
    
    // Forward all query parameters to the backend
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.append(key, value)
    })

    console.log('Proxying request to:', backendUrl.toString())

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`Backend responded with status ${response.status}`)
      throw new Error(`Backend responded with ${response.status}`)
    }

    const data = await response.json()
    console.log('Successfully fetched products:', data.products?.length || 0)
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error) {
    console.error('Products proxy error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch products', 
        details: error.message,
        products: [],
        total: 0 
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}