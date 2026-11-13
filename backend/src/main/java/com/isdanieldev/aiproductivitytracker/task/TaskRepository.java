package com.isdanieldev.aiproductivitytracker.task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<TaskEntity, Long> {
    @EntityGraph(attributePaths = "goal") List<TaskEntity> findByUserIdOrderByCreatedAtAsc(Long userId);
    Optional<TaskEntity> findByIdAndUserId(Long id, Long userId);
    Optional<TaskEntity> findByUserIdAndRequestKey(Long userId, String requestKey);
}
