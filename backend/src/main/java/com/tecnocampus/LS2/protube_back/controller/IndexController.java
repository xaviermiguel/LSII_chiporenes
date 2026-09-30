package com.tecnocampus.LS2.protube_back.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class IndexController {

    @GetMapping("")
    public ModelAndView home() {
        return new ModelAndView("index");
    }
    @PostMapping("logout")
    public ModelAndView logout() {
        return new ModelAndView("logout");
    }

}
