plugins { id("com.android.application") }

android {
    namespace = "com.indie.moba"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.indie.moba.zhufeng.v3"
        minSdk = 26
        targetSdk = 34
        versionCode = 3
        versionName = "0.3.0"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
