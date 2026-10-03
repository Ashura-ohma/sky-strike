plugins { id("com.android.application") }

android {
    namespace = "com.indie.moba"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.indie.moba.zhufeng"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
