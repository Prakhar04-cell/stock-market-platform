package com.bullrun.security.repository;

import com.bullrun.security.model.Holding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HoldingRepository extends JpaRepository<Holding, String> {

    @Query("SELECT h FROM Holding h JOIN FETCH h.stock s WHERE h.userId = :userId AND h.quantity > 0")
    List<Holding> findActiveHoldingsByUserId(@Param("userId") String userId);

    List<Holding> findByUserId(String userId);
}
