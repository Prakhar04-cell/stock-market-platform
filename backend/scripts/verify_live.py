import sys
import asyncio
import json
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token
from app.models.user import User, Role
from sqlalchemy import select
from httpx import AsyncClient, ASGITransport

async def verify_all():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        print("=== 1. Health Endpoints ===")
        for path in ['/health', '/health/database', '/health/redis', '/health/market-data']:
            r = await client.get(path)
            print(f"{path} -> HTTP {r.status_code}: {json.dumps(r.json())}")

        print("\n=== 2. Upstox Auth Status ===")
        r = await client.get('/api/v1/upstox/auth/status')
        print(f"/api/v1/upstox/auth/status -> HTTP {r.status_code}: {json.dumps(r.json())}")

        print("\n=== 3. Market Quotes (RELIANCE, TCS, INFY) ===")
        r = await client.get('/api/v1/market/quotes?symbols=RELIANCE,TCS,INFY')
        print(f"/api/v1/market/quotes -> HTTP {r.status_code}")
        quotes = r.json()
        for sym, q in quotes.items():
            print(f"  {sym}: LTP={q.get('ltp')} | Open={q.get('open')} | PrevClose={q.get('previous_close')} | Chg%={q.get('change_percent')}")

        print("\n=== 4. Single Quote (RELIANCE) ===")
        r = await client.get('/api/v1/market/quote/RELIANCE')
        print(f"/api/v1/market/quote/RELIANCE -> HTTP {r.status_code}: LTP={r.json().get('ltp')}, Volume={r.json().get('volume')}")

        print("\n=== 5. Historical & Intraday Candles (RELIANCE) ===")
        for interval in ['1m', '5m', '15m', '30m', '1h', '1D']:
            r = await client.get(f'/api/v1/market/candles/RELIANCE?interval={interval}')
            candles = r.json()
            cnt = len(candles) if isinstance(candles, list) else 0
            last_c = candles[-1] if isinstance(candles, list) and candles else {}
            print(f"  Interval {interval}: {cnt} bars | Last bar: {last_c.get('timestamp')} Close={last_c.get('close')}")

        print("\n=== 6. Market Ticker (Indices) ===")
        r = await client.get('/api/v1/market/ticker')
        print(f"/api/v1/market/ticker -> HTTP {r.status_code}")
        indices = r.json().get('indices', [])
        for idx in indices:
            print(f"  {idx.get('symbol')}: LTP={idx.get('ltp')} | Value={idx.get('value')} | Change%={idx.get('change_percent')}")

        print("\n=== 7. Instrument Search ===")
        r = await client.get('/api/v1/market/search?query=RELIANCE')
        print(f"/api/v1/market/search?query=RELIANCE -> HTTP {r.status_code}: {len(r.json())} results")
        for inst in r.json():
            print(f"  Match: symbol={inst.get('symbol')} | key={inst.get('instrument_key')} | name={inst.get('name')}")

        print("\n=== 8. Admin Monitoring ===")
        async with AsyncSessionLocal() as db:
            admin_user = (await db.execute(select(User).join(User.roles).where(Role.name == "ADMIN"))).scalar_one_or_none()
            if not admin_user:
                admin_role = (await db.execute(select(Role).where(Role.name == "ADMIN"))).scalar_one_or_none()
                if not admin_role:
                    admin_role = Role(name="ADMIN", description="Administrator")
                    db.add(admin_role)
                    await db.flush()
                admin_user = User(
                    email="admin@tradex.local",
                    hashed_password="dummy_hash_for_test",
                    is_active=True,
                    is_verified=True,
                    roles=[admin_role],
                )
                db.add(admin_user)
                await db.commit()
                await db.refresh(admin_user)

            admin_token = create_access_token(subject=admin_user.id, role="ADMIN")
            headers = {"Authorization": f"Bearer {admin_token}"}
            r = await client.get('/api/v1/admin/monitoring', headers=headers)
            print(f"/api/v1/admin/monitoring -> HTTP {r.status_code}")
            mon_data = r.json()
            print("  Metrics:")
            for k, v in mon_data.get('metrics', {}).items():
                if isinstance(v, (str, int, float, bool)):
                    print(f"    {k}: {v}")

if __name__ == "__main__":
    asyncio.run(verify_all())
