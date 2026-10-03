plugins { id("com.android.application") }

android {
    namespace = "com.indie.moba"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.indie.moba.zhufeng.v3"
        minSdk = 26
        targetSdk = 34
        versionCode = 4
        versionName = "0.4.0"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
