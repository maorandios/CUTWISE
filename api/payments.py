"""
PayPal Payment Integration for Cutwise
Handles credit purchases and payment processing
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import paypalrestsdk
from dotenv import load_dotenv
import requests
from auth import get_current_user

load_dotenv()

router = APIRouter(prefix="/api/payments", tags=["payments"])

# PayPal Configuration
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")  # sandbox or live

# Configure PayPal SDK
paypalrestsdk.configure({
    "mode": PAYPAL_MODE,
    "client_id": PAYPAL_CLIENT_ID,
    "client_secret": PAYPAL_CLIENT_SECRET
})

# Helper function to get correct PayPal API base URL
def get_paypal_base_url() -> str:
    """Get the correct PayPal API base URL based on mode.
    
    Sandbox: https://api-m.sandbox.paypal.com
    Live: https://api-m.paypal.com (NOT api-m.live.paypal.com!)
    """
    if PAYPAL_MODE == "sandbox":
        return "https://api-m.sandbox.paypal.com"
    else:
        return "https://api-m.paypal.com"

# Pricing plans
PLANS = {
    "single": {"credits": 1, "price": 1.00, "currency": "EUR", "name": "Single Use"},
    "pack_20": {"credits": 20, "price": 499.00, "currency": "EUR", "name": "20 Uses Pack"},
    "pack_50": {"credits": 50, "price": 999.00, "currency": "EUR", "name": "50 Uses Pack"}
}

# Request/Response Models
class CreateOrderRequest(BaseModel):
    plan_type: str  # single, pack_20, pack_50

class CreateOrderResponse(BaseModel):
    order_id: str
    approval_url: str

class CaptureOrderRequest(BaseModel):
    order_id: str

class CaptureOrderResponse(BaseModel):
    success: bool
    credits_added: int
    transaction_id: Optional[str] = None
    message: str


def get_paypal_access_token() -> str:
    """Get PayPal access token for API calls"""
    base_url = get_paypal_base_url()
    url = f"{base_url}/v1/oauth2/token"
    
    response = requests.post(
        url,
        headers={"Accept": "application/json", "Accept-Language": "en_US"},
        auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
        data={"grant_type": "client_credentials"}
    )
    
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to get PayPal access token")
    
    return response.json()["access_token"]


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_paypal_order(
    request: CreateOrderRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a PayPal order for credit purchase
    """
    print(f"[PayPal] Creating order for user: {current_user}")
    user_id = current_user.get("sub")
    
    if request.plan_type not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    
    plan = PLANS[request.plan_type]
    print(f"[PayPal] Plan selected: {plan}")
    
    try:
        print("[PayPal] Getting PayPal access token...")
        access_token = get_paypal_access_token()
        print("[PayPal] Access token obtained")
        
        # Create PayPal order
        base_url = get_paypal_base_url()
        url = f"{base_url}/v2/checkout/orders"
        
        order_data = {
            "intent": "CAPTURE",
            "purchase_units": [{
                "reference_id": f"cutwise_{user_id}_{request.plan_type}",
                "description": f"Cutwise - {plan['name']}",
                "amount": {
                    "currency_code": plan["currency"],
                    "value": str(plan["price"])
                },
                "custom_id": f"{user_id}|{request.plan_type}|{plan['credits']}"
            }],
            "application_context": {
                "brand_name": "Cutwise",
                "landing_page": "NO_PREFERENCE",
                "user_action": "PAY_NOW",
                "return_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:5180')}/payment-success",
                "cancel_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:5180')}/payment-cancel"
            }
        }
        
        print(f"[PayPal] Creating order with PayPal API...")
        response = requests.post(
            url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            json=order_data
        )
        
        print(f"[PayPal] PayPal API response status: {response.status_code}")
        
        if response.status_code != 201:
            error_detail = response.text
            print(f"[PayPal] PayPal API error: {error_detail}")
            raise HTTPException(status_code=500, detail=f"Failed to create PayPal order: {error_detail}")
        
        order = response.json()
        order_id = order["id"]
        print(f"[PayPal] Order created successfully: {order_id}")
        
        # Get approval URL
        approval_url = next(
            (link["href"] for link in order["links"] if link["rel"] == "approve"),
            None
        )
        
        if not approval_url:
            print("[PayPal] ERROR: No approval URL in PayPal response")
            raise HTTPException(status_code=500, detail="No approval URL in PayPal response")
        
        print(f"[PayPal] Approval URL: {approval_url}")
        return CreateOrderResponse(
            order_id=order_id,
            approval_url=approval_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[PayPal] Exception creating order: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.post("/capture-order", response_model=CaptureOrderResponse)
async def capture_paypal_order(
    request: CaptureOrderRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Capture a PayPal order after user approval and add credits to user account
    """
    user_id = current_user.get("sub")
    print(f"[PayPal] Capturing order {request.order_id} for user {user_id}", flush=True)
    
    try:
        access_token = get_paypal_access_token()
        print("[PayPal] Got access token for capture", flush=True)
        
        # First, get the order details to retrieve custom_id
        base_url = get_paypal_base_url()
        get_order_url = f"{base_url}/v2/checkout/orders/{request.order_id}"
        print(f"[PayPal] Fetching order details from: {get_order_url}", flush=True)
        
        get_response = requests.get(
            get_order_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            }
        )
        
        if get_response.status_code != 200:
            print(f"[PayPal] Failed to get order details: {get_response.text}", flush=True)
            raise HTTPException(status_code=400, detail=f"Failed to get order details: {get_response.text}")
        
        order_data = get_response.json()
        print(f"[PayPal] Order data retrieved: {order_data.get('status')}", flush=True)
        
        # Get custom_id from order details
        custom_id = order_data["purchase_units"][0].get("custom_id", "")
        print(f"[PayPal] Custom ID from order: {custom_id}", flush=True)
        
        parts = custom_id.split("|")
        if len(parts) != 3:
            print(f"[PayPal] Invalid custom_id format. Parts: {parts}", flush=True)
            raise HTTPException(status_code=500, detail=f"Invalid custom_id format: {custom_id}")
        
        _, plan_type, credits_str = parts
        credits_to_add = int(credits_str)
        print(f"[PayPal] Plan: {plan_type}, Credits: {credits_to_add}", flush=True)
        
        # Now capture the order
        capture_url = f"{base_url}/v2/checkout/orders/{request.order_id}/capture"
        print(f"[PayPal] Capturing order at: {capture_url}", flush=True)
        
        capture_response = requests.post(
            capture_url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            }
        )
        
        print(f"[PayPal] Capture response status: {capture_response.status_code}", flush=True)
        
        if capture_response.status_code != 201:
            print(f"[PayPal] Capture failed: {capture_response.text}", flush=True)
            raise HTTPException(status_code=400, detail=f"Failed to capture order: {capture_response.text}")
        
        capture_data = capture_response.json()
        print(f"[PayPal] Capture status: {capture_data.get('status')}", flush=True)
        
        # Extract payment details
        if capture_data["status"] != "COMPLETED":
            raise HTTPException(status_code=400, detail="Payment not completed")
        
        # Get transaction details
        transaction_id = capture_data["purchase_units"][0]["payments"]["captures"][0]["id"]
        payer_email = capture_data["payer"].get("email_address", "")
        amount = float(capture_data["purchase_units"][0]["payments"]["captures"][0]["amount"]["value"])
        
        print(f"[PayPal] Capture successful! Transaction ID: {transaction_id}, Amount: {amount}", flush=True)
        
        # Note: In production, you would save this to Supabase here
        # For now, we'll handle it in the frontend via Supabase client
        
        return CaptureOrderResponse(
            success=True,
            credits_added=credits_to_add,
            transaction_id=transaction_id,
            message=f"Successfully added {credits_to_add} credits to your account"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[PayPal] Exception capturing order: {str(e)}", flush=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to capture order: {str(e)}")


@router.get("/plans")
async def get_payment_plans():
    """
    Get available payment plans
    """
    return {
        "plans": [
            {
                "id": "single",
                "name": "Single Use",
                "credits": 1,
                "price": 29.00,
                "currency": "EUR",
                "price_per_credit": 29.00,
                "savings": 0
            },
            {
                "id": "pack_20",
                "name": "20 Uses Pack",
                "credits": 20,
                "price": 499.00,
                "currency": "EUR",
                "price_per_credit": 24.95,
                "savings": 14,
                "popular": True
            },
            {
                "id": "pack_50",
                "name": "50 Uses Pack",
                "credits": 50,
                "price": 999.00,
                "currency": "EUR",
                "price_per_credit": 19.98,
                "savings": 31,
                "best_value": True
            }
        ]
    }
