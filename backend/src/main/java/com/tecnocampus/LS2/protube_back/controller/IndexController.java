package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.security.SessionAuthentication;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class IndexController {
    private final SessionAuthentication sessions;

    public IndexController(SessionAuthentication sessions) {
        this.sessions = sessions;
    }

    @GetMapping("")
    public ModelAndView home() {
        return new ModelAndView("index");
    }
    @PostMapping("logout")
    public ModelAndView logout(HttpServletRequest request, HttpServletResponse response) {
        sessions.signOut(request, response);
        return new ModelAndView("logout");
    }

}
