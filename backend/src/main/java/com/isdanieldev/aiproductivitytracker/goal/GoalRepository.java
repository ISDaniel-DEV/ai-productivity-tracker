package com.isdanieldev.aiproductivitytracker.goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
import java.util.Optional;

public interface GoalRepository extends JpaRepository<GoalEntity, Long> {
    @EntityGraph(attributePaths = "parent") List<GoalEntity> findByUserIdOrderByCreatedAtAsc(Long userId);
    Optional<GoalEntity> findByIdAndUserId(Long id, Long userId);
    Optional<GoalEntity> findByUserIdAndRequestKey(Long userId, String requestKey);
}
