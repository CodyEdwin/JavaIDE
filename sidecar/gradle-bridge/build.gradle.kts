plugins {
    java
    application
}

group = "dev.javaide"
version = "0.1.0"

repositories {
    mavenCentral()
    maven {
        name = "gradleReleases"
        url = uri("https://repo.gradle.org/gradle/libs-releases")
    }
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.release = 17
    options.encoding = "UTF-8"
    options.compilerArgs.addAll(listOf("-Xlint:all", "-Werror"))
}

dependencies {
    implementation("org.gradle:gradle-tooling-api:9.8.1")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.18.2")
    implementation("org.ow2.asm:asm:9.7.1")

    // The model builder is loaded by the Gradle daemon through the generated
    // init script. Gradle itself supplies these classes at runtime.
    compileOnly(gradleApi())

    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

application {
    applicationName = "gradle-bridge"
    mainClass = "dev.javaide.gradlebridge.Main"
    applicationDefaultJvmArgs = listOf("-Dfile.encoding=UTF-8")
}

tasks.jar {
    manifest {
        attributes(
            "Implementation-Title" to "JavaIDE Gradle Bridge",
            "Implementation-Version" to project.version,
        )
    }
}

tasks.test {
    useJUnitPlatform()
}
