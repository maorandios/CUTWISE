from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import jwt as pyjwt
import os
import requests
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

security = HTTPBearer()

# Get Supabase URL and JWT secret from environment
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET')

if not SUPABASE_URL:
    print("WARNING: SUPABASE_URL not set in environment")
if not SUPABASE_JWT_SECRET:
    print("WARNING: SUPABASE_JWT_SECRET not set in environment")
else:
    print(f"INFO: Supabase JWT authentication configured")

# Cache for JWKS public keys
_jwks_cache = None

def get_jwks():
    """Fetch JWKS (JSON Web Key Set) from Supabase"""
    global _jwks_cache
    if _jwks_cache is None:
        try:
            jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            print(f"[Auth] Fetching JWKS from: {jwks_url}", flush=True)
            response = requests.get(jwks_url, timeout=10)
            response.raise_for_status()
            _jwks_cache = response.json()
            print(f"[Auth] JWKS fetched successfully with {len(_jwks_cache.get('keys', []))} keys", flush=True)
        except Exception as e:
            print(f"[Auth] Failed to fetch JWKS: {e}", flush=True)
            import traceback
            traceback.print_exc()
            _jwks_cache = None
    return _jwks_cache

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    """
    Verify Supabase JWT token and return user_id.
    
    Args:
        credentials: HTTP Authorization header with Bearer token
        
    Returns:
        user_id (str): The authenticated user's ID
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: JWT secret not configured"
        )
    
    token = credentials.credentials
    
    try:
        # Decode and verify the JWT token
        # ES256 is used by Supabase for JWT signing
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256", "HS384", "HS512", "RS256", "ES256"],
            options={"verify_aud": False}  # Supabase tokens don't use aud claim
        )
        
        # Extract user ID from the 'sub' claim
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing user ID"
            )
        
        return user_id
        
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Dependency to get current authenticated user.
    Returns the full JWT payload as a dictionary.
    
    Use this in your route handlers like:
    
    @app.get("/api/protected")
    async def protected_route(user: dict = Depends(get_current_user)):
        user_id = user.get("sub")
        ...
    """
    if not SUPABASE_URL:
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: Supabase URL not configured"
        )
    
    token = credentials.credentials
    
    try:
        # First, decode without verification to see the header
        unverified_header = pyjwt.get_unverified_header(token)
        print(f"[Auth] JWT header: {unverified_header}")
        
        # Get the algorithm from the header
        alg = unverified_header.get('alg')
        kid = unverified_header.get('kid')
        
        print(f"[Auth] Token algorithm: {alg}, Key ID: {kid}")
        
        # For ES256, we need to use PyJWT with JWKS
        if alg == 'ES256':
            # Use PyJWT's JWT client with JWKS
            jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            print(f"[Auth] Using JWKS URL: {jwks_url}", flush=True)
            
            jwks_client = pyjwt.PyJWKClient(jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            print(f"[Auth] Got signing key: {signing_key.key_id}", flush=True)
            
            # Decode with PyJWT
            payload = pyjwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                options={"verify_aud": False}
            )
        else:
            # For other algorithms (HS256, etc.), use the JWT secret
            if not SUPABASE_JWT_SECRET:
                raise HTTPException(
                    status_code=500,
                    detail="Server configuration error: JWT secret not configured"
                )
            
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256", "HS384", "HS512", "RS256"],
                options={"verify_aud": False}
            )
        
        print(f"[Auth] JWT decoded successfully. User ID: {payload.get('sub')}")
        
        # Return the full payload
        return payload
        
    except JWTError as e:
        print(f"[Auth] JWTError: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication token: {str(e)}"
        )
    except Exception as e:
        print(f"[Auth] Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )

async def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(lambda: None)
) -> Optional[str]:
    """
    Optional authentication - returns user_id if authenticated, None otherwise.
    Useful for endpoints that work both with and without authentication.
    
    Note: This is a simplified version. For production, implement proper optional auth.
    """
    if not credentials:
        return None
    
    try:
        return await verify_token(credentials)
    except HTTPException:
        return None
