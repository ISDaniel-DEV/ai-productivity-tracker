package com.isdanieldev.aiproductivitytracker.note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface NoteRepository extends JpaRepository<NoteEntity, UUID> {
    @EntityGraph(attributePaths = "category") List<NoteEntity> findByUserIdOrderByCreatedAtAsc(Long userId);
    Optional<NoteEntity> findByIdAndUserId(UUID id, Long userId);
    Optional<NoteEntity> findByUserIdAndRequestKey(Long userId, String requestKey);
}
