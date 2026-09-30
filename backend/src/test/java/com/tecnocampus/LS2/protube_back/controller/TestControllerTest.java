package com.tecnocampus.LS2.protube_back.controller;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(MockitoExtension.class)
class TestControllerTest {

    TestController testController = new TestController();

    @Test
    void sayHello() {

        String s = testController.sayHello();
        assertEquals("Hello, World!", s);
    }
}