package com.bullrun.security.service;

import com.bullrun.security.dto.HoldingAnalyticsDto;
import com.bullrun.security.dto.PnLReportDto;
import com.bullrun.security.model.Holding;
import com.bullrun.security.model.MarketPrice;
import com.bullrun.security.model.Order;
import com.bullrun.security.model.OrderExecution;
import com.bullrun.security.repository.HoldingRepository;
import com.bullrun.security.repository.MarketPriceRepository;
import com.bullrun.security.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class PnLCalculator {

    private final HoldingRepository holdingRepository;
    private final OrderRepository orderRepository;
    private final MarketPriceRepository marketPriceRepository;

    public PnLCalculator(
        HoldingRepository holdingRepository,
        OrderRepository orderRepository,
        MarketPriceRepository marketPriceRepository
    ) {
        this.holdingRepository = holdingRepository;
        this.orderRepository = orderRepository;
        this.marketPriceRepository = marketPriceRepository;
    }

    @Transactional(readOnly = true)
    public PnLReportDto calculatePnL(String userId) {
        List<Holding> holdings = holdingRepository.findActiveHoldingsByUserId(userId);
        List<Order> orders = orderRepository.findByUserIdWithDetails(userId);

        BigDecimal totalInvested = BigDecimal.ZERO;
        BigDecimal totalMarketValue = BigDecimal.ZERO;
        BigDecimal unrealizedPnl = BigDecimal.ZERO;
        BigDecimal dayPnl = BigDecimal.ZERO;

        List<HoldingAnalyticsDto> positions = new ArrayList<>();

        for (Holding h : holdings) {
            BigDecimal qty = h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO;
            BigDecimal avgBuy = h.getAverageBuyPrice() != null ? h.getAverageBuyPrice() : BigDecimal.ZERO;
            BigDecimal invested = qty.multiply(avgBuy).setScale(4, RoundingMode.HALF_UP);

            // Fetch latest market price
            Optional<MarketPrice> mktOpt = marketPriceRepository.findLatestByStockId(h.getStockId());
            BigDecimal curPrice = avgBuy; // default to avg buy if market price not yet available
            BigDecimal dayChange = BigDecimal.ZERO;

            if (mktOpt.isPresent()) {
                MarketPrice mp = mktOpt.get();
                if (mp.getLtp() != null && mp.getLtp().compareTo(BigDecimal.ZERO) > 0) {
                    curPrice = mp.getLtp();
                }
                if (mp.getPriceChange() != null) {
                    dayChange = mp.getPriceChange();
                }
            }

            BigDecimal curValue = qty.multiply(curPrice).setScale(4, RoundingMode.HALF_UP);
            BigDecimal posUnrealizedPnl = curValue.subtract(invested).setScale(4, RoundingMode.HALF_UP);

            BigDecimal posPnlPercent = BigDecimal.ZERO;
            if (invested.compareTo(BigDecimal.ZERO) > 0) {
                posPnlPercent = posUnrealizedPnl
                    .multiply(new BigDecimal("100"))
                    .divide(invested, 2, RoundingMode.HALF_UP);
            }

            BigDecimal posDayPnl = dayChange.multiply(qty).setScale(4, RoundingMode.HALF_UP);

            totalInvested = totalInvested.add(invested);
            totalMarketValue = totalMarketValue.add(curValue);
            unrealizedPnl = unrealizedPnl.add(posUnrealizedPnl);
            dayPnl = dayPnl.add(posDayPnl);

            HoldingAnalyticsDto dto = new HoldingAnalyticsDto();
            dto.setHoldingId(h.getId());
            dto.setStockId(h.getStockId());
            dto.setSymbol(h.getStock() != null ? h.getStock().getSymbol() : "UNKNOWN");
            dto.setName(h.getStock() != null ? h.getStock().getName() : "");
            dto.setSector(h.getStock() != null ? h.getStock().getSector() : "Equities");
            dto.setQuantity(qty);
            dto.setAverageBuyPrice(avgBuy);
            dto.setCurrentPrice(curPrice);
            dto.setInvestedValue(invested);
            dto.setCurrentValue(curValue);
            dto.setUnrealizedPnl(posUnrealizedPnl);
            dto.setPnlPercentage(posPnlPercent);
            dto.setDayChange(dayChange);
            dto.setDayPnl(posDayPnl);

            positions.add(dto);
        }

        // Calculate realized P&L from filled SELL orders
        BigDecimal realizedPnl = BigDecimal.ZERO;
        for (Order o : orders) {
            if ("SELL".equalsIgnoreCase(o.getSide()) && "FILLED".equalsIgnoreCase(o.getStatus())) {
                BigDecimal avgSellPrice = o.getAverageExecutionPrice() != null ? o.getAverageExecutionPrice() : o.getPrice();
                BigDecimal filledQty = o.getFilledQuantity() != null && o.getFilledQuantity().compareTo(BigDecimal.ZERO) > 0
                    ? o.getFilledQuantity()
                    : o.getQuantity();

                if (avgSellPrice != null && filledQty != null && o.getStock() != null) {
                    // Approximate cost basis from holding avg price or limit price
                    BigDecimal costBasis = o.getPrice() != null ? o.getPrice() : avgSellPrice;
                    BigDecimal tradeGrossPnl = avgSellPrice.subtract(costBasis).multiply(filledQty);

                    // Subtract executions trade charges
                    BigDecimal charges = BigDecimal.ZERO;
                    if (o.getExecutions() != null) {
                        for (OrderExecution exec : o.getExecutions()) {
                            if (exec.getTradeCharges() != null) {
                                charges = charges.add(exec.getTradeCharges());
                            }
                        }
                    }
                    realizedPnl = realizedPnl.add(tradeGrossPnl.subtract(charges));
                }
            }
        }
        realizedPnl = realizedPnl.setScale(4, RoundingMode.HALF_UP);

        BigDecimal totalPnl = realizedPnl.add(unrealizedPnl).setScale(4, RoundingMode.HALF_UP);

        BigDecimal profitPercent = BigDecimal.ZERO;
        if (totalInvested.compareTo(BigDecimal.ZERO) > 0) {
            profitPercent = totalPnl
                .multiply(new BigDecimal("100"))
                .divide(totalInvested, 2, RoundingMode.HALF_UP);
        }

        PnLReportDto report = new PnLReportDto();
        report.setUserId(userId);
        report.setTotalPnl(totalPnl);
        report.setRealizedPnl(realizedPnl);
        report.setUnrealizedPnl(unrealizedPnl);
        report.setProfitPercentage(profitPercent);
        report.setDayPnl(dayPnl);
        report.setTotalInvested(totalInvested);
        report.setTotalPortfolioValue(totalMarketValue);
        report.setPositionPnL(positions);

        return report;
    }
}
