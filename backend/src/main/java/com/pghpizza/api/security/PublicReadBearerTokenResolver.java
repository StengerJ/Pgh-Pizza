package com.pghpizza.api.security;

import java.util.Arrays;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.PathContainer;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

/**
 * Ignores the Authorization header on public reads. Otherwise an expired login stored in a
 * browser makes every public page fail with 401, because the resource server rejects invalid
 * bearer tokens even on permitAll endpoints.
 */
public class PublicReadBearerTokenResolver implements BearerTokenResolver {
    static final String[] PUBLIC_READ_PATHS = {
            "/api/ratings", "/api/ratings/*",
            "/api/blog-posts", "/api/blog-posts/*",
            "/api/profiles/*"
    };

    private static final List<PathPattern> PUBLIC_READ_PATTERNS = Arrays.stream(PUBLIC_READ_PATHS)
            .map(PathPatternParser.defaultInstance::parse)
            .toList();

    private final DefaultBearerTokenResolver delegate = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        if (HttpMethod.GET.matches(request.getMethod()) && isPublicRead(request)) {
            return null;
        }

        return delegate.resolve(request);
    }

    private static boolean isPublicRead(HttpServletRequest request) {
        PathContainer path = PathContainer.parsePath(
                request.getRequestURI().substring(request.getContextPath().length()));
        return PUBLIC_READ_PATTERNS.stream().anyMatch(pattern -> pattern.matches(path));
    }
}
