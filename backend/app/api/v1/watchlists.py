from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import ResourceConflictError, ResourceNotFoundError
from app.models.market import Stock
from app.models.user import User
from app.models.watchlist import Watchlist, WatchlistItem
from app.schemas.stocks import StockResponse
from app.schemas.watchlists import (
    WatchlistCreate,
    WatchlistItemAdd,
    WatchlistItemResponse,
    WatchlistResponse,
    WatchlistUpdate,
)

router = APIRouter(prefix="/watchlists", tags=["Watchlists"])


def _format_stock_response(stock: Stock) -> StockResponse:
    return StockResponse(
        id=stock.id,
        exchange_code=stock.exchange.code if stock.exchange else "NSE",
        symbol=stock.symbol,
        name=stock.name,
        isin=stock.isin,
        sector=stock.sector,
        lot_size=stock.lot_size,
        tick_size=stock.tick_size,
        is_tradable=stock.is_tradable,
        market_data_status="WAITING_FOR_MARKET_DATA",
        market_data_message="Waiting for market data provider connection (Phase 2).",
        ltp=None,
        day_change=None,
        day_change_percent=None,
    )


def _format_watchlist_response(wl: Watchlist) -> WatchlistResponse:
    items = []
    for item in wl.items:
        items.append(
            WatchlistItemResponse(
                id=item.id,
                watchlist_id=item.watchlist_id,
                stock_id=item.stock_id,
                display_order=item.display_order,
                added_at=item.added_at,
                stock=_format_stock_response(item.stock),
            )
        )
    return WatchlistResponse(
        id=wl.id,
        name=wl.name,
        is_default=wl.is_default,
        created_at=wl.created_at,
        updated_at=wl.updated_at,
        items=items,
    )


@router.get("", response_model=List[WatchlistResponse], summary="List all user watchlists")
async def list_watchlists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all watchlists belonging to the current user."""
    stmt = (
        select(Watchlist)
        .where(Watchlist.user_id == current_user.id)
        .options(
            selectinload(Watchlist.items)
            .selectinload(WatchlistItem.stock)
            .selectinload(Stock.exchange)
        )
    )
    res = await db.execute(stmt)
    watchlists = res.scalars().all()
    return [_format_watchlist_response(w) for w in watchlists]


@router.post("", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED, summary="Create a new watchlist")
async def create_watchlist(
    data: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new custom watchlist."""
    wl = Watchlist(
        user_id=current_user.id,
        name=data.name.strip(),
        is_default=False,
    )
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    return WatchlistResponse(
        id=wl.id,
        name=wl.name,
        is_default=wl.is_default,
        created_at=wl.created_at,
        updated_at=wl.updated_at,
        items=[],
    )


@router.put("/{watchlist_id}", response_model=WatchlistResponse, summary="Rename watchlist")
async def update_watchlist(
    watchlist_id: str,
    data: WatchlistUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename an existing watchlist."""
    stmt = (
        select(Watchlist)
        .where(Watchlist.id == watchlist_id, Watchlist.user_id == current_user.id)
        .options(
            selectinload(Watchlist.items)
            .selectinload(WatchlistItem.stock)
            .selectinload(Stock.exchange)
        )
    )
    wl = (await db.execute(stmt)).scalar_one_or_none()
    if not wl:
        raise ResourceNotFoundError(resource="Watchlist", identifier=watchlist_id)

    wl.name = data.name.strip()
    await db.commit()
    await db.refresh(wl)
    return _format_watchlist_response(wl)


@router.delete("/{watchlist_id}", summary="Delete watchlist")
async def delete_watchlist(
    watchlist_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user watchlist."""
    stmt = select(Watchlist).where(Watchlist.id == watchlist_id, Watchlist.user_id == current_user.id)
    wl = (await db.execute(stmt)).scalar_one_or_none()
    if not wl:
        raise ResourceNotFoundError(resource="Watchlist", identifier=watchlist_id)

    await db.delete(wl)
    await db.commit()
    return {"success": True, "message": f"Watchlist '{wl.name}' deleted."}


@router.post("/{watchlist_id}/items", response_model=WatchlistResponse, summary="Add stock to watchlist")
async def add_stock_to_watchlist(
    watchlist_id: str,
    item_in: WatchlistItemAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a stock to an existing watchlist."""
    stmt = (
        select(Watchlist)
        .where(Watchlist.id == watchlist_id, Watchlist.user_id == current_user.id)
        .options(selectinload(Watchlist.items))
    )
    wl = (await db.execute(stmt)).scalar_one_or_none()
    if not wl:
        raise ResourceNotFoundError(resource="Watchlist", identifier=watchlist_id)

    # Check if stock exists
    stock_stmt = select(Stock).where(Stock.id == item_in.stock_id)
    stock = (await db.execute(stock_stmt)).scalar_one_or_none()
    if not stock:
        raise ResourceNotFoundError(resource="Stock", identifier=item_in.stock_id)

    # Check if already added
    if any(item.stock_id == item_in.stock_id for item in wl.items):
        raise ResourceConflictError(message=f"Stock '{stock.symbol}' is already in this watchlist.")

    order_idx = len(wl.items)
    new_item = WatchlistItem(
        watchlist_id=wl.id,
        stock_id=stock.id,
        display_order=order_idx,
    )
    db.add(new_item)
    await db.commit()

    # Reload
    return await get_watchlist_by_id(watchlist_id, current_user, db)


@router.delete("/{watchlist_id}/items/{stock_id}", summary="Remove stock from watchlist")
async def remove_stock_from_watchlist(
    watchlist_id: str,
    stock_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a stock from a watchlist."""
    # Ensure watchlist belongs to user
    wl_stmt = select(Watchlist).where(Watchlist.id == watchlist_id, Watchlist.user_id == current_user.id)
    wl = (await db.execute(wl_stmt)).scalar_one_or_none()
    if not wl:
        raise ResourceNotFoundError(resource="Watchlist", identifier=watchlist_id)

    del_stmt = delete(WatchlistItem).where(
        WatchlistItem.watchlist_id == watchlist_id,
        WatchlistItem.stock_id == stock_id,
    )
    await db.execute(del_stmt)
    await db.commit()
    return {"success": True, "message": "Stock removed from watchlist."}


async def get_watchlist_by_id(watchlist_id: str, current_user: User, db: AsyncSession) -> WatchlistResponse:
    stmt = (
        select(Watchlist)
        .where(Watchlist.id == watchlist_id, Watchlist.user_id == current_user.id)
        .options(
            selectinload(Watchlist.items)
            .selectinload(WatchlistItem.stock)
            .selectinload(Stock.exchange)
        )
    )
    wl = (await db.execute(stmt)).scalar_one_or_none()
    if not wl:
        raise ResourceNotFoundError(resource="Watchlist", identifier=watchlist_id)
    return _format_watchlist_response(wl)
