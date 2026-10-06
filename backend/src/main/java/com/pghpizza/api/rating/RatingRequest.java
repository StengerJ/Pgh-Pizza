package com.pghpizza.api.rating;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RatingRequest(
        @NotBlank @Size(max = 160) String restaurantName,
        @NotBlank @Size(max = 180) String location,
        @NotBlank @Size(max = 120) @Pattern(regexp = SCORE_TEXT, message = SCORE_MESSAGE) String sauce,
        @NotBlank @Size(max = 160) @Pattern(regexp = SCORE_TEXT, message = SCORE_MESSAGE) String toppings,
        @NotBlank @Size(max = 120) @Pattern(regexp = SCORE_TEXT, message = SCORE_MESSAGE) String crust,
        @NotNull @DecimalMin("1.0") @DecimalMax("10.0") @Digits(integer = 2, fraction = 2) BigDecimal overallRating,
        @NotNull @DecimalMin("1.0") @DecimalMax("10.0") @Digits(integer = 2, fraction = 2) BigDecimal affordabilityRating,
        @NotBlank @Size(max = 5000) String comments
) {
    // Sauce, toppings, and crust are stored as text but hold 1-10 scores with at most one decimal.
    static final String SCORE_TEXT = "^(10(\\.0)?|[1-9](\\.[0-9])?)$";
    static final String SCORE_MESSAGE = "must be a score from 1 to 10 with at most one decimal";
}
