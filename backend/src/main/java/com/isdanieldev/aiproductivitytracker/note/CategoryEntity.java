package com.isdanieldev.aiproductivitytracker.note;
import com.isdanieldev.aiproductivitytracker.user.UserEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter @Entity @Table(name = "note_category")
public class CategoryEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private UserEntity user;
    @Column(nullable = false, length = 10) private String type;
    @Column(nullable = false, length = 80) private String name;
    @Column(name = "normalized_name", nullable = false, length = 80) private String normalizedName;
}
