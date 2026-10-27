package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class AppTest {
    @Test
    void addsTwoNumbers() {
        assertEquals(42, App.add(2, 40));
    }

    @Test
    void addingMaxValueOverflows() {
        assertThrows(
                ArithmeticException.class,
                () -> Math.addExact(Integer.MAX_VALUE, 1));
    }
}
