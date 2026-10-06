plugins {
	kotlin("jvm") version "2.3.21"
	kotlin("plugin.spring") version "2.3.21"
	id("org.springframework.boot") version "4.1.1"
	id("io.spring.dependency-management") version "1.1.7"
	id("org.jooq.jooq-codegen-gradle") version "3.20.5"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-jooq")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.jetbrains.kotlin:kotlin-reflect")
	implementation("tools.jackson.module:jackson-module-kotlin")
	runtimeOnly("org.postgresql:postgresql")
	jooqCodegen("org.postgresql:postgresql:42.7.5")

	testImplementation("org.springframework.boot:spring-boot-starter-jooq-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

jooq {
	configuration {
		jdbc {
			driver = "org.postgresql.Driver"
			url = "jdbc:postgresql://localhost:5433/bangkok_flood"
			user = System.getenv("DB_USER") ?: "bangkok"
			password = System.getenv("DB_PASSWORD") ?: "bangkok_dev_only"
		}
		generator {
			database {
				name = "org.jooq.meta.postgres.PostgresDatabase"
				inputSchema = "public"
				includes = "districts|buildings|river_line|building_risk|district_risk"
				forcedTypes {
					forcedType {
						name = "OTHER"
						includeTypes = "(?i)(geometry|geography)(\\s*\\(.*\\))?"
					}
				}
			}
			target {
				packageName = "com.example.flood.jooq"
				directory = "build/generated-src/jooq/main"
			}
		}
	}
}

sourceSets {
	main {
		java.srcDir("build/generated-src/jooq/main")
	}
}

tasks.named("compileJava") { dependsOn("jooqCodegen") }
tasks.named("compileKotlin") { dependsOn("jooqCodegen") }