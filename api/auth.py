from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

security = HTTPBearer()

# Get JWT secret from environment
SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET')
if not SUPABASE_JWT_SECRET:
    print("WARNING: SUPABASE_JWT_SECRET not set in environment")
else:
    print(f"INFO: Supabase JWT authentication configured")

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
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
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
) -> str:
    """
    Dependency to get current authenticated user ID.
    Use this in your route handlers like:
    
    @app.get("/api/protected")
    async def protected_route(user_id: str = Depends(get_current_user)):
        # user_id is automatically extracted from JWT
        ...
    """
    return await verify_token(credentials)

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
