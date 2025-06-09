'use server'

import jwt from "jsonwebtoken"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const callId = searchParams.get("callId")
  if (!callId) {
    return new Response("Call ID is required", { status: 400 })
  }
  const token = jwt.sign({
    orgId: '71d6e9cd-3d64-4c64-be3c-c99d1bcf792d',
    token: {tag: "private"}
  }, process.env.VAPI_PRIVATE_KEY!, {
    expiresIn: "1h"
  })
  const callDetails = await fetch(`https://api.vapi.ai/call/${callId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  })
  const data = await callDetails.json()
  return new Response(JSON.stringify(data), { status: 200 })
}