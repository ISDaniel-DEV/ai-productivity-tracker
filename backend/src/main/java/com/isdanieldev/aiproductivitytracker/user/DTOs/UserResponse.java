package com.isdanieldev.aiproductivitytracker.user.DTOs;

public record UserResponse(
        Long id,
        String name,
        String email,
        String createdAt
) {
}
