plugins { id("com.android.application") }

android {
    namespace = "com.indie.moba"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.indie.moba.zhufeng.v2"
        minSdk = 26
        targetSdk = 34
        versionCode = 2
        versionName = "0.2.0"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
