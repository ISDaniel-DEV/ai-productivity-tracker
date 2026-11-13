package com.isdanieldev.aiproductivitytracker.note;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface CategoryRepository extends JpaRepository<CategoryEntity, Long> {
    Optional<CategoryEntity> findByUserIdAndTypeAndNormalizedName(Long userId, String type, String normalizedName);
}
