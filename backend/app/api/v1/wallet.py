from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.wallet import LedgerEntry, Wallet
from app.schemas.wallet import LedgerEntryResponse, WalletResponse, WalletSummaryResponse
from app.services.wallet_service import get_wallet_summary

router = APIRouter(prefix="/wallet", tags=["Wallet & Ledger"])


@router.get("", response_model=WalletResponse, summary="Get trader virtual paper wallet")
async def get_my_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the paper-trading wallet for the authenticated trader."""
    summary = await get_wallet_summary(db, current_user.id)
    return WalletResponse(**summary)


@router.get("/summary", response_model=WalletSummaryResponse, summary="Get wallet summary with recent ledger")
async def get_my_wallet_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve wallet overview and recent ledger transactions."""
    summary = await get_wallet_summary(db, current_user.id)
    wallet_resp = WalletResponse(**summary)

    # Fetch recent ledger entries
    stmt = (
        select(LedgerEntry)
        .where(LedgerEntry.wallet_id == wallet_resp.id)
        .order_by(desc(LedgerEntry.created_at))
        .limit(20)
    )
    res = await db.execute(stmt)
    entries = res.scalars().all()

    return WalletSummaryResponse(
        wallet=wallet_resp,
        recent_ledger=[LedgerEntryResponse.from_orm(e) for e in entries],
    )


@router.get("/ledger", response_model=List[LedgerEntryResponse], summary="Get full audit ledger entries")
async def get_my_ledger(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve paginated ledger transaction history for user's wallet."""
    # Find wallet
    w_stmt = select(Wallet).where(Wallet.user_id == current_user.id)
    wallet = (await db.execute(w_stmt)).scalar_one_or_none()
    if not wallet:
        return []

    stmt = (
        select(LedgerEntry)
        .where(LedgerEntry.wallet_id == wallet.id)
        .order_by(desc(LedgerEntry.created_at))
        .offset(offset)
        .limit(limit)
    )
    res = await db.execute(stmt)
    entries = res.scalars().all()
    return [LedgerEntryResponse.from_orm(e) for e in entries]
