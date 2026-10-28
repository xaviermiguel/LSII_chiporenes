package com.tecnocampus.LS2.protube_back.security;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

class SessionCookiesTest {
    @Test
    void productionRenewalAndDeletionUseSameConfiguredCookieAttributes() {
        var settings = new ServerProperties();
        settings.getServlet().getSession().setTimeout(Duration.ofDays(7));
        var cookie = settings.getServlet().getSession().getCookie();
        cookie.setName("PROTUBE_SESSION");
        cookie.setDomain("example.com");
        cookie.setPath("/protube");
        cookie.setSecure(true);
        var cookies = new SessionCookies(settings);
        var request = new MockHttpServletRequest();
        request.getSession();
        var renewed = new MockHttpServletResponse();
        cookies.renew(request, renewed);
        var deleted = new MockHttpServletResponse();
        cookies.clear(request, deleted);

        for (var response : new MockHttpServletResponse[]{renewed, deleted}) {
            String header = response.getHeader("Set-Cookie");
            assertNotNull(header);
            assertTrue(header.startsWith("PROTUBE_SESSION="));
            assertTrue(header.contains("Path=/protube"));
            assertTrue(header.contains("Domain=example.com"));
            assertTrue(header.contains("Secure"));
            assertTrue(header.contains("HttpOnly"));
            assertTrue(header.contains("SameSite=Lax"));
        }
        assertTrue(renewed.getHeader("Set-Cookie").contains("Max-Age=604800"));
        assertTrue(deleted.getHeader("Set-Cookie").contains("Max-Age=0"));
    }

    @Test
    void usesContextPathAndRequestSecurityWhenCookieSettingsAreNotOverridden() {
        var cookies = new SessionCookies(new ServerProperties());
        var request = new MockHttpServletRequest();
        request.setContextPath("/protube");
        request.setSecure(true);
        request.getSession();
        var response = new MockHttpServletResponse();
        cookies.renew(request, response);
        assertTrue(response.getHeader("Set-Cookie").contains("Path=/protube"));
        assertTrue(response.getHeader("Set-Cookie").contains("Secure"));
    }

    @Test
    void anonymousRenewalDoesNotCreateSessionOrCookie() {
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        new SessionCookies(new ServerProperties()).renew(request, response);
        assertNull(request.getSession(false));
        assertNull(response.getHeader("Set-Cookie"));
    }
}
