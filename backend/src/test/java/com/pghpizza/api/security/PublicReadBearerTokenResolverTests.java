package com.pghpizza.api.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletRequest;

class PublicReadBearerTokenResolverTests {
    private final PublicReadBearerTokenResolver resolver = new PublicReadBearerTokenResolver();

    private MockHttpServletRequest request(String method, String path) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.addHeader("Authorization", "Bearer expired.token.value");
        return request;
    }

    @ParameterizedTest
    @CsvSource({
            "GET, /api/ratings",
            "GET, /api/ratings/8d6f6a7e-1111-2222-3333-444455556666",
            "GET, /api/blog-posts",
            "GET, /api/blog-posts/fiori-pizza-brookline",
            "GET, /api/profiles/contributors",
            "GET, /api/profiles/8d6f6a7e-1111-2222-3333-444455556666"
    })
    void ignoresTokensOnPublicReadsSoAnExpiredLoginCannotBlockThem(String method, String path) {
        assertThat(resolver.resolve(request(method, path))).isNull();
    }

    @ParameterizedTest
    @CsvSource({
            "GET, /api/auth/me",
            "GET, /api/admin/users",
            "POST, /api/ratings",
            "PUT, /api/ratings/8d6f6a7e-1111-2222-3333-444455556666",
            "DELETE, /api/blog-posts/8d6f6a7e-1111-2222-3333-444455556666",
            "PUT, /api/profiles/me"
    })
    void stillReadsTokensEverywhereElse(String method, String path) {
        assertThat(resolver.resolve(request(method, path))).isEqualTo("expired.token.value");
    }
}
