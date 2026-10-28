package com.tecnocampus.LS2.protube_back.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tecnocampus.LS2.protube_back.dto.ApiError;
import com.tecnocampus.LS2.protube_back.dto.auth.LoginRequest;
import com.tecnocampus.LS2.protube_back.security.SessionCookies;
import com.tecnocampus.LS2.protube_back.security.SessionRenewalFilter;
import com.tecnocampus.LS2.protube_back.services.AuthService;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.savedrequest.NullRequestCache;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.DefaultCorsProcessor;
import org.springframework.web.filter.CorsFilter;

import java.io.IOException;
import java.util.List;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    CsrfTokenRepository csrfTokenRepository() {
        return new HttpSessionCsrfTokenRepository();
    }

    @Bean
    SessionAuthenticationStrategy sessionAuthenticationStrategy(CsrfTokenRepository csrf) {
        return new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(), new CsrfAuthenticationStrategy(csrf)));
    }

    @Bean
    AuthenticationManager authenticationManager(AuthService users) {
        return candidate -> {
            var user = users.login(new LoginRequest(candidate.getName(), (String) candidate.getCredentials()));
            return UsernamePasswordAuthenticationToken.authenticated(user, null, List.of());
        };
    }

    @Bean
    UrlBasedCorsConfigurationSource corsConfigurationSource(
            @Value("${pro_tube.auth.allowed-origins:http://localhost:5173}") List<String> origins) {
        if (origins.stream().anyMatch(origin -> origin.contains("*"))) {
            throw new IllegalArgumentException("CORS requires explicit origins");
        }
        var config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowCredentials(true);
        config.setAllowedMethods(List.of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "X-CSRF-TOKEN", "Range"));
        config.setExposedHeaders(List.of("Content-Range", "Accept-Ranges"));
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        source.registerCorsConfiguration("/media/**", config);
        return source;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityContextRepository contexts,
            CsrfTokenRepository csrf, UrlBasedCorsConfigurationSource cors, SessionCookies cookies,
            ObjectMapper json) throws Exception {
        var corsFilter = new CorsFilter(cors);
        corsFilter.setCorsProcessor(new DefaultCorsProcessor() {
            @Override
            protected void rejectRequest(ServerHttpResponse response) throws IOException {
                response.setStatusCode(HttpStatus.FORBIDDEN);
                response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
                json.writeValue(response.getBody(), new ApiError("ACCESS_DENIED",
                        "No tienes permiso para realizar esta operación."));
            }
        });
        http.cors(AbstractHttpConfigurer::disable)
                .addFilterBefore(corsFilter, CsrfFilter.class)
                .csrf(c -> c.csrfTokenRepository(csrf))
                .securityContext(c -> c.securityContextRepository(contexts).requireExplicitSave(true))
                .sessionManagement(c -> c.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .requestCache(c -> c.requestCache(new NullRequestCache()))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(c -> c
                        .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login", "/api/auth/logout", "/logout").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/videos", "/api/videos/*", "/api/hello").permitAll()
                        .requestMatchers(HttpMethod.GET, "/", "/index.html", "/assets/**", "/favicon.ico", "/media/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/api/videos", "/api/videos/*", "/api/hello", "/media/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(c -> c
                        .authenticationEntryPoint((req, res, ex) -> writeError(json, res, 401,
                                "AUTHENTICATION_REQUIRED", "Debes iniciar sesión para realizar esta operación."))
                        .accessDeniedHandler((req, res, ex) -> {
                            boolean invalidCsrf = ex instanceof CsrfException;
                            writeError(json, res, 403, invalidCsrf ? "INVALID_CSRF_TOKEN" : "ACCESS_DENIED",
                                    invalidCsrf ? "El token de seguridad falta o no es válido."
                                            : "No tienes permiso para realizar esta operación.");
                        }))
                .addFilterAfter(new SessionRenewalFilter(cookies), AnonymousAuthenticationFilter.class);
        return http.build();
    }

    private static void writeError(ObjectMapper json, HttpServletResponse response, int status,
                                   String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getWriter(), new ApiError(code, message));
    }
}
