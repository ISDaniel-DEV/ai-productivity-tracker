package com.isdanieldev.aiproductivitytracker.note;
import com.isdanieldev.aiproductivitytracker.user.UserEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.UUID;

@Getter @Setter @Entity @Table(name = "notebook_note")
public class NoteEntity {
    @Id private UUID id = UUID.randomUUID();
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private UserEntity user;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id") private CategoryEntity category;
    @Column(nullable = false, length = 10) private String kind;
    @Column(nullable = false, length = 180) private String title;
    @Column(nullable = false, columnDefinition = "TEXT") private String body = "";
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt = Instant.now();
    @Column(name = "request_key", length = 36, updatable = false) private String requestKey;
}
