package dev.javaide.gradlebridge.fixtures;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/** Compiled input for {@code TestScannerTest}. */
@DisplayName("Sample tests")
class SampleTests {
    @Test
    @DisplayName("works")
    void works() {}

    @Test
    @Disabled("not today")
    void skipped() {}

    @Nested
    class NestedCase {
        @Test
        void nestedWorks() {}
    }
}
