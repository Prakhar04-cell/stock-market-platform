package com.bullrun.security.repository;

import com.bullrun.security.model.MarketPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MarketPriceRepository extends JpaRepository<MarketPrice, String> {

    @Query("SELECT m FROM MarketPrice m WHERE m.stockId = :stockId ORDER BY m.timestamp DESC LIMIT 1")
    Optional<MarketPrice> findLatestByStockId(@Param("stockId") String stockId);

    @Query("SELECT m FROM MarketPrice m WHERE m.instrumentKey = :instrumentKey ORDER BY m.timestamp DESC LIMIT 1")
    Optional<MarketPrice> findLatestByInstrumentKey(@Param("instrumentKey") String instrumentKey);
}
