package com.bullrun.security.repository;

import com.bullrun.security.model.OrderExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderExecutionRepository extends JpaRepository<OrderExecution, String> {
    List<OrderExecution> findByOrderId(String orderId);
}
