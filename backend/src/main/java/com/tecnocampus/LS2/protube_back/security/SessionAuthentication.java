package com.tecnocampus.LS2.protube_back.security;

import com.tecnocampus.LS2.protube_back.dto.auth.AuthUserResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.stereotype.Component;

import java.util.List;

/** Shared by registration and login; stores only the user ID and authorities in the session. */
@Component
public class SessionAuthentication {
    private final SecurityContextRepository contexts;
    private final SessionAuthenticationStrategy strategy;
    private final CsrfTokenRepository csrf;
    private final SessionCookies cookies;
    private final ServerProperties server;

    public SessionAuthentication(SecurityContextRepository contexts, SessionAuthenticationStrategy strategy,
                                 CsrfTokenRepository csrf, SessionCookies cookies, ServerProperties server) {
        this.contexts = contexts;
        this.strategy = strategy;
        this.csrf = csrf;
        this.cookies = cookies;
        this.server = server;
    }

    public void signIn(AuthUserResponse user, HttpServletRequest request, HttpServletResponse response) {
        var authentication = UsernamePasswordAuthenticationToken.authenticated(user.id(), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER")));
        strategy.onAuthentication(authentication, request, response);
        request.getSession().setMaxInactiveInterval((int) server.getServlet().getSession().getTimeout().toSeconds());
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        cookies.renew(request, response);
    }

    public void signOut(HttpServletRequest request, HttpServletResponse response) {
        csrf.saveToken(null, request, response);
        var handler = new SecurityContextLogoutHandler();
        handler.setSecurityContextRepository(contexts);
        handler.logout(request, response, SecurityContextHolder.getContext().getAuthentication());
        cookies.clear(request, response);
    }
}
