package com.pghpizza.api.rating;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class RatingRequestValidationTests {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private RatingRequest withSauce(String sauce) {
        return new RatingRequest("Fiori", "Brookline", sauce, "8.0", "9.1",
                new BigDecimal("9.0"), new BigDecimal("8.5"), "Classic slice");
    }

    @ParameterizedTest
    @ValueSource(strings = { "1", "5.0", "7.2", "9", "10", "10.0" })
    void acceptsScoresFromOneToTenWithOneDecimal(String sauce) {
        assertThat(validator.validate(withSauce(sauce))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = { "Sweet", "0.9", "10.5", "11", "8.55", "-3", "" })
    void rejectsNonScores(String sauce) {
        assertThat(validator.validate(withSauce(sauce)))
                .anyMatch(violation -> violation.getPropertyPath().toString().equals("sauce"));
    }

    @Test
    void appliesTheSameRuleToCrustAndToppings() {
        RatingRequest request = new RatingRequest("Fiori", "Brookline", "7", "Thin", "Lots",
                new BigDecimal("9.0"), new BigDecimal("8.5"), "Classic slice");
        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("crust", "toppings");
    }
}
