plugins { id("com.android.application") }

android {
    namespace = "com.indie.moba"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.indie.moba.zhufeng.v4"
        minSdk = 26
        targetSdk = 34
        versionCode = 5
        versionName = "0.5.0"
    }

    signingConfigs.getByName("debug") {
        val cachedKey = rootProject.file("../.signing/debug.keystore")
        if (cachedKey.exists()) {
            storeFile = cachedKey
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
