package com.bullrun.security.repository;

import com.bullrun.security.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, String> {

    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.stock s LEFT JOIN FETCH o.executions e WHERE o.userId = :userId ORDER BY o.createdAt DESC")
    List<Order> findByUserIdWithDetails(@Param("userId") String userId);

    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);

    long countByUserId(String userId);

    long countByUserIdAndSide(String userId, String side);

    long countByUserIdAndStatus(String userId, String status);
}
