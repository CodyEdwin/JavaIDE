package com.example;

/** Small executable used by the Phase 0 jdtls and Gradle spikes. */
public final class App {
    private App() {}

    /**
     * Adds two integers.
     *
     * @param left first addend
     * @param right second addend
     * @return the sum
     */
    public static int add(int left, int right) {
        return left + right;
    }

    /**
     * Entry point.
     *
     * @param args ignored
     */
    public static void main(String[] args) {
        System.out.println("2 + 40 = " + add(2, 40));
    }
}
