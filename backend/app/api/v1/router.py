from fastapi import APIRouter
from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.orders import router as orders_router
from app.api.v1.portfolio import router as portfolio_router
from app.api.v1.stocks import router as stocks_router
from app.api.v1.wallet import router as wallet_router
from app.api.v1.watchlists import router as watchlists_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(wallet_router)
api_router.include_router(watchlists_router)
api_router.include_router(stocks_router)
api_router.include_router(orders_router)
api_router.include_router(portfolio_router)
api_router.include_router(admin_router)
