package com.tecnocampus.LS2.protube_back.controller;

import org.junit.jupiter.api.Test;
import com.tecnocampus.LS2.protube_back.security.SessionAuthentication;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.mockito.Mockito.*;

import static org.junit.jupiter.api.Assertions.assertEquals;

class IndexControllerTest {
    SessionAuthentication sessions = mock(SessionAuthentication.class);
    IndexController indexController = new IndexController(sessions);

    @Test
    void home() {

        assertEquals("index", indexController.home().getViewName());
    }

    @Test
    void logout() {

        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        assertEquals("logout", indexController.logout(request, response).getViewName());
        verify(sessions).signOut(request, response);
    }
}
