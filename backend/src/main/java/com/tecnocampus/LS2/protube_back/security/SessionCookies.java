package com.tecnocampus.LS2.protube_back.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** Uses the same cookie settings as the servlet container when renewing or deleting a session. */
@Component
public class SessionCookies {
    private final ServerProperties server;

    public SessionCookies(ServerProperties server) {
        this.server = server;
    }

    public void renew(HttpServletRequest request, HttpServletResponse response) {
        var session = request.getSession(false);
        if (session != null) {
            write(request, response, session.getId(), server.getServlet().getSession().getTimeout());
        }
    }

    public void clear(HttpServletRequest request, HttpServletResponse response) {
        write(request, response, "", Duration.ZERO);
    }

    private void write(HttpServletRequest request, HttpServletResponse response, String value, Duration age) {
        var cookie = server.getServlet().getSession().getCookie();
        String name = cookie.getName() == null ? "JSESSIONID" : cookie.getName();
        String path = cookie.getPath();
        if (path == null) {
            path = request.getContextPath().isEmpty() ? "/" : request.getContextPath();
        }
        boolean secure = cookie.getSecure() == null ? request.isSecure() : cookie.getSecure();
        var builder = ResponseCookie.from(name, value).path(path).httpOnly(true)
                .secure(secure).sameSite("Lax").maxAge(age);
        if (cookie.getDomain() != null) {
            builder.domain(cookie.getDomain());
        }
        response.addHeader(HttpHeaders.SET_COOKIE, builder.build().toString());
    }
}
